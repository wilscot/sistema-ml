import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/database';

/**
 * DELETE /api/vendas/[id]
 * Deleta uma venda (soft delete)
 * 
 * NOTA: Vendas deletadas NÃO restauram estoque automaticamente.
 * Use com cuidado!
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

    // Verificar se venda existe e não está deletada
    const vendaExistente = db
      .prepare('SELECT * FROM vendas WHERE id = ? AND deletedAt IS NULL')
      .get(id) as any;

    if (!vendaExistente) {
      return NextResponse.json(
        { error: 'Venda não encontrada ou já deletada' },
        { status: 404 }
      );
    }

    // Soft delete: atualizar deletedAt
    const now = Math.floor(Date.now() / 1000);
    db.prepare('UPDATE vendas SET deletedAt = ? WHERE id = ?').run(now, id);

    return NextResponse.json(
      { 
        success: true,
        message: 'Venda deletada com sucesso',
        warning: 'Estoque não foi restaurado automaticamente'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erro ao deletar venda:', error);
    return NextResponse.json(
      { error: 'Erro ao deletar venda' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/vendas/[id]
 * Busca uma venda específica por ID
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

    const venda = db
      .prepare('SELECT * FROM vendas WHERE id = ?')
      .get(id) as any;

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

