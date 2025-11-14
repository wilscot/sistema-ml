import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/db';
import { getProdutoById } from '@/lib/db-client';
import { eq, sql } from 'drizzle-orm';
import type { NovaVenda } from '@/db/schema';

const { vendas, produtos } = schema;

interface VendaImportada {
  numeroVenda: string;
  data: string | Date;
  unidades: number;
  receita: number;
  taxaVenda: number;
  taxaEnvio: number;
  total: number;
  tituloAnuncio: string;
  tipoAnuncio: 'CLASSICO' | 'PREMIUM';
  produtoId: number;
  freteCobrado?: number;
  estado?: string;
  canalVenda?: string;
  variacao?: string;
  precoUnitario?: number;
  receitaEnvio?: number;
  descricaoStatus?: string;
  numeroAnuncio?: string;
  sku?: string;
  nomeComprador?: string;
  cpfComprador?: string;
  enderecoCompleto?: string;
  cidade?: string;
  estadoComprador?: string;
  cep?: string;
  pais?: string;
  formaEntrega?: string;
  dataCaminho?: string;
  dataEntrega?: string;
  motorista?: string;
  numeroRastreamento?: string;
  urlRastreamento?: string;
  dadosPessoaisEmpresa?: string;
  tipoDocumento?: string;
  enderecoDados?: string;
  tipoContribuinte?: string;
  inscricaoEstadual?: string;
}

