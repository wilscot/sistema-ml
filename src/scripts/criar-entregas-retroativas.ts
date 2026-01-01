import { getDb } from '@/database';

async function criarEntregasRetroativas() {
  const db = getDb();
  
  console.log('Criando entregas retroativas para compras antigas...\n');
  
  const now = Math.floor(Date.now() / 1000);
  
  try {
    // Definir entregas a criar
    // Formato: { numeroCompra, quantidadeReceber }
    // Se quantidadeReceber = null, usa quantidadeComprada
    const entregasParaCriar = [
      { numeroCompra: 'C-2025-001', quantidadeReceber: null }, // Total
      { numeroCompra: 'C-2025-002', quantidadeReceber: null }, // Total
      { numeroCompra: 'C-2025-003', quantidadeReceber: 10 },   // 12 - 2 = 10 (faltam 2)
      { numeroCompra: 'C-2025-004', quantidadeReceber: null }, // Total
      { numeroCompra: 'C-2025-005', quantidadeReceber: null }, // Total
    ];
    
    for (const config of entregasParaCriar) {
      // Buscar compra
      const compra = db.prepare(`
        SELECT id, produtoId, quantidadeComprada, quantidadeRecebida, numeroCompra, dataCompra
        FROM compras 
        WHERE numeroCompra = ? AND deletedAt IS NULL
      `).get(config.numeroCompra) as any;
      
      if (!compra) {
        console.log(`Compra ${config.numeroCompra}: NAO ENCONTRADA\n`);
        continue;
      }
      
      // Verificar se já tem entregas
      const entregasExistentes = db.prepare(`
        SELECT COALESCE(SUM(quantidadeRecebida), 0) as total
        FROM entregas
        WHERE compraId = ? AND deletedAt IS NULL
      `).get(compra.id) as any;
      
      if (entregasExistentes.total > 0) {
        console.log(`Compra ${config.numeroCompra}: Já tem ${entregasExistentes.total} un. entregues, pulando...\n`);
        continue;
      }
      
      const quantidadeReceber = config.quantidadeReceber ?? compra.quantidadeComprada;
      
      console.log(`Compra ${config.numeroCompra}:`);
      console.log(`  - Total comprado: ${compra.quantidadeComprada}`);
      console.log(`  - Criando entrega de: ${quantidadeReceber} unidades`);
      
      // Criar entrega
      db.prepare(`
        INSERT INTO entregas (compraId, quantidadeRecebida, dataRecebimento, observacoes, createdAt)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        compra.id,
        quantidadeReceber,
        compra.dataCompra, // Usar data da compra como data de recebimento
        'Entrega retroativa - migração do sistema',
        now
      );
      
      // Atualizar compra
      db.prepare(`
        UPDATE compras 
        SET quantidadeRecebida = quantidadeRecebida + ?,
            quantidadeDisponivel = quantidadeDisponivel + ?
        WHERE id = ?
      `).run(quantidadeReceber, quantidadeReceber, compra.id);
      
      // Atualizar estoque do produto
      db.prepare(`
        UPDATE produtos_prod 
        SET quantidade = quantidade + ?
        WHERE id = ?
      `).run(quantidadeReceber, compra.produtoId);
      
      console.log(`  -> Entrega criada`);
      console.log(`  -> Estoque do produto atualizado (+${quantidadeReceber})\n`);
    }
    
    // Mostrar situação final
    console.log('\n--- SITUAÇÃO FINAL ---\n');
    
    const compras = db.prepare(`
      SELECT c.*, p.nome as produtoNome
      FROM compras c
      JOIN produtos_prod p ON p.id = c.produtoId
      WHERE c.deletedAt IS NULL
      ORDER BY c.numeroCompra
    `).all() as any[];
    
    for (const c of compras) {
      const pendente = c.quantidadeComprada - (c.quantidadeRecebida || 0);
      console.log(`${c.numeroCompra} - ${c.produtoNome}`);
      console.log(`  Comprado: ${c.quantidadeComprada} | Recebido: ${c.quantidadeRecebida || 0} | Disponível: ${c.quantidadeDisponivel} | Pendente: ${pendente}`);
    }
    
    console.log('\n--- ESTOQUE DOS PRODUTOS ---\n');
    
    const produtos = db.prepare('SELECT * FROM produtos_prod WHERE deletedAt IS NULL').all() as any[];
    
    for (const p of produtos) {
      console.log(`${p.nome}: ${p.quantidade} unidades`);
    }
    
    console.log('\nConcluído!');
    
  } catch (error: any) {
    console.error('Erro:', error.message);
    process.exit(1);
  }
}

criarEntregasRetroativas()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Erro:', err);
    process.exit(1);
  });

