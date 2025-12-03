import { NextRequest, NextResponse } from 'next/server';
import { getDb, getDbInstance } from '@/db/index';

/**
 * GET /api/vendas/meses-disponiveis
 * Retorna lista de meses (YYYY-MM) que têm vendas registradas
 */
export async function GET(request: NextRequest) {
  try {
    getDb();
    const db = getDbInstance();

    // Buscar todas as datas de vendas não deletadas
    const vendas = db
      .prepare('SELECT data FROM vendas WHERE deletedAt IS NULL ORDER BY data DESC')
      .all() as { data: number }[];

    // Extrair meses únicos (formato YYYY-MM)
    const mesesSet = new Set<string>();
    
    vendas.forEach((venda) => {
      const date = new Date(venda.data * 1000);
      const mesAno = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      mesesSet.add(mesAno);
    });

    // Converter para array e ordenar (mais recente primeiro)
    const meses = Array.from(mesesSet).sort((a, b) => b.localeCompare(a));

    return NextResponse.json({ meses }, { status: 200 });
  } catch (error) {
    console.error('Erro ao buscar meses disponíveis:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar meses disponíveis' },
      { status: 500 }
    );
  }
}

