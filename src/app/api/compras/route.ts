import { NextRequest, NextResponse } from 'next/server';
import { getDb, getDbInstance, saveDb } from '@/db/index';
import { validarCompra } from '@/lib/validators';
import { calcularCustoUnitario } from '@/lib/calculators';
import type { Compra, CompraInput } from '@/types/compra';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const produtoIdParam = searchParams.get('produtoId');

    getDb();
    const db = getDbInstance();

    let compras: Compra[] = [];

    if (produtoIdParam) {
      const produtoId = parseInt(produtoIdParam, 10);
      if (isNaN(produtoId) || produtoId <= 0) {
        return NextResponse.json(
          { error: 'produtoId deve ser um número válido maior que zero' },
          { status: 400 }
        );
      }

      compras = db
        .prepare(
          `SELECT * FROM compras 
           WHERE deletedAt IS NULL AND produtoId = ? 
           ORDER BY dataCompra DESC`
        )
        .all(produtoId) as Compra[];
    } else {
      compras = db
        .prepare('SELECT * FROM compras WHERE deletedAt IS NULL ORDER BY dataCompra DESC')
        .all() as Compra[];
    }

    return NextResponse.json({ compras });
  } catch (error) {
    console.error('Erro ao buscar compras:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar compras' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = body as CompraInput;

    // Validar dados
    const validation = validarCompra(data);
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Dados inválidos', errors: validation.errors },
        { status: 400 }
      );
    }

    getDb();
    const db = getDbInstance();

    // Verificar se produto existe
    const produto = db
      .prepare('SELECT id FROM produtos_prod WHERE id = ? AND deletedAt IS NULL')
      .get(data.produtoId!);

    if (!produto) {
      return NextResponse.json(
        { error: 'Produto não encontrado' },
        { status: 404 }
      );
    }

    // Calcular custo unitário
    const custoUnitario = calcularCustoUnitario(
      data.precoUSD!,
      data.cotacao!,
      data.freteTotal!,
      data.quantidadeComprada!
    );

    // Converter dataCompra para timestamp
    let dataCompraTimestamp: number;
    if (typeof data.dataCompra === 'string') {
      dataCompraTimestamp = Math.floor(new Date(data.dataCompra).getTime() / 1000);
    } else if (typeof data.dataCompra === 'number') {
      dataCompraTimestamp = data.dataCompra;
    } else if (data.dataCompra && typeof data.dataCompra === 'object' && 'getTime' in data.dataCompra) {
      dataCompraTimestamp = Math.floor((data.dataCompra as Date).getTime() / 1000);
    } else {
      dataCompraTimestamp = data.dataCompra!;
    }

    const now = Math.floor(Date.now() / 1000);
    const quantidadeComprada = data.quantidadeComprada!;

    // Gerar número da compra (C-YYYY-XXX)
    const ano = new Date().getFullYear();
    const ultimaCompra = db
      .prepare("SELECT numeroCompra FROM compras WHERE numeroCompra LIKE ? ORDER BY id DESC LIMIT 1")
      .get(`C-${ano}-%`) as any;
    
    let proximoNumero = 1;
    if (ultimaCompra?.numeroCompra) {
      const partes = ultimaCompra.numeroCompra.split('-');
      proximoNumero = parseInt(partes[2]) + 1;
    }
    const numeroCompra = `C-${ano}-${String(proximoNumero).padStart(3, '0')}`;

    // Inserir compra
    // quantidadeDisponivel e quantidadeRecebida começam em 0
    // Estoque só aumenta quando registrar entregas
    const insertResult = db
      .prepare(
        `INSERT INTO compras (
          produtoId, precoUSD, cotacao, freteTotal, quantidadeComprada, 
          quantidadeDisponivel, quantidadeRecebida, moeda, fornecedor, observacoes, 
          custoUnitario, dataCompra, numeroCompra, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        data.produtoId!,
        data.precoUSD!,
        data.cotacao!,
        data.freteTotal!,
        quantidadeComprada,
        0, // quantidadeDisponivel começa em 0 (aumenta nas entregas)
        0, // quantidadeRecebida começa em 0
        data.moeda || 'USD',
        data.fornecedor || null,
        data.observacoes || null,
        custoUnitario,
        dataCompraTimestamp,
        numeroCompra,
        now,
        now
      );

    // Buscar compra criada
    const compra = db
      .prepare('SELECT * FROM compras WHERE id = ?')
      .get(insertResult.lastInsertRowid) as Compra;

    if (!compra) {
      return NextResponse.json(
        { error: 'Erro ao criar compra' },
        { status: 500 }
      );
    }

    // NÃO incrementar estoque do produto aqui
    // Estoque só aumenta quando registrar entregas via POST /api/entregas

    saveDb();

    return NextResponse.json({ compra }, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar compra:', error);
    return NextResponse.json(
      { error: 'Erro ao criar compra' },
      { status: 500 }
    );
  }
}
