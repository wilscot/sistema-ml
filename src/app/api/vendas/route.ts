import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/db';
import { getVendas, getProdutoById, getConfig } from '@/lib/db-client';
import { validarVenda } from '@/lib/validators';
import {
  calcularCustoTotal,
  calcularTaxaML,
  calcularLucro,
} from '@/lib/calculators';
import { eq, sql } from 'drizzle-orm';
import type { NovaVenda } from '@/db/schema';

const { vendas, produtos } = schema;

/**
 * GET /api/vendas
 * Retorna vendas com filtros opcionais
 * Query: ?produtoId=X, ?startDate=Y, ?endDate=Z
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const produtoIdParam = searchParams.get('produtoId');
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    const filters: {
      produtoId?: number;
      startDate?: Date;
      endDate?: Date;
    } = {};

    if (produtoIdParam) {
      const produtoId = parseInt(produtoIdParam);
      if (!isNaN(produtoId) && produtoId > 0) {
        filters.produtoId = produtoId;
      }
    }

    if (startDateParam) {
      const startDate = new Date(startDateParam);
      if (!isNaN(startDate.getTime())) {
        filters.startDate = startDate;
      }
    }

    if (endDateParam) {
      const endDate = new Date(endDateParam);
      if (!isNaN(endDate.getTime())) {
        filters.endDate = endDate;
      }
    }

    const vendasList = await getVendas(Object.keys(filters).length > 0 ? filters : undefined);

    return NextResponse.json({ vendas: vendasList }, { status: 200 });
  } catch (error) {
    console.error('Erro ao buscar vendas:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    
    // Verificar se é erro de coluna não encontrada
    if (errorMessage.includes('no such column') || errorMessage.includes('column')) {
      return NextResponse.json(
        { 
          error: 'Schema do banco desatualizado. Execute: pnpm db:push',
          details: errorMessage
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Erro ao buscar vendas. Tente novamente mais tarde.',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/vendas
 * Cria nova venda e deduz estoque (TRANSACTION)
 * Body: Omit<NovaVenda, 'taxaML' | 'lucroLiquido'>
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

    // Buscar produto
    const produto = await getProdutoById(body.produtoId);

    if (!produto) {
      return NextResponse.json(
        { error: 'Produto não encontrado' },
        { status: 404 }
      );
    }

    // Validar que produto é PROD (vendas só para PROD)
    if (produto.tipo !== 'PROD') {
      return NextResponse.json(
        { error: 'Vendas só podem ser registradas para produtos PROD' },
        { status: 400 }
      );
    }

    // Validar que produto não está deletado
    if (produto.deletedAt) {
      return NextResponse.json(
        { error: 'Não é possível registrar venda para produto deletado' },
        { status: 400 }
      );
    }

    // Validar estoque
    const quantidadeVendida = body.quantidadeVendida || 0;
    const estoqueAtual = produto.quantidade || 0;

    if (quantidadeVendida <= 0) {
      return NextResponse.json(
        { error: 'Quantidade vendida deve ser maior que zero' },
        { status: 400 }
      );
    }

    if (quantidadeVendida > estoqueAtual) {
      return NextResponse.json(
        {
          error: `Estoque insuficiente. Disponível: ${estoqueAtual}, Solicitado: ${quantidadeVendida}`,
        },
        { status: 400 }
      );
    }

    // Buscar configuração para obter taxas
    const config = await getConfig();

    // Determinar taxa percentual baseado no tipo de anúncio
    const taxaPercent =
      body.tipoAnuncio === 'CLASSICO'
        ? config.taxaClassico
        : config.taxaPremium;

    // Calcular custo total do produto
    const custoTotal = calcularCustoTotal(
      produto.precoUSD,
      produto.cotacao,
      produto.freteTotal,
      produto.quantidade || 1
    );

    // Calcular taxa ML
    const taxaML = calcularTaxaML(body.precoVenda, taxaPercent);

    // Calcular lucro líquido
    const lucroLiquido = calcularLucro(
      body.precoVenda,
      quantidadeVendida,
      body.freteCobrado || 0,
      custoTotal,
      taxaML
    );

    // Preparar dados da venda
    const novaVenda: NovaVenda = {
      produtoId: body.produtoId,
      quantidadeVendida,
      precoVenda: body.precoVenda,
      tipoAnuncio: body.tipoAnuncio,
      freteCobrado: body.freteCobrado || 0,
      taxaML,
      lucroLiquido,
      data: body.data ? new Date(body.data) : new Date(),
      createdAt: new Date(),
    };

    // Validar dados completos
    const validation = validarVenda(novaVenda, estoqueAtual);
    if (!validation.valid) {
      return NextResponse.json(
        { errors: validation.errors },
        { status: 400 }
      );
    }

    // TRANSACTION: Inserir venda + Atualizar estoque
    // better-sqlite3 é síncrono, então usamos transaction do Drizzle
    // O Drizzle para better-sqlite3 usa transações síncronas através do método transaction()
    const result = db.transaction(() => {
      // Inserir venda
      const vendaInserida = db
        .insert(vendas)
        .values(novaVenda)
        .returning()
        .all();

      // Atualizar estoque (deduzir quantidade vendida)
      db.update(produtos)
        .set({
          quantidade: sql`${produtos.quantidade} - ${quantidadeVendida}`,
          updatedAt: new Date(),
        })
        .where(eq(produtos.id, body.produtoId))
        .run();

      return vendaInserida;
    });

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Erro ao criar venda' },
        { status: 500 }
      );
    }

    return NextResponse.json({ venda: result[0] }, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar venda:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Erro desconhecido';
    
    // Verificar se é erro de validação de dados JSON
    if (errorMessage.includes('JSON') || errorMessage.includes('parse')) {
      return NextResponse.json(
        { error: 'Dados inválidos. Verifique os campos do formulário.' },
        { status: 400 }
      );
    }
    
    // Verificar se é erro de transação
    if (errorMessage.includes('transaction') || errorMessage.includes('constraint')) {
      return NextResponse.json(
        { error: 'Erro ao processar venda. Verifique o estoque e tente novamente.' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Erro ao criar venda. Tente novamente mais tarde.' },
      { status: 500 }
    );
  }
}
