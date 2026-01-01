import { getDb } from '@/database';

async function corrigirEstoqueCompras() {
  const db = getDb();
  
  console.log('Corrigindo estoque de compras existentes...\n');
  console.log('NOTA: Compras antigas que já tinham vendas serão marcadas como "já recebidas"\n');
  
  try {
    // Buscar todas as compras
    const compras = db.prepare(`
      SELECT c.id, c.produtoId, c.quantidadeComprada, c.quantidadeRecebida, 
             c.quantidadeDisponivel, c.numeroCompra 
      FROM compras c
      WHERE c.deletedAt IS NULL
    `).all() as any[];
    
    for (const compra of compras) {
      // Contar vendas vinculadas a esta compra
      const vendasCompra = db.prepare(`
        SELECT COALESCE(SUM(quantidadeVendida), 0) as totalVendido
        FROM vendas
        WHERE compraId = ? AND deletedAt IS NULL
      `).get(compra.id) as any;
      
      const totalVendido = vendasCompra?.totalVendido || 0;
      
      console.log(`Compra ${compra.numeroCompra || '#' + compra.id}:`);
      console.log(`  - Comprada: ${compra.quantidadeComprada}`);
      console.log(`  - Vendido (desta compra): ${totalVendido}`);
      console.log(`  - Recebida atual: ${compra.quantidadeRecebida || 0}`);
      
      // Se há vendas, significa que o estoque já foi usado
      // Então a compra precisa ser considerada como "já recebida"
      if (totalVendido > 0) {
        // Marcar como totalmente recebida (comportamento antigo)
        db.prepare(`
          UPDATE compras 
          SET quantidadeRecebida = ?,
              quantidadeDisponivel = ?
          WHERE id = ?
        `).run(
          compra.quantidadeComprada, // Tudo foi "recebido" no sistema antigo
          compra.quantidadeComprada - totalVendido, // Disponível = comprado - vendido
          compra.id
        );
        
        console.log(`  -> Marcada como recebida (${compra.quantidadeComprada} un.)`);
        console.log(`  -> Disponível: ${compra.quantidadeComprada - totalVendido}`);
      } else {
        // Se não há vendas, zerar para aguardar entregas
        db.prepare(`
          UPDATE compras 
          SET quantidadeRecebida = 0,
              quantidadeDisponivel = 0
          WHERE id = ?
        `).run(compra.id);
        
        console.log(`  -> Zerada (aguardando entregas)`);
      }
      
      console.log('');
    }
    
    // Recalcular estoque dos produtos
    console.log('Recalculando estoque dos produtos...\n');
    
    const produtos = db.prepare('SELECT id, nome FROM produtos_prod WHERE deletedAt IS NULL').all() as any[];
    
    for (const produto of produtos) {
      // Somar quantidadeDisponivel de todas as compras do produto
      const totalDisponivel = db.prepare(`
        SELECT COALESCE(SUM(quantidadeDisponivel), 0) as total
        FROM compras
        WHERE produtoId = ? AND deletedAt IS NULL
      `).get(produto.id) as any;
      
      console.log(`Produto: ${produto.nome}`);
      console.log(`  - Total disponível (soma das compras): ${totalDisponivel.total}`);
      
      // Atualizar estoque do produto
      db.prepare(`
        UPDATE produtos_prod 
        SET quantidade = ? 
        WHERE id = ?
      `).run(totalDisponivel.total, produto.id);
      
      console.log(`  -> Estoque atualizado para: ${totalDisponivel.total}\n`);
    }
    
    console.log('Correção concluída!\n');
    console.log('IMPORTANTE:');
    console.log('- Compras ANTIGAS com vendas foram marcadas como "já recebidas"');
    console.log('- Compras NOVAS precisarão registrar entregas para liberar estoque');
    
  } catch (error: any) {
    console.error('Erro:', error.message);
    process.exit(1);
  }
}

corrigirEstoqueCompras()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Erro:', err);
    process.exit(1);
  });
