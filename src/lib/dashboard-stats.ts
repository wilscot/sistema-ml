import type Database from 'better-sqlite3';

/**
 * Conta o número de vendas do mês atual
 */
export function getVendasDoMes(db: Database.Database): number {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // getMonth() retorna 0-11

  const startOfMonth = Math.floor(
    new Date(year, month - 1, 1).getTime() / 1000
  );
  const endOfMonth = Math.floor(
    new Date(year, month, 0, 23, 59, 59).getTime() / 1000
  );

  const result = db
    .prepare(
      `SELECT COUNT(*) as count 
       FROM vendas 
       WHERE data >= ? AND data <= ?`
    )
    .get(startOfMonth, endOfMonth) as { count: number } | undefined;

  return result?.count || 0;
}

/**
 * Calcula o faturamento bruto do mês atual
 * Faturamento = soma de (precoVenda × quantidadeVendida + freteCobrado)
 */
export function getFaturamentoBruto(db: Database.Database): number {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const startOfMonth = Math.floor(
    new Date(year, month - 1, 1).getTime() / 1000
  );
  const endOfMonth = Math.floor(
    new Date(year, month, 0, 23, 59, 59).getTime() / 1000
  );

  const result = db
    .prepare(
      `SELECT COALESCE(SUM((precoVenda * quantidadeVendida) + freteCobrado), 0) as total
       FROM vendas 
       WHERE data >= ? AND data <= ?`
    )
    .get(startOfMonth, endOfMonth) as { total: number } | undefined;

  return result?.total || 0;
}

/**
 * Calcula o lucro líquido do mês atual
 * Lucro = soma de lucroLiquido (já calculado nas vendas)
 */
export function getLucroLiquido(db: Database.Database): number {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const startOfMonth = Math.floor(
    new Date(year, month - 1, 1).getTime() / 1000
  );
  const endOfMonth = Math.floor(
    new Date(year, month, 0, 23, 59, 59).getTime() / 1000
  );

  const result = db
    .prepare(
      `SELECT COALESCE(SUM(lucroLiquido), 0) as total
       FROM vendas 
       WHERE data >= ? AND data <= ?`
    )
    .get(startOfMonth, endOfMonth) as { total: number } | undefined;

  return result?.total || 0;
}
