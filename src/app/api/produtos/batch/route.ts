import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/db';
import { validarProduto } from '@/lib/validators';
import type { NovoProduto } from '@/db/schema';

const { produtos } = schema;

/**
 * POST /api/produtos/batch
 * Cria múltiplos produtos em uma única transação
 * Body: NovoProduto[]
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const produtosParaCriar: NovoProduto[] = body.produtos || [];

    if (!Array.isArray(produtosParaCriar) || produtosParaCriar.length === 0) {
      return NextResponse.json(
        { error: 'Array de produtos é obrigatório e não pode estar vazio' },
        { status: 400 }
      );
    }

    const erros: string[] = [];
    const produtosValidados: NovoProduto[] = [];
    const nomesProdutos = new Set<string>();

    for (let i = 0; i < produtosParaCriar.length; i++) {
      const produto = produtosParaCriar[i];
      const nomeNormalizado = produto.nome?.trim().toLowerCase() || '';

      if (nomesProdutos.has(nomeNormalizado)) {
        erros.push(`Produto ${i + 1}: Nome duplicado "${produto.nome}"`);
        continue;
      }

      const validation = validarProduto(produto);
      if (!validation.valid) {
        erros.push(
          `Produto ${i + 1} ("${produto.nome}"): ${validation.errors.join(', ')}`
        );
        continue;
      }

      nomesProdutos.add(nomeNormalizado);
      produtosValidados.push(produto);
    }

    if (erros.length > 0 && produtosValidados.length === 0) {
      return NextResponse.json(
        {
          error: 'Nenhum produto válido para criar',
          erros,
        },
        { status: 400 }
      );
    }

    if (produtosValidados.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum produto válido para criar' },
        { status: 400 }
      );
    }

    let produtosCriados: any[] = [];
    const errosCriacao: string[] = [];

    try {
      const result = db.transaction(() => {
        const criados: any[] = [];

        for (const produto of produtosValidados) {
          try {
            const produtoInserido = db
              .insert(produtos)
              .values(produto)
              .returning()
              .all();

            if (produtoInserido.length > 0) {
              criados.push(produtoInserido[0]);
            }
          } catch (error: any) {
            const errorMsg = error.message || 'Erro desconhecido';
            if (errorMsg.includes('UNIQUE') || errorMsg.includes('duplicate')) {
              errosCriacao.push(
                `Produto "${produto.nome}": Nome já existe no banco`
              );
            } else {
              errosCriacao.push(
                `Produto "${produto.nome}": ${errorMsg}`
              );
            }
          }
        }

        return criados;
      });

      produtosCriados = result;
    } catch (error) {
      console.error('Erro na transação de criação em lote:', error);
      return NextResponse.json(
        {
          error: 'Erro ao processar criação em lote',
          erros: [
            ...erros,
            error instanceof Error ? error.message : 'Erro desconhecido',
          ],
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        produtos: produtosCriados,
        criados: produtosCriados.length,
        total: produtosParaCriar.length,
        erros: [...erros, ...errosCriacao],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Erro ao criar produtos em lote:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Erro desconhecido';

    if (errorMessage.includes('JSON') || errorMessage.includes('parse')) {
      return NextResponse.json(
        { error: 'Dados inválidos. Verifique o formato do arquivo.' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Erro ao criar produtos em lote. Tente novamente mais tarde.' },
      { status: 500 }
    );
  }
}

