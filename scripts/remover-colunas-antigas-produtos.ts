import Database from 'better-sqlite3';

const sqlite = new Database('./db/data.db');

console.log('Verificando e removendo colunas antigas da tabela produtos...\n');

try {
  // Verificar quais colunas existem
  const tableInfo = sqlite.prepare(`PRAGMA table_info(produtos)`).all() as Array<{ name: string; type: string; notnull: number }>;
  
  console.log('Colunas atuais na tabela produtos:');
  tableInfo.forEach(col => {
    console.log(`  - ${col.name} (${col.type}, NOT NULL: ${col.notnull})`);
  });

  const colunasAntigas = ['preco_usd', 'cotacao', 'frete_total', 'moeda', 'fornecedor'];
  const colunasExistentes = tableInfo.map(col => col.name);
  const colunasParaRemover = colunasAntigas.filter(col => colunasExistentes.includes(col));

  if (colunasParaRemover.length === 0) {
    console.log('\n✓ Nenhuma coluna antiga encontrada. Schema já está atualizado.');
    sqlite.close();
    process.exit(0);
  }

  console.log(`\nColunas antigas encontradas: ${colunasParaRemover.join(', ')}`);
  console.log('\nSQLite não suporta DROP COLUMN diretamente.');
  console.log('Vamos recriar a tabela sem essas colunas...\n');

  // Criar nova tabela sem as colunas antigas
  sqlite.exec(`
    CREATE TABLE produtos_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      tipo TEXT NOT NULL,
      quantidade INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
      deleted_at INTEGER
    );
  `);

  console.log('✓ Nova tabela produtos_new criada');

  // Copiar dados (apenas colunas que existem em ambas)
  const colunasParaCopiar = ['id', 'nome', 'tipo', 'quantidade', 'created_at', 'updated_at', 'deleted_at']
    .filter(col => colunasExistentes.includes(col));

  const colunasStr = colunasParaCopiar.join(', ');
  sqlite.exec(`
    INSERT INTO produtos_new (${colunasStr})
    SELECT ${colunasStr} FROM produtos;
  `);

  console.log(`✓ Dados copiados (${colunasParaCopiar.length} colunas)`);

  // Contar registros
  const countOld = sqlite.prepare('SELECT COUNT(*) as count FROM produtos').get() as { count: number };
  const countNew = sqlite.prepare('SELECT COUNT(*) as count FROM produtos_new').get() as { count: number };
  
  console.log(`  Registros na tabela antiga: ${countOld.count}`);
  console.log(`  Registros na tabela nova: ${countNew.count}`);

  if (countOld.count !== countNew.count) {
    throw new Error('Número de registros não corresponde! Abortando...');
  }

  // Fazer backup da tabela antiga
  sqlite.exec(`ALTER TABLE produtos RENAME TO produtos_old_backup_${Date.now()};`);
  console.log('✓ Tabela antiga renomeada para backup');

  // Renomear nova tabela
  sqlite.exec(`ALTER TABLE produtos_new RENAME TO produtos;`);
  console.log('✓ Nova tabela renomeada para produtos');

  // Verificar e corrigir foreign key da tabela compras
  console.log('\nVerificando foreign key da tabela compras...');
  try {
    const fkList = sqlite.prepare('PRAGMA foreign_key_list(compras)').all() as Array<any>;
    const fkIncorreta = fkList.find(fk => fk.table !== 'produtos');
    
    if (fkIncorreta) {
      console.log(`⚠️  Foreign key incorreta encontrada: ${fkIncorreta.from} -> ${fkIncorreta.table}.${fkIncorreta.to}`);
      console.log('Execute: pnpm db:fix-fk para corrigir');
    } else {
      console.log('✓ Foreign key da tabela compras está correta');
    }
  } catch (error) {
    console.log('⚠️  Não foi possível verificar foreign key da tabela compras');
  }

  console.log('\n✅ Migração concluída com sucesso!');
  console.log('\nA tabela antiga foi renomeada para backup.');
  console.log('Você pode deletá-la manualmente depois de verificar que tudo está funcionando.');

} catch (error) {
  console.error('\n❌ Erro ao remover colunas:', error);
  console.error('\nTentando reverter alterações...');
  
  try {
    // Verificar se produtos_new existe e remover
    const tables = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='produtos_new'").all();
    if (tables.length > 0) {
      sqlite.exec('DROP TABLE IF EXISTS produtos_new;');
      console.log('✓ Tabela produtos_new removida');
    }
  } catch (revertError) {
    console.error('Erro ao reverter:', revertError);
  }
  
  process.exit(1);
} finally {
  sqlite.close();
}

