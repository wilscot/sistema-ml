import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/db';
import { eq } from 'drizzle-orm';

const { vendas, produtos } = schema;

/**
 * DELETE /api/vendas/batch-delete
 * Exclui múltiplas vendas e reverte estoque
 * Body: { ids: number[] }
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const ids: number[] = body.ids || [];

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Array de IDs é obrigatório e não pode estar vazio' },
        { status: 400 }
      );
    }

    const estornoEstoque: Array<{ produtoId: number; quantidade: number }> =
      [];
    let deletadas = 0;
    const erros: string[] = [];

    try {
      const result = db.transaction(() => {
        const deletadasLocal: number[] = [];
        const estornoLocal: Map<number, number> = new Map();

        for (const id of ids) {
          try {
            const venda = db
              .select()
              .from(vendas)
              .where(eq(vendas.id, id))
              .limit(1)
              .all();

            if (venda.length === 0) {
              erros.push(`Venda ${id}: não encontrada`);
              continue;
            }

            const vendaData = venda[0];

            if (!vendaData.produtoId) {
              erros.push(`Venda ${id}: produto não encontrado`);
              continue;
            }

            const produto = db
              .select()
              .from(produtos)
              .where(eq(produtos.id, vendaData.produtoId))
              .limit(1)
              .all();

            if (produto.length === 0) {
              erros.push(
                `Venda ${id}: produto ${vendaData.produtoId} foi deletado`
              );
              continue;
            }

            const quantidadeVendida = vendaData.quantidadeVendida || 0;

            if (quantidadeVendida > 0) {
              const quantidadeAtual = estornoLocal.get(vendaData.produtoId) || 0;
              estornoLocal.set(
                vendaData.produtoId,
                quantidadeAtual + quantidadeVendida
              );
            }

            db.delete(vendas).where(eq(vendas.id, id)).run();
            deletadasLocal.push(id);
          } catch (error: any) {
            const errorMsg = error.message || 'Erro desconhecido';
            erros.push(`Venda ${id}: ${errorMsg}`);
          }
        }

        for (const [produtoId, quantidade] of estornoLocal.entries()) {
          const produtoAtual = db
            .select()
            .from(produtos)
            .where(eq(produtos.id, produtoId))
            .limit(1)
            .all();

          if (produtoAtual.length > 0) {
            const quantidadeAtual = produtoAtual[0].quantidade || 0;
            const novaQuantidade = quantidadeAtual + quantidade;

            db.update(produtos)
              .set({
                quantidade: novaQuantidade,
                updatedAt: new Date(),
              })
              .where(eq(produtos.id, produtoId))
              .run();

            estornoEstoque.push({ produtoId, quantidade });
          }
        }

        return deletadasLocal;
      });

      deletadas = result.length;
    } catch (error) {
      console.error('Erro na transação de exclusão em lote:', error);
      return NextResponse.json(
        {
          error: 'Erro ao processar exclusão em lote',
          erros: [
            ...erros,
            error instanceof Error ? error.message : 'Erro desconhecido',
          ],
        },
        { status: 500 }
      );
    }

    if (deletadas === 0) {
      return NextResponse.json(
        {
          error: 'Nenhuma venda foi deletada',
          erros,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        deletadas,
        total: ids.length,
        estornoEstoque,
        erros: erros.length > 0 ? erros : undefined,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erro ao deletar vendas em lote:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Erro desconhecido';

    if (errorMessage.includes('JSON') || errorMessage.includes('parse')) {
      return NextResponse.json(
        { error: 'Dados inválidos. Verifique o formato do arquivo.' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Erro ao deletar vendas em lote. Tente novamente mais tarde.' },
      { status: 500 }
    );
  }
}

