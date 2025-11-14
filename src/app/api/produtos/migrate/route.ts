import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/db';
import { getProdutoById } from '@/lib/db-client';
import type { NovoProduto } from '@/db/schema';

const { produtos } = schema;

/**
 * POST /api/produtos/migrate
 * Copia produto LAB para PROD (original permanece em LAB)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { produtoId } = body;

    if (!produtoId || typeof produtoId !== 'number') {
      return NextResponse.json(
        { error: 'produtoId é obrigatório e deve ser um número' },
        { status: 400 }
      );
    }

    // Buscar produto original
    const produtoOriginal = await getProdutoById(produtoId);

    if (!produtoOriginal) {
      return NextResponse.json(
        { error: 'Produto não encontrado' },
        { status: 404 }
      );
    }

    // Validar que produto é LAB e não deletado
    if (produtoOriginal.tipo !== 'LAB') {
      return NextResponse.json(
        { error: 'Apenas produtos LAB podem ser migrados para PROD' },
        { status: 400 }
      );
    }

    if (produtoOriginal.deletedAt) {
      return NextResponse.json(
        { error: 'Produtos deletados não podem ser migrados' },
        { status: 400 }
      );
    }

    // Validar campos obrigatórios
    if (
      !produtoOriginal.nome ||
      !produtoOriginal.precoUSD ||
      !produtoOriginal.cotacao ||
      produtoOriginal.freteTotal === undefined
    ) {
      return NextResponse.json(
        { error: 'Produto com dados incompletos não pode ser migrado' },
        { status: 400 }
      );
    }

    // Criar novo produto PROD (cópia do original)
    const novoProduto: NovoProduto = {
      nome: produtoOriginal.nome,
      precoUSD: produtoOriginal.precoUSD,
      cotacao: produtoOriginal.cotacao,
      freteTotal: produtoOriginal.freteTotal,
      quantidade: produtoOriginal.quantidade,
      fornecedor: produtoOriginal.fornecedor ?? null,
      tipo: 'PROD',
      deletedAt: null,
      // createdAt e updatedAt serão gerados automaticamente pelo schema
    };

    // Inserir novo produto PROD
    const result = db.insert(produtos).values(novoProduto).returning().all();

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Erro ao criar produto PROD' },
        { status: 500 }
      );
    }

    return NextResponse.json({ produto: result[0] }, { status: 201 });
  } catch (error) {
    console.error('Erro ao migrar produto:', error);
    return NextResponse.json(
      { error: 'Erro ao migrar produto' },
      { status: 500 }
    );
  }
}

