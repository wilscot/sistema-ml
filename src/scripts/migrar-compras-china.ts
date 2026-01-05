import { getDb } from '@/database';

async function migrarComprasChina() {
  const db = getDb();
  
  console.log('🚀 Iniciando migração para sistema Compras China...\n');
  
  try {
    // 1. Criar tabela lotes_china
    console.log('[1/3] Criando tabela lotes_china...');
    db.exec(`
      CREATE TABLE IF NOT EXISTS lotes_china (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        compraId INTEGER NOT NULL REFERENCES compras(id) ON DELETE CASCADE,
        numeroLote INTEGER NOT NULL,
        quantidade INTEGER NOT NULL DEFAULT 2,
        
        linkComprado INTEGER NOT NULL DEFAULT 0,
        dataCompraLink INTEGER,
        valorLink REAL,
        custoUnitarioLink REAL,
        ordemAliexpress TEXT,
        
        recebido INTEGER NOT NULL DEFAULT 0,
        dataRecebimento INTEGER,
        codigoRastreio TEXT,
        fotoEtiqueta TEXT,
        observacoes TEXT,
        statusEntrega TEXT DEFAULT 'ok',
        
        createdAt INTEGER NOT NULL DEFAULT (unixepoch()),
        updatedAt INTEGER NOT NULL DEFAULT (unixepoch())
      )
    `);
    console.log('✅ Tabela lotes_china criada!\n');
    
    // 2. Adicionar campos em compras
    console.log('[2/3] Adicionando campos em compras...');
    
    const tableInfo = db.prepare("PRAGMA table_info(compras)").all() as any[];
    
    const addColumnIfNotExists = (columnName: string, columnDef: string) => {
      const exists = tableInfo.some((col: any) => col.name === columnName);
      if (!exists) {
        db.exec(`ALTER TABLE compras ADD COLUMN ${columnName} ${columnDef}`);
        console.log(`  ✅ Coluna ${columnName} adicionada`);
      } else {
        console.log(`  ℹ️  Coluna ${columnName} já existe`);
      }
    };
    
    addColumnIfNotExists('tipoCompra', "TEXT DEFAULT 'normal'");
    addColumnIfNotExists('freteEstimado', 'REAL');
    addColumnIfNotExists('freteReal', 'REAL DEFAULT 0');
    addColumnIfNotExists('custoUnitarioLink', 'REAL');
    
    console.log('');
    
    // 3. Marcar compras existentes como 'normal'
    console.log('[3/3] Marcando compras existentes como tipo "normal"...');
    const result = db.prepare(`
      UPDATE compras 
      SET tipoCompra = 'normal' 
      WHERE tipoCompra IS NULL
    `).run();
    
    console.log(`✅ ${result.changes} compras marcadas como "normal"\n`);
    
    // Mostrar resumo
    console.log('='.repeat(50));
    console.log('📊 RESUMO DA MIGRAÇÃO');
    console.log('='.repeat(50));
    
    const totalCompras = db.prepare('SELECT COUNT(*) as total FROM compras WHERE deletedAt IS NULL').get() as any;
    const comprasNormais = db.prepare("SELECT COUNT(*) as total FROM compras WHERE tipoCompra = 'normal' AND deletedAt IS NULL").get() as any;
    
    console.log(`\nTotal de compras: ${totalCompras.total}`);
    console.log(`Compras normais: ${comprasNormais.total}`);
    console.log(`Compras china: 0 (nenhuma ainda)`);
    
    console.log('\n🎉 Migração concluída com sucesso!');
    console.log('\nPróximos passos:');
    console.log('  1. Criar APIs para lotes_china');
    console.log('  2. Criar página de Compras China');
    console.log('  3. Implementar fluxo de lotes');
    
  } catch (error: any) {
    console.error('❌ Erro na migração:', error.message);
    process.exit(1);
  }
}

migrarComprasChina()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Erro:', err);
    process.exit(1);
  });

