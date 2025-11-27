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

    await getDb();
    const db = getDbInstance();

    // sql.js não suporta prepared statements da mesma forma, usar interpolação segura
    // produtoIdNum já foi validado como número inteiro positivo
    const result = db.exec(
      `SELECT * FROM cenarios_lab 
       WHERE produtoId = ${produtoIdNum} 
       ORDER BY createdAt DESC`
    );

    let cenarios: Cenario[] = [];

    if (result.length > 0) {
      const columns = result[0].columns;
      const values = result[0].values;

      cenarios = values.map((row) => {
        const cenario: any = {};
        columns.forEach((col, index) => {
          cenario[col] = row[index];
        });
        return cenario as Cenario;
      });
    }

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

    await getDb();
    const db = getDbInstance();

    // Buscar configurações LAB (singleton)
    const configResult = db.exec('SELECT * FROM configuracoes_lab LIMIT 1');
    if (configResult.length === 0 || configResult[0].values.length === 0) {
      return NextResponse.json(
        { error: 'Configurações LAB não encontradas. Execute o setup do banco.' },
        { status: 500 }
      );
    }

    const configColumns = configResult[0].columns;
    const configValues = configResult[0].values[0];
    const config: any = {};
    configColumns.forEach((col, index) => {
      config[col] = configValues[index];
    });

    const taxaClassico = config.taxaClassico || 11.0;
    const taxaPremium = config.taxaPremium || 16.0;

    // Buscar produto para calcular custo unitário
    const produtoId = body.produtoId!;
    const produtoResult = db.exec(
      `SELECT * FROM produtos_lab WHERE id = ${produtoId}`
    );

    if (produtoResult.length === 0 || produtoResult[0].values.length === 0) {
      return NextResponse.json(
        { error: 'Produto não encontrado' },
        { status: 404 }
      );
    }

    const produtoColumns = produtoResult[0].columns;
    const produtoValues = produtoResult[0].values[0];
    const produto: any = {};
    produtoColumns.forEach((col, index) => {
      produto[col] = produtoValues[index];
    });

    // Calcular custo unitário do produto
    const custoUnitario = calcularCustoUnitario(
      produto.precoUSD,
      produto.cotacao,
      produto.freteTotal,
      1 // quantidade = 1 para simulação
    );

    // Calcular receitas (assumindo quantidade = 1 para simulação)
    const receitaClassico = calcularReceita(
      body.precoVendaClassico!,
      1,
      0 // sem frete na simulação
    );
    const receitaPremium = calcularReceita(
      body.precoVendaPremium!,
      1,
      0 // sem frete na simulação
    );

    // Calcular taxas ML
    const taxaMLClassico = calcularTaxaML(body.precoVendaClassico!, taxaClassico);
    const taxaMLPremium = calcularTaxaML(body.precoVendaPremium!, taxaPremium);

    // Calcular lucros líquidos
    const lucroClassico = calcularLucroLiquido(
      receitaClassico,
      custoUnitario,
      taxaMLClassico
    );
    const lucroPremium = calcularLucroLiquido(
      receitaPremium,
      custoUnitario,
      taxaMLPremium
    );

    // Inserir cenário
    const now = Math.floor(Date.now() / 1000);
    const nomeEscaped = body.nome!.replace(/'/g, "''"); // Escapar aspas simples
    db.run(
      `INSERT INTO cenarios_lab 
       (produtoId, nome, precoVendaClassico, precoVendaPremium, taxaClassico, taxaPremium, lucroClassico, lucroPremium, createdAt, updatedAt)
       VALUES (${body.produtoId!}, '${nomeEscaped}', ${body.precoVendaClassico!}, ${body.precoVendaPremium!}, ${taxaClassico}, ${taxaPremium}, ${lucroClassico}, ${lucroPremium}, ${now}, ${now})`
    );

    // Buscar cenário criado
    const insertResult = db.exec('SELECT last_insert_rowid() as id');
    const newId = insertResult[0].values[0][0] as number;

    const cenarioResult = db.exec(`SELECT * FROM cenarios_lab WHERE id = ${newId}`);
    const cenarioColumns = cenarioResult[0].columns;
    const cenarioValues = cenarioResult[0].values[0];
    const cenario: any = {};
    cenarioColumns.forEach((col, index) => {
      cenario[col] = cenarioValues[index];
    });

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
