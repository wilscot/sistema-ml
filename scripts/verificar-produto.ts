import Database from 'better-sqlite3';

const sqlite = new Database('./db/data.db');

console.log('Verificando produto ID 2...\n');

try {
  // Verificar se produto existe
  const produto = sqlite.prepare('SELECT * FROM produtos WHERE id = ?').get(2) as any;
  
  if (!produto) {
    console.log('❌ Produto com ID 2 não encontrado');
  } else {
    console.log('✓ Produto encontrado:');
    console.log(JSON.stringify(produto, null, 2));
  }

  // Verificar estrutura da tabela produtos
  console.log('\n--- Estrutura da tabela produtos ---');
  const tableInfo = sqlite.prepare('PRAGMA table_info(produtos)').all() as Array<{ name: string; type: string; notnull: number; pk: number }>;
  tableInfo.forEach(col => {
    console.log(`  ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
  });

  // Verificar estrutura da tabela compras
  console.log('\n--- Estrutura da tabela compras ---');
  const comprasInfo = sqlite.prepare('PRAGMA table_info(compras)').all() as Array<{ name: string; type: string; notnull: number; pk: number }>;
  comprasInfo.forEach(col => {
    console.log(`  ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
  });

  // Verificar foreign keys
  console.log('\n--- Foreign Keys da tabela compras ---');
  const foreignKeys = sqlite.prepare('PRAGMA foreign_key_list(compras)').all() as Array<any>;
  if (foreignKeys.length === 0) {
    console.log('⚠️  Nenhuma foreign key encontrada!');
  } else {
    foreignKeys.forEach(fk => {
      console.log(`  ${fk.from} -> ${fk.table}.${fk.to} (on delete: ${fk.on_delete})`);
    });
  }

  // Verificar se foreign keys estão habilitadas
  console.log('\n--- Configuração de Foreign Keys ---');
  const fkEnabled = sqlite.prepare('PRAGMA foreign_keys').get() as { foreign_keys: number };
  console.log(`Foreign keys habilitadas: ${fkEnabled.foreign_keys === 1 ? 'SIM' : 'NÃO'}`);

  // Listar todos os produtos
  console.log('\n--- Todos os produtos ---');
  const produtos = sqlite.prepare('SELECT id, nome, tipo, quantidade, deleted_at FROM produtos').all() as Array<any>;
  produtos.forEach(p => {
    console.log(`  ID ${p.id}: ${p.nome} (${p.tipo}) - Qtd: ${p.quantidade} ${p.deleted_at ? '[DELETADO]' : ''}`);
  });

} catch (error) {
  console.error('Erro:', error);
} finally {
  sqlite.close();
}

