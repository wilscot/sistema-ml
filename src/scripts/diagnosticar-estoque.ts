import { getDb } from '@/database';

async function diagnosticar() {
  const db = getDb();
  
  console.log('='.repeat(80));
  console.log('DIAGNOSTICO COMPLETO DO ESTOQUE');
  console.log('='.repeat(80));
  console.log('');
  
  // 1. PRODUTOS
  console.log('PRODUTOS:');
  const produtos = db
    .prepare('SELECT * FROM produtos_prod WHERE deletedAt IS NULL')
    .all() as any[];
  
  produtos.forEach((p: any) => {
    console.log(`\nProduto #${p.id}: ${p.nome}`);
    console.log(`  - Estoque registrado: ${p.quantidade}`);
    console.log(`  - Fornecedor: ${p.fornecedor || 'N/A'}`);
  });
  
  console.log('\n' + '='.repeat(80));
  
  // 2. COMPRAS
  console.log('COMPRAS:');
  const compras = db
    .prepare('SELECT * FROM compras WHERE deletedAt IS NULL ORDER BY dataCompra ASC')
    .all() as any[];
  
  if (compras.length === 0) {
    console.log('  NENHUMA COMPRA REGISTRADA!');
  } else {
    compras.forEach((c: any) => {
      console.log(`\nCompra #${c.id} (Produto #${c.produtoId})`);
      console.log(`  - Data: ${new Date(c.dataCompra * 1000).toLocaleDateString()}`);
      console.log(`  - Quantidade comprada: ${c.quantidadeComprada}`);
      console.log(`  - Quantidade disponivel: ${c.quantidadeDisponivel}`);
      console.log(`  - Custo unitario: R$ ${c.custoUnitario?.toFixed(2)}`);
    });
  }
  
  console.log('\n' + '='.repeat(80));
  
  // 3. VENDAS ATIVAS
  console.log('VENDAS ATIVAS:');
  const vendasAtivas = db
    .prepare('SELECT * FROM vendas WHERE deletedAt IS NULL ORDER BY data ASC')
    .all() as any[];
  
  if (vendasAtivas.length === 0) {
    console.log('  Nenhuma venda ativa');
  } else {
    let totalVendido = 0;
    vendasAtivas.forEach((v: any) => {
      console.log(`\nVenda #${v.id} (${v.numeroVenda || 'S/N'})`);
      console.log(`  - Produto: #${v.produtoId}`);
      console.log(`  - Quantidade: ${v.quantidadeVendida}`);
      console.log(`  - Compra usada: #${v.compraId || 'N/A'}`);
      console.log(`  - Data: ${new Date(v.data * 1000).toLocaleDateString()}`);
      totalVendido += v.quantidadeVendida;
    });
    console.log(`\nTOTAL VENDIDO (ativas): ${totalVendido}`);
  }
  
  console.log('\n' + '='.repeat(80));
  
  // 4. VENDAS DELETADAS
  console.log('VENDAS DELETADAS (na lixeira):');
  const vendasDeletadas = db
    .prepare('SELECT * FROM vendas WHERE deletedAt IS NOT NULL ORDER BY data ASC')
    .all() as any[];
  
  if (vendasDeletadas.length === 0) {
    console.log('  Nenhuma venda deletada');
  } else {
    let totalDeletado = 0;
    vendasDeletadas.forEach((v: any) => {
      console.log(`\nVenda #${v.id} (${v.numeroVenda || 'S/N'})`);
      console.log(`  - Produto: #${v.produtoId}`);
      console.log(`  - Quantidade: ${v.quantidadeVendida}`);
      console.log(`  - Compra usada: #${v.compraId || 'N/A'}`);
      console.log(`  - Deletada em: ${new Date(v.deletedAt * 1000).toLocaleString()}`);
      totalDeletado += v.quantidadeVendida;
    });
    console.log(`\nTOTAL DELETADO: ${totalDeletado}`);
  }
  
  console.log('\n' + '='.repeat(80));
  
  // 5. CÁLCULO ESPERADO
  console.log('CALCULO DO ESTOQUE ESPERADO:');
  console.log('');
  
  produtos.forEach((p: any) => {
    const comprasProduto = compras.filter((c: any) => c.produtoId === p.id);
    const vendasAtivasProduto = vendasAtivas.filter((v: any) => v.produtoId === p.id);
    const vendasDeletadasProduto = vendasDeletadas.filter((v: any) => v.produtoId === p.id);
    
    const totalComprado = comprasProduto.reduce((sum: number, c: any) => sum + c.quantidadeComprada, 0);
    const totalVendidoAtivo = vendasAtivasProduto.reduce((sum: number, v: any) => sum + v.quantidadeVendida, 0);
    const totalVendidoDeletado = vendasDeletadasProduto.reduce((sum: number, v: any) => sum + v.quantidadeVendida, 0);
    const totalDisponivelCompras = comprasProduto.reduce((sum: number, c: any) => sum + c.quantidadeDisponivel, 0);
    
    console.log(`Produto: ${p.nome} (#${p.id})`);
    console.log(`  Total comprado: ${totalComprado}`);
    console.log(`  Total vendido (ativas): ${totalVendidoAtivo}`);
    console.log(`  Total vendido (deletadas): ${totalVendidoDeletado}`);
    console.log(`  ---------------------`);
    console.log(`  Estoque esperado: ${totalComprado} - ${totalVendidoAtivo} = ${totalComprado - totalVendidoAtivo}`);
    console.log(`  Estoque registrado (produto): ${p.quantidade}`);
    console.log(`  Estoque registrado (compras): ${totalDisponivelCompras}`);
    console.log('');
    
    if (p.quantidade !== totalComprado - totalVendidoAtivo) {
      console.log(`  INCONSISTENCIA DETECTADA!`);
      console.log(`     Diferenca: ${(totalComprado - totalVendidoAtivo) - p.quantidade} unidades`);
    }
    
    if (totalDisponivelCompras !== totalComprado - totalVendidoAtivo) {
      console.log(`  COMPRAS INCONSISTENTES!`);
      console.log(`     Diferenca: ${(totalComprado - totalVendidoAtivo) - totalDisponivelCompras} unidades`);
    }
    
    console.log('');
  });
  
  console.log('='.repeat(80));
  console.log('Diagnostico completo!');
  console.log('='.repeat(80));
}

diagnosticar()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Erro:', err);
    process.exit(1);
  });

