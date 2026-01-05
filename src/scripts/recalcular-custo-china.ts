import { getDb } from '@/database';

async function recalcularCustoChina() {
  const db = getDb();
  
  console.log('Recalculando custos de compras China...\n');
  
  try {
    const compras = db
      .prepare("SELECT * FROM compras WHERE tipoCompra = 'china'")
      .all() as any[];
    
    if (compras.length === 0) {
      console.log('Nenhuma compra China encontrada.');
      return;
    }
    
    for (const compra of compras) {
      const paypalTotal = compra.precoUSD * compra.cotacao * compra.quantidadeComprada;
      const custoTotal = paypalTotal + (compra.freteEstimado || 0);
      const custoUnitario = custoTotal / compra.quantidadeComprada;
      
      db.prepare(`
        UPDATE compras 
        SET custoUnitario = ? 
        WHERE id = ?
      `).run(custoUnitario, compra.id);
      
      console.log(`Compra ${compra.numeroCompra}:`);
      console.log(`  PayPal: R$ ${paypalTotal.toFixed(2)}`);
      console.log(`  Frete estimado: R$ ${(compra.freteEstimado || 0).toFixed(2)}`);
      console.log(`  Custo total: R$ ${custoTotal.toFixed(2)}`);
      console.log(`  Custo unitario: R$ ${custoUnitario.toFixed(2)}`);
      console.log('');
    }
    
    console.log(`${compras.length} compra(s) recalculada(s)!`);
    
  } catch (error: any) {
    console.error('Erro:', error.message);
    process.exit(1);
  }
}

recalcularCustoChina()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Erro:', err);
    process.exit(1);
  });

