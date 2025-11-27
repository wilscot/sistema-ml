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

    if (!modo || (modo !== 'LAB' && modo !== 'PROD')) {
      return NextResponse.json(
        { error: "Query param 'modo' é obrigatório e deve ser 'LAB' ou 'PROD'" },
        { status: 400 }
      );
    }

    await getDb();
    const db = getDbInstance();

    let produtos: (ProdutoLab | ProdutoProd)[] = [];

    if (modo === 'LAB') {
      const result = db.exec(
        `SELECT * FROM produtos_lab 
         WHERE deletedAt IS NULL 
         ORDER BY createdAt DESC`
      );

      if (result.length > 0) {
        const columns = result[0].columns;
        const values = result[0].values;

        produtos = values.map((row) => {
          const produto: any = {};
          columns.forEach((col, index) => {
            produto[col] = row[index];
          });
          return produto as ProdutoLab;
        });
      }
    } else {
      const result = db.exec(
        `SELECT * FROM produtos_prod 
         WHERE deletedAt IS NULL 
         ORDER BY createdAt DESC`
      );

      if (result.length > 0) {
        const columns = result[0].columns;
        const values = result[0].values;

        produtos = values.map((row) => {
          const produto: any = {};
          columns.forEach((col, index) => {
            produto[col] = row[index];
          });
          return produto as ProdutoProd;
        });
      }
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

    await getDb();
    const db = getDbInstance();
    const now = Math.floor(Date.now() / 1000);

    if (modo === 'LAB') {
      const produtoData = data as ProdutoLabInput;
      const stmt = db.prepare(
        `INSERT INTO produtos_lab (nome, precoUSD, cotacao, freteTotal, fornecedor, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      );
      stmt.bind([
        produtoData.nome,
        produtoData.precoUSD,
        produtoData.cotacao,
        produtoData.freteTotal,
        produtoData.fornecedor || null,
        now,
        now,
      ]);
      stmt.step();
      stmt.free();

      const result = db.exec(
        `SELECT * FROM produtos_lab WHERE id = last_insert_rowid()`
      );

      if (result.length === 0) {
        return NextResponse.json(
          { error: 'Erro ao criar produto' },
          { status: 500 }
        );
      }

      const columns = result[0].columns;
      const values = result[0].values[0];
      const produto: any = {};
      columns.forEach((col, index) => {
        produto[col] = values[index];
      });

      saveDb();

      return NextResponse.json({ produto: produto as ProdutoLab }, { status: 201 });
    } else {
      const produtoData = data as ProdutoProdInput;
      const stmt = db.prepare(
        `INSERT INTO produtos_prod (nome, fornecedor, quantidade, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?)`
      );
      stmt.bind([
        produtoData.nome,
        produtoData.fornecedor || null,
        produtoData.quantidade || 0,
        now,
        now,
      ]);
      stmt.step();
      stmt.free();

      const result = db.exec(
        `SELECT * FROM produtos_prod WHERE id = last_insert_rowid()`
      );

      if (result.length === 0) {
        return NextResponse.json(
          { error: 'Erro ao criar produto' },
          { status: 500 }
        );
      }

      const columns = result[0].columns;
      const values = result[0].values[0];
      const produto: any = {};
      columns.forEach((col, index) => {
        produto[col] = values[index];
      });

      saveDb();

      return NextResponse.json({ produto: produto as ProdutoProd }, { status: 201 });
    }
  } catch (error) {
    console.error('Erro ao criar produto:', error);
    return NextResponse.json(
      { error: 'Erro ao criar produto' },
      { status: 500 }
    );
  }
}
