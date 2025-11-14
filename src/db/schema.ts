import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const produtos = sqliteTable('produtos', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nome: text('nome').notNull(),
  precoUSD: real('preco_usd').notNull(),
  cotacao: real('cotacao').notNull(),
  freteTotal: real('frete_total').notNull(),
  quantidade: integer('quantidade').notNull().default(0),
  fornecedor: text('fornecedor'),
  tipo: text('tipo', { enum: ['LAB', 'PROD'] }).notNull().default('LAB'),
  moeda: text('moeda', { enum: ['USD', 'BRL'] }).notNull().default('USD'),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const cenarios = sqliteTable('cenarios', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  produtoId: integer('produto_id')
    .notNull()
    .references(() => produtos.id, { onDelete: 'cascade' }),
  nome: text('nome').notNull(),
  precoVendaClassico: real('preco_venda_classico').notNull(),
  precoVendaPremium: real('preco_venda_premium').notNull(),
  taxaClassico: real('taxa_classico').notNull(),
  taxaPremium: real('taxa_premium').notNull(),
  freteCobrado: real('frete_cobrado').notNull(),
  lucroClassico: real('lucro_classico').notNull(),
  lucroPremium: real('lucro_premium').notNull(),
  lucroLiquidoClassico: real('lucro_liquido_classico').notNull().default(0),
  lucroLiquidoPremium: real('lucro_liquido_premium').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const vendas = sqliteTable('vendas', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  produtoId: integer('produto_id')
    .notNull()
    .references(() => produtos.id, { onDelete: 'restrict' }),
  quantidadeVendida: integer('quantidade_vendida').notNull(),
  precoVenda: real('preco_venda').notNull(),
  tipoAnuncio: text('tipo_anuncio', { enum: ['CLASSICO', 'PREMIUM'] }).notNull(),
  freteCobrado: real('frete_cobrado').notNull(),
  taxaML: real('taxa_ml').notNull(),
  lucroLiquido: real('lucro_liquido').notNull(),
  data: integer('data', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  
  // Campos detalhados do Mercado Livre
  numeroVenda: text('numero_venda'),
  estado: text('estado'),
  descricaoStatus: text('descricao_status'),
  precoUnitario: real('preco_unitario'),
  variacao: text('variacao'),
  numeroAnuncio: text('numero_anuncio'),
  canalVenda: text('canal_venda'),
  sku: text('sku'),
  
  // Cliente
  nomeComprador: text('nome_comprador'),
  cpfComprador: text('cpf_comprador'),
  enderecoComprador: text('endereco_comprador'),
  cidadeComprador: text('cidade_comprador'),
  estadoComprador: text('estado_comprador'),
  cepComprador: text('cep_comprador'),
  paisComprador: text('pais_comprador'),
  
  // Envio
  formaEntrega: text('forma_entrega'),
  dataCaminho: text('data_caminho'),
  dataEntrega: text('data_entrega'),
  motorista: text('motorista'),
  numeroRastreamento: text('numero_rastreamento'),
  urlRastreamento: text('url_rastreamento'),
  
  // Faturamento
  dadosPessoaisEmpresa: text('dados_pessoais_empresa'),
  tipoDocumento: text('tipo_documento'),
  enderecoDados: text('endereco_dados'),
  tipoContribuinte: text('tipo_contribuinte'),
  inscricaoEstadual: text('inscricao_estadual'),
  
  // Dados financeiros detalhados
  receita: real('receita'),
  receitaEnvio: real('receita_envio'),
  taxaEnvio: real('taxa_envio'),
});

export const configuracoes = sqliteTable('configuracoes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  taxaClassico: real('taxa_classico').notNull().default(11),
  taxaPremium: real('taxa_premium').notNull().default(16),
  cotacaoDolar: real('cotacao_dolar'),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

// TypeScript types inferidos automaticamente
export type Produto = typeof produtos.$inferSelect;
export type NovoProduto = typeof produtos.$inferInsert;
export type Cenario = typeof cenarios.$inferSelect;
export type NovoCenario = typeof cenarios.$inferInsert;
export type Venda = typeof vendas.$inferSelect;
export type NovaVenda = typeof vendas.$inferInsert;
export type Configuracao = typeof configuracoes.$inferSelect;
export type NovaConfiguracao = typeof configuracoes.$inferInsert;
