import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/db';
import { getProdutoById } from '@/lib/db-client';
import { eq } from 'drizzle-orm';
import type { NovoProduto } from '@/db/schema';

const { produtos } = schema;

/**
 * GET /api/produtos/[id]
 * Retorna produto por ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      );
    }

    const produto = await getProdutoById(id);

    if (!produto) {
      return NextResponse.json(
        { error: 'Produto não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ produto }, { status: 200 });
  } catch (error) {
    console.error('Erro ao buscar produto:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar produto' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/produtos/[id]
 * Atualiza produto (incluindo soft delete)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      );
    }

    const produtoExistente = await getProdutoById(id);

    if (!produtoExistente) {
      return NextResponse.json(
        { error: 'Produto não encontrado' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const updates: Partial<NovoProduto> = {};

    // Campos que podem ser atualizados (tipo não pode ser alterado após criação)
    if (body.nome !== undefined) {
      if (!body.nome || body.nome.trim().length < 3) {
        return NextResponse.json(
          { error: 'Nome obrigatório (mínimo 3 caracteres)' },
          { status: 400 }
        );
      }
      updates.nome = body.nome.trim();
    }
    
    if (body.quantidade !== undefined) {
      if (isNaN(body.quantidade) || body.quantidade < 0) {
        return NextResponse.json(
          { error: 'Quantidade deve ser maior ou igual a zero' },
          { status: 400 }
        );
      }
      updates.quantidade = body.quantidade;
    }
    
    // tipo não pode ser editado após criação (ignorar se fornecido)
    if (body.deletedAt !== undefined) {
      // Converter Date para timestamp se necessário
      updates.deletedAt = body.deletedAt instanceof Date 
        ? body.deletedAt 
        : body.deletedAt === null 
          ? null 
          : new Date(body.deletedAt);
    }
    
    // Nota: Campos de custo (precoUSD, cotacao, freteTotal, moeda, fornecedor)
    // foram removidos do schema. Esses campos são ignorados se enviados.

    // Verificar se há campos para atualizar
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'Nenhum campo fornecido para atualização' },
        { status: 400 }
      );
    }

    // Atualizar updatedAt
    updates.updatedAt = new Date();

    // Atualizar no banco
    const result = db
      .update(produtos)
      .set(updates)
      .where(eq(produtos.id, id))
      .returning()
      .all();

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Erro ao atualizar produto' },
        { status: 500 }
      );
    }

    return NextResponse.json({ produto: result[0] }, { status: 200 });
  } catch (error) {
    console.error('Erro ao atualizar produto:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Erro desconhecido';
    
    // Verificar se é erro de schema
    if (errorMessage.includes('no such column') || errorMessage.includes('column') || errorMessage.includes('no such table')) {
      return NextResponse.json(
        { 
          error: 'Schema do banco desatualizado. Execute: pnpm db:update',
          details: errorMessage
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Erro ao atualizar produto. Tente novamente mais tarde.',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/produtos/[id]
 * Deleta produto permanentemente (hard delete)
 * - Verifica se produto tem vendas (bloqueia se tiver)
 * - Deleta cenários primeiro (cascade)
 * - Deleta produto
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      );
    }

    const produtoExistente = await getProdutoById(id);

    if (!produtoExistente) {
      return NextResponse.json(
        { error: 'Produto não encontrado' },
        { status: 404 }
      );
    }

    const { vendas: vendasTable, cenarios: cenariosTable } = schema;

    // Verificar se produto tem vendas associadas
    const vendas = db
      .select()
      .from(vendasTable)
      .where(eq(vendasTable.produtoId, id))
      .all();

    if (vendas.length > 0) {
      return NextResponse.json(
        {
          error: 'Não é possível deletar produto com vendas registradas',
          vendas: vendas.length,
        },
        { status: 400 }
      );
    }

    try {
      // Deletar cenários primeiro (cascade também funciona, mas deletamos explicitamente)
      db.delete(cenariosTable)
        .where(eq(cenariosTable.produtoId, id))
        .run();

      // Deletar produto permanentemente
      db.delete(produtos).where(eq(produtos.id, id)).run();

      return NextResponse.json(
        {
          success: true,
          message: 'Produto deletado permanentemente',
        },
        { status: 200 }
      );
    } catch (dbError: any) {
      console.error('Erro ao deletar produto do banco:', dbError);
      
      // Verificar se é erro de foreign key constraint
      if (
        dbError.message?.includes('FOREIGN KEY') ||
        dbError.message?.includes('constraint')
      ) {
        return NextResponse.json(
          {
            error:
              'Não é possível deletar produto. Existem relações ativas (vendas ou outros dados).',
            details: dbError.message,
          },
          { status: 400 }
        );
      }

      throw dbError;
    }
  } catch (error) {
    console.error('Erro ao deletar produto:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Erro desconhecido';
    
    return NextResponse.json(
      {
        error: 'Erro ao deletar produto',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
