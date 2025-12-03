import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  // Criar pasta data se não existir
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, 'sistema-ml.db');
  db = new Database(dbPath);

  // Criar tabelas
  db.exec(`
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
      nome TEXT NOT NULL UNIQUE,
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

    CREATE TABLE IF NOT EXISTS cenarios_lab (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      produtoId INTEGER NOT NULL,
      nome TEXT NOT NULL,
      precoVendaClassico REAL NOT NULL,
      precoVendaPremium REAL NOT NULL,
      taxaClassico REAL NOT NULL,
      taxaPremium REAL NOT NULL,
      lucroClassico REAL NOT NULL,
      lucroPremium REAL NOT NULL,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS compras (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      produtoId INTEGER NOT NULL,
      precoUSD REAL NOT NULL,
      cotacao REAL NOT NULL,
      freteTotal REAL NOT NULL,
      quantidadeComprada INTEGER NOT NULL,
      quantidadeDisponivel INTEGER NOT NULL,
      moeda TEXT NOT NULL DEFAULT 'USD',
      fornecedor TEXT,
      observacoes TEXT,
      custoUnitario REAL NOT NULL,
      dataCompra INTEGER NOT NULL,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS vendas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      produtoId INTEGER NOT NULL,
      compraId INTEGER,
      numeroVenda TEXT,
      nomeComprador TEXT,
      cpfComprador TEXT,
      quantidadeVendida INTEGER NOT NULL,
      precoVenda REAL NOT NULL,
      tipoAnuncio TEXT NOT NULL,
      freteCobrado REAL NOT NULL DEFAULT 0,
      taxaML REAL NOT NULL,
      custoTotal REAL NOT NULL,
      lucroLiquido REAL NOT NULL,
      data INTEGER NOT NULL,
      deletedAt INTEGER,
      createdAt INTEGER NOT NULL
    );
  `);

  // Migração: adicionar colunas se não existirem
  try {
    const columns = db.prepare("PRAGMA table_info(vendas)").all() as any[];
    const columnNames = columns.map((col) => col.name);

    if (!columnNames.includes('numeroVenda')) {
      db.exec('ALTER TABLE vendas ADD COLUMN numeroVenda TEXT');
    }
    if (!columnNames.includes('nomeComprador')) {
      db.exec('ALTER TABLE vendas ADD COLUMN nomeComprador TEXT');
    }
    if (!columnNames.includes('cpfComprador')) {
      db.exec('ALTER TABLE vendas ADD COLUMN cpfComprador TEXT');
    }
    if (!columnNames.includes('deletedAt')) {
      db.exec('ALTER TABLE vendas ADD COLUMN deletedAt INTEGER');
    }
  } catch (error) {
    // Ignorar erro se colunas já existirem
    console.warn('Erro ao adicionar colunas (podem já existir):', error);
  }

  // Adicionar coluna deletedAt em compras se não existir
  try {
    const columnsCompras = db.prepare("PRAGMA table_info(compras)").all() as any[];
    const columnNamesCompras = columnsCompras.map((col) => col.name);

    if (!columnNamesCompras.includes('deletedAt')) {
      db.exec('ALTER TABLE compras ADD COLUMN deletedAt INTEGER');
    }
  } catch (error) {
    console.warn('Erro ao adicionar coluna deletedAt em compras:', error);
  }

  // Criar índice único para nome de produtos_prod (se não existir)
  try {
    db.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_produtos_prod_nome 
      ON produtos_prod(nome) 
      WHERE deletedAt IS NULL;
    `);
  } catch (error) {
    console.warn('Erro ao criar índice único em produtos_prod:', error);
  }

  return db;
}

export function getDbInstance(): Database.Database {
  if (!db) {
    return getDb();
  }
  return db;
}

export function saveDb() {
  // better-sqlite3 salva automaticamente
  return;
}
