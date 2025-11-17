import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/db';
import { getVendas, getProdutoById, getConfig, getComprasDisponiveisProduto, deduzirEstoqueCompra } from '@/lib/db-client';
import { validarVenda } from '@/lib/validators';
import {
  calcularCustoTotal,
  calcularTaxaML,
  calcularLucro,
} from '@/lib/calculators';
import { eq, sql } from 'drizzle-orm';
import type { NovaVenda } from '@/db/schema';

const { vendas, produtos } = schema;

/**
 * GET /api/vendas
 * Retorna vendas com filtros opcionais
 * Query: ?produtoId=X, ?startDate=Y, ?endDate=Z
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const produtoIdParam = searchParams.get('produtoId');
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    const filters: {
      produtoId?: number;
      startDate?: Date;
      endDate?: Date;
    } = {};

    if (produtoIdParam) {
      const produtoId = parseInt(produtoIdParam);
      if (!isNaN(produtoId) && produtoId > 0) {
        filters.produtoId = produtoId;
      }
    }

    if (startDateParam) {
      const startDate = new Date(startDateParam);
      if (!isNaN(startDate.getTime())) {
        filters.startDate = startDate;
      }
    }

    if (endDateParam) {
      const endDate = new Date(endDateParam);
      if (!isNaN(endDate.getTime())) {
        filters.endDate = endDate;
      }
    }

    const vendasList = await getVendas(Object.keys(filters).length > 0 ? filters : undefined);

    return NextResponse.json({ vendas: vendasList }, { status: 200 });
  } catch (error) {
    console.error('Erro ao buscar vendas:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    
    // Verificar se é erro de coluna não encontrada
    if (errorMessage.includes('no such column') || errorMessage.includes('column')) {
      return NextResponse.json(
        { 
          error: 'Schema do banco desatualizado. Execute: pnpm db:push',
          details: errorMessage
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Erro ao buscar vendas. Tente novamente mais tarde.',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/vendas
 * Cria nova venda e deduz estoque (TRANSACTION)
 * Body: Omit<NovaVenda, 'taxaML' | 'lucroLiquido'>
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validar produtoId
    if (!body.produtoId || typeof body.produtoId !== 'number') {
      return NextResponse.json(
        { error: 'produtoId é obrigatório e deve ser um número' },
        { status: 400 }
      );
    }

    // Buscar produto
    const produto = await getProdutoById(body.produtoId);

    if (!produto) {
      return NextResponse.json(
        { error: 'Produto não encontrado' },
        { status: 404 }
      );
    }

    // Validar que produto é PROD (vendas só para PROD)
    if (produto.tipo !== 'PROD') {
      return NextResponse.json(
        { error: 'Vendas só podem ser registradas para produtos PROD' },
        { status: 400 }
      );
    }

    // Validar que produto não está deletado
    if (produto.deletedAt) {
      return NextResponse.json(
        { error: 'Não é possível registrar venda para produto deletado' },
        { status: 400 }
      );
    }

    // Validar quantidade
    const quantidadeVendida = body.quantidadeVendida || 0;
    const precoVenda = body.precoVenda;
    const tipoAnuncio = body.tipoAnuncio;
    const freteCobrado = body.freteCobrado || 0;
    const data = body.data ? new Date(body.data) : new Date();

    if (quantidadeVendida <= 0) {
      return NextResponse.json(
        { error: 'Quantidade vendida deve ser maior que zero' },
        { status: 400 }
      );
    }

    // Buscar compras disponíveis (FIFO)
    const comprasDisponiveis = getComprasDisponiveisProduto(produtoId);

    if (comprasDisponiveis.length === 0) {
      return NextResponse.json(
        { error: 'Produto sem estoque disponível' },
        { status: 400 }
      );
    }

    const estoqueTotal = comprasDisponiveis.reduce(
      (acc, c) => acc + c.quantidadeDisponivel,
      0
    );

    if (estoqueTotal < quantidadeVendida) {
      return NextResponse.json(
        { error: `Estoque insuficiente. Disponível: ${estoqueTotal}` },
        { status: 400 }
      );
    }

    // Buscar configuração para obter taxas
    const config = await getConfig();

    // TRANSACTION: Deduzir estoque FIFO + Inserir venda + Atualizar estoque total
    const result = db.transaction(() => {
      // Deduzir usando FIFO
      let quantidadeRestante = quantidadeVendida;
      let compraUsada: typeof comprasDisponiveis[0] | null = null;
      let custoTotalVenda = 0;

      for (const compra of comprasDisponiveis) {
        if (quantidadeRestante === 0) break;

        const quantidadeDeduzir = Math.min(
          quantidadeRestante,
          compra.quantidadeDisponivel
        );

        deduzirEstoqueCompra(compra.id, quantidadeDeduzir);

        custoTotalVenda += compra.custoUnitario * quantidadeDeduzir;

        quantidadeRestante -= quantidadeDeduzir;

        // Vincular à primeira compra usada
        if (!compraUsada && quantidadeDeduzir > 0) {
          compraUsada = compra;
        }
      }

      // Validar que uma compra foi usada
      if (!compraUsada) {
        throw new Error('Erro ao processar compras para venda');
      }

      // Calcular taxa e lucro
      const taxaPercent = tipoAnuncio === 'CLASSICO' ? config.taxaClassico : config.taxaPremium;
      const taxaML = calcularTaxaML(precoVenda, taxaPercent);

      const receitaTotal = precoVenda * quantidadeVendida + freteCobrado;
      const lucroLiquido = receitaTotal - custoTotalVenda - taxaML;

      // Criar venda com compraId (vinculada à primeira compra usada)
      const novaVenda = db
        .insert(vendas)
        .values({
          produtoId,
          compraId: compraUsada.id,
          quantidadeVendida,
          precoVenda,
          tipoAnuncio,
          freteCobrado,
          taxaML,
          lucroLiquido,
          data,
        })
        .returning()
        .all();

      // Atualizar estoque total do produto
      db.update(produtos)
        .set({
          quantidade: sql`${produtos.quantidade} - ${quantidadeVendida}`,
          updatedAt: new Date(),
        })
        .where(eq(produtos.id, produtoId))
        .run();

      return novaVenda;
    });

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Erro ao criar venda' },
        { status: 500 }
      );
    }

    return NextResponse.json({ venda: result[0] }, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar venda:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Erro desconhecido';
    
    // Verificar se é erro de validação de dados JSON
    if (errorMessage.includes('JSON') || errorMessage.includes('parse')) {
      return NextResponse.json(
        { error: 'Dados inválidos. Verifique os campos do formulário.' },
        { status: 400 }
      );
    }
    
    // Verificar se é erro de transação
    if (errorMessage.includes('transaction') || errorMessage.includes('constraint')) {
      return NextResponse.json(
        { error: 'Erro ao processar venda. Verifique o estoque e tente novamente.' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Erro ao criar venda. Tente novamente mais tarde.' },
      { status: 500 }
    );
  }
}
