// TODO: GET /api/cotacao
// - Buscar cotação USD-BRL via AwesomeAPI
// - URL: https://economia.awesomeapi.com.br/json/last/USD-BRL
// - Parsear response.USDBRL.bid (string → number)
// - Cache local (1 hora) via getCachedCotacao/setCachedCotacao
// - Fallback: retornar última cotação conhecida
// - Retornar: { cotacao: number, timestamp: number }

