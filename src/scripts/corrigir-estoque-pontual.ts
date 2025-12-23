import { getDb } from '@/database';

async function corrigirEstoquePontual() {
  const db = getDb();
  
  console.log('Analisando situacao do estoque...\n');
  
  // Buscar todos os produtos
  const produtos = db
    .prepare('SELECT id, nome, quantidade FROM produtos_prod WHERE deletedAt IS NULL')
    .all() as any[];
  
  for (const produto of produtos) {
    console.log(`Produto: ${produto.nome} (ID: ${produto.id})`);
    console.log(`   Estoque atual: ${produto.quantidade}`);
    
    // Contar vendas deletadas deste produto
    const result = db
      .prepare(`
        SELECT SUM(quantidadeVendida) as totalDeletado
        FROM vendas 
        WHERE produtoId = ? AND deletedAt IS NOT NULL
      `)
      .get(produto.id) as any;
    
    const quantidadeDeletada = result?.totalDeletado || 0;
    
    if (quantidadeDeletada > 0) {
      console.log(`   Vendas deletadas nao devolvidas: ${quantidadeDeletada}`);
      
      // Corrigir estoque do produto
      const novoEstoque = produto.quantidade + quantidadeDeletada;
      db.prepare(`
        UPDATE produtos_prod 
        SET quantidade = ? 
        WHERE id = ?
      `).run(novoEstoque, produto.id);
      
      console.log(`   Estoque corrigido: ${produto.quantidade} -> ${novoEstoque}`);
      
      // Buscar a compra mais recente com disponibilidade menor que comprada
      const compra = db
        .prepare(`
          SELECT id, quantidadeComprada, quantidadeDisponivel 
          FROM compras 
          WHERE produtoId = ? AND quantidadeDisponivel < quantidadeComprada
          ORDER BY dataCompra DESC 
          LIMIT 1
        `)
        .get(produto.id) as any;
      
      if (compra) {
        // Devolver para a compra também
        const novaDisponivelCompra = compra.quantidadeDisponivel + quantidadeDeletada;
        db.prepare(`
          UPDATE compras 
          SET quantidadeDisponivel = ? 
          WHERE id = ?
        `).run(novaDisponivelCompra, compra.id);
        
        console.log(`   Compra #${compra.id} corrigida: ${compra.quantidadeDisponivel} -> ${novaDisponivelCompra}`);
      }
    } else {
      console.log(`   Estoque OK (sem vendas deletadas)`);
    }
    
    console.log('');
  }
  
  console.log('Correcao concluida!\n');
  
  // Mostrar situação final
  console.log('Situacao final:\n');
  const produtosAtualizados = db
    .prepare('SELECT id, nome, quantidade FROM produtos_prod WHERE deletedAt IS NULL')
    .all() as any[];
  
  produtosAtualizados.forEach((p: any) => {
    const compras = db
      .prepare('SELECT SUM(quantidadeDisponivel) as total FROM compras WHERE produtoId = ?')
      .get(p.id) as any;
    
    const vendas = db
      .prepare('SELECT COUNT(*) as total FROM vendas WHERE produtoId = ? AND deletedAt IS NULL')
      .get(p.id) as any;
    
    console.log(`${p.nome}:`);
    console.log(`  - Estoque produto: ${p.quantidade}`);
    console.log(`  - Estoque compras: ${compras?.total || 0}`);
    console.log(`  - Vendas ativas: ${vendas?.total || 0}`);
    console.log('');
  });
}

corrigirEstoquePontual()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Erro:', err);
    process.exit(1);
  });

