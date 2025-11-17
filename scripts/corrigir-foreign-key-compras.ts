import Database from 'better-sqlite3';

const sqlite = new Database('./db/data.db');

console.log('Corrigindo foreign key da tabela compras...\n');

try {
  // Verificar foreign keys atuais
  console.log('Foreign keys atuais:');
  const foreignKeys = sqlite.prepare('PRAGMA foreign_key_list(compras)').all() as Array<any>;
  foreignKeys.forEach(fk => {
    console.log(`  ${fk.from} -> ${fk.table}.${fk.to}`);
  });

  // SQLite não permite alterar foreign keys diretamente
  // Precisamos recriar a tabela compras com a foreign key correta
  
  console.log('\nVerificando se há dados na tabela compras...');
  const comprasExistentes = sqlite.prepare('SELECT * FROM compras').all() as Array<any>;
  console.log(`Encontradas ${comprasExistentes.length} compras existentes`);

  if (comprasExistentes.length > 0) {
    console.log('\n⚠️  Há compras existentes. Fazendo backup...');
    sqlite.exec('CREATE TABLE IF NOT EXISTS compras_backup AS SELECT * FROM compras');
    console.log('✓ Backup criado: compras_backup');
  }

  // Recriar tabela compras com foreign key correta
  console.log('\nRecriando tabela compras com foreign key correta...');
  
  sqlite.exec(`
    CREATE TABLE compras_new (
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

  console.log('✓ Nova tabela compras_new criada');

  // Copiar dados se houver
  if (comprasExistentes.length > 0) {
    console.log('\nCopiando dados existentes...');
    sqlite.exec(`
      INSERT INTO compras_new 
      SELECT * FROM compras;
    `);
    console.log(`✓ ${comprasExistentes.length} compras copiadas`);
  }

  // Remover tabela antiga
  console.log('\nRemovendo tabela antiga...');
  sqlite.exec('DROP TABLE compras');
  console.log('✓ Tabela antiga removida');

  // Renomear nova tabela
  console.log('\nRenomeando nova tabela...');
  sqlite.exec('ALTER TABLE compras_new RENAME TO compras');
  console.log('✓ Tabela renomeada para compras');

  // Verificar foreign keys novamente
  console.log('\nVerificando foreign keys após correção:');
  const newForeignKeys = sqlite.prepare('PRAGMA foreign_key_list(compras)').all() as Array<any>;
  if (newForeignKeys.length === 0) {
    console.log('⚠️  Nenhuma foreign key encontrada!');
  } else {
    newForeignKeys.forEach(fk => {
      console.log(`  ✓ ${fk.from} -> ${fk.table}.${fk.to} (on delete: ${fk.on_delete})`);
    });
  }

  console.log('\n✅ Foreign key corrigida com sucesso!');

} catch (error) {
  console.error('\n❌ Erro ao corrigir foreign key:', error);
  process.exit(1);
} finally {
  sqlite.close();
}

