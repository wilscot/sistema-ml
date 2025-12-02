import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/database';

/**
 * POST /api/vendas/[id]/restaurar
 * Restaura uma venda deletada (soft delete)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      );
    }

    const db = getDb();

    // Verificar se venda existe e está deletada
    const vendaExistente = db
      .prepare('SELECT * FROM vendas WHERE id = ? AND deletedAt IS NOT NULL')
      .get(id) as any;

    if (!vendaExistente) {
      return NextResponse.json(
        { error: 'Venda não encontrada ou não está deletada' },
        { status: 404 }
      );
    }

    // Restaurar: atualizar deletedAt para NULL
    db.prepare('UPDATE vendas SET deletedAt = NULL WHERE id = ?').run(id);

    // Buscar venda restaurada
    const vendaRestaurada = db
      .prepare('SELECT * FROM vendas WHERE id = ?')
      .get(id) as any;

    return NextResponse.json(
      {
        success: true,
        message: 'Venda restaurada com sucesso',
        venda: vendaRestaurada,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erro ao restaurar venda:', error);
    return NextResponse.json(
      { error: 'Erro ao restaurar venda' },
      { status: 500 }
    );
  }
}

