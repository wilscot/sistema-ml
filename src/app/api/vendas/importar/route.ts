import { NextRequest, NextResponse } from 'next/server';
import { getDb, getDbInstance } from '@/db/index';
import {
  calcularReceita,
  calcularTaxaML,
  calcularLucroLiquido,
} from '@/lib/calculators';
import type { VendaML } from '@/types/venda';
import type { ProdutoProd } from '@/types/produto';

interface ErroDetalhado {
  linha: number;
  numeroVenda: string;
  titulo: string;
  motivo: string;
  detalhes: string;
}

interface ImportResult {
  importadas: number;
  erros: string[];
  errosDetalhados: ErroDetalhado[];
  produtosNaoEncontrados: string[];
}

/**
 * Busca produto PROD pelo título do anúncio (match exato)
 */
function buscarProdutoPorTitulo(
  db: any,
  tituloAnuncio: string
): ProdutoProd | null {
  const produtos = db
    .prepare(
      `SELECT * FROM produtos_prod 
       WHERE deletedAt IS NULL 
       AND LOWER(TRIM(nome)) = LOWER(TRIM(?))`
    )
    .all(tituloAnuncio.trim()) as ProdutoProd[];

  return produtos.length > 0 ? produtos[0] : null;
}

/**
 * Processa uma venda individual (mesma lógica do POST /api/vendas)
 */
