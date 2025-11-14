import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/db';
import { not, isNull, desc } from 'drizzle-orm';

const { produtos } = schema;

/**
 * GET /api/produtos/lixeira
 * Retorna produtos deletados (deletedAt NOT NULL)
 */
export async function GET(request: NextRequest) {
  try {
    const result = db
      .select()
      .from(produtos)
      .where(not(isNull(produtos.deletedAt)))
      .orderBy(desc(produtos.deletedAt))
      .all();

    return NextResponse.json({ produtos: result }, { status: 200 });
  } catch (error) {
    console.error('Erro ao buscar produtos da lixeira:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar produtos da lixeira' },
      { status: 500 }
    );
  }
}

