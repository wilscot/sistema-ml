import { NextRequest, NextResponse } from 'next/server';

// Cache em memória (simples, para produção usar Redis ou similar)
interface CacheEntry {
  value: number;
  timestamp: number;
}

let cotacaoCache: CacheEntry | null = null;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hora em milissegundos

function getCachedCotacao(): number | null {
  if (!cotacaoCache) return null;

  const isExpired = Date.now() - cotacaoCache.timestamp > CACHE_DURATION;
  return isExpired ? null : cotacaoCache.value;
}

function setCachedCotacao(value: number): void {
  cotacaoCache = {
    value,
    timestamp: Date.now(),
  };
}

function getExpiredCache(): number | null {
  // Retorna cache mesmo se expirado (fallback)
  return cotacaoCache?.value || null;
}

export async function GET(request: NextRequest) {
  try {
    // 1. Verificar cache (não expirado)
    const cached = getCachedCotacao();
    if (cached !== null) {
      return NextResponse.json({
        cotacao: cached,
        timestamp: cotacaoCache!.timestamp,
      });
    }

    // 2. Buscar da API com timeout de 5 segundos
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(
        'https://economia.awesomeapi.com.br/json/last/USD-BRL',
        {
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      // Validar estrutura da resposta
      if (!data.USDBRL || !data.USDBRL.bid) {
        throw new Error('Resposta da API inválida');
      }

      // Parsear bid (string → number)
      const cotacao = parseFloat(data.USDBRL.bid);

      // Validação: cotação deve ser > 0 e < 100 (sanity check)
      if (isNaN(cotacao) || cotacao <= 0 || cotacao >= 100) {
        throw new Error(`Cotação inválida: ${cotacao}`);
      }

      // 3. Salvar no cache
      setCachedCotacao(cotacao);

      return NextResponse.json({
        cotacao,
        timestamp: Date.now(),
      });
    } catch (fetchError: any) {
      clearTimeout(timeoutId);

      // 4. Fallback: tentar retornar cache expirado (melhor que nada)
      const expiredCache = getExpiredCache();
      if (expiredCache !== null) {
        console.warn(
          'API falhou, retornando cache expirado:',
          fetchError.message
        );
        return NextResponse.json({
          cotacao: expiredCache,
          timestamp: cotacaoCache!.timestamp,
          warning: 'Cotação em cache (pode estar desatualizada)',
        });
      }

      // 5. Se não houver cache: erro
      throw new Error(
        `Não foi possível buscar cotação: ${fetchError.message}`
      );
    }
  } catch (error: any) {
    console.error('Erro ao buscar cotação:', error);
    return NextResponse.json(
      {
        error: error.message || 'Não foi possível buscar cotação',
      },
      { status: 500 }
    );
  }
}
