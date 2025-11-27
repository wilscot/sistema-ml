import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const DB_DIR = join(process.cwd(), 'db');
const DB_PATH = join(DB_DIR, 'data.db');

// Garantir que a pasta db existe
if (!existsSync(DB_DIR)) {
  mkdirSync(DB_DIR, { recursive: true });
}

async function setupDatabase() {
  console.log('🚀 Iniciando setup do banco de dados...\n');

  try {
    // Carregar sql.js
    const SQL = await initSqlJs();

    let data: Uint8Array | null = null;

    // Tentar carregar banco existente
    if (existsSync(DB_PATH)) {
      try {
        const buffer = readFileSync(DB_PATH);
        data = new Uint8Array(buffer);
        console.log('📂 Banco existente encontrado, verificando tabelas...\n');
      } catch (error) {
        console.log('📂 Criando novo banco de dados...\n');
      }
    } else {
      console.log('📂 Criando novo banco de dados...\n');
    }

    // Criar ou carregar database
    const db = new SQL.Database(data);

    console.log('📦 Criando tabelas...');

    // Criar tabelas usando SQL raw
    const createTablesSQL = `
      -- Tabelas LAB
      CREATE TABLE IF NOT EXISTS produtos_lab (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        precoUSD REAL NOT NULL,
        cotacao REAL NOT NULL,
        freteTotal REAL NOT NULL,
        fornecedor TEXT,
        deletedAt INTEGER,
        createdAt INTEGER NOT NULL DEFAULT (unixepoch()),
        updatedAt INTEGER NOT NULL DEFAULT (unixepoch())
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
        createdAt INTEGER NOT NULL DEFAULT (unixepoch()),
        updatedAt INTEGER NOT NULL DEFAULT (unixepoch()),
        FOREIGN KEY (produtoId) REFERENCES produtos_lab(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS configuracoes_lab (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        taxaClassico REAL NOT NULL DEFAULT 11.0,
        taxaPremium REAL NOT NULL DEFAULT 16.0,
        cotacaoDolar REAL NOT NULL DEFAULT 1.0,
        updatedAt INTEGER NOT NULL DEFAULT (unixepoch())
      );

      -- Tabelas PROD
      CREATE TABLE IF NOT EXISTS produtos_prod (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        fornecedor TEXT,
        quantidade INTEGER NOT NULL DEFAULT 0,
        deletedAt INTEGER,
        createdAt INTEGER NOT NULL DEFAULT (unixepoch()),
        updatedAt INTEGER NOT NULL DEFAULT (unixepoch())
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
        createdAt INTEGER NOT NULL DEFAULT (unixepoch()),
        updatedAt INTEGER NOT NULL DEFAULT (unixepoch()),
        FOREIGN KEY (produtoId) REFERENCES produtos_prod(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS vendas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        produtoId INTEGER NOT NULL,
        compraId INTEGER,
        quantidadeVendida INTEGER NOT NULL,
        precoVenda REAL NOT NULL,
        tipoAnuncio TEXT NOT NULL,
        freteCobrado REAL NOT NULL DEFAULT 0,
        taxaML REAL NOT NULL,
        custoTotal REAL NOT NULL,
        lucroLiquido REAL NOT NULL,
        data INTEGER NOT NULL,
        createdAt INTEGER NOT NULL DEFAULT (unixepoch()),
        FOREIGN KEY (produtoId) REFERENCES produtos_prod(id) ON DELETE CASCADE,
        FOREIGN KEY (compraId) REFERENCES compras(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS configuracoes_prod (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        taxaClassico REAL NOT NULL DEFAULT 11.0,
        taxaPremium REAL NOT NULL DEFAULT 16.0,
        cotacaoDolar REAL NOT NULL DEFAULT 1.0,
        updatedAt INTEGER NOT NULL DEFAULT (unixepoch())
      );
    `;

    // Executar SQL para criar tabelas (sql.js executa múltiplos statements)
    db.run(createTablesSQL);

    console.log('✅ Tabelas criadas com sucesso!\n');

    // Verificar se já existe seed
    const labConfigResult = db.exec(
      'SELECT COUNT(*) as count FROM configuracoes_lab'
    );
    const labCount =
      labConfigResult.length > 0 && labConfigResult[0].values.length > 0
        ? labConfigResult[0].values[0][0]
        : 0;

    const prodConfigResult = db.exec(
      'SELECT COUNT(*) as count FROM configuracoes_prod'
    );
    const prodCount =
      prodConfigResult.length > 0 && prodConfigResult[0].values.length > 0
        ? prodConfigResult[0].values[0][0]
        : 0;

    // Seed configuracoes_lab (singleton - apenas se não existir)
    if (labCount === 0) {
      console.log('🌱 Inserindo seed configuracoes_lab...');
      db.run(
        `INSERT INTO configuracoes_lab (taxaClassico, taxaPremium, cotacaoDolar, updatedAt) 
         VALUES (11.0, 16.0, 5.60, unixepoch())`
      );
      console.log('✅ Seed configuracoes_lab inserido!');
    } else {
      console.log('ℹ️  configuracoes_lab já existe, pulando seed.');
    }

    // Seed configuracoes_prod (singleton - apenas se não existir)
    if (prodCount === 0) {
      console.log('🌱 Inserindo seed configuracoes_prod...');
      db.run(
        `INSERT INTO configuracoes_prod (taxaClassico, taxaPremium, cotacaoDolar, updatedAt) 
         VALUES (11.0, 16.0, 5.60, unixepoch())`
      );
      console.log('✅ Seed configuracoes_prod inserido!');
    } else {
      console.log('ℹ️  configuracoes_prod já existe, pulando seed.');
    }

    // Salvar banco no disco
    const dataToSave = db.export();
    const buffer = Buffer.from(dataToSave);
    writeFileSync(DB_PATH, buffer);

    console.log('\n🎉 Setup do banco de dados concluído com sucesso!');
    console.log('📁 Banco criado em: ./db/data.db\n');
  } catch (error) {
    console.error('❌ Erro ao configurar banco de dados:', error);
    process.exit(1);
  }
}

// Executar setup
setupDatabase();
