import { NextRequest, NextResponse } from 'next/server';
import { getDb, getDbInstance } from '@/db/index';
import {
  getVendasDoMes,
  getFaturamentoBruto,
  getLucroLiquido,
} from '@/lib/dashboard-stats';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const periodo = searchParams.get('periodo') || 'mes';

    if (periodo !== 'mes') {
      return NextResponse.json(
        { error: "Período deve ser 'mes' (outros períodos não implementados)" },
        { status: 400 }
      );
    }

    getDb();
    const db = getDbInstance();

    const vendasDoMes = getVendasDoMes(db);
    const faturamentoBruto = getFaturamentoBruto(db);
    const lucroLiquido = getLucroLiquido(db);

    return NextResponse.json({
      vendasDoMes,
      faturamentoBruto,
      lucroLiquido,
    });
  } catch (error) {
    console.error('Erro ao buscar métricas do dashboard:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar métricas do dashboard' },
      { status: 500 }
    );
  }
}
