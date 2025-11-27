import {
  sqliteTable,
  text,
  integer,
  real,
} from 'drizzle-orm/sqlite-core';
import { relations, sql } from 'drizzle-orm';

// ============================================
// MODO LAB (Simulação)
// ============================================

export const produtosLab = sqliteTable('produtos_lab', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nome: text('nome').notNull(),
  precoUSD: real('precoUSD').notNull(),
  cotacao: real('cotacao').notNull(),
  freteTotal: real('freteTotal').notNull(),
  fornecedor: text('fornecedor'),
  deletedAt: integer('deletedAt'),
  createdAt: integer('createdAt')
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updatedAt')
    .notNull()
    .default(sql`(unixepoch())`),
});

export const cenariosLab = sqliteTable('cenarios_lab', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  produtoId: integer('produtoId')
    .notNull()
    .references(() => produtosLab.id, { onDelete: 'cascade' }),
  nome: text('nome').notNull(),
  precoVendaClassico: real('precoVendaClassico').notNull(),
  precoVendaPremium: real('precoVendaPremium').notNull(),
  taxaClassico: real('taxaClassico').notNull(),
  taxaPremium: real('taxaPremium').notNull(),
  lucroClassico: real('lucroClassico').notNull(),
  lucroPremium: real('lucroPremium').notNull(),
  createdAt: integer('createdAt')
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updatedAt')
    .notNull()
    .default(sql`(unixepoch())`),
});

export const configuracoesLab = sqliteTable('configuracoes_lab', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  taxaClassico: real('taxaClassico').notNull().default(11.0),
  taxaPremium: real('taxaPremium').notNull().default(16.0),
  cotacaoDolar: real('cotacaoDolar').notNull().default(1.0),
  updatedAt: integer('updatedAt')
    .notNull()
    .default(sql`(unixepoch())`),
});

// ============================================
// MODO PROD (Operação Real)
// ============================================

export const produtosProd = sqliteTable('produtos_prod', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nome: text('nome').notNull(),
  fornecedor: text('fornecedor'),
  quantidade: integer('quantidade').notNull().default(0),
  deletedAt: integer('deletedAt'),
  createdAt: integer('createdAt')
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updatedAt')
    .notNull()
    .default(sql`(unixepoch())`),
});

export const compras = sqliteTable('compras', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  produtoId: integer('produtoId')
    .notNull()
    .references(() => produtosProd.id, { onDelete: 'cascade' }),
  precoUSD: real('precoUSD').notNull(),
  cotacao: real('cotacao').notNull(),
  freteTotal: real('freteTotal').notNull(),
  quantidadeComprada: integer('quantidadeComprada').notNull(),
  quantidadeDisponivel: integer('quantidadeDisponivel').notNull(),
  moeda: text('moeda').notNull().default('USD'),
  fornecedor: text('fornecedor'),
  observacoes: text('observacoes'),
  custoUnitario: real('custoUnitario').notNull(),
  dataCompra: integer('dataCompra').notNull(),
  createdAt: integer('createdAt')
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updatedAt')
    .notNull()
    .default(sql`(unixepoch())`),
});

export const vendas = sqliteTable('vendas', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  produtoId: integer('produtoId')
    .notNull()
    .references(() => produtosProd.id, { onDelete: 'cascade' }),
  compraId: integer('compraId').references(() => compras.id, {
    onDelete: 'set null',
  }),
  quantidadeVendida: integer('quantidadeVendida').notNull(),
  precoVenda: real('precoVenda').notNull(),
  tipoAnuncio: text('tipoAnuncio').notNull(), // 'CLASSICO' | 'PREMIUM'
  freteCobrado: real('freteCobrado').notNull().default(0),
  taxaML: real('taxaML').notNull(),
  custoTotal: real('custoTotal').notNull(),
  lucroLiquido: real('lucroLiquido').notNull(),
  data: integer('data').notNull(),
  createdAt: integer('createdAt')
    .notNull()
    .default(sql`(unixepoch())`),
});

export const configuracoesProd = sqliteTable('configuracoes_prod', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  taxaClassico: real('taxaClassico').notNull().default(11.0),
  taxaPremium: real('taxaPremium').notNull().default(16.0),
  cotacaoDolar: real('cotacaoDolar').notNull().default(1.0),
  updatedAt: integer('updatedAt')
    .notNull()
    .default(sql`(unixepoch())`),
});

// ============================================
// RELATIONS (Drizzle ORM)
// ============================================

export const produtosLabRelations = relations(produtosLab, ({ many }) => ({
  cenarios: many(cenariosLab),
}));

export const cenariosLabRelations = relations(cenariosLab, ({ one }) => ({
  produto: one(produtosLab, {
    fields: [cenariosLab.produtoId],
    references: [produtosLab.id],
  }),
}));

export const produtosProdRelations = relations(produtosProd, ({ many }) => ({
  compras: many(compras),
  vendas: many(vendas),
}));

export const comprasRelations = relations(compras, ({ one, many }) => ({
  produto: one(produtosProd, {
    fields: [compras.produtoId],
    references: [produtosProd.id],
  }),
  vendas: many(vendas),
}));

export const vendasRelations = relations(vendas, ({ one }) => ({
  produto: one(produtosProd, {
    fields: [vendas.produtoId],
    references: [produtosProd.id],
  }),
  compra: one(compras, {
    fields: [vendas.compraId],
    references: [compras.id],
  }),
}));
