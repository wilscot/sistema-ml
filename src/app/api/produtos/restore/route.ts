import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/db';
import { getProdutoById } from '@/lib/db-client';
import { eq } from 'drizzle-orm';

const { produtos } = schema;

/**
 * POST /api/produtos/restore
 * Restaura produto deletado
 * LAB → LAB (deletedAt = null)
 * PROD → LAB (deletedAt = null, tipo = 'LAB')
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { produtoId } = body;

    if (!produtoId || typeof produtoId !== 'number') {
      return NextResponse.json(
        { error: 'produtoId é obrigatório e deve ser um número' },
        { status: 400 }
      );
    }

    // Buscar produto
    const produto = await getProdutoById(produtoId);

    if (!produto) {
      return NextResponse.json(
        { error: 'Produto não encontrado' },
        { status: 404 }
      );
    }

    if (!produto.deletedAt) {
      return NextResponse.json(
        { error: 'Produto não está deletado' },
        { status: 400 }
      );
    }

    // Restaurar conforme regra de negócio
    if (produto.tipo === 'LAB') {
      // LAB restaurado = LAB (apenas deletedAt = null)
      const result = db
        .update(produtos)
        .set({
          deletedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(produtos.id, produtoId))
        .returning()
        .all();

      if (result.length === 0) {
        return NextResponse.json(
          { error: 'Erro ao restaurar produto' },
          { status: 500 }
        );
      }

      return NextResponse.json({ produto: result[0] }, { status: 200 });
    } else {
      // PROD restaurado = LAB (deletedAt = null, tipo = 'LAB')
      const result = db
        .update(produtos)
        .set({
          deletedAt: null,
          tipo: 'LAB',
          updatedAt: new Date(),
        })
        .where(eq(produtos.id, produtoId))
        .returning()
        .all();

      if (result.length === 0) {
        return NextResponse.json(
          { error: 'Erro ao restaurar produto' },
          { status: 500 }
        );
      }

      return NextResponse.json({ produto: result[0] }, { status: 200 });
    }
  } catch (error) {
    console.error('Erro ao restaurar produto:', error);
    return NextResponse.json(
      { error: 'Erro ao restaurar produto' },
      { status: 500 }
    );
  }
}

