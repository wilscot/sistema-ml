import { NextRequest, NextResponse } from 'next/server';
import { getVendaById } from '@/lib/db-client';

/**
 * GET /api/vendas/[id]
 * Retorna venda por ID com produto associado
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);

    if (isNaN(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const venda = await getVendaById(id);

    if (!venda) {
      return NextResponse.json(
        { error: 'Venda não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({ venda }, { status: 200 });
  } catch (error) {
    console.error('Erro ao buscar venda:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar venda' },
      { status: 500 }
    );
  }
}

