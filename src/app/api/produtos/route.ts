import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/db';
import { getProdutos } from '@/lib/db-client';
import { validarProduto } from '@/lib/validators';
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
    return NextResponse.json(
      { error: 'Erro ao buscar produtos. Tente novamente mais tarde.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/produtos
 * Cria um novo produto
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data: NovoProduto = {
      nome: body.nome,
      precoUSD: body.precoUSD,
      cotacao: body.cotacao,
      freteTotal: body.freteTotal ?? 0,
      quantidade: body.quantidade ?? 0,
      fornecedor: body.fornecedor ?? null,
      tipo: body.tipo ?? 'LAB',
      moeda: (body.moeda as 'USD' | 'BRL') || 'USD',
    };

    // Validar dados
    const validation = validarProduto(data);
    if (!validation.valid) {
      return NextResponse.json(
        { errors: validation.errors },
        { status: 400 }
      );
    }

    // Inserir no banco
    const result = db.insert(produtos).values(data).returning().all();

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Erro ao criar produto' },
        { status: 500 }
      );
    }

    return NextResponse.json({ produto: result[0] }, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar produto:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Erro desconhecido';
    
    // Verificar se é erro de validação de dados JSON
    if (errorMessage.includes('JSON') || errorMessage.includes('parse')) {
      return NextResponse.json(
        { error: 'Dados inválidos. Verifique os campos do formulário.' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Erro ao criar produto. Tente novamente mais tarde.' },
      { status: 500 }
    );
  }
}
