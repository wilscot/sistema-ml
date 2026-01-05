import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/database';

export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const body = await request.json();
    const {
      produtoId,
      quantidade,
      paypalUSD,
      paypalBRL,
      valorLinkInicial,
      quantidadePorLote,
      fornecedor,
      dataCompra
    } = body;

    // Validacoes
    if (!produtoId || !quantidade || !paypalUSD || !paypalBRL || !valorLinkInicial) {
      return NextResponse.json(
        { error: 'Campos obrigatorios faltando' },
        { status: 400 }
      );
    }

    // Calculos
    const cotacao = paypalBRL / paypalUSD;
    const precoUSD = paypalUSD / quantidade;
    const numLotes = Math.ceil(quantidade / quantidadePorLote);
    const freteEstimado = numLotes * valorLinkInicial;
    const custoTotal = paypalBRL + freteEstimado;
    const custoUnitario = custoTotal / quantidade;
    const custoUnitarioLink = valorLinkInicial / quantidadePorLote;

    // Gerar numero da compra
    const ano = new Date(dataCompra * 1000).getFullYear();
    const ultimaCompra = db
      .prepare("SELECT COUNT(*) as total FROM compras WHERE strftime('%Y', datetime(dataCompra, 'unixepoch')) = ?")
      .get(ano.toString()) as any;
    const numero = String((ultimaCompra?.total || 0) + 1).padStart(3, '0');
    const numeroCompra = `C-${ano}-${numero}`;

    const now = Math.floor(Date.now() / 1000);

    // Inserir compra
    const result = db.prepare(`
      INSERT INTO compras (
        produtoId, numeroCompra, tipoCompra,
        precoUSD, cotacao, moeda,
        freteTotal, freteEstimado, freteReal, 
        quantidadeComprada, quantidadeRecebida, quantidadeDisponivel,
        custoUnitario, custoUnitarioLink,
        fornecedor, dataCompra, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      produtoId,
      numeroCompra,
      'china',
      precoUSD,
      cotacao,
      'USD',
      freteEstimado, // freteTotal = freteEstimado inicial
      freteEstimado,
      0, // freteReal comeca em 0
      quantidade,
      0, // quantidadeRecebida
      0, // quantidadeDisponivel
      custoUnitario,
      custoUnitarioLink,
      fornecedor || null,
      dataCompra,
      now,
      now
    );

    const compraId = result.lastInsertRowid;

    // Criar lotes vazios
    for (let i = 1; i <= numLotes; i++) {
      // Ultimo lote pode ter quantidade diferente
      const qtdLote = i === numLotes && quantidade % quantidadePorLote !== 0
        ? quantidade % quantidadePorLote
        : quantidadePorLote;

      db.prepare(`
        INSERT INTO lotes_china (
          compraId, numeroLote, quantidade, 
          linkComprado, recebido, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(compraId, i, qtdLote, 0, 0, now, now);
    }

    console.log(`Compra China criada: ${numeroCompra} com ${numLotes} lotes`);

    const compra = db.prepare('SELECT * FROM compras WHERE id = ?').get(compraId);

    return NextResponse.json({ compra }, { status: 201 });

  } catch (error: any) {
    console.error('Erro ao criar compra China:', error);
    return NextResponse.json(
      { error: 'Erro ao criar compra' },
      { status: 500 }
    );
  }
}
