import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/database';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getDb();
    const loteId = parseInt(params.id);
    const body = await request.json();
    const { dataRecebimento, codigoRastreio, fotoEtiqueta, observacoes, statusEntrega } = body;

    // Validacoes
    if (!dataRecebimento) {
      return NextResponse.json(
        { error: 'Data de recebimento e obrigatoria' },
        { status: 400 }
      );
    }

    // Buscar lote
    const lote = db
      .prepare('SELECT * FROM lotes_china WHERE id = ?')
      .get(loteId) as any;

    if (!lote) {
      return NextResponse.json(
        { error: 'Lote nao encontrado' },
        { status: 404 }
      );
    }

    if (!lote.linkComprado) {
      return NextResponse.json(
        { error: 'Precisa registrar compra do link primeiro' },
        { status: 400 }
      );
    }

    if (lote.recebido) {
      return NextResponse.json(
        { error: 'Lote ja foi marcado como recebido' },
        { status: 400 }
      );
    }

    const now = Math.floor(Date.now() / 1000);

    // Atualizar lote
    db.prepare(`
      UPDATE lotes_china 
      SET 
        recebido = 1,
        dataRecebimento = ?,
        codigoRastreio = ?,
        fotoEtiqueta = ?,
        observacoes = ?,
        statusEntrega = ?,
        updatedAt = ?
      WHERE id = ?
    `).run(
      dataRecebimento,
      codigoRastreio || null,
      fotoEtiqueta || null,
      observacoes || null,
      statusEntrega || 'ok',
      now,
      loteId
    );

    // Buscar compra
    const compra = db
      .prepare('SELECT * FROM compras WHERE id = ?')
      .get(lote.compraId) as any;

    // Atualizar estoque SOMENTE se status = ok
    if (statusEntrega === 'ok') {
      // Atualizar quantidadeRecebida e quantidadeDisponivel da compra
      db.prepare(`
        UPDATE compras 
        SET 
          quantidadeRecebida = quantidadeRecebida + ?,
          quantidadeDisponivel = quantidadeDisponivel + ?
        WHERE id = ?
      `).run(lote.quantidade, lote.quantidade, lote.compraId);

      // Atualizar estoque do produto
      db.prepare(`
        UPDATE produtos_prod 
        SET quantidade = quantidade + ? 
        WHERE id = ?
      `).run(lote.quantidade, compra.produtoId);

      console.log(`Recebimento OK: +${lote.quantidade} unidades no estoque`);
    } else {
      console.log(`Recebimento com status: ${statusEntrega} - estoque NAO atualizado`);
    }

    const loteAtualizado = db
      .prepare('SELECT * FROM lotes_china WHERE id = ?')
      .get(loteId);

    return NextResponse.json({ lote: loteAtualizado }, { status: 200 });

  } catch (error: any) {
    console.error('Erro ao registrar recebimento:', error);
    return NextResponse.json(
      { error: 'Erro ao registrar recebimento' },
      { status: 500 }
    );
  }
}

