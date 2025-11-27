import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

// Tabela de produtos LAB
export const produtosLab = sqliteTable('produtos_lab', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nome: text('nome').notNull(),
  precoUSD: real('preco_usd').notNull(),
  cotacao: real('cotacao').notNull(),
  freteTotal: real('frete_total').notNull(),
  fornecedor: text('fornecedor'),
  deletedAt: integer('deleted_at'),
  createdAt: integer('created_at').notNull().$defaultFn(() => Math.floor(Date.now() / 1000)),
  updatedAt: integer('updated_at').notNull().$defaultFn(() => Math.floor(Date.now() / 1000)),
});

// Tabela de cenários LAB
export const cenariosLab = sqliteTable('cenarios_lab', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  produtoId: integer('produto_id').notNull().references(() => produtosLab.id),
  nome: text('nome').notNull(),
  precoClassico: real('preco_classico').notNull(),
  precoPremium: real('preco_premium').notNull(),
  lucroClassico: real('lucro_classico').notNull(),
  lucroPremium: real('lucro_premium').notNull(),
  createdAt: integer('created_at').notNull().$defaultFn(() => Math.floor(Date.now() / 1000)),
});

// Tabela de configurações LAB
export const configuracoesLab = sqliteTable('configuracoes_lab', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  taxaClassico: real('taxa_classico').notNull(),
  taxaPremium: real('taxa_premium').notNull(),
  cotacaoDolar: real('cotacao_dolar').notNull(),
  updatedAt: integer('updated_at').notNull().$defaultFn(() => Math.floor(Date.now() / 1000)),
});

// Tabela de produtos PROD
export const produtosProd = sqliteTable('produtos_prod', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nome: text('nome').notNull(),
  fornecedor: text('fornecedor'),
  quantidade: integer('quantidade').notNull().default(0),
  deletedAt: integer('deleted_at'),
  createdAt: integer('created_at').notNull().$defaultFn(() => Math.floor(Date.now() / 1000)),
  updatedAt: integer('updated_at').notNull().$defaultFn(() => Math.floor(Date.now() / 1000)),
});

// Tabela de compras PROD
export const compras = sqliteTable('compras', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  produtoId: integer('produto_id').notNull().references(() => produtosProd.id),
  precoUSD: real('preco_usd').notNull(),
  cotacao: real('cotacao').notNull(),
  freteTotal: real('frete_total').notNull(),
  quantidadeComprada: integer('quantidade_comprada').notNull(),
  quantidadeDisponivel: integer('quantidade_disponivel').notNull(),
  custoUnitario: real('custo_unitario').notNull(),
  fornecedor: text('fornecedor'),
  observacoes: text('observacoes'),
  dataCompra: integer('data_compra').notNull(),
  createdAt: integer('created_at').notNull().$defaultFn(() => Math.floor(Date.now() / 1000)),
});

// Tabela de vendas PROD
export const vendas = sqliteTable('vendas', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  produtoId: integer('produto_id').notNull().references(() => produtosProd.id),
  quantidade: integer('quantidade').notNull(),
  precoVenda: real('preco_venda').notNull(),
  tipoAnuncio: text('tipo_anuncio').notNull(),
  frete: real('frete').notNull().default(0),
  custoTotal: real('custo_total').notNull(),
  receita: real('receita').notNull(),
  taxaML: real('taxa_ml').notNull(),
  lucroLiquido: real('lucro_liquido').notNull(),
  dataVenda: integer('data_venda').notNull(),
  createdAt: integer('created_at').notNull().$defaultFn(() => Math.floor(Date.now() / 1000)),
});

// Tabela de configurações PROD
export const configuracoesProd = sqliteTable('configuracoes_prod', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  taxaClassico: real('taxa_classico').notNull(),
  taxaPremium: real('taxa_premium').notNull(),
  cotacaoDolar: real('cotacao_dolar').notNull(),
  updatedAt: integer('updated_at').notNull().$defaultFn(() => Math.floor(Date.now() / 1000)),
});

