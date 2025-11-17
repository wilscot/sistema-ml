import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/db';
import { eq, inArray } from 'drizzle-orm';

const { produtos, vendas, cenarios, compras } = schema;

/**
 * DELETE /api/produtos/batch-delete
 * Deleta múltiplos produtos permanentemente (hard delete)
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

    let deletados = 0;
    const erros: string[] = [];
    const produtosComVendas: number[] = [];

    try {
      const result = db.transaction(() => {
        const deletadosLocal: number[] = [];

        for (const id of ids) {
          try {
            // Verificar se produto existe
            const produto = db
              .select()
              .from(produtos)
              .where(eq(produtos.id, id))
              .limit(1)
              .all();

            if (produto.length === 0) {
              erros.push(`Produto ${id}: não encontrado`);
              continue;
            }

            // Verificar se produto tem vendas associadas
            const vendasProduto = db
              .select()
              .from(vendas)
              .where(eq(vendas.produtoId, id))
              .limit(1)
              .all();

            if (vendasProduto.length > 0) {
              produtosComVendas.push(id);
              const produtoNome = produto[0]?.nome || `ID ${id}`;
              erros.push(`Produto "${produtoNome}" (ID ${id}): possui ${vendasProduto.length} venda(s) registrada(s)`);
              continue;
            }

            // Verificar se produto tem compras associadas
            try {
              const comprasProduto = db
                .select()
                .from(compras)
                .where(eq(compras.produtoId, id))
                .limit(1)
                .all();

              if (comprasProduto.length > 0) {
                const produtoNome = produto[0]?.nome || `ID ${id}`;
                erros.push(`Produto "${produtoNome}" (ID ${id}): possui ${comprasProduto.length} compra(s) registrada(s)`);
                continue;
              }
            } catch (compraError: any) {
              // Se a tabela compras não existir, ignorar este erro
              if (!compraError.message?.includes('no such table')) {
                const produtoNome = produto[0]?.nome || `ID ${id}`;
                erros.push(`Produto "${produtoNome}" (ID ${id}): erro ao verificar compras - ${compraError.message}`);
              }
            }

            // Deletar cenários primeiro
            db.delete(cenarios)
              .where(eq(cenarios.produtoId, id))
              .run();

            // Deletar produto permanentemente
            db.delete(produtos).where(eq(produtos.id, id)).run();
            deletadosLocal.push(id);
          } catch (error: any) {
            const errorMsg = error.message || 'Erro desconhecido';
            erros.push(`Produto ${id}: ${errorMsg}`);
          }
        }

        return deletadosLocal;
      });

      deletados = result.length;
    } catch (error: any) {
      console.error('Erro na transação:', error);
      return NextResponse.json(
        {
          error: 'Erro ao processar exclusão em massa',
          details: error.message || 'Erro desconhecido',
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        deletados,
        erros: erros.length > 0 ? erros : undefined,
        produtosComVendas: produtosComVendas.length > 0 ? produtosComVendas : undefined,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erro ao deletar produtos em massa:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Erro desconhecido';

    return NextResponse.json(
      {
        error: 'Erro ao deletar produtos em massa',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

