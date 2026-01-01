import { getDb } from '@/database';

async function migrarEntregas() {
  const db = getDb();
  
  console.log('🔄 Iniciando migração para sistema de entregas...\n');
  
  try {
    // 1. Criar tabela entregas
    console.log('[1/3] Criando tabela entregas...');
    db.exec(`
      CREATE TABLE IF NOT EXISTS entregas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        compraId INTEGER NOT NULL REFERENCES compras(id) ON DELETE CASCADE,
        quantidadeRecebida INTEGER NOT NULL,
        dataRecebimento INTEGER NOT NULL,
        codigoRastreio TEXT,
        fotoEtiqueta TEXT,
        observacoes TEXT,
        createdAt INTEGER NOT NULL DEFAULT (unixepoch()),
        deletedAt INTEGER
      )
    `);
    console.log('✅ Tabela entregas criada!\n');
    
    // 2. Adicionar campos em compras
    console.log('[2/3] Adicionando campos em compras...');
    
    // Verificar se colunas já existem
    const tableInfo = db.prepare("PRAGMA table_info(compras)").all() as any[];
    const hasNumeroCompra = tableInfo.some((col: any) => col.name === 'numeroCompra');
    const hasQuantidadeRecebida = tableInfo.some((col: any) => col.name === 'quantidadeRecebida');
    
    if (!hasNumeroCompra) {
      db.exec(`ALTER TABLE compras ADD COLUMN numeroCompra TEXT`);
      console.log('  ✅ Coluna numeroCompra adicionada');
    } else {
      console.log('  ℹ️  Coluna numeroCompra já existe');
    }
    
    if (!hasQuantidadeRecebida) {
      db.exec(`ALTER TABLE compras ADD COLUMN quantidadeRecebida INTEGER NOT NULL DEFAULT 0`);
      console.log('  ✅ Coluna quantidadeRecebida adicionada');
    } else {
      console.log('  ℹ️  Coluna quantidadeRecebida já existe');
    }
    
    console.log('');
    
    // 3. Gerar números de compra para registros existentes
    console.log('[3/3] Gerando números de compra para registros existentes...');
    const compras = db.prepare('SELECT id, dataCompra FROM compras WHERE numeroCompra IS NULL').all() as any[];
    
    if (compras.length > 0) {
      compras.forEach((compra: any, index: number) => {
        const ano = new Date(compra.dataCompra * 1000).getFullYear();
        const numero = String(index + 1).padStart(3, '0');
        const numeroCompra = `C-${ano}-${numero}`;
        
        db.prepare('UPDATE compras SET numeroCompra = ? WHERE id = ?').run(numeroCompra, compra.id);
        console.log(`  ✅ Compra #${compra.id} → ${numeroCompra}`);
      });
    } else {
      console.log('  ℹ️  Nenhuma compra sem número');
    }
    
    console.log('\n🎉 Migração concluída com sucesso!');
    
  } catch (error: any) {
    console.error('❌ Erro na migração:', error.message);
    process.exit(1);
  }
}

migrarEntregas()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Erro:', err);
    process.exit(1);
  });

