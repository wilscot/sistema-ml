import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/db';
import { getCenariosByProdutoId, getProdutoById } from '@/lib/db-client';
import { validarCenario } from '@/lib/validators';
import {
  calcularCustoTotal,
  calcularTaxaML,
  calcularLucro,
} from '@/lib/calculators';
import type { NovoCenario } from '@/db/schema';

const { cenarios } = schema;

/**
 * GET /api/cenarios
 * Retorna cenários de um produto
 * Query: ?produtoId=X (obrigatório)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const produtoIdParam = searchParams.get('produtoId');

    if (!produtoIdParam) {
      return NextResponse.json(
        { error: 'produtoId é obrigatório na query' },
        { status: 400 }
      );
    }

    const produtoId = parseInt(produtoIdParam);

    if (isNaN(produtoId) || produtoId <= 0) {
      return NextResponse.json(
        { error: 'produtoId deve ser um número positivo' },
        { status: 400 }
      );
    }

    const cenariosList = await getCenariosByProdutoId(produtoId);

    return NextResponse.json({ cenarios: cenariosList }, { status: 200 });
  } catch (error) {
    console.error('Erro ao buscar cenários:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar cenários. Tente novamente mais tarde.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cenarios
 * Cria novo cenário com lucros calculados automaticamente
 * Body: Omit<NovoCenario, 'lucroClassico' | 'lucroPremium'>
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validar produtoId
    if (!body.produtoId || typeof body.produtoId !== 'number') {
      return NextResponse.json(
        { error: 'produtoId é obrigatório e deve ser um número' },
        { status: 400 }
      );
    }

    // Buscar produto para obter dados de custo
    const produto = await getProdutoById(body.produtoId);

    if (!produto) {
      return NextResponse.json(
        { error: 'Produto não encontrado' },
        { status: 404 }
      );
    }

    // Validar que produto é LAB (cenários só para LAB)
    if (produto.tipo !== 'LAB') {
      return NextResponse.json(
        { error: 'Cenários só podem ser criados para produtos LAB' },
        { status: 400 }
      );
    }

    // Validar que produto não está deletado
    if (produto.deletedAt) {
      return NextResponse.json(
        { error: 'Não é possível criar cenário para produto deletado' },
        { status: 400 }
      );
    }

    // Calcular custo total do produto
    const moeda = (produto.moeda as 'USD' | 'BRL') || 'USD';
    const custoTotal = calcularCustoTotal(
      produto.precoUSD,
      produto.cotacao,
      produto.freteTotal,
      produto.quantidade || 1,
      moeda
    );

    // Calcular taxas ML
    const taxaClassicoValor = calcularTaxaML(
      body.precoVendaClassico,
      body.taxaClassico
    );
    const taxaPremiumValor = calcularTaxaML(
      body.precoVendaPremium,
      body.taxaPremium
    );

    // Calcular lucros (quantidade = 1 para cenário unitário)
    const lucroClassico = calcularLucro(
      body.precoVendaClassico,
      1,
      body.freteCobrado,
      custoTotal,
      taxaClassicoValor
    );

    const lucroPremium = calcularLucro(
      body.precoVendaPremium,
      1,
      body.freteCobrado,
      custoTotal,
      taxaPremiumValor
    );

    // Montar dados completos do cenário
    const novoCenario: NovoCenario = {
      produtoId: body.produtoId,
      nome: body.nome,
      precoVendaClassico: body.precoVendaClassico,
      precoVendaPremium: body.precoVendaPremium,
      taxaClassico: body.taxaClassico,
      taxaPremium: body.taxaPremium,
      freteCobrado: body.freteCobrado,
      lucroClassico,
      lucroPremium,
      lucroLiquidoClassico: lucroClassico,
      lucroLiquidoPremium: lucroPremium,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Validar dados completos
    const validation = validarCenario(novoCenario);
    if (!validation.valid) {
      return NextResponse.json(
        { errors: validation.errors },
        { status: 400 }
      );
    }

    // Inserir no banco
    const result = db
      .insert(cenarios)
      .values(novoCenario)
      .returning()
      .all();

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Erro ao criar cenário' },
        { status: 500 }
      );
    }

    return NextResponse.json({ cenario: result[0] }, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar cenário:', error);
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
      { error: 'Erro ao criar cenário. Tente novamente mais tarde.' },
      { status: 500 }
    );
  }
}
