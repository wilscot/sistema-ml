import { getDb } from '@/database';

async function corrigirEstoqueRetroativo() {
  const db = getDb();
  
  console.log('Buscando vendas deletadas...');
  
  // Buscar todas vendas deletadas
  const vendasDeletadas = db
    .prepare('SELECT * FROM vendas WHERE deletedAt IS NOT NULL')
    .all() as any[];
  
  if (vendasDeletadas.length === 0) {
    console.log('Nenhuma venda deletada encontrada');
    return;
  }
  
  console.log(`Encontradas ${vendasDeletadas.length} vendas deletadas`);
  console.log('');
  
  // Processar cada venda
  for (const venda of vendasDeletadas) {
    console.log(`Venda #${venda.id}:`);
    console.log(`  - Produto: ${venda.produtoId}`);
    console.log(`  - Quantidade: ${venda.quantidadeVendida}`);
    
    // Devolver estoque ao produto
    db.prepare(`
      UPDATE produtos_prod 
      SET quantidade = quantidade + ? 
      WHERE id = ?
    `).run(venda.quantidadeVendida, venda.produtoId);
    
    // Devolver estoque à compra (se tiver compraId)
    if (venda.compraId) {
      db.prepare(`
        UPDATE compras 
        SET quantidadeDisponivel = quantidadeDisponivel + ? 
        WHERE id = ?
      `).run(venda.quantidadeVendida, venda.compraId);
      
      console.log(`  Devolvido ${venda.quantidadeVendida} unidades ao produto e compra`);
    } else {
      console.log(`  Devolvido ${venda.quantidadeVendida} unidades ao produto`);
    }
    console.log('');
  }
  
  console.log('Correcao concluida!');
  console.log('');
  console.log('Verificando estoque final...');
  
  // Mostrar estoque atual
  const produtos = db
    .prepare('SELECT id, nome, quantidade FROM produtos_prod WHERE deletedAt IS NULL')
    .all() as any[];
  
  console.log('');
  console.log('Estoque atualizado:');
  produtos.forEach((p: any) => {
    console.log(`  - ${p.nome}: ${p.quantidade} unidades`);
  });
}

corrigirEstoqueRetroativo()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Erro:', err);
    process.exit(1);
  });

