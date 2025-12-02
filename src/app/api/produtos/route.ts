import { NextRequest, NextResponse } from 'next/server';
import { getDb, getDbInstance, saveDb } from '@/db/index';
import {
  validarProdutoLab,
  validarProdutoProd,
} from '@/lib/validators';
import type { ProdutoLab, ProdutoProd, ProdutoLabInput, ProdutoProdInput } from '@/types/produto';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const modo = searchParams.get('modo');
    const deletados = searchParams.get('deletados');

    if (!modo || (modo !== 'LAB' && modo !== 'PROD')) {
      return NextResponse.json(
        { error: "Query param 'modo' é obrigatório e deve ser 'LAB' ou 'PROD'" },
        { status: 400 }
      );
    }

    getDb();
    const db = getDbInstance();

    let produtos: (ProdutoLab | ProdutoProd)[] = [];

    // Se deletados=true, buscar produtos deletados; caso contrário, buscar não deletados
    const whereClause =
      deletados === 'true'
        ? 'WHERE deletedAt IS NOT NULL'
        : 'WHERE deletedAt IS NULL';

    if (modo === 'LAB') {
      produtos = db
        .prepare(
          `SELECT * FROM produtos_lab 
           ${whereClause} 
           ORDER BY deletedAt DESC, createdAt DESC`
        )
        .all() as ProdutoLab[];
    } else {
      produtos = db
        .prepare(
          `SELECT * FROM produtos_prod 
           ${whereClause} 
           ORDER BY deletedAt DESC, createdAt DESC`
        )
        .all() as ProdutoProd[];
    }

    return NextResponse.json({ produtos });
  } catch (error) {
    console.error('Erro ao buscar produtos:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar produtos' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { modo, ...data } = body;

    if (!modo || (modo !== 'LAB' && modo !== 'PROD')) {
      return NextResponse.json(
        { error: "Campo 'modo' é obrigatório e deve ser 'LAB' ou 'PROD'" },
        { status: 400 }
      );
    }

    // Validar dados
    let validation;
    if (modo === 'LAB') {
      validation = validarProdutoLab(data as ProdutoLabInput);
    } else {
      validation = validarProdutoProd(data as ProdutoProdInput);
    }

    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Dados inválidos', errors: validation.errors },
        { status: 400 }
      );
    }

    getDb();
    const db = getDbInstance();
    const now = Math.floor(Date.now() / 1000);

    if (modo === 'LAB') {
      const produtoData = data as ProdutoLabInput;
      const stmt = db.prepare(
        `INSERT INTO produtos_lab (nome, precoUSD, cotacao, freteTotal, fornecedor, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      );
      const result = stmt.run(
        produtoData.nome,
        produtoData.precoUSD,
        produtoData.cotacao,
        produtoData.freteTotal,
        produtoData.fornecedor || null,
        now,
        now
      );

      const produto = db
        .prepare(`SELECT * FROM produtos_lab WHERE id = ?`)
        .get(result.lastInsertRowid) as ProdutoLab;

      if (!produto) {
        return NextResponse.json(
          { error: 'Erro ao criar produto' },
          { status: 500 }
        );
      }

      saveDb();

      return NextResponse.json({ produto }, { status: 201 });
    } else {
      const produtoData = data as ProdutoProdInput;
      const stmt = db.prepare(
        `INSERT INTO produtos_prod (nome, fornecedor, quantidade, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?)`
      );
      const result = stmt.run(
        produtoData.nome,
        produtoData.fornecedor || null,
        produtoData.quantidade || 0,
        now,
        now
      );

      const produto = db
        .prepare(`SELECT * FROM produtos_prod WHERE id = ?`)
        .get(result.lastInsertRowid) as ProdutoProd;

      if (!produto) {
        return NextResponse.json(
          { error: 'Erro ao criar produto' },
          { status: 500 }
        );
      }

      saveDb();

      return NextResponse.json({ produto }, { status: 201 });
    }
  } catch (error) {
    console.error('Erro ao criar produto:', error);
    return NextResponse.json(
      { error: 'Erro ao criar produto' },
      { status: 500 }
    );
  }
}
