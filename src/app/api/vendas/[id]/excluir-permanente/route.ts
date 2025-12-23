import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/database';

/**
 * DELETE /api/vendas/[id]/excluir-permanente
 * Exclui uma venda permanentemente do banco de dados
 * ACAO IRREVERSIVEL - Apenas vendas na lixeira podem ser excluidas
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

    // Verificar se venda está deletada (na lixeira)
    const venda = db
      .prepare('SELECT * FROM vendas WHERE id = ? AND deletedAt IS NOT NULL')
      .get(id) as any;

    if (!venda) {
      return NextResponse.json(
        { error: 'Venda não encontrada na lixeira' },
        { status: 404 }
      );
    }

    // Deletar permanentemente
    db.prepare('DELETE FROM vendas WHERE id = ?').run(id);

    console.log(`Venda #${id} excluida permanentemente`);

    return NextResponse.json({ 
      success: true,
      message: 'Venda excluída permanentemente'
    });
  } catch (error: any) {
    console.error('Erro ao excluir venda permanentemente:', error);
    return NextResponse.json(
      { error: 'Erro ao excluir venda' },
      { status: 500 }
    );
  }
}

