import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/database';

/**
 * POST /api/vendas/[id]/restaurar
 * Restaura uma venda deletada e remove estoque do produto
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

    // Buscar venda deletada
    const venda = db
      .prepare('SELECT * FROM vendas WHERE id = ? AND deletedAt IS NOT NULL')
      .get(id) as any;

    if (!venda) {
      return NextResponse.json(
        { error: 'Venda não encontrada na lixeira' },
        { status: 404 }
      );
    }

    // Verificar se tem estoque suficiente
    const produto = db
      .prepare('SELECT * FROM produtos_prod WHERE id = ?')
      .get(venda.produtoId) as any;

    if (!produto || produto.quantidade < venda.quantidadeVendida) {
      return NextResponse.json(
        { error: `Estoque insuficiente para restaurar venda. Disponivel: ${produto?.quantidade || 0}, Necessario: ${venda.quantidadeVendida}` },
        { status: 400 }
      );
    }

    // Remover estoque do produto
    db.prepare(`
      UPDATE produtos_prod 
      SET quantidade = quantidade - ? 
      WHERE id = ?
    `).run(venda.quantidadeVendida, venda.produtoId);

    console.log(`Removido ${venda.quantidadeVendida} unidades do produto ${venda.produtoId}`);

    // Restaurar venda
    db.prepare('UPDATE vendas SET deletedAt = NULL WHERE id = ?').run(id);

    // Buscar venda restaurada
    const vendaRestaurada = db
      .prepare('SELECT * FROM vendas WHERE id = ?')
      .get(id) as any;

    return NextResponse.json(
      {
        success: true,
        message: 'Venda restaurada e estoque atualizado',
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

