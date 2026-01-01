import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/database';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getDb();
    const id = parseInt(params.id);

    const produto = db
      .prepare('SELECT * FROM produtos_prod WHERE id = ? AND deletedAt IS NULL')
      .get(id) as any;

    if (!produto) {
      return NextResponse.json(
        { error: 'Produto não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ produto }, { status: 200 });
  } catch (error: any) {
    console.error('Erro ao buscar produto:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar produto' },
      { status: 500 }
    );
  }
}
