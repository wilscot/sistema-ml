import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/db';
import { getProdutoById } from '@/lib/db-client';
import type { NovoProduto } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';

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

    // Validar apenas campos obrigatórios (campos de custo foram removidos)
    if (!produtoOriginal.nome) {
      return NextResponse.json(
        { error: 'Produto com nome inválido não pode ser migrado' },
        { status: 400 }
      );
    }

    // Verificar se já existe produto PROD com o mesmo nome (não deletado)
    const produtoExistente = db
      .select()
      .from(produtos)
      .where(
        and(
          eq(produtos.nome, produtoOriginal.nome),
          eq(produtos.tipo, 'PROD'),
          isNull(produtos.deletedAt)
        )
      )
      .limit(1)
      .all();

    if (produtoExistente.length > 0) {
      return NextResponse.json(
        { 
          error: 'Produto já existe em PROD',
          produtoId: produtoExistente[0].id
        },
        { status: 409 }
      );
    }

    // Criar novo produto PROD (cópia do original)
    // Nota: Campos de custo (precoUSD, cotacao, freteTotal, moeda, fornecedor)
    // foram removidos do schema. Custos devem ser registrados via tabela compras.
    const novoProduto: NovoProduto = {
      nome: produtoOriginal.nome,
      tipo: 'PROD',
      quantidade: produtoOriginal.quantidade ?? 0,
      // deletedAt será null por padrão (produto ativo)
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