/**
 * POST /api/vendas/importar
 * Importa múltiplas vendas do Excel do Mercado Livre
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const vendasImportadas: VendaImportada[] = body.vendas || [];

    console.log('=== API IMPORTAR VENDAS ===');
    console.log('Total de vendas recebidas:', vendasImportadas.length);

    if (!Array.isArray(vendasImportadas) || vendasImportadas.length === 0) {
      return NextResponse.json(
        { error: 'Array de vendas é obrigatório' },
        { status: 400 }
      );
    }

    const erros: string[] = [];
    const produtosNaoEncontrados: string[] = [];
    const vendasParaImportar: NovaVenda[] = [];
    const vendasDuplicadas: string[] = [];

    for (const vendaML of vendasImportadas) {
      console.log(`Processando venda ${vendaML.numeroVenda}:`, {
        produtoId: vendaML.produtoId,
        unidades: vendaML.unidades,
        receita: vendaML.receita
      });
      if (!vendaML.produtoId) {
        produtosNaoEncontrados.push(vendaML.tituloAnuncio);
        continue;
      }

      const produto = await getProdutoById(vendaML.produtoId);
      if (!produto) {
        produtosNaoEncontrados.push(vendaML.tituloAnuncio);
        continue;
      }

      if (produto.tipo !== 'PROD') {
        erros.push(
          `Venda ${vendaML.numeroVenda}: Produto deve ser tipo PROD`
        );
        continue;
      }

      if (produto.deletedAt) {
        erros.push(
          `Venda ${vendaML.numeroVenda}: Produto está deletado`
        );
        continue;
      }

      const estoqueAtual = produto.quantidade || 0;
      console.log(`Venda ${vendaML.numeroVenda} - Estoque: ${estoqueAtual}, Unidades: ${vendaML.unidades}`);
      if (vendaML.unidades > estoqueAtual) {
        const erroMsg = `Venda ${vendaML.numeroVenda}: Estoque insuficiente (Disponível: ${estoqueAtual}, Solicitado: ${vendaML.unidades})`;
        console.warn(erroMsg);
        erros.push(erroMsg);
        continue;
      }

      const dataVenda = new Date(vendaML.data);
      if (isNaN(dataVenda.getTime())) {
        erros.push(`Venda ${vendaML.numeroVenda}: Data inválida`);
        continue;
      }

      const freteCobrado = vendaML.receitaEnvio || 0;
      const taxaML = vendaML.taxaVenda;
      const lucroLiquido = vendaML.total;

      const novaVenda: any = {
        produtoId: vendaML.produtoId,
        quantidadeVendida: vendaML.unidades,
        precoVenda: vendaML.receita,
        tipoAnuncio: vendaML.tipoAnuncio,
        freteCobrado,
        taxaML,
        lucroLiquido,
        data: dataVenda,
        createdAt: new Date(),
        
        // Campos detalhados do Mercado Livre
        numeroVenda: vendaML.numeroVenda,
        estado: vendaML.estado,
        descricaoStatus: vendaML.descricaoStatus,
        precoUnitario: vendaML.precoUnitario,
        variacao: vendaML.variacao,
        numeroAnuncio: vendaML.numeroAnuncio,
        canalVenda: vendaML.canalVenda,
        sku: vendaML.sku,
        
        // Cliente
        nomeComprador: vendaML.nomeComprador,
        cpfComprador: vendaML.cpfComprador,
        enderecoComprador: vendaML.enderecoCompleto,
        cidadeComprador: vendaML.cidade,
        estadoComprador: vendaML.estadoComprador,
        cepComprador: vendaML.cep,
        paisComprador: vendaML.pais,
        
        // Envio
        formaEntrega: vendaML.formaEntrega,
        dataCaminho: vendaML.dataCaminho,
        dataEntrega: vendaML.dataEntrega,
        motorista: vendaML.motorista,
        numeroRastreamento: vendaML.numeroRastreamento,
        urlRastreamento: vendaML.urlRastreamento,
        
        // Faturamento
        dadosPessoaisEmpresa: vendaML.dadosPessoaisEmpresa,
        tipoDocumento: vendaML.tipoDocumento,
        enderecoDados: vendaML.enderecoDados,
        tipoContribuinte: vendaML.tipoContribuinte,
        inscricaoEstadual: vendaML.inscricaoEstadual,
        
        // Dados financeiros detalhados
        receita: vendaML.receita,
        receitaEnvio: vendaML.receitaEnvio,
        taxaEnvio: vendaML.taxaEnvio,
      };

      vendasParaImportar.push(novaVenda);
    }

    if (vendasParaImportar.length === 0) {
      return NextResponse.json(
        {
          error: 'Nenhuma venda válida para importar',
          erros: erros,
          produtosNaoEncontrados,
        },
        { status: 400 }
      );
    }

    let importadas = 0;
    const errosImportacao: string[] = [];

    console.log(`Iniciando transação para importar ${vendasParaImportar.length} vendas...`);

    try {
      const result = db.transaction(() => {
        const vendasInseridas: any[] = [];

        for (let idx = 0; idx < vendasParaImportar.length; idx++) {
          const novaVenda = vendasParaImportar[idx];
          try {
            console.log(`[${idx + 1}/${vendasParaImportar.length}] Inserindo venda ${novaVenda.numeroVenda || 'sem número'}...`);
            
            const vendaInserida = db
              .insert(vendas)
              .values(novaVenda)
              .returning()
              .all();

            if (vendaInserida.length > 0) {
              console.log(`Venda inserida com ID: ${vendaInserida[0].id}`);
              
              // Atualizar estoque
              const produtoAtual = db
                .select()
                .from(produtos)
                .where(eq(produtos.id, novaVenda.produtoId))
                .limit(1)
                .all();

              if (produtoAtual.length > 0) {
                const estoqueAnterior = produtoAtual[0].quantidade || 0;
                const novoEstoque = estoqueAnterior - novaVenda.quantidadeVendida;
                console.log(`Atualizando estoque do produto ${novaVenda.produtoId}: ${estoqueAnterior} -> ${novoEstoque}`);
                
                db.update(produtos)
                  .set({
                    quantidade: sql`${produtos.quantidade} - ${novaVenda.quantidadeVendida}`,
                    updatedAt: new Date(),
                  })
                  .where(eq(produtos.id, novaVenda.produtoId))
                  .run();
              } else {
                console.warn(`Produto ${novaVenda.produtoId} não encontrado para atualizar estoque`);
              }

              vendasInseridas.push(vendaInserida[0]);
              importadas++;
              console.log(`✓ Venda ${idx + 1} importada com sucesso`);
            } else {
              console.warn(`Venda ${idx + 1} não foi inserida (retornou vazio)`);
            }
          } catch (error: any) {
            const errorMsg = error.message || 'Erro desconhecido';
            console.error(`Erro ao importar venda ${idx + 1}:`, errorMsg);
            if (errorMsg.includes('UNIQUE') || errorMsg.includes('duplicate')) {
              vendasDuplicadas.push(novaVenda.produtoId?.toString() || '');
            } else {
              errosImportacao.push(
                `Venda ${novaVenda.numeroVenda || idx + 1}: ${errorMsg}`
              );
            }
          }
        }

        console.log(`Transação concluída. ${importadas} vendas importadas, ${errosImportacao.length} erros`);
        return vendasInseridas;
      });

      return NextResponse.json(
        {
          importadas,
          total: vendasImportadas.length,
          erros: [...erros, ...errosImportacao],
          produtosNaoEncontrados: produtosNaoEncontrados.filter(
            (v, i, a) => a.indexOf(v) === i
          ),
          vendasDuplicadas: vendasDuplicadas.filter(
            (v, i, a) => a.indexOf(v) === i
          ),
        },
        { status: 200 }
      );
    } catch (error) {
      console.error('Erro na transação de importação:', error);
      return NextResponse.json(
        {
          error: 'Erro ao processar importação',
          importadas,
          erros: [
            ...erros,
            error instanceof Error ? error.message : 'Erro desconhecido',
          ],
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Erro ao importar vendas:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Erro desconhecido';

    if (errorMessage.includes('JSON') || errorMessage.includes('parse')) {
      return NextResponse.json(
        { error: 'Dados inválidos. Verifique o formato do arquivo.' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Erro ao importar vendas. Tente novamente mais tarde.' },
      { status: 500 }
    );
  }
}

