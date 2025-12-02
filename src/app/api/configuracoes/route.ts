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

    getDb();
    const db = getDbInstance();

    const tableName = modo === 'LAB' ? 'configuracoes_lab' : 'configuracoes_prod';

    // Buscar configurações (singleton - sempre deve existir 1 registro)
    let configuracao = db
      .prepare(`SELECT * FROM ${tableName} LIMIT 1`)
      .get() as Configuracao | null;

    if (!configuracao) {
      // Se não existir, criar com valores default
      const now = Math.floor(Date.now() / 1000);
      db.prepare(
        `INSERT INTO ${tableName} (taxaClassico, taxaPremium, cotacaoDolar, updatedAt)
         VALUES (11.0, 16.0, 5.60, ?)`
      ).run(now);

      // Buscar novamente
      configuracao = db
        .prepare(`SELECT * FROM ${tableName} LIMIT 1`)
        .get() as Configuracao | null;
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

    getDb();
    const db = getDbInstance();

    const tableName = modo === 'LAB' ? 'configuracoes_lab' : 'configuracoes_prod';
    const now = Math.floor(Date.now() / 1000);

    // Atualizar configurações (singleton - sempre 1 registro)
    db.prepare(
      `UPDATE ${tableName} 
       SET taxaClassico = ?, taxaPremium = ?, cotacaoDolar = ?, updatedAt = ?
       WHERE id = (SELECT id FROM ${tableName} LIMIT 1)`
    ).run(body.taxaClassico!, body.taxaPremium!, body.cotacaoDolar!, now);

    // Buscar configuração atualizada
    const configuracao = db
      .prepare(`SELECT * FROM ${tableName} LIMIT 1`)
      .get() as Configuracao | null;

    if (!configuracao) {
      return NextResponse.json(
        { error: 'Erro ao buscar configurações atualizadas' },
        { status: 500 }
      );
    }

    return NextResponse.json({ configuracao });
  } catch (error: any) {
    console.error('Erro ao atualizar configurações:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao atualizar configurações' },
      { status: 500 }
    );
  }
}
