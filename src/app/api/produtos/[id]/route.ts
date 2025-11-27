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

    await getDb();
    const db = getDbInstance();

    let produto: ProdutoLab | ProdutoProd | null = null;

    if (modo === 'LAB') {
      const result = db.exec(
        `SELECT * FROM produtos_lab WHERE id = ${id} AND deletedAt IS NULL`
      );

      if (result.length > 0 && result[0].values.length > 0) {
        const columns = result[0].columns;
        const values = result[0].values[0];
        produto = {} as ProdutoLab;
        columns.forEach((col, index) => {
          (produto as any)[col] = values[index];
        });
      }
    } else {
      const result = db.exec(
        `SELECT * FROM produtos_prod WHERE id = ${id} AND deletedAt IS NULL`
      );

      if (result.length > 0 && result[0].values.length > 0) {
        const columns = result[0].columns;
        const values = result[0].values[0];
        produto = {} as ProdutoProd;
        columns.forEach((col, index) => {
          (produto as any)[col] = values[index];
        });
      }
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

    await getDb();
    const db = getDbInstance();

    // Verificar se produto existe
    let exists = false;
    if (modo === 'LAB') {
      const check = db.exec(
        `SELECT id FROM produtos_lab WHERE id = ${id} AND deletedAt IS NULL`
      );
      exists = check.length > 0 && check[0].values.length > 0;
    } else {
      const check = db.exec(
        `SELECT id FROM produtos_prod WHERE id = ${id} AND deletedAt IS NULL`
      );
      exists = check.length > 0 && check[0].values.length > 0;
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

      const stmt = db.prepare(
        `UPDATE produtos_lab SET ${updates.join(', ')} WHERE id = ?`
      );
      stmt.bind(values);
      stmt.step();
      stmt.free();
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

      const stmt = db.prepare(
        `UPDATE produtos_prod SET ${updates.join(', ')} WHERE id = ?`
      );
      stmt.bind(values);
      stmt.step();
      stmt.free();
    }

    // Buscar produto atualizado
    const result =
      modo === 'LAB'
        ? db.exec(`SELECT * FROM produtos_lab WHERE id = ${id}`)
        : db.exec(`SELECT * FROM produtos_prod WHERE id = ${id}`);

    if (result.length === 0 || result[0].values.length === 0) {
      return NextResponse.json(
        { error: 'Erro ao atualizar produto' },
        { status: 500 }
      );
    }

    const columns = result[0].columns;
    const values = result[0].values[0];
    const produtoAtualizado: any = {};
    columns.forEach((col, index) => {
      produtoAtualizado[col] = values[index];
    });

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

    await getDb();
    const db = getDbInstance();
    const now = Math.floor(Date.now() / 1000);

    if (modo === 'LAB') {
      // Verificar se produto existe e não está deletado
      const check = db.exec(
        `SELECT id FROM produtos_lab WHERE id = ${id} AND deletedAt IS NULL`
      );
      if (check.length === 0 || check[0].values.length === 0) {
        return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
      }

      const stmt = db.prepare(
        `UPDATE produtos_lab SET deletedAt = ? WHERE id = ? AND deletedAt IS NULL`
      );
      stmt.bind([now, id]);
      stmt.step();
      stmt.free();
    } else {
      // Verificar se produto existe e não está deletado
      const check = db.exec(
        `SELECT id FROM produtos_prod WHERE id = ${id} AND deletedAt IS NULL`
      );
      if (check.length === 0 || check[0].values.length === 0) {
        return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
      }

      const stmt = db.prepare(
        `UPDATE produtos_prod SET deletedAt = ? WHERE id = ? AND deletedAt IS NULL`
      );
      stmt.bind([now, id]);
      stmt.step();
      stmt.free();
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
