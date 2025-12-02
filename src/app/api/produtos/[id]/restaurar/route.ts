import { NextRequest, NextResponse } from 'next/server';
import { getDb, getDbInstance } from '@/db/index';
import type { ProdutoLab, ProdutoProd } from '@/types/produto';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const searchParams = request.nextUrl.searchParams;
    const modo = searchParams.get('modo');

    if (isNaN(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    if (!modo || (modo !== 'LAB' && modo !== 'PROD')) {
      return NextResponse.json(
        { error: "Query param 'modo' é obrigatório e deve ser 'LAB' ou 'PROD'" },
        { status: 400 }
      );
    }

    getDb();
    const db = getDbInstance();

    if (modo === 'LAB') {
      // Restaurar produto LAB (deletedAt = NULL)
      const produto = db
        .prepare('SELECT * FROM produtos_lab WHERE id = ? AND deletedAt IS NOT NULL')
        .get(id) as ProdutoLab | null;

      if (!produto) {
        return NextResponse.json(
          { error: 'Produto deletado não encontrado' },
          { status: 404 }
        );
      }

      db.prepare('UPDATE produtos_lab SET deletedAt = NULL WHERE id = ?').run(id);

      return NextResponse.json({ success: true });
    } else {
      // PROD deletado → mover para LAB (INSERT em produtos_lab, mantém deletedAt em PROD)
      const produto = db
        .prepare('SELECT * FROM produtos_prod WHERE id = ? AND deletedAt IS NOT NULL')
        .get(id) as ProdutoProd | null;

      if (!produto) {
        return NextResponse.json(
          { error: 'Produto deletado não encontrado' },
          { status: 404 }
        );
      }

      // Inserir em produtos_lab (copiar dados básicos)
      // PROD não tem precoUSD, cotacao, freteTotal, então usamos valores padrão
      const now = Math.floor(Date.now() / 1000);
      db.prepare(
        `INSERT INTO produtos_lab (nome, fornecedor, precoUSD, cotacao, freteTotal, createdAt, updatedAt)
         VALUES (?, ?, 0, 1, 0, ?, ?)`
      ).run(produto.nome, produto.fornecedor || null, now, now);

      // Manter deletedAt em produtos_prod (não restaurar em PROD)
      return NextResponse.json({ success: true });
    }
  } catch (error: any) {
    console.error('Erro ao restaurar produto:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao restaurar produto' },
      { status: 500 }
    );
  }
}

