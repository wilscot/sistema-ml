import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/database';

/**
 * DELETE /api/compras/[id]
 * Soft delete de uma compra
 */
export async function DELETE(
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

    // Verificar se compra existe
    const compra = db
      .prepare('SELECT * FROM compras WHERE id = ? AND deletedAt IS NULL')
      .get(id);

    if (!compra) {
      return NextResponse.json(
        { error: 'Compra não encontrada' },
        { status: 404 }
      );
    }

    // Soft delete
    const now = Math.floor(Date.now() / 1000);
    db.prepare('UPDATE compras SET deletedAt = ? WHERE id = ?').run(now, id);

    return NextResponse.json(
      { 
        success: true,
        message: 'Compra excluída com sucesso',
        warning: 'Compra movida para lixeira'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erro ao excluir compra:', error);
    return NextResponse.json(
      { error: 'Erro ao excluir compra' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/compras/[id]
 * Busca uma compra específica
 */
export async function GET(
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

    const compra = db
      .prepare('SELECT * FROM compras WHERE id = ? AND deletedAt IS NULL')
      .get(id);

    if (!compra) {
      return NextResponse.json(
        { error: 'Compra não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({ compra }, { status: 200 });
  } catch (error) {
    console.error('Erro ao buscar compra:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar compra' },
      { status: 500 }
    );
  }
}

