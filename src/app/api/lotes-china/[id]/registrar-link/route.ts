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
    const { quantidade, valorTotal, dataCompra, ordemAliexpress } = body;

    // Validacoes
    if (!quantidade || !valorTotal || !dataCompra) {
      return NextResponse.json(
        { error: 'Campos obrigatorios: quantidade, valorTotal, dataCompra' },
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

    if (lote.linkComprado) {
      return NextResponse.json(
        { error: 'Link ja foi registrado para este lote' },
        { status: 400 }
      );
    }

    const now = Math.floor(Date.now() / 1000);
    const custoUnitarioLink = valorTotal / quantidade;

    // Atualizar lote
    db.prepare(`
      UPDATE lotes_china 
      SET 
        quantidade = ?,
        linkComprado = 1,
        dataCompraLink = ?,
        valorLink = ?,
        custoUnitarioLink = ?,
        ordemAliexpress = ?,
        updatedAt = ?
      WHERE id = ?
    `).run(
      quantidade,
      dataCompra,
      valorTotal,
      custoUnitarioLink,
      ordemAliexpress || null,
      now,
      loteId
    );

    // Buscar compra
    const compra = db
      .prepare('SELECT * FROM compras WHERE id = ?')
      .get(lote.compraId) as any;

    // Recalcular frete real (soma de todos os lotes pagos)
    const freteRealResult = db
      .prepare(`
        SELECT COALESCE(SUM(valorLink), 0) as total
        FROM lotes_china
        WHERE compraId = ? AND linkComprado = 1
      `)
      .get(lote.compraId) as any;

    const freteReal = freteRealResult.total;

    // IMPORTANTE: Custo unitario usa FRETE ESTIMADO, nao frete real
    // Isso garante que o custo seja consistente desde o inicio
    const paypalTotal = compra.precoUSD * compra.cotacao * compra.quantidadeComprada;
    const custoTotal = paypalTotal + compra.freteEstimado; // USA ESTIMADO
    const custoUnitario = custoTotal / compra.quantidadeComprada;

    // Atualizar compra (custoUnitario baseado em frete estimado)
    db.prepare(`
      UPDATE compras 
      SET 
        freteReal = ?,
        custoUnitario = ?,
        custoUnitarioLink = ?
      WHERE id = ?
    `).run(freteReal, custoUnitario, custoUnitarioLink, lote.compraId);

    console.log(`Link registrado: Lote ${lote.numeroLote} - R$ ${valorTotal}`);
    console.log(`Frete real atualizado: R$ ${freteReal}`);
    console.log(`Frete estimado (base calculo): R$ ${compra.freteEstimado}`);
    console.log(`Custo unitario: R$ ${custoUnitario.toFixed(2)}`);

    const loteAtualizado = db
      .prepare('SELECT * FROM lotes_china WHERE id = ?')
      .get(loteId);

    return NextResponse.json({ lote: loteAtualizado }, { status: 200 });

  } catch (error: any) {
    console.error('Erro ao registrar link:', error);
    return NextResponse.json(
      { error: 'Erro ao registrar link' },
      { status: 500 }
    );
  }
}

