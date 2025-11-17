import { db, schema } from '@/db';
import type { Produto, Cenario, Venda, Configuracao, Compra } from '@/db/schema';
import { eq, and, isNull, gte, lte, desc, gt } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

const { produtos, cenarios, vendas, configuracoes, compras } = schema;

/**
 * Retorna lista de produtos filtrados por tipo
 * @param tipo - 'LAB' ou 'PROD'
 * @param includeDeleted - Se true, inclui produtos deletados (default: false)
 * @returns Array de produtos ordenados por createdAt DESC
 */
export async function getProdutos(
  tipo: 'LAB' | 'PROD',
  includeDeleted = false
): Promise<Produto[]> {
  const conditions = [eq(produtos.tipo, tipo)];

  if (!includeDeleted) {
    conditions.push(isNull(produtos.deletedAt));
  }

  const result = db
    .select()
    .from(produtos)
    .where(and(...conditions))
    .orderBy(desc(produtos.createdAt))
    .all();

  return result;
}

/**
 * Retorna produto único por ID
 * @param id - ID do produto
 * @returns Produto ou null se não encontrado
 */
export async function getProdutoById(id: number): Promise<Produto | null> {
  const result = db
    .select()
    .from(produtos)
    .where(eq(produtos.id, id))
    .limit(1)
    .all();

  return result[0] || null;
}

/**
 * Retorna lista de cenários de um produto
 * @param produtoId - ID do produto
 * @returns Array de cenários ordenados por createdAt DESC
 */
export async function getCenariosByProdutoId(
  produtoId: number
): Promise<Cenario[]> {
  const result = db
    .select()
    .from(cenarios)
    .where(eq(cenarios.produtoId, produtoId))
    .orderBy(desc(cenarios.createdAt))
    .all();

  return result;
}

/**
 * Retorna vendas com JOIN de produtos
 * @param filters - Filtros opcionais (produtoId, startDate, endDate)
 * @returns Array de vendas com produto associado, ordenadas por data DESC
 */
export async function getVendas(
  filters?: {
    produtoId?: number;
    startDate?: Date;
    endDate?: Date;
  }
): Promise<(Venda & { produto: Produto })[]> {
  const conditions = [];

  if (filters?.produtoId) {
    conditions.push(eq(vendas.produtoId, filters.produtoId));
  }

  if (filters?.startDate) {
    conditions.push(gte(vendas.data, filters.startDate));
  }

  if (filters?.endDate) {
    // Adiciona 1 dia para incluir o dia final
    const endDatePlusOne = new Date(filters.endDate);
    endDatePlusOne.setDate(endDatePlusOne.getDate() + 1);
    conditions.push(lte(vendas.data, endDatePlusOne));
  }

  const baseQuery = db
    .select({
      venda: vendas,
      produto: produtos,
    })
    .from(vendas)
    .innerJoin(produtos, eq(vendas.produtoId, produtos.id));

  const result =
    conditions.length > 0
      ? baseQuery.where(and(...conditions)).orderBy(desc(vendas.data)).all()
      : baseQuery.orderBy(desc(vendas.data)).all();

  return result.map((row) => ({
    ...row.venda,
    produto: row.produto,
  }));
}

/**
 * Retorna venda única por ID com produto associado
 * @param id - ID da venda
 * @returns Venda com produto ou null se não encontrado
 */
export async function getVendaById(
  id: number
): Promise<(Venda & { produto: Produto }) | null> {
  const result = db
    .select({
      venda: vendas,
      produto: produtos,
    })
    .from(vendas)
    .innerJoin(produtos, eq(vendas.produtoId, produtos.id))
    .where(eq(vendas.id, id))
    .limit(1)
    .all();

  if (result.length === 0) {
    return null;
  }

  return {
    ...result[0].venda,
    produto: result[0].produto,
  };
}

/**
 * Retorna configuração global (singleton id=1)
 * Se não existir, cria com valores default
 * @returns Configuração global
 */
export async function getConfig(): Promise<Configuracao> {
  let config = db
    .select()
    .from(configuracoes)
    .where(eq(configuracoes.id, 1))
    .limit(1)
    .all();

  if (config.length === 0) {
    // Criar configuração default se não existir
    db.insert(configuracoes)
      .values({
        id: 1,
        taxaClassico: 11,
        taxaPremium: 16,
        cotacaoDolar: null,
      })
      .run();

    // Buscar novamente após criar
    config = db
      .select()
      .from(configuracoes)
      .where(eq(configuracoes.id, 1))
      .limit(1)
      .all();
  }

  return config[0];
}

/**
 * Retorna todas as compras de um produto
 * @param produtoId - ID do produto
 * @returns Array de compras ordenadas por dataCompra DESC (mais recentes primeiro)
 */
export function getComprasByProdutoId(produtoId: number) {
  return db
    .select()
    .from(compras)
    .where(eq(compras.produtoId, produtoId))
    .orderBy(desc(compras.dataCompra))
    .all();
}

/**
 * Retorna compras disponíveis (com estoque > 0) de um produto
 * Ordenado por dataCompra ASC (FIFO - mais antigas primeiro)
 * @param produtoId - ID do produto
 * @returns Array de compras com quantidadeDisponivel > 0, ordenadas por dataCompra ASC
 */
export function getComprasDisponiveisProduto(produtoId: number) {
  return db
    .select()
    .from(compras)
    .where(
      and(
        eq(compras.produtoId, produtoId),
        gt(compras.quantidadeDisponivel, 0)
      )
    )
    .orderBy(compras.dataCompra)
    .all();
}

/**
 * Retorna compra única por ID
 * @param id - ID da compra
 * @returns Compra ou undefined se não encontrada
 */
export function getCompraById(id: number) {
  return db.select().from(compras).where(eq(compras.id, id)).get();
}

/**
 * Retorna todas as compras com produtos associados
 * @returns Array de objetos com compra e produto, ordenadas por dataCompra DESC
 */
export function getComprasComProdutos() {
  return db
    .select({
      compra: compras,
      produto: produtos,
    })
    .from(compras)
    .leftJoin(produtos, eq(compras.produtoId, produtos.id))
    .orderBy(desc(compras.dataCompra))
    .all();
}

/**
 * Deduz quantidade do estoque disponível de uma compra
 * @param compraId - ID da compra
 * @param quantidade - Quantidade a deduzir
 * @returns Compra atualizada ou undefined se não encontrada
 */
export function deduzirEstoqueCompra(compraId: number, quantidade: number) {
  return db
    .update(compras)
    .set({
      quantidadeDisponivel: sql`${compras.quantidadeDisponivel} - ${quantidade}`,
      updatedAt: sql`(unixepoch())`,
    })
    .where(eq(compras.id, compraId))
    .returning()
    .get();
}
