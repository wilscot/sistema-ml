import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/db';
import { getProdutos } from '@/lib/db-client';
import type { NovoProduto } from '@/db/schema';

const { produtos } = schema;

/**
 * GET /api/produtos?tipo=LAB|PROD
 * Retorna lista de produtos filtrados por tipo
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tipo = searchParams.get('tipo') as 'LAB' | 'PROD' | null;

    if (!tipo || (tipo !== 'LAB' && tipo !== 'PROD')) {
      return NextResponse.json(
        { error: 'Parâmetro tipo é obrigatório e deve ser LAB ou PROD' },
        { status: 400 }
      );
    }

    const produtosList = await getProdutos(tipo);

    return NextResponse.json({ produtos: produtosList }, { status: 200 });
  } catch (error) {
    console.error('Erro ao buscar produtos:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    
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
        error: 'Erro ao buscar produtos. Tente novamente mais tarde.',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/produtos
 * Cria um novo produto
 * 
 * Campos obrigatórios: nome, tipo
 * Campos opcionais: quantidade (default: 0)
 * 
 * Nota: Campos de custo (precoUSD, cotacao, freteTotal, moeda, fornecedor)
 * foram removidos do schema. Para produtos PROD, os custos devem ser
 * registrados através da tabela compras.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validar campos obrigatórios
    if (!body.nome || body.nome.trim().length < 3) {
      return NextResponse.json(
        { error: 'Nome obrigatório (mínimo 3 caracteres)' },
        { status: 400 }
      );
    }

    if (body.tipo && body.tipo !== 'LAB' && body.tipo !== 'PROD') {
      return NextResponse.json(
        { error: "Tipo deve ser 'LAB' ou 'PROD'" },
        { status: 400 }
      );
    }

    if (body.quantidade !== undefined && (isNaN(body.quantidade) || body.quantidade < 0)) {
      return NextResponse.json(
        { error: 'Quantidade deve ser maior ou igual a zero' },
        { status: 400 }
      );
    }

    // Criar objeto com apenas os campos do schema atual
    const data: NovoProduto = {
      nome: body.nome.trim(),
      tipo: body.tipo || 'LAB',
      quantidade: body.quantidade ?? 0,
    };

    // Log dos dados que serão inseridos (para debug)
    console.log('Dados a serem inseridos:', JSON.stringify(data, null, 2));

    // Inserir no banco
    const result = db.insert(produtos).values(data).returning().all();

    if (result.length === 0) {
      console.error('Nenhum produto retornado após inserção');
      return NextResponse.json(
        { error: 'Erro ao criar produto: nenhum registro retornado' },
        { status: 500 }
      );
    }

    console.log('Produto criado com sucesso:', result[0].id);
    return NextResponse.json({ produto: result[0] }, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar produto:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'N/A');
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
    
    // Verificar se é erro de validação de dados JSON
    if (errorMessage.includes('JSON') || errorMessage.includes('parse')) {
      return NextResponse.json(
        { error: 'Dados inválidos. Verifique os campos do formulário.' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Erro ao criar produto. Tente novamente mais tarde.',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}
