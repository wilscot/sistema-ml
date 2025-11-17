import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '../src/db/schema';

const sqlite = new Database('./db/data.db');

console.log('Atualizando schema do banco de dados...\n');

try {
  // Criar tabela compras se não existir
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS compras (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      produto_id INTEGER NOT NULL,
      preco_usd REAL NOT NULL,
      cotacao REAL NOT NULL,
      frete_total REAL NOT NULL DEFAULT 0,
      quantidade_comprada INTEGER NOT NULL,
      quantidade_disponivel INTEGER NOT NULL,
      moeda TEXT NOT NULL DEFAULT 'USD',
      fornecedor TEXT,
      observacoes TEXT,
      custo_unitario REAL NOT NULL,
      data_compra INTEGER NOT NULL DEFAULT (unixepoch()),
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
      FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE
    );
  `);

  console.log('✓ Tabela compras criada/verificada');

  // Adicionar coluna compra_id em vendas se não existir
  try {
    sqlite.exec(`
      ALTER TABLE vendas ADD COLUMN compra_id INTEGER REFERENCES compras(id);
    `);
    console.log('✓ Coluna compra_id adicionada em vendas');
  } catch (error: any) {
    if (error.message?.includes('duplicate column name') || error.message?.includes('already exists')) {
      console.log('✓ Coluna compra_id já existe em vendas');
    } else {
      throw error;
    }
  }

  // Remover colunas antigas de produtos (se existirem)
  const columnsToRemove = ['preco_usd', 'cotacao', 'frete_total', 'moeda', 'fornecedor'];
  
  for (const column of columnsToRemove) {
    try {
      // SQLite não suporta DROP COLUMN diretamente, então vamos verificar se existe primeiro
      const tableInfo = sqlite.prepare(`PRAGMA table_info(produtos)`).all() as Array<{ name: string }>;
      const columnExists = tableInfo.some(col => col.name === column);
      
      if (columnExists) {
        console.log(`⚠️  Coluna ${column} ainda existe em produtos. SQLite não suporta DROP COLUMN diretamente.`);
        console.log(`   Para remover, você precisará recriar a tabela ou usar uma ferramenta externa.`);
      }
    } catch (error) {
      // Ignorar erros de verificação
    }
  }

  console.log('\n✅ Schema atualizado com sucesso!');
  console.log('\nNota: Se houver colunas antigas em produtos (preco_usd, cotacao, etc),');
  console.log('elas não foram removidas automaticamente pois SQLite não suporta DROP COLUMN.');
  console.log('Essas colunas podem ser ignoradas ou removidas manualmente se necessário.');

} catch (error) {
  console.error('❌ Erro ao atualizar schema:', error);
  process.exit(1);
} finally {
  sqlite.close();
}

