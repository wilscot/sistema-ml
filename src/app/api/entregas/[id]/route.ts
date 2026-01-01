import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/database';

// GET - Buscar entrega específica
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getDb();
    const id = parseInt(params.id);

    const entrega = db
      .prepare('SELECT * FROM entregas WHERE id = ? AND deletedAt IS NULL')
      .get(id) as any;

    if (!entrega) {
      return NextResponse.json(
        { error: 'Entrega não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({ entrega }, { status: 200 });
  } catch (error: any) {
    console.error('Erro ao buscar entrega:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar entrega' },
      { status: 500 }
    );
  }
}

// DELETE - Soft delete de entrega
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getDb();
    const id = parseInt(params.id);

    const entrega = db
      .prepare('SELECT * FROM entregas WHERE id = ? AND deletedAt IS NULL')
      .get(id) as any;

    if (!entrega) {
      return NextResponse.json(
        { error: 'Entrega não encontrada' },
        { status: 404 }
      );
    }

    const now = Math.floor(Date.now() / 1000);

    // Soft delete da entrega
    db.prepare('UPDATE entregas SET deletedAt = ? WHERE id = ?').run(now, id);

    // Reverter quantidadeRecebida na compra
    db.prepare(`
      UPDATE compras 
      SET quantidadeRecebida = quantidadeRecebida - ? 
      WHERE id = ?
    `).run(entrega.quantidadeRecebida, entrega.compraId);

    // Reverter quantidadeDisponivel na compra
    db.prepare(`
      UPDATE compras 
      SET quantidadeDisponivel = quantidadeDisponivel - ? 
      WHERE id = ?
    `).run(entrega.quantidadeRecebida, entrega.compraId);

    // Reverter estoque do produto
    const compra = db.prepare('SELECT produtoId FROM compras WHERE id = ?').get(entrega.compraId) as any;
    
    db.prepare(`
      UPDATE produtos_prod 
      SET quantidade = quantidade - ? 
      WHERE id = ?
    `).run(entrega.quantidadeRecebida, compra.produtoId);

    return NextResponse.json({ 
      success: true,
      message: 'Entrega excluída e estoque ajustado'
    });
  } catch (error: any) {
    console.error('Erro ao excluir entrega:', error);
    return NextResponse.json(
      { error: 'Erro ao excluir entrega' },
      { status: 500 }
    );
  }
}

