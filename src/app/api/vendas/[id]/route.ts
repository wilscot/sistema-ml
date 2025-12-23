import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/database';

/**
 * DELETE /api/vendas/[id]
 * Deleta uma venda (soft delete) e devolve estoque ao produto
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

    // Buscar a venda antes de deletar
    const venda = db
      .prepare('SELECT * FROM vendas WHERE id = ? AND deletedAt IS NULL')
      .get(id) as any;

    if (!venda) {
      return NextResponse.json(
        { error: 'Venda não encontrada ou já deletada' },
        { status: 404 }
      );
    }

    // Devolver estoque ao produto
    db.prepare(`
      UPDATE produtos_prod 
      SET quantidade = quantidade + ? 
      WHERE id = ?
    `).run(venda.quantidadeVendida, venda.produtoId);

    console.log(`Devolvido ${venda.quantidadeVendida} unidades ao produto ${venda.produtoId}`);

    // Soft delete: atualizar deletedAt
    const now = Math.floor(Date.now() / 1000);
    db.prepare('UPDATE vendas SET deletedAt = ? WHERE id = ?').run(now, id);

    return NextResponse.json(
      { 
        success: true,
        message: 'Venda deletada e estoque devolvido'
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

