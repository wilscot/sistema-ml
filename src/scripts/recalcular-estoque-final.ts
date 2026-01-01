import { getDb } from '@/database';

async function recalcularEstoqueFinal() {
  const db = getDb();
  
  console.log('=== RECALCULANDO ESTOQUE FINAL ===\n');
  
  const now = Math.floor(Date.now() / 1000);
  
  try {
    // 1. Primeiro, listar TODAS as compras para diagnóstico
    console.log('--- TODAS AS COMPRAS ---\n');
    const todasCompras = db.prepare(`
      SELECT c.*, p.nome as produtoNome
      FROM compras c
      LEFT JOIN produtos_prod p ON p.id = c.produtoId
      WHERE c.deletedAt IS NULL
    `).all() as any[];
    
    for (const c of todasCompras) {
      console.log(`ID: ${c.id} | Numero: ${c.numeroCompra || 'NULL'} | Produto: ${c.produtoNome}`);
      console.log(`  Comprado: ${c.quantidadeComprada} | Recebido: ${c.quantidadeRecebida} | Disponível: ${c.quantidadeDisponivel}`);
    }
    
    // 2. Corrigir compra sem numeroCompra
    console.log('\n--- CORRIGINDO COMPRAS SEM NUMERO ---\n');
    const comprasSemNumero = db.prepare(`
      SELECT id, dataCompra FROM compras WHERE numeroCompra IS NULL AND deletedAt IS NULL
    `).all() as any[];
    
    for (const compra of comprasSemNumero) {
      const ano = new Date(compra.dataCompra * 1000).getFullYear();
      // Buscar próximo número disponível
      const ultimaCompra = db.prepare(`
        SELECT numeroCompra FROM compras 
        WHERE numeroCompra LIKE ? 
        ORDER BY numeroCompra DESC LIMIT 1
      `).get(`C-${ano}-%`) as any;
      
      let proximoNumero = 1;
      if (ultimaCompra?.numeroCompra) {
        const partes = ultimaCompra.numeroCompra.split('-');
        proximoNumero = parseInt(partes[2]) + 1;
      }
      const numeroCompra = `C-${ano}-${String(proximoNumero).padStart(3, '0')}`;
      
      db.prepare('UPDATE compras SET numeroCompra = ? WHERE id = ?').run(numeroCompra, compra.id);
      console.log(`Compra #${compra.id} -> ${numeroCompra}`);
    }
    
    // 3. Recalcular quantidadeDisponivel de cada compra
    console.log('\n--- RECALCULANDO QUANTIDADE DISPONÍVEL ---\n');
    
    const compras = db.prepare(`
      SELECT c.*, p.nome as produtoNome
      FROM compras c
      LEFT JOIN produtos_prod p ON p.id = c.produtoId
      WHERE c.deletedAt IS NULL
    `).all() as any[];
    
    for (const compra of compras) {
      // Total de entregas desta compra
      const entregas = db.prepare(`
        SELECT COALESCE(SUM(quantidadeRecebida), 0) as total
        FROM entregas
        WHERE compraId = ? AND deletedAt IS NULL
      `).get(compra.id) as any;
      
      // Total de vendas desta compra
      const vendas = db.prepare(`
        SELECT COALESCE(SUM(quantidadeVendida), 0) as total
        FROM vendas
        WHERE compraId = ? AND deletedAt IS NULL
      `).get(compra.id) as any;
      
      const quantidadeRecebida = entregas.total;
      const quantidadeVendida = vendas.total;
      const quantidadeDisponivel = quantidadeRecebida - quantidadeVendida;
      
      console.log(`${compra.numeroCompra || '#' + compra.id} - ${compra.produtoNome}`);
      console.log(`  Entregas: ${quantidadeRecebida} | Vendas: ${quantidadeVendida} | Disponível: ${quantidadeDisponivel}`);
      
      // Atualizar compra
      db.prepare(`
        UPDATE compras 
        SET quantidadeRecebida = ?, quantidadeDisponivel = ?
        WHERE id = ?
      `).run(quantidadeRecebida, quantidadeDisponivel, compra.id);
    }
    
    // 4. Recalcular estoque de cada produto
    console.log('\n--- RECALCULANDO ESTOQUE DOS PRODUTOS ---\n');
    
    const produtos = db.prepare('SELECT * FROM produtos_prod WHERE deletedAt IS NULL').all() as any[];
    
    for (const produto of produtos) {
      // Soma de quantidadeDisponivel de todas as compras do produto
      const totalDisponivel = db.prepare(`
        SELECT COALESCE(SUM(quantidadeDisponivel), 0) as total
        FROM compras
        WHERE produtoId = ? AND deletedAt IS NULL
      `).get(produto.id) as any;
      
      console.log(`${produto.nome}`);
      console.log(`  Estoque anterior: ${produto.quantidade}`);
      console.log(`  Estoque correto: ${totalDisponivel.total}`);
      
      db.prepare('UPDATE produtos_prod SET quantidade = ? WHERE id = ?').run(totalDisponivel.total, produto.id);
    }
    
    // 5. Mostrar situação final
    console.log('\n=== SITUAÇÃO FINAL ===\n');
    
    const comprasFinais = db.prepare(`
      SELECT c.*, p.nome as produtoNome
      FROM compras c
      LEFT JOIN produtos_prod p ON p.id = c.produtoId
      WHERE c.deletedAt IS NULL
      ORDER BY c.id
    `).all() as any[];
    
    console.log('COMPRAS:');
    for (const c of comprasFinais) {
      const pendente = c.quantidadeComprada - c.quantidadeRecebida;
      const status = pendente === 0 ? 'COMPLETO' : pendente === c.quantidadeComprada ? 'PENDENTE' : 'PARCIAL';
      console.log(`  ${c.numeroCompra} | ${c.produtoNome}`);
      console.log(`    Comprado: ${c.quantidadeComprada} | Recebido: ${c.quantidadeRecebida} | Disponível: ${c.quantidadeDisponivel} | [${status}]`);
    }
    
    console.log('\nPRODUTOS:');
    const produtosFinais = db.prepare('SELECT * FROM produtos_prod WHERE deletedAt IS NULL').all() as any[];
    for (const p of produtosFinais) {
      console.log(`  ${p.nome}: ${p.quantidade} unidades em estoque`);
    }
    
    console.log('\nConcluído!');
    
  } catch (error: any) {
    console.error('Erro:', error.message);
    process.exit(1);
  }
}

recalcularEstoqueFinal()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Erro:', err);
    process.exit(1);
  });

