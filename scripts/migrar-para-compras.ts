import { db } from '@/db';
import { produtos, compras } from '@/db/schema';
import { calcularCustoTotal } from '@/lib/calculators';
import { eq } from 'drizzle-orm';

async function migrarParaCompras() {
  console.log('Iniciando migração...');

  const produtosExistentes = db
    .select()
    .from(produtos)
    .where(eq(produtos.tipo, 'PROD'))
    .all();

  console.log(`Encontrados ${produtosExistentes.length} produtos`);

  for (const produto of produtosExistentes) {
    const precoUSD = (produto as any).precoUSD;
    const cotacao = (produto as any).cotacao;
    const freteTotal = (produto as any).freteTotal || 0;
    const moeda = (produto as any).moeda || 'USD';
    const fornecedor = (produto as any).fornecedor || '';
    const quantidade = produto.quantidade || 0;

    if (!precoUSD || !cotacao) {
      console.log(`Pulando produto ${produto.id}: sem dados`);
      continue;
    }

    const custoUnitario = calcularCustoTotal(
      precoUSD,
      cotacao,
      freteTotal,
      quantidade || 1,
      moeda as 'USD' | 'BRL'
    );

    db.insert(compras).values({
      produtoId: produto.id,
      precoUSD,
      cotacao,
      freteTotal,
      quantidadeComprada: quantidade,
      quantidadeDisponivel: quantidade,
      moeda,
      fornecedor,
      custoUnitario,
      dataCompra: produto.createdAt,
      observacoes: 'Migração automática',
    }).run();

    console.log(`Compra criada para ${produto.nome}`);
  }

  console.log('\nMigração concluída!');
  console.log('\nExecute ALTER TABLE para remover campos antigos:');
  console.log('ALTER TABLE produtos DROP COLUMN preco_usd;');
  console.log('ALTER TABLE produtos DROP COLUMN cotacao;');
  console.log('ALTER TABLE produtos DROP COLUMN frete_total;');
  console.log('ALTER TABLE produtos DROP COLUMN moeda;');
  console.log('ALTER TABLE produtos DROP COLUMN fornecedor;');
}

migrarParaCompras().catch(console.error);