async function processarVenda(
  db: any,
  vendaML: VendaML,
  produtoId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. VERIFICAR ESTOQUE
    const estoqueTotal = db
      .prepare(
        'SELECT COALESCE(SUM(quantidadeDisponivel), 0) as total FROM compras WHERE produtoId = ?'
      )
      .get(produtoId) as { total: number } | undefined;

    if (!estoqueTotal || estoqueTotal.total < vendaML.unidades) {
      return {
        success: false,
        error: `Estoque insuficiente: ${estoqueTotal?.total || 0} disponível, ${vendaML.unidades} solicitado`,
      };
    }

    // 2. BEGIN TRANSACTION
    db.exec('BEGIN TRANSACTION');

    try {
      // 3. BUSCAR COMPRAS DISPONÍVEIS (FIFO)
      const comprasDisponiveis = db
        .prepare(
          `SELECT * FROM compras 
           WHERE produtoId = ? AND quantidadeDisponivel > 0 
           ORDER BY dataCompra ASC`
        )
        .all(produtoId) as any[];

      if (comprasDisponiveis.length === 0) {
        db.exec('ROLLBACK');
        return {
          success: false,
          error: 'Nenhuma compra disponível para este produto',
        };
      }

      // 4. LOOP FIFO
      let quantidadeRestante = vendaML.unidades;
      let custoTotalAcumulado = 0;
      let ultimaCompraId: number | null = null;

      for (const compra of comprasDisponiveis) {
        if (quantidadeRestante <= 0) break;

        const quantidadeParaDeduzir = Math.min(
          quantidadeRestante,
          compra.quantidadeDisponivel
        );

        const custoParcelaAtual = compra.custoUnitario * quantidadeParaDeduzir;
        custoTotalAcumulado += custoParcelaAtual;

        const novaQuantidadeDisponivel =
          compra.quantidadeDisponivel - quantidadeParaDeduzir;
        db.prepare(
          'UPDATE compras SET quantidadeDisponivel = ? WHERE id = ?'
        ).run(novaQuantidadeDisponivel, compra.id);

        quantidadeRestante -= quantidadeParaDeduzir;
        ultimaCompraId = compra.id;
      }

      if (quantidadeRestante > 0) {
        db.exec('ROLLBACK');
        return {
          success: false,
          error: 'Erro FIFO: quantidade restante não pôde ser deduzida',
        };
      }

      // 5. CALCULAR VALORES
      const config = db
        .prepare('SELECT * FROM configuracoes_prod LIMIT 1')
        .get() as any;

      if (!config) {
        db.exec('ROLLBACK');
        return {
          success: false,
          error: 'Configurações PROD não encontradas',
        };
      }

      const taxaPercent =
        vendaML.tipoAnuncio === 'CLASSICO'
          ? config.taxaClassico
          : config.taxaPremium;

      // Usar receitaEnvio como freteCobrado (do Excel) - é um CUSTO
      const freteCobrado = vendaML.receitaEnvio || 0;

      const valorTotalVenda = vendaML.precoUnitario * vendaML.unidades;
      const taxaML = calcularTaxaML(valorTotalVenda, taxaPercent);

      // Custo total unitário (média ponderada das compras usadas)
      const custoTotalUnitario = custoTotalAcumulado / vendaML.unidades;
      const custoTotal = Number(custoTotalUnitario.toFixed(2));

      // Lucro líquido: receita - custo - taxa - frete (frete é CUSTO)
      const lucroLiquido = calcularLucroLiquido(
        vendaML.precoUnitario,
        vendaML.unidades,
        freteCobrado, // Frete PAGO pelo vendedor (é um custo)
        custoTotal,
        taxaML
      );

      // 6. INSERIR VENDA
      const dataTimestamp = Math.floor(vendaML.data.getTime() / 1000);
      const now = Math.floor(Date.now() / 1000);

      db.prepare(
        `INSERT INTO vendas (produtoId, compraId, numeroVenda, nomeComprador, cpfComprador, quantidadeVendida, precoVenda, tipoAnuncio, freteCobrado, taxaML, custoTotal, lucroLiquido, data, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        produtoId,
        ultimaCompraId,
        vendaML.numeroVenda || null,
        vendaML.nomeComprador || null,
        vendaML.cpfComprador || null,
        vendaML.unidades,
        vendaML.precoUnitario,
        vendaML.tipoAnuncio,
        freteCobrado,
        taxaML,
        custoTotal,
        lucroLiquido,
        dataTimestamp,
        now
      );

      // 7. ATUALIZAR ESTOQUE PRODUTO
      db.prepare(
        'UPDATE produtos_prod SET quantidade = quantidade - ?, updatedAt = ? WHERE id = ?'
      ).run(vendaML.unidades, now, produtoId);

      // 8. COMMIT TRANSACTION
      db.exec('COMMIT');

      return { success: true };
    } catch (transactionError: any) {
      db.exec('ROLLBACK');
      throw transactionError;
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Erro ao processar venda',
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { vendas } = body as { vendas: VendaML[] };

    if (!vendas || !Array.isArray(vendas) || vendas.length === 0) {
      return NextResponse.json(
        { error: 'Array de vendas é obrigatório e não pode estar vazio' },
        { status: 400 }
      );
    }

    getDb();
    const db = getDbInstance();

    const result: ImportResult = {
      importadas: 0,
      erros: [],
      errosDetalhados: [],
      produtosNaoEncontrados: [],
    };

    // Processar cada venda
    for (let i = 0; i < vendas.length; i++) {
      const vendaML = vendas[i];
      const linha = i + 7; // Linha no Excel (header + offset)

      try {
        // Validação de dados básicos
        if (!vendaML.numeroVenda || !vendaML.tituloAnuncio) {
          result.errosDetalhados.push({
            linha,
            numeroVenda: vendaML.numeroVenda || 'N/A',
            titulo: vendaML.tituloAnuncio || 'N/A',
            motivo: 'Dados inválidos',
            detalhes: 'Número da venda ou título do anúncio não informado',
          });
          result.erros.push(
            `Venda linha ${linha}: Dados inválidos - número ou título ausente`
          );
          continue;
        }

        // Buscar produto por título do anúncio
        const produto = buscarProdutoPorTitulo(db, vendaML.tituloAnuncio);

        if (!produto) {
          // Produto não encontrado
          if (!result.produtosNaoEncontrados.includes(vendaML.tituloAnuncio)) {
            result.produtosNaoEncontrados.push(vendaML.tituloAnuncio);
          }
          result.errosDetalhados.push({
            linha,
            numeroVenda: vendaML.numeroVenda || 'N/A',
            titulo: vendaML.tituloAnuncio || 'N/A',
            motivo: 'Produto não encontrado',
            detalhes: 'Nenhum produto PROD corresponde a este título',
          });
          result.erros.push(
            `Venda #${vendaML.numeroVenda}: Produto não encontrado - "${vendaML.tituloAnuncio}"`
          );
          continue;
        }

        // Processar venda
        const processamento = await processarVenda(db, vendaML, produto.id);

        if (processamento.success) {
          result.importadas++;
        } else {
          const erroDetalhado: ErroDetalhado = {
            linha,
            numeroVenda: vendaML.numeroVenda || 'N/A',
            titulo: vendaML.tituloAnuncio || 'N/A',
            motivo: processamento.error?.includes('Estoque insuficiente')
              ? 'Estoque insuficiente'
              : processamento.error?.includes('Configurações')
              ? 'Configuração não encontrada'
              : processamento.error?.includes('compra disponível')
              ? 'Nenhuma compra disponível'
              : 'Erro ao processar venda',
            detalhes: processamento.error || 'Erro desconhecido',
          };
          result.errosDetalhados.push(erroDetalhado);
          result.erros.push(
            `Venda #${vendaML.numeroVenda}: ${processamento.error || 'Erro desconhecido'}`
          );
        }
      } catch (error: any) {
        result.errosDetalhados.push({
          linha,
          numeroVenda: vendaML.numeroVenda || 'N/A',
          titulo: vendaML.tituloAnuncio || 'N/A',
          motivo: 'Erro ao processar',
          detalhes: error.message || 'Erro desconhecido',
        });
        result.erros.push(
          `Venda #${vendaML.numeroVenda}: ${error.message || 'Erro ao processar'}`
        );
      }
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Erro ao importar vendas:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao importar vendas' },
      { status: 500 }
    );
  }
}
