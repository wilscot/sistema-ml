import Database from 'better-sqlite3';

console.log('Criando banco de dados...');

const sqlite = new Database('./db/data.db');

console.log('Criando tabelas...');

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS produtos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    preco_usd REAL NOT NULL,
    cotacao REAL NOT NULL,
    frete_total REAL NOT NULL,
    quantidade INTEGER DEFAULT 0 NOT NULL,
    fornecedor TEXT,
    tipo TEXT DEFAULT 'LAB' NOT NULL,
    deleted_at INTEGER,
    created_at INTEGER DEFAULT (unixepoch()) NOT NULL,
    updated_at INTEGER DEFAULT (unixepoch()) NOT NULL
  );

  CREATE TABLE IF NOT EXISTS cenarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    produto_id INTEGER NOT NULL,
    nome TEXT NOT NULL,
    preco_venda_classico REAL NOT NULL,
    preco_venda_premium REAL NOT NULL,
    taxa_classico REAL NOT NULL,
    taxa_premium REAL NOT NULL,
    frete_cobrado REAL NOT NULL,
    lucro_classico REAL NOT NULL,
    lucro_premium REAL NOT NULL,
    created_at INTEGER DEFAULT (unixepoch()) NOT NULL,
    updated_at INTEGER DEFAULT (unixepoch()) NOT NULL,
    FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS vendas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    produto_id INTEGER NOT NULL,
    quantidade_vendida INTEGER NOT NULL,
    preco_venda REAL NOT NULL,
    tipo_anuncio TEXT NOT NULL,
    frete_cobrado REAL NOT NULL,
    taxa_ml REAL NOT NULL,
    lucro_liquido REAL NOT NULL,
    data INTEGER NOT NULL,
    created_at INTEGER DEFAULT (unixepoch()) NOT NULL,
    FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE RESTRICT
  );

  CREATE TABLE IF NOT EXISTS configuracoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    taxa_classico REAL DEFAULT 11 NOT NULL,
    taxa_premium REAL DEFAULT 16 NOT NULL,
    cotacao_dolar REAL,
    updated_at INTEGER DEFAULT (unixepoch()) NOT NULL
  );
`);

console.log('Tabelas criadas!');

const existingConfig = sqlite.prepare('SELECT * FROM configuracoes WHERE id = 1').get();

if (!existingConfig) {
  sqlite.prepare(`
    INSERT INTO configuracoes (id, taxa_classico, taxa_premium, updated_at)
    VALUES (1, 11, 16, unixepoch())
  `).run();
  console.log('Configurações inicializadas!');
} else {
  console.log('Configurações já existem');
}

sqlite.close();
console.log('Setup completo!');

