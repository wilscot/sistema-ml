import { NextRequest, NextResponse } from 'next/server';
import { buscarCotacaoDolar } from '@/lib/cotacao';

export const dynamic = 'force-dynamic';

/**
 * GET /api/cotacao
 * Busca cotação atual do dólar (USD-BRL) da API AwesomeAPI
 * Retorna cotação em BRL ou null em caso de erro
 */
export async function GET(request: NextRequest) {
  try {
    const cotacao = await buscarCotacaoDolar();

    if (cotacao === null) {
      return NextResponse.json(
        { error: 'Erro ao buscar cotação da API' },
        { status: 500 }
      );
    }

    return NextResponse.json({ cotacao }, { status: 200 });
  } catch (error) {
    console.error('Erro ao buscar cotação:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar cotação' },
      { status: 500 }
    );
  }
}
