import { NextRequest, NextResponse } from 'next/server';
import { getDb, getDbInstance, saveDb } from '@/db/index';
import { validarConfiguracao } from '@/lib/validators';
import type { Configuracao, ConfiguracaoInput } from '@/types/configuracao';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const modo = searchParams.get('modo');

    if (!modo || (modo !== 'LAB' && modo !== 'PROD')) {
      return NextResponse.json(
        { error: "Query param 'modo' é obrigatório e deve ser 'LAB' ou 'PROD'" },
        { status: 400 }
      );
    }

    await getDb();
    const db = getDbInstance();

    const tableName = modo === 'LAB' ? 'configuracoes_lab' : 'configuracoes_prod';

    // Buscar configurações (singleton - sempre deve existir 1 registro)
    const result = db.exec(`SELECT * FROM ${tableName} LIMIT 1`);

    let configuracao: Configuracao | null = null;

    if (result.length > 0 && result[0].values.length > 0) {
      const columns = result[0].columns;
      const values = result[0].values[0];

      const config: any = {};
      columns.forEach((col, index) => {
        config[col] = values[index];
      });
      configuracao = config as Configuracao;
    } else {
      // Se não existir, criar com valores default
      const now = Math.floor(Date.now() / 1000);
      db.run(
        `INSERT INTO ${tableName} (taxaClassico, taxaPremium, cotacaoDolar, updatedAt)
         VALUES (11.0, 16.0, 5.60, ?)`,
        [now]
      );
      saveDb();

      // Buscar novamente
      const newResult = db.exec(`SELECT * FROM ${tableName} LIMIT 1`);
      if (newResult.length > 0 && newResult[0].values.length > 0) {
        const columns = newResult[0].columns;
        const values = newResult[0].values[0];
        const config: any = {};
        columns.forEach((col, index) => {
          config[col] = values[index];
        });
        configuracao = config as Configuracao;
      }
    }

    if (!configuracao) {
      return NextResponse.json(
        { error: 'Erro ao buscar ou criar configurações' },
        { status: 500 }
      );
    }

    return NextResponse.json({ configuracao });
  } catch (error: any) {
    console.error('Erro ao buscar configurações:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar configurações' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const modo = searchParams.get('modo');

    if (!modo || (modo !== 'LAB' && modo !== 'PROD')) {
      return NextResponse.json(
        { error: "Query param 'modo' é obrigatório e deve ser 'LAB' ou 'PROD'" },
        { status: 400 }
      );
    }

    const body: ConfiguracaoInput = await request.json();

    const validation = validarConfiguracao(body);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.errors.join(', ') },
        { status: 400 }
      );
    }

    await getDb();
    const db = getDbInstance();

    const tableName = modo === 'LAB' ? 'configuracoes_lab' : 'configuracoes_prod';
    const now = Math.floor(Date.now() / 1000);

    // Atualizar configurações (singleton - sempre 1 registro)
    db.run(
      `UPDATE ${tableName} 
       SET taxaClassico = ?, taxaPremium = ?, cotacaoDolar = ?, updatedAt = ?
       WHERE id = (SELECT id FROM ${tableName} LIMIT 1)`,
      [body.taxaClassico!, body.taxaPremium!, body.cotacaoDolar!, now]
    );

    saveDb();

    // Buscar configuração atualizada
    const result = db.exec(`SELECT * FROM ${tableName} LIMIT 1`);
    if (result.length === 0 || result[0].values.length === 0) {
      return NextResponse.json(
        { error: 'Erro ao buscar configurações atualizadas' },
        { status: 500 }
      );
    }

    const columns = result[0].columns;
    const values = result[0].values[0];
    const config: any = {};
    columns.forEach((col, index) => {
      config[col] = values[index];
    });

    return NextResponse.json({ configuracao: config as Configuracao });
  } catch (error: any) {
    console.error('Erro ao atualizar configurações:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao atualizar configurações' },
      { status: 500 }
    );
  }
}
