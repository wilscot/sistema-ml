import initSqlJs from 'sql.js';
import type { Database } from 'sql.js';

let sqlDb: Database | null = null;
let isInitialized = false;

// Inicializar banco e criar tabelas
export async function getDb() {
  if (isInitialized && sqlDb) {
    return sqlDb;
  }

  const SQL = await initSqlJs({
    locateFile: (file) => `https://sql.js.org/dist/${file}`,
  });

  sqlDb = new SQL.Database();
  
  // Criar tabelas
  sqlDb.run(`
    CREATE TABLE IF NOT EXISTS produtos_lab (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      precoUSD REAL NOT NULL,
      cotacao REAL NOT NULL,
      freteTotal REAL NOT NULL,
      fornecedor TEXT,
      deletedAt INTEGER,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS produtos_prod (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      fornecedor TEXT,
      quantidade INTEGER NOT NULL DEFAULT 0,
      deletedAt INTEGER,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS configuracoes_lab (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      taxaClassico REAL NOT NULL,
      taxaPremium REAL NOT NULL,
      cotacaoDolar REAL NOT NULL,
      updatedAt INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS configuracoes_prod (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      taxaClassico REAL NOT NULL,
      taxaPremium REAL NOT NULL,
      cotacaoDolar REAL NOT NULL,
      updatedAt INTEGER NOT NULL
    );
  `);

  isInitialized = true;
  return sqlDb;
}

export function getDbInstance(): Database {
  if (!sqlDb) {
    throw new Error('Database não inicializado. Chame getDb() primeiro.');
  }
  return sqlDb;
}

export function saveDb() {
  // sql.js mantém tudo em memória, não precisa salvar
  // mas mantemos a função para compatibilidade
  return;
}
