import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/db';
import { eq, inArray, sql } from 'drizzle-orm';

const { compras, vendas, produtos } = schema;

/**
 * DELETE /api/compras/batch-delete
 * Deleta múltiplas compras permanentemente
 * Body: { ids: number[] }
 * 
 * Regras:
 * - Verifica se compra tem vendas associadas (bloqueia se tiver)
 * - Reverte estoque do produto (diminui quantidade)
 * - Deleta compra permanentemente
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

    const deletados: number[] = [];
    const erros: string[] = [];
    const comprasComVendas: number[] = [];

    try {
      const result = db.transaction(() => {
        for (const id of ids) {
          try {
            // Verificar se compra existe
            const compra = db
              .select()
              .from(compras)
              .where(eq(compras.id, id))
              .limit(1)
              .all();

            if (compra.length === 0) {
              erros.push(`Compra ${id}: não encontrada`);
              continue;
            }

            const compraData = compra[0];

            // Verificar se compra tem vendas associadas
            const vendasCompra = db
              .select()
              .from(vendas)
              .where(eq(vendas.compraId, id))
              .limit(1)
              .all();

            if (vendasCompra.length > 0) {
              comprasComVendas.push(id);
              erros.push(`Compra ${id}: possui ${vendasCompra.length} venda(s) registrada(s). Não é possível deletar.`);
              continue;
            }

            // Reverter estoque do produto (diminuir quantidade)
            // A quantidade a reverter é a quantidadeDisponivel (não a quantidadeComprada)
            // pois parte pode já ter sido vendida
            const quantidadeReverter = compraData.quantidadeDisponivel;

            if (quantidadeReverter > 0) {
              db.update(produtos)
                .set({
                  quantidade: sql`${produtos.quantidade} - ${quantidadeReverter}`,
                  updatedAt: new Date(),
                })
                .where(eq(produtos.id, compraData.produtoId))
                .run();
            }

            // Deletar compra permanentemente
            db.delete(compras).where(eq(compras.id, id)).run();
            deletados.push(id);
          } catch (error: any) {
            erros.push(`Compra ${id}: ${error.message || 'Erro desconhecido'}`);
          }
        }

        return { deletados, erros, comprasComVendas };
      });

      return NextResponse.json(
        {
          deletados: result.deletados.length,
          erros: result.erros,
          comprasComVendas: result.comprasComVendas,
        },
        { status: 200 }
      );
    } catch (transactionError: any) {
      console.error('Erro na transação:', transactionError);
      return NextResponse.json(
        {
          error: 'Erro ao processar exclusão de compras',
          details: transactionError.message,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Erro ao deletar compras:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Erro desconhecido';

    return NextResponse.json(
      {
        error: 'Erro ao deletar compras',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

