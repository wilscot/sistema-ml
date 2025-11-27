# ESCOPO DO PROJETO: Sistema de Gestão Mercado Livre v2.0

## 1. VISÃO GERAL

Descrição: Sistema desktop local para gestão de produtos importados com **dois ambientes completamente isolados**: LAB (simulação/testes) e PROD (operação real). Inclui controle de compras FIFO, registro de vendas, importação Excel ML e dashboard de métricas.

Tipo: Desktop App (instalador local)

Objetivo Principal: 
- **LAB**: Simular lucros de produtos antes de comprar
- **PROD**: Gerenciar negócio real (compras, vendas, dashboard com métricas)

Público-Alvo: Uso pessoal por vendedores/autônomos; pode crescer para equipe pequena (cada instalação independente).

Complexidade Estimada: Medium-High

---

## 2. TECH STACK (OBRIGATÓRIO)

Frontend:  
Framework: Next.js 14  
Linguagem: TypeScript  
Styling: Tailwind CSS  
UI Components: shadcn/ui  
Ícones: Lucide React  

Backend:  
Framework: Next.js API Routes  
Linguagem: TypeScript  
Database: SQLite via Drizzle ORM + better-sqlite3  
ORM: Drizzle ORM (schema e migrations 100% via código TypeScript)

Infraestrutura:  
Deploy: Instalador local (Windows/Linux/Mac)  
Node Version: 20.x  
Package Manager: pnpm  

---

## 3. INTEGRAÇÕES EXTERNAS

Tem integrações com APIs ou serviços externos? Sim

