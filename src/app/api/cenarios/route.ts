import { NextRequest, NextResponse } from 'next/server';
import { getDb, getDbInstance, saveDb } from '@/db/index';
import { validarCenario } from '@/lib/validators';
import {
  calcularCustoUnitario,
  calcularReceita,
  calcularTaxaML,
  calcularLucroLiquido,
} from '@/lib/calculators';
import type { Cenario, CenarioInput } from '@/types/cenario';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const produtoId = searchParams.get('produtoId');

    if (!produtoId) {
      return NextResponse.json(
        { error: "Query param 'produtoId' é obrigatório" },
        { status: 400 }
      );
    }

    const produtoIdNum = parseInt(produtoId, 10);
    if (isNaN(produtoIdNum) || produtoIdNum <= 0) {
      return NextResponse.json(
        { error: 'produtoId deve ser um número válido maior que zero' },
        { status: 400 }
      );
    }

    getDb();
    const db = getDbInstance();

    const cenarios = db
      .prepare(
        `SELECT * FROM cenarios_lab 
         WHERE produtoId = ? 
         ORDER BY createdAt DESC`
      )
      .all(produtoIdNum) as Cenario[];

    return NextResponse.json({ cenarios });
  } catch (error: any) {
    console.error('Erro ao buscar cenários:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar cenários' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CenarioInput = await request.json();

    const validation = validarCenario(body);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.errors.join(', ') },
        { status: 400 }
      );
    }

    getDb();
    const db = getDbInstance();

    // Buscar configurações LAB (singleton)
    const config = db
      .prepare('SELECT * FROM configuracoes_lab LIMIT 1')
      .get() as any;

    if (!config) {
      return NextResponse.json(
        { error: 'Configurações LAB não encontradas. Execute o setup do banco.' },
        { status: 500 }
      );
    }

    const taxaClassico = config.taxaClassico || 11.0;
    const taxaPremium = config.taxaPremium || 16.0;

    // Buscar produto para calcular custo unitário
    const produtoId = body.produtoId!;
    const produto = db
      .prepare('SELECT * FROM produtos_lab WHERE id = ?')
      .get(produtoId) as any;

    if (!produto) {
      return NextResponse.json(
        { error: 'Produto não encontrado' },
        { status: 404 }
      );
    }

    // Calcular custo unitário do produto
    const custoUnitario = calcularCustoUnitario(
      produto.precoUSD,
      produto.cotacao,
      produto.freteTotal,
      1 // quantidade = 1 para simulação
    );

    // Calcular taxas ML (sobre o valor total da venda)
    const taxaMLClassico = calcularTaxaML(body.precoVendaClassico!, taxaClassico);
    const taxaMLPremium = calcularTaxaML(body.precoVendaPremium!, taxaPremium);

    // Calcular lucros líquidos (simulação não tem frete, então frete = 0)
    const lucroClassico = calcularLucroLiquido(
      body.precoVendaClassico!,
      1, // quantidade = 1 para simulação
      0, // frete = 0 (simulação não tem frete)
      custoUnitario,
      taxaMLClassico
    );
    const lucroPremium = calcularLucroLiquido(
      body.precoVendaPremium!,
      1, // quantidade = 1 para simulação
      0, // frete = 0 (simulação não tem frete)
      custoUnitario,
      taxaMLPremium
    );

    // Inserir cenário
    const now = Math.floor(Date.now() / 1000);
    const insertResult = db
      .prepare(
        `INSERT INTO cenarios_lab 
         (produtoId, nome, precoVendaClassico, precoVendaPremium, taxaClassico, taxaPremium, lucroClassico, lucroPremium, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        body.produtoId!,
        body.nome!,
        body.precoVendaClassico!,
        body.precoVendaPremium!,
        taxaClassico,
        taxaPremium,
        lucroClassico,
        lucroPremium,
        now,
        now
      );

    // Buscar cenário criado
    const cenario = db
      .prepare('SELECT * FROM cenarios_lab WHERE id = ?')
      .get(insertResult.lastInsertRowid) as Cenario;

    saveDb();

    return NextResponse.json({ cenario: cenario as Cenario }, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao criar cenário:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao criar cenário' },
      { status: 500 }
    );
  }
}
