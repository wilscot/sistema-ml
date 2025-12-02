import { NextRequest, NextResponse } from 'next/server';
import { getDb, getDbInstance, saveDb } from '@/db/index';
import {
  validarProdutoLab,
  validarProdutoProd,
} from '@/lib/validators';
import type {
  ProdutoLab,
  ProdutoProd,
  ProdutoLabInput,
  ProdutoProdInput,
} from '@/types/produto';

export async function GET(
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

    let produto: ProdutoLab | ProdutoProd | null = null;

    if (modo === 'LAB') {
      produto = db
        .prepare('SELECT * FROM produtos_lab WHERE id = ? AND deletedAt IS NULL')
        .get(id) as ProdutoLab | null;
    } else {
      produto = db
        .prepare('SELECT * FROM produtos_prod WHERE id = ? AND deletedAt IS NULL')
        .get(id) as ProdutoProd | null;
    }

    if (!produto) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ produto });
  } catch (error) {
    console.error('Erro ao buscar produto:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar produto' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const searchParams = request.nextUrl.searchParams;
    const modo = searchParams.get('modo');
    const body = await request.json();

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

    // Verificar se produto existe
    let exists = false;
    if (modo === 'LAB') {
      exists = !!db
        .prepare('SELECT id FROM produtos_lab WHERE id = ? AND deletedAt IS NULL')
        .get(id);
    } else {
      exists = !!db
        .prepare('SELECT id FROM produtos_prod WHERE id = ? AND deletedAt IS NULL')
        .get(id);
    }

    if (!exists) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
    }

    // Validar apenas campos fornecidos (validação parcial para PUT)
    const errors: string[] = [];

    if (modo === 'LAB') {
      const produtoData = body as Partial<ProdutoLabInput>;
      if (produtoData.nome !== undefined) {
        if (!produtoData.nome || typeof produtoData.nome !== 'string') {
          errors.push('Nome inválido');
        } else if (produtoData.nome.trim().length < 3) {
          errors.push('Nome deve ter pelo menos 3 caracteres');
        }
      }
      if (produtoData.precoUSD !== undefined) {
        if (typeof produtoData.precoUSD !== 'number' || produtoData.precoUSD <= 0) {
          errors.push('Preço USD deve ser maior que zero');
        }
      }
      if (produtoData.cotacao !== undefined) {
        if (typeof produtoData.cotacao !== 'number' || produtoData.cotacao <= 0) {
          errors.push('Cotação deve ser maior que zero');
        }
      }
      if (produtoData.freteTotal !== undefined) {
        if (typeof produtoData.freteTotal !== 'number' || produtoData.freteTotal < 0) {
          errors.push('Frete Total deve ser maior ou igual a zero');
        }
      }
    } else {
      const produtoData = body as Partial<ProdutoProdInput>;
      if (produtoData.nome !== undefined) {
        if (!produtoData.nome || typeof produtoData.nome !== 'string') {
          errors.push('Nome inválido');
        } else if (produtoData.nome.trim().length < 3) {
          errors.push('Nome deve ter pelo menos 3 caracteres');
        }
      }
      if (produtoData.quantidade !== undefined) {
        if (
          typeof produtoData.quantidade !== 'number' ||
          !Number.isInteger(produtoData.quantidade) ||
          produtoData.quantidade < 0
        ) {
          errors.push('Quantidade deve ser um número inteiro maior ou igual a zero');
        }
      }
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { error: 'Dados inválidos', errors },
        { status: 400 }
      );
    }

    const now = Math.floor(Date.now() / 1000);

    if (modo === 'LAB') {
      const produtoData = body as Partial<ProdutoLabInput>;
      const updates: string[] = [];
      const values: any[] = [];

      if (produtoData.nome !== undefined) {
        updates.push('nome = ?');
        values.push(produtoData.nome);
      }
      if (produtoData.precoUSD !== undefined) {
        updates.push('precoUSD = ?');
        values.push(produtoData.precoUSD);
      }
      if (produtoData.cotacao !== undefined) {
        updates.push('cotacao = ?');
        values.push(produtoData.cotacao);
      }
      if (produtoData.freteTotal !== undefined) {
        updates.push('freteTotal = ?');
        values.push(produtoData.freteTotal);
      }
      if (produtoData.fornecedor !== undefined) {
        updates.push('fornecedor = ?');
        values.push(produtoData.fornecedor || null);
      }

      updates.push('updatedAt = ?');
      values.push(now);
      values.push(id);

      db.prepare(`UPDATE produtos_lab SET ${updates.join(', ')} WHERE id = ?`).run(
        ...values
      );
    } else {
      const produtoData = body as Partial<ProdutoProdInput>;
      const updates: string[] = [];
      const values: any[] = [];

      if (produtoData.nome !== undefined) {
        updates.push('nome = ?');
        values.push(produtoData.nome);
      }
      if (produtoData.fornecedor !== undefined) {
        updates.push('fornecedor = ?');
        values.push(produtoData.fornecedor || null);
      }
      if (produtoData.quantidade !== undefined) {
        updates.push('quantidade = ?');
        values.push(produtoData.quantidade);
      }

      updates.push('updatedAt = ?');
      values.push(now);
      values.push(id);

      db.prepare(`UPDATE produtos_prod SET ${updates.join(', ')} WHERE id = ?`).run(
        ...values
      );
    }

    // Buscar produto atualizado
    const produtoAtualizado =
      modo === 'LAB'
        ? (db.prepare('SELECT * FROM produtos_lab WHERE id = ?').get(id) as ProdutoLab)
        : (db.prepare('SELECT * FROM produtos_prod WHERE id = ?').get(id) as ProdutoProd);

    if (!produtoAtualizado) {
      return NextResponse.json(
        { error: 'Erro ao atualizar produto' },
        { status: 500 }
      );
    }

    saveDb();

    return NextResponse.json({
      produto: produtoAtualizado as ProdutoLab | ProdutoProd,
    });
  } catch (error) {
    console.error('Erro ao atualizar produto:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar produto' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
    const now = Math.floor(Date.now() / 1000);

    if (modo === 'LAB') {
      // Verificar se produto existe e não está deletado
      const check = db
        .prepare('SELECT id FROM produtos_lab WHERE id = ? AND deletedAt IS NULL')
        .get(id);
      if (!check) {
        return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
      }

      db.prepare(
        `UPDATE produtos_lab SET deletedAt = ? WHERE id = ? AND deletedAt IS NULL`
      ).run(now, id);
    } else {
      // Verificar se produto existe e não está deletado
      const check = db
        .prepare('SELECT id FROM produtos_prod WHERE id = ? AND deletedAt IS NULL')
        .get(id);
      if (!check) {
        return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
      }

      db.prepare(
        `UPDATE produtos_prod SET deletedAt = ? WHERE id = ? AND deletedAt IS NULL`
      ).run(now, id);
    }

    saveDb();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao deletar produto:', error);
    return NextResponse.json(
      { error: 'Erro ao deletar produto' },
      { status: 500 }
    );
  }
}
