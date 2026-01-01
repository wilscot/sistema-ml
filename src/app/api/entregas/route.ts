import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/database';

// GET - Listar entregas de uma compra
export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const compraId = searchParams.get('compraId');

    if (!compraId) {
      return NextResponse.json(
        { error: 'compraId é obrigatório' },
        { status: 400 }
      );
    }

    const entregas = db
      .prepare(`
        SELECT * FROM entregas 
        WHERE compraId = ? AND deletedAt IS NULL
        ORDER BY dataRecebimento DESC
      `)
      .all(parseInt(compraId)) as any[];

    return NextResponse.json({ entregas }, { status: 200 });
  } catch (error: any) {
    console.error('Erro ao buscar entregas:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar entregas' },
      { status: 500 }
    );
  }
}

// POST - Criar nova entrega
export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const body = await request.json();
    const { compraId, quantidadeRecebida, dataRecebimento, codigoRastreio, fotoEtiqueta, observacoes } = body;

    // Validações
    if (!compraId || !quantidadeRecebida || !dataRecebimento) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: compraId, quantidadeRecebida, dataRecebimento' },
        { status: 400 }
      );
    }

    // Verificar compra existe
    const compra = db
      .prepare('SELECT * FROM compras WHERE id = ?')
      .get(compraId) as any;

    if (!compra) {
      return NextResponse.json(
        { error: 'Compra não encontrada' },
        { status: 404 }
      );
    }

    // Verificar se não ultrapassa quantidade comprada
    const totalRecebido = (compra.quantidadeRecebida || 0) + quantidadeRecebida;
    if (totalRecebido > compra.quantidadeComprada) {
      return NextResponse.json(
        { error: `Quantidade excede o total comprado. Restam ${compra.quantidadeComprada - (compra.quantidadeRecebida || 0)} unidades` },
        { status: 400 }
      );
    }

    const now = Math.floor(Date.now() / 1000);

    // Inserir entrega
    const result = db.prepare(`
      INSERT INTO entregas (compraId, quantidadeRecebida, dataRecebimento, codigoRastreio, fotoEtiqueta, observacoes, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      compraId,
      quantidadeRecebida,
      dataRecebimento,
      codigoRastreio || null,
      fotoEtiqueta || null,
      observacoes || null,
      now
    );

    // Atualizar quantidadeRecebida na compra
    db.prepare(`
      UPDATE compras 
      SET quantidadeRecebida = quantidadeRecebida + ? 
      WHERE id = ?
    `).run(quantidadeRecebida, compraId);

    // Atualizar quantidadeDisponivel na compra
    db.prepare(`
      UPDATE compras 
      SET quantidadeDisponivel = quantidadeDisponivel + ? 
      WHERE id = ?
    `).run(quantidadeRecebida, compraId);

    // Atualizar estoque do produto
    db.prepare(`
      UPDATE produtos_prod 
      SET quantidade = quantidade + ? 
      WHERE id = ?
    `).run(quantidadeRecebida, compra.produtoId);

    const entrega = db
      .prepare('SELECT * FROM entregas WHERE id = ?')
      .get(result.lastInsertRowid) as any;

    return NextResponse.json({ entrega }, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao criar entrega:', error);
    return NextResponse.json(
      { error: 'Erro ao criar entrega' },
      { status: 500 }
    );
  }
}