API/Serviço 1:  
Nome: AwesomeAPI (Cotação Dólar)  
Tipo: REST API  
Autenticação: Nenhuma  
Endpoints usados: GET /json/last/USD-BRL  
Documentação: [https://docs.awesomeapi.com.br](https://docs.awesomeapi.com.br)

---

## 4. DEPENDÊNCIAS PRINCIPAIS

Produção:
- next
- react
- typescript
- tailwindcss
- drizzle-orm
- better-sqlite3
- shadcn/ui
- lucide-react
- date-fns
- recharts (para gráficos do dashboard)

Desenvolvimento:
- @types/node
- @types/react
- @types/better-sqlite3
- drizzle-kit (CLI para migrations)
- eslint
- prettier

---

## 5. REGRAS DE NEGÓCIO

### Regra 1: Separação Total LAB/PROD
Descrição: LAB e PROD são ambientes **100% independentes** com tabelas separadas no banco  
Implementação:
- Tabelas: `produtos_lab`, `cenarios_lab`, `configuracoes_lab` (LAB)
- Tabelas: `produtos_prod`, `compras`, `vendas`, `configuracoes_prod` (PROD)
- Context Provider React controla qual modo está ativo
- Toggle no header alterna entre LAB ↔ PROD
- Navegação condicional: cada modo mostra apenas suas telas

Validações:
- LAB não tem acesso a compras/vendas
- PROD não tem acesso a simulações
- Configurações são independentes (cada modo tem suas taxas ML)

### Regra 2: Migração LAB → PROD
Descrição: Produto cadastrado no LAB pode ser copiado para PROD via botão "Exportar para PROD"  
Implementação:
- Copia: nome, fornecedor, preço USD, cotação, frete
- Original **permanece intacto** no LAB
- Cria novo registro na tabela `produtos_prod`
- Não copia: cenários, simulações, ID

Validações:
- Campos obrigatórios devem estar preenchidos
- Confirmação: "Exportar [Nome] para PROD?"

### Regra 3: Sistema de Compras (FIFO)
Descrição: Cada entrada de estoque é registrada como uma "compra" com custo unitário calculado e salvo  
Implementação:
- Tabela `compras` vinculada a `produtos_prod`
- Custo Unitário = (preço USD × cotação + frete total) ÷ quantidade
- FIFO: Vendas deduzem das compras mais antigas primeiro
- `quantidadeDisponivel` diminui, `quantidadeComprada` permanece fixo

Validações:
- Venda não pode ocorrer sem compra disponível
- Sistema busca compras com `quantidadeDisponivel > 0` ordenadas por `dataCompra ASC`
- Se uma compra não cobre toda venda, sistema deduz de múltiplas compras

### Regra 4: Vendas Deduzem Estoque Automaticamente
Descrição: Cada venda registrada deduz automaticamente da compra mais antiga (FIFO)  
Implementação:
- Sistema calcula `custoTotal` somando custos proporcionais das compras usadas
- Lucro = (preço venda × qtd) + frete cobrado - custo total - taxa ML
- Atualiza `compra.quantidadeDisponivel` via SQL transaction

Validações:
- Estoque não pode ficar negativo
- Venda bloqueada se não houver compras disponíveis

### Regra 5: Simulações (Apenas LAB)
Descrição: Múltiplos cenários de precificação podem ser salvos por produto LAB  
Implementação:
- Tabela `cenarios_lab` vinculada a `produtos_lab`
- Calcula lucro para anúncio clássico (11%) e premium (16%)
- Cenários ficam recolhidos por padrão (expandir para ver)

Validações:
- Campos obrigatórios: preço venda, frete cobrado
- Simulação não afeta estoque real

### Regra 6: Configurações Independentes
Descrição: LAB e PROD têm configurações separadas  
Implementação:
- Tabela `configuracoes_lab` (taxas ML para simulação)
- Tabela `configuracoes_prod` (taxas ML para vendas reais)
- Valores default: 11% (clássico), 16% (premium)
- Cotação dólar pode ser manual ou via API

### Regra 7: Lixeira e Restauração
Descrição: Produtos deletados podem ser restaurados  
Implementação:
- Soft delete (campo `deleted_at`)
- LAB deletado → restaura em LAB
- PROD deletado → move para LAB (nunca delete permanente)

---

## 6. FUNCIONALIDADES

### 🧪 MODO LAB (Simulação)

#### Feature LAB-1: Produtos LAB
**Descrição:** Cadastro simplificado para teste de viabilidade  
**Campos:** Nome, preço USD, cotação, frete total, fornecedor  
**UI/UX:** 
- Tela `/lab/produtos`
- Formulário de cadastro
- Lista com busca/filtros
- Botão "Exportar para PROD" em cada produto

**Validações:**
- Nome obrigatório (min 3 caracteres)
- Preço USD > 0
- Cotação > 0
- Frete >= 0

#### Feature LAB-2: Simulação de Cenários
**Descrição:** Calcular lucros hipotéticos (clássico vs premium)  
**Tela:** `/lab/simulacao`  
**Requisitos:**
- Selecionar produto LAB
- Informar: preço venda, frete cobrado
- Sistema calcula automaticamente: taxa ML, lucro líquido
- Salvar múltiplos cenários por produto

**UI/UX:**
- Lista de cenários recolhida (expandir para editar)
- Comparação lado a lado: Clássico vs Premium
- Destaque visual: lucro positivo (verde), negativo (vermelho)

#### Feature LAB-3: Lixeira LAB
**Descrição:** Restaurar produtos deletados  
**Tela:** `/lab/lixeira`  
**Comportamento:** Produto restaurado volta para LAB

#### Feature LAB-4: Configurações LAB
**Descrição:** Editar taxas ML para simulações  
**Tela:** `/lab/configuracoes`  
**Campos:** Taxa Clássico (%), Taxa Premium (%), Cotação Dólar

---

### 🏭 MODO PROD (Operação Real)

#### Feature PROD-1: Produtos PROD
**Descrição:** Cadastro base de produtos em produção  
**Campos:** Nome, fornecedor (campos de custo vêm das compras)  
**Tela:** `/prod/produtos`  
**UI/UX:**
- Lista de produtos com indicador de estoque
- Badge: "Sem estoque" se quantidade = 0

**Observação:** Custos/preços não ficam aqui, ficam na tabela `compras`

#### Feature PROD-2: Sistema de Compras (JÁ IMPLEMENTADO)
**Descrição:** Registrar entradas de estoque com custos  
**Tela:** `/prod/compras`  
**Formulário:**
- Select produto
- Preço USD unitário
- Cotação (com botão buscar API)
- Frete total (BRL)
- Quantidade comprada
- Fornecedor
- Data da compra
- Observações

**Preview em tempo real:**
- Custo unitário calculado
- Custo total (unitário × quantidade)

**Validações:**
- Todos campos obrigatórios
- Preço > 0, Cotação > 0, Quantidade > 0
- Frete >= 0

**Arquivos envolvidos:**
- `src/db/schema.ts` (tabela compras)
- `src/app/prod/compras/page.tsx`
- `src/components/CompraForm.tsx`
- `src/lib/calculators.ts` (calcularCustoTotal)

#### Feature PROD-3: Registro de Vendas (JÁ IMPLEMENTADO)
**Descrição:** Registrar vendas manuais ou importar Excel ML  
**Tela:** `/prod/vendas`  

**Formulário Manual:**
- Select produto
- Quantidade vendida
- Preço venda
- Tipo anúncio (Clássico/Premium)
- Frete cobrado
- Data

**Importação Excel:**
- Upload planilha ML (formato específico)
- Parser automático
- Preview antes de importar
- Vincula vendas às compras via FIFO

**Cálculos automáticos:**
- Taxa ML (% sobre preço venda)
- Custo total (FIFO das compras)
- Lucro líquido = receita - custo - taxa ML

**Validações:**
- Não permite venda sem estoque
- Alerta se estoque insuficiente

**Arquivos envolvidos:**
- `src/app/prod/vendas/page.tsx`
- `src/app/prod/vendas/importar/page.tsx`
- `src/lib/excel-parser.ts`
- `src/lib/calculators.ts` (calcularLucro, calcularTaxaML)

#### Feature PROD-4: Dashboard ✨ NOVO
**Descrição:** Painel com métricas do mês atual  
**Tela:** `/prod/dashboard`  

**Cards de Resumo:**
```
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│ Vendas Este Mês     │  │ Faturamento Bruto   │  │ Lucro Líquido       │
│ 15 vendas           │  │ R$ 5.250,00         │  │ R$ 1.340,00         │
│ ↑ +5 vs mês passado │  │ ↑ +12% vs anterior  │  │ ↑ +8% vs anterior   │
└─────────────────────┘  └─────────────────────┘  └─────────────────────┘
```

**Métricas:**
- **Vendas do mês:** COUNT(vendas) WHERE MONTH(data) = mês atual
- **Faturamento Bruto:** SUM(precoVenda × quantidadeVendida)
- **Lucro Líquido:** SUM(lucroLiquido) de todas vendas

**Gráficos (opcional):**
- Evolução de vendas (últimos 6 meses)
- Top 5 produtos mais vendidos
- Distribuição Clássico vs Premium

**Filtros:**
- Período (mês atual, últimos 30 dias, personalizado)

**Arquivos a criar:**
- `src/app/prod/dashboard/page.tsx`
- `src/components/DashboardCard.tsx`
- `src/lib/dashboard-stats.ts` (funções de cálculo)

#### Feature PROD-5: Lixeira PROD
**Descrição:** Restaurar produtos deletados  
**Tela:** `/prod/lixeira`  
**Comportamento:** Produto restaurado **move para LAB** (não volta para PROD)

#### Feature PROD-6: Configurações PROD
**Descrição:** Editar taxas ML para vendas reais  
**Tela:** `/prod/configuracoes`  
**Campos:** Taxa Clássico (%), Taxa Premium (%), Cotação Dólar

---

### 🌐 GLOBAL (Ambos os modos)

#### Feature GLOBAL-1: Context Provider LAB/PROD
**Descrição:** Sistema global de controle de modo  
**Implementação:**
- Context Provider React: `<ModeProvider>`
- Hook: `useMode()` retorna `{ mode: 'LAB' | 'PROD', setMode }`
- Persistência: localStorage
- Todas queries filtram por modo ativo

**Arquivos a criar:**
- `src/contexts/ModeContext.tsx`
- `src/hooks/useMode.ts`

#### Feature GLOBAL-2: Toggle Header
**Descrição:** Botão no cabeçalho para alternar LAB ↔ PROD  
**UI/UX:**
- Botão toggle estilizado: 🧪 LAB | 🏭 PROD
- Indicador visual claro do modo ativo
- Confirmação se houver formulários não salvos

**Arquivo a modificar:**
- `src/components/Navbar.tsx`

#### Feature GLOBAL-3: Navegação Condicional
**Descrição:** Menu lateral mostra apenas opções do modo ativo  

**Menu LAB:**
- Produtos LAB
- Simulação
- Lixeira
- Configurações

**Menu PROD:**
- Dashboard
- Produtos
- Compras
- Vendas
- Lixeira
- Configurações

---

## 7. O QUE NÃO FAZER

Funcionalidades Excluídas:
❌ Integração automática com API Mercado Livre  
❌ Notificações/alertas de estoque mínimo  
❌ Edição em massa via CSV/Excel (apenas importação)  
❌ Robôs/automatização de preços  
❌ Gestão multi-usuários (cada instalação é single-user)  
❌ Exportação de relatório (CSV/PDF) no Dashboard  
❌ Alertas visuais avançados
❌ Sincronização entre instalações (cloud)
❌ Gráficos complexos no Dashboard (manter simples)
❌ Previsão de demanda ou IA

Tecnologias Excluídas:
❌ Material-UI (usar apenas shadcn/ui)  
❌ Express/Node puro (usar Next.js API)  
❌ MongoDB, Firebase, Supabase (usar SQLite local)
❌ PocketBase (complexo para setup automático)
❌ Prisma (usar Drizzle ORM)
❌ Zustand/Redux (usar Context API)

---

## 8. ESTRUTURA DE DADOS

### Drizzle Schema (src/db/schema.ts):

```typescript
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// ========== LAB ==========

export const produtosLab = sqliteTable('produtos_lab', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nome: text('nome').notNull(),
  precoUSD: real('preco_usd').notNull(),
  cotacao: real('cotacao').notNull(),
  freteTotal: real('frete_total').notNull().default(0),
  fornecedor: text('fornecedor'),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

export const cenariosLab = sqliteTable('cenarios_lab', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  produtoId: integer('produto_id').notNull().references(() => produtosLab.id, { onDelete: 'cascade' }),
  nome: text('nome').notNull(),
  precoVendaClassico: real('preco_venda_classico').notNull(),
  precoVendaPremium: real('preco_venda_premium').notNull(),
  taxaClassico: real('taxa_classico').notNull(),
  taxaPremium: real('taxa_premium').notNull(),
  freteCobrado: real('frete_cobrado').notNull(),
  lucroClassico: real('lucro_classico').notNull(),
  lucroPremium: real('lucro_premium').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

export const configuracoesLab = sqliteTable('configuracoes_lab', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  taxaClassico: real('taxa_classico').notNull().default(11),
  taxaPremium: real('taxa_premium').notNull().default(16),
  cotacaoDolar: real('cotacao_dolar'),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

// ========== PROD ==========

export const produtosProd = sqliteTable('produtos_prod', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nome: text('nome').notNull(),
  fornecedor: text('fornecedor'),
  quantidade: integer('quantidade').notNull().default(0), // soma de todas compras disponíveis
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

export const compras = sqliteTable('compras', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  produtoId: integer('produto_id').notNull().references(() => produtosProd.id, { onDelete: 'cascade' }),
  precoUSD: real('preco_usd').notNull(),
  cotacao: real('cotacao').notNull(),
  freteTotal: real('frete_total').notNull().default(0),
  quantidadeComprada: integer('quantidade_comprada').notNull(),
  quantidadeDisponivel: integer('quantidade_disponivel').notNull(),
  moeda: text('moeda', { enum: ['USD', 'BRL'] }).notNull().default('USD'),
  fornecedor: text('fornecedor'),
  observacoes: text('observacoes'),
  custoUnitario: real('custo_unitario').notNull(), // (precoUSD × cotacao + freteTotal) ÷ quantidade
  dataCompra: integer('data_compra', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

export const vendas = sqliteTable('vendas', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  produtoId: integer('produto_id').notNull().references(() => produtosProd.id, { onDelete: 'cascade' }),
  compraId: integer('compra_id').references(() => compras.id), // rastreabilidade FIFO
  quantidadeVendida: integer('quantidade_vendida').notNull(),
  precoVenda: real('preco_venda').notNull(),
  tipoAnuncio: text('tipo_anuncio', { enum: ['CLASSICO', 'PREMIUM'] }).notNull(),
  freteCobrado: real('frete_cobrado').notNull(),
  taxaML: real('taxa_ml').notNull(),
  custoTotal: real('custo_total').notNull(), // custo real da(s) compra(s) usada(s)
  lucroLiquido: real('lucro_liquido').notNull(),
  data: integer('data', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

export const configuracoesProd = sqliteTable('configuracoes_prod', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  taxaClassico: real('taxa_classico').notNull().default(11),
  taxaPremium: real('taxa_premium').notNull().default(16),
  cotacaoDolar: real('cotacao_dolar'),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

// ========== TYPES ==========

export type ProdutoLab = typeof produtosLab.$inferSelect;
export type NovoProdutoLab = typeof produtosLab.$inferInsert;
export type CenarioLab = typeof cenariosLab.$inferSelect;
export type NovoCenarioLab = typeof cenariosLab.$inferInsert;

export type ProdutoProd = typeof produtosProd.$inferSelect;
export type NovoProdutoProd = typeof produtosProd.$inferInsert;
export type Compra = typeof compras.$inferSelect;
export type NovaCompra = typeof compras.$inferInsert;
export type Venda = typeof vendas.$inferSelect;
export type NovaVenda = typeof vendas.$inferInsert;

export type ConfiguracaoLab = typeof configuracoesLab.$inferSelect;
export type ConfiguracaoProd = typeof configuracoesProd.$inferSelect;
```

Persistência:  
Tipo: SQLite local via Drizzle ORM  
Localização: Raiz do projeto (./db/data.db)  
Observações: 
- Schema totalmente definido em TypeScript
- Migrations automáticas via drizzle-kit push
- Type-safe queries automáticos
- Tabelas separadas garantem isolamento LAB/PROD

---

## 9. CASOS DE USO

### UC1: Simular Produto no LAB
Ator: Usuário  
Fluxo Principal:
1. Acessa modo LAB (toggle no header)
2. Cadastra produto: nome, preço USD, cotação, frete
3. Cria cenários de simulação (clássico vs premium)
4. Sistema calcula lucros automaticamente
5. Decide se vale a pena comprar o produto

### UC2: Exportar Produto LAB → PROD
Ator: Usuário  
Pré-condição: Produto cadastrado no LAB  
Fluxo Principal:
1. Usuário está no modo LAB, visualizando produto
2. Clica em "Exportar para PROD"
3. Confirmação: "Deseja exportar [Nome] para PROD?"
4. Sistema copia dados base para `produtos_prod`
5. Original permanece intacto em `produtos_lab`
6. Toast: "Produto exportado com sucesso!"

### UC3: Registrar Compra (PROD)
Ator: Usuário  
Pré-condição: Produto existe em PROD  
Fluxo Principal:
1. Acessa modo PROD
2. Navega para /prod/compras
3. Clica "Nova Compra"
4. Preenche formulário: produto, preço USD, cotação, frete, quantidade
5. Sistema calcula custo unitário em tempo real
6. Usuário salva
7. Sistema:
   - Insere registro em `compras`
   - Atualiza `produtos_prod.quantidade` (+quantidade comprada)
8. Toast: "Compra registrada!"

### UC4: Registrar Venda Manual (PROD)
Ator: Usuário  
Pré-condição: Produto tem estoque disponível  
Fluxo Principal:
1. Navega para /prod/vendas
2. Clica "Nova Venda"
3. Preenche: produto, quantidade, preço, tipo anúncio, frete
4. Sistema busca compras disponíveis (FIFO)
5. Preview mostra: taxa ML, custo, lucro estimado
6. Usuário salva
7. Sistema:
   - Deduz estoque da(s) compra(s) mais antigas
   - Calcula custo total real (FIFO)
   - Insere registro em `vendas`
   - Atualiza `compra.quantidadeDisponivel`
8. Toast: "Venda registrada! Lucro: R$ X,XX"

### UC5: Visualizar Dashboard (PROD)
Ator: Usuário  
Fluxo Principal:
1. Acessa modo PROD
2. Navega para /prod/dashboard (ou página inicial PROD)
3. Sistema carrega métricas do mês:
   - COUNT(vendas) do mês atual
   - SUM(precoVenda × quantidadeVendida) = Faturamento Bruto
   - SUM(lucroLiquido) = Lucro Líquido
4. Exibe cards com valores e variação vs mês anterior
5. Opcional: Gráfico de evolução mensal

### UC6: Alternar entre LAB e PROD
Ator: Usuário  
Fluxo Principal:
1. Usuário clica no toggle do header
2. Sistema verifica se há formulários não salvos
3. Se sim: Confirmação "Você tem alterações não salvas. Continuar?"
4. Sistema atualiza Context: `setMode('LAB' | 'PROD')`
5. Sistema atualiza localStorage
6. Navegação é filtrada automaticamente
7. Queries passam a usar tabelas do modo ativo

### UC7: Deletar e Restaurar Produto
Ator: Usuário  
Fluxo Principal:
1. Usuário deleta produto (LAB ou PROD)
2. Soft delete: `deleted_at = NOW()`
3. Produto some da listagem principal
4. Usuário acessa lixeira do modo ativo
5. Clica "Restaurar"
6. Sistema:
   - Se LAB: `deleted_at = null` (restaura em LAB)
   - Se PROD: move para LAB (`tipo = 'LAB'`, `deleted_at = null`)

---

## 10. VALIDAÇÕES E REGRAS DE CAMPO

### Formulário: Cadastro Produto LAB
Campo: Nome  
- Tipo: text  
- Obrigatório: Sim  
- Validação: minLength 3  
- Mensagem erro: "Nome deve ter ao menos 3 caracteres"

Campo: Preço USD  
- Tipo: number  
- Obrigatório: Sim  
- Validação: minValue 0.01  
- Mensagem erro: "Preço deve ser maior que zero"

Campo: Cotação  
- Tipo: number  
- Obrigatório: Sim  
- Validação: minValue 0.01  
- Mensagem erro: "Cotação inválida"

Campo: Frete Total  
- Tipo: number  
- Obrigatório: Não  
- Validação: minValue 0  
- Mensagem erro: "Frete não pode ser negativo"

### Formulário: Registro de Compra
Campo: Produto  
- Tipo: select  
- Obrigatório: Sim  
- Validação: produto deve existir em PROD  
- Mensagem erro: "Selecione um produto"

Campo: Quantidade  
- Tipo: number  
- Obrigatório: Sim  
- Validação: minValue 1  
- Mensagem erro: "Quantidade mínima: 1"

### Formulário: Registro de Venda
Campo: Quantidade Vendida  
- Tipo: number  
- Obrigatório: Sim  
- Validação: minValue 1 AND <= estoque disponível  
- Mensagem erro: "Estoque insuficiente! Disponível: X unidades"

Campo: Tipo Anúncio  
- Tipo: select  
- Obrigatório: Sim  
- Opções: ['CLASSICO', 'PREMIUM']  
- Mensagem erro: "Selecione o tipo de anúncio"

---

## 11. CRITÉRIOS DE ACEITE

### Funcionalidades LAB:
- [ ] Cadastro de produto LAB funcionando
- [ ] Simulação de cenários salva múltiplos cenários
- [ ] Botão "Exportar para PROD" funciona corretamente
- [ ] Lixeira LAB restaura produtos em LAB
- [ ] Configurações LAB independentes de PROD

### Funcionalidades PROD:
- [ ] Dashboard exibe métricas corretas do mês
- [ ] Sistema de compras registra entradas (FIFO)
- [ ] Vendas deduzem estoque automaticamente
- [ ] Importação Excel ML funciona
- [ ] Lixeira PROD move produtos para LAB ao restaurar
- [ ] Configurações PROD independentes de LAB

### Separação LAB/PROD:
- [ ] Toggle header alterna entre modos
- [ ] Context Provider controla modo ativo
- [ ] Navegação mostra apenas opções do modo ativo
- [ ] Queries filtram automaticamente por modo
- [ ] localStorage persiste modo selecionado

### Validações:
- [ ] Todos campos obrigatórios validados
- [ ] Mensagens de erro adequadas
- [ ] Venda não ocorre sem estoque
- [ ] Alertas visuais (estoque baixo, lucro negativo)

### UX:
- [ ] Interface intuitiva
- [ ] Responsivo (mobile-friendly)
- [ ] Loading/empty states visíveis
- [ ] Operações rápidas (<200ms)
- [ ] Feedback visual (toasts) em ações

### Técnico:
- [ ] Código sem erros TypeScript
- [ ] Drizzle ORM funcionando corretamente
- [ ] Migrations automáticas via script
- [ ] Sistema funciona 100% offline (após setup inicial)
- [ ] FIFO implementado corretamente
- [ ] Cálculos de lucro precisos

---

## 12. DEPLOYMENT

Tipo: Instalador Local (não vai para cloud)  
Ambiente: Desktop/Servidor local do cliente

**Estrutura de instalação:**
```
sistema-ml/
├── src/
│   ├── app/
│   │   ├── lab/          # Rotas LAB
│   │   └── prod/         # Rotas PROD
│   ├── contexts/
│   │   └── ModeContext.tsx
│   ├── db/
│   │   ├── schema.ts
│   │   └── index.ts
│   ├── lib/
│   │   ├── calculators.ts
│   │   └── excel-parser.ts
│   └── components/
├── db/
│   └── data.db (criado automaticamente)
├── package.json
└── drizzle.config.ts
```

**Setup automático do banco:**
```typescript
// scripts/setup-db.ts
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';

const sqlite = new Database('./db/data.db');
const db = drizzle(sqlite);

// Cria todas as tabelas automaticamente
// Seed inicial: cria configurações default para LAB e PROD
```

**Como rodar:**
```bash
# 1. Instalar dependências
pnpm install

# 2. Criar banco e tabelas (automático)
pnpm db:push

# 3. Iniciar aplicação
pnpm dev
```

**Scripts package.json:**
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "db:push": "drizzle-kit push:sqlite",
    "db:studio": "drizzle-kit studio",
    "db:seed": "tsx scripts/seed.ts"
  }
}
```

Não precisa:
- [ ] Deploy em servidor web
- [ ] CI/CD
- [ ] Monitoramento cloud
- [ ] Backup automático cloud (usuário faz backup manual do data.db)

---

## 13. MANUTENÇÃO FUTURA (Opcional)

Features que PODEM ser adicionadas depois (não agora):
- Integração API ML para vendas automáticas
- Relatórios exportáveis (PDF/Excel)
- Gráficos avançados no Dashboard
- Alertas de estoque mínimo
- Previsão de demanda (IA/ML)
- Multi-usuários com permissões
- Sincronização cloud opcional
- App mobile companion

Condição: Implementar apenas se solicitado pelo usuário.

---

## 14. RESUMO EXECUTIVO

**O que é:** Sistema desktop local com **dois ambientes isolados** (LAB para simulação, PROD para operação real), controle FIFO de compras, registro de vendas e dashboard com métricas.

**Diferencial:** 
- Separação total LAB/PROD (simular sem afetar dados reais)
- FIFO implementado (custo real por venda)
- Dashboard com métricas (faturamento, lucro líquido)
- Importação Excel ML (parser automático)
- 100% local e offline-first
- Setup automático ZERO configuração manual

**Tecnologia:** Next.js 14 + TypeScript + Drizzle ORM + SQLite + shadcn/ui + Context API

**Complexidade:** Medium-High

**Prazo estimado:** 6-8 dias úteis (refatoramento + novas features)

**Usuário final:** Vendedor autônomo/importador (instalador desktop)

**Performance:** <200ms para operações CRUD

**Vantagens da Arquitetura:**
✅ Isolamento LAB/PROD evita erros
✅ FIFO garante custo real por venda
✅ Dashboard dá visibilidade do negócio
✅ Context Provider simplifica controle de modo
✅ Drizzle ORM 100% type-safe
✅ Migrations automáticas
✅ Zero configuração manual
