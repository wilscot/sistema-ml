import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/database';

export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const compraId = searchParams.get('compraId');

    if (!compraId) {
      return NextResponse.json(
        { error: 'compraId e obrigatorio' },
        { status: 400 }
      );
    }

    const lotes = db
      .prepare('SELECT * FROM lotes_china WHERE compraId = ? ORDER BY numeroLote ASC')
      .all(parseInt(compraId)) as any[];

    return NextResponse.json({ lotes }, { status: 200 });
  } catch (error: any) {
    console.error('Erro ao buscar lotes:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar lotes' },
      { status: 500 }
    );
  }
}

