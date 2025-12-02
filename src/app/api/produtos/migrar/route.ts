import { NextRequest, NextResponse } from 'next/server';
import { getDb, getDbInstance, saveDb } from '@/db/index';
import type { ProdutoProd } from '@/types/produto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { produtoLabId } = body;

    if (!produtoLabId || typeof produtoLabId !== 'number' || produtoLabId <= 0) {
      return NextResponse.json(
        { error: 'produtoLabId é obrigatório e deve ser um número válido' },
        { status: 400 }
      );
    }

    getDb();
    const db = getDbInstance();

    // Buscar produto LAB
    const produtoLab = db
      .prepare('SELECT * FROM produtos_lab WHERE id = ? AND deletedAt IS NULL')
      .get(produtoLabId) as any;

    if (!produtoLab) {
      return NextResponse.json(
        { error: 'Produto LAB não encontrado' },
        { status: 404 }
      );
    }

    // Criar produto PROD copiando dados
    const now = Math.floor(Date.now() / 1000);
    const insertResult = db
      .prepare(
        `INSERT INTO produtos_prod (nome, fornecedor, quantidade, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(
        produtoLab.nome,
        produtoLab.fornecedor || null,
        0, // Quantidade inicial sempre 0
        now,
        now
      );

    // Buscar produto PROD criado
    const produtoProd = db
      .prepare('SELECT * FROM produtos_prod WHERE id = ?')
      .get(insertResult.lastInsertRowid) as ProdutoProd;

    if (!produtoProd) {
      return NextResponse.json(
        { error: 'Erro ao criar produto PROD' },
        { status: 500 }
      );
    }

    saveDb();

    return NextResponse.json({ produtoProd }, { status: 201 });
  } catch (error) {
    console.error('Erro ao migrar produto:', error);
    return NextResponse.json(
      { error: 'Erro ao migrar produto' },
      { status: 500 }
    );
  }
}

