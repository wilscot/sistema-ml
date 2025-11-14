# ESCOPO DO PROJETO: Sistema de GestÃ£o Mercado Livre

## 1. VISÃƒO GERAL

DescriÃ§Ã£o: Sistema desktop local para gestÃ£o de produtos importados, registro de custos bÃ¡sicos, simulaÃ§Ã£o de cenÃ¡rios de preÃ§o e lucro, controle manual de vendas, estoque e ambientes LAB/PROD independentes.

Tipo: Desktop App (instalador local)

Objetivo Principal: Calcular preÃ§o ideal de venda, lucro lÃ­quido e taxa ML, registrar vendas manualmente, organizar produtos e cenÃ¡rios de simulaÃ§Ã£o.

PÃºblico-Alvo: Uso pessoal por vendedores/autÃ´nomos; pode crescer para equipe pequena (cada instalaÃ§Ã£o independente).

Complexidade Estimada: Medium

---

## 2. TECH STACK (OBRIGATÃ“RIO)

Frontend:  
Framework: Next.js 14  
Linguagem: TypeScript  
Styling: Tailwind CSS  
UI Components: shadcn/ui  
Ãcones: Lucide React  

Backend:  
Framework: Next.js API Routes  
Linguagem: TypeScript  
Database: SQLite via Drizzle ORM + better-sqlite3  
ORM: Drizzle ORM (schema e migrations 100% via cÃ³digo TypeScript)

Infraestrutura:  
Deploy: Instalador local (Windows/Linux/Mac)  
Node Version: 20.x  
Package Manager: pnpm  

---

## 3. INTEGRAÃ‡Ã•ES EXTERNAS

Tem integraÃ§Ãµes com APIs ou serviÃ§os externos? Sim

API/ServiÃ§o 1:  
Nome: AwesomeAPI (CotaÃ§Ã£o DÃ³lar)  
Tipo: REST API  
AutenticaÃ§Ã£o: Nenhuma  
Endpoints usados: GET /json/last/USD-BRL  
DocumentaÃ§Ã£o: [https://docs.awesomeapi.com.br](https://docs.awesomeapi.com.br)

---

## 4. DEPENDÃŠNCIAS PRINCIPAIS

ProduÃ§Ã£o:
- next
- react
- typescript
- tailwindcss
- drizzle-orm
- better-sqlite3
- shadcn/ui
- lucide-react
- date-fns

Desenvolvimento:
- @types/node
- @types/react
- @types/better-sqlite3
- drizzle-kit (CLI para migrations)
- eslint
- prettier

---

## 5. REGRAS DE NEGÃ“CIO

Regra 1: Produto sÃ³ pode ser migrado do LAB para PROD via aÃ§Ã£o explÃ­cita  
DescriÃ§Ã£o: Produto cadastrado na simulaÃ§Ã£o Ã© COPIADO para produÃ§Ã£o manualmente (original permanece em LAB)  
FÃ³rmula/LÃ³gica: NÃ£o aplicÃ¡vel

ValidaÃ§Ãµes:
- Quantidade, valor e custos obrigatÃ³rios para migraÃ§Ã£o
- Cria novo registro PROD mantendo LAB intacto

ExceÃ§Ãµes:
- Se dados incompletos, nÃ£o permite migraÃ§Ã£o

Regra 2: Cada venda deduz automaticamente do estoque do produto vendido  
DescriÃ§Ã£o: Venda registrada em PROD ajusta estoque do produto base

ValidaÃ§Ãµes:
- Estoque nÃ£o pode ficar negativo

ExceÃ§Ã£o:
- Venda nÃ£o registrada se estoque zerado

Regra 3: SimulaÃ§Ãµes podem salvar mÃºltiplos cenÃ¡rios por produto  
DescriÃ§Ã£o: UsuÃ¡rio pode criar/editar cenÃ¡rios com diferentes valores. Todos ficam recolhidos por padrÃ£o.

Regra 4: Taxas ML sÃ£o editÃ¡veis  
DescriÃ§Ã£o: Valores default para anÃºncios clÃ¡ssico (11%) e premium (16%) podem ser ajustados nas configuraÃ§Ãµes globais.

Regra 5: Lixeira e RestauraÃ§Ã£o
DescriÃ§Ã£o: Produtos deletados podem ser restaurados
- LAB deletado â†’ restaura em LAB
- PROD deletado â†’ move para LAB (nunca delete permanente)
- Soft delete com campo `deleted_at`

---

## 6. FUNCIONALIDADES

FASE 1: Setup Inicial e Cadastro  
Feature 1.1: Cadastro de Produto  
DescriÃ§Ã£o: Cadastrar novo produto no sistema  
Requisitos:
- Nome, preÃ§o em USD, cotaÃ§Ã£o, frete, quantidade  
UI/UX:
- Tela de cadastro e lista
- InteraÃ§Ã£o: input, create, delete (soft), editar
- Auto-refresh apÃ³s criar/editar/deletar
ValidaÃ§Ãµes:
- Campos obrigatÃ³rios para cadastro

Feature 1.2: Ambientes LAB/PROD  
DescriÃ§Ã£o: Bancos isolados para simulaÃ§Ã£o e produÃ§Ã£o  
Requisitos:
- Copiar produto com botÃ£o "migrar para produÃ§Ã£o"
- Original permanece em LAB  
UI/UX:
- Filtro/aba para alternar ambiente

Feature 1.3: Lixeira e RestauraÃ§Ã£o
DescriÃ§Ã£o: Gerenciar produtos deletados
Requisitos:
- Soft delete (campo deleted_at)
- Visualizar lixeira
- Restaurar produto
- LAB restaura em LAB, PROD move para LAB
UI/UX:
- Ãcone lixeira nas pÃ¡ginas
- Modal de confirmaÃ§Ã£o ao deletar
- Lista de itens na lixeira

FASE 2: SimulaÃ§Ã£o de CenÃ¡rios  
Feature 2.1: Simulador de PreÃ§o/Lucro  
DescriÃ§Ã£o: Gerar e editar cenÃ¡rios de preÃ§o por produto  
Requisitos:
- Salvar mÃºltiplos cenÃ¡rios associados ao produto  
UI/UX:
- Lista recolhida; expandir para editar  
ValidaÃ§Ãµes:
- CenÃ¡rio sÃ³ pode ser salvo com campos vÃ¡lidos

FASE 3: GestÃ£o Manual de Vendas  
Feature 3.1: Registro de Venda  
DescriÃ§Ã£o: Inserir venda manual (seleciona produto, opÃ§Ã£o clÃ¡ssico/premium, preÃ§o, frete, quantidade, data)  
Requisitos:
- Deduzir estoque do produto base
- Calcular taxa ML e lucro  
UI/UX:
- FormulÃ¡rio de venda, tabela histÃ³rica
ValidaÃ§Ãµes:
- NÃ£o permite venda sem estoque

Feature 3.2: ConfiguraÃ§Ãµes Globais  
DescriÃ§Ã£o: Editar taxas ML e cotaÃ§Ã£o dÃ³lar (manual/automÃ¡tico via API)  
UI/UX:
- Settings/global config tela

---

## 7. O QUE NÃƒO FAZER

Funcionalidades ExcluÃ­das:
âŒ IntegraÃ§Ã£o automÃ¡tica com API Mercado Livre  
âŒ NotificaÃ§Ãµes/alertas de estoque mÃ­nimo  
âŒ EdiÃ§Ã£o em massa via CSV/Excel  
âŒ RobÃ´s/automatizaÃ§Ã£o de preÃ§os  
âŒ GestÃ£o multi-usuÃ¡rios (cada instalaÃ§Ã£o Ã© single-user)  
âŒ ExportaÃ§Ã£o de relatÃ³rio (CSV/PDF)  
âŒ Alertas visuais avanÃ§ados
âŒ SincronizaÃ§Ã£o entre instalaÃ§Ãµes (cloud)

Tecnologias ExcluÃ­das:
âŒ Material-UI (usar apenas shadcn/ui)  
âŒ Express/Node puro (usar Next.js API)  
âŒ MongoDB, Firebase, Supabase (usar SQLite local)
âŒ PocketBase (complexo para setup automÃ¡tico)
âŒ Prisma (usar Drizzle ORM)

---

## 8. ESTRUTURA DE DADOS

### Drizzle Schema (src/db/schema.ts):

```typescript
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
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

export const cenarios = sqliteTable('cenarios', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  produtoId: integer('produto_id').notNull().references(() => produtos.id),
  nome: text('nome').notNull(),
  precoVendaClassico: real('preco_venda_classico').notNull(),
  precoVendaPremium: real('preco_venda_premium').notNull(),
  taxaClassico: real('taxa_classico').notNull(),
  taxaPremium: real('taxa_premium').notNull(),
  freteCobrado: real('frete_cobrado').notNull(),
  lucroClassico: real('lucro_classico').notNull(),
  lucroPremium: real('lucro_premium').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

export const vendas = sqliteTable('vendas', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  produtoId: integer('produto_id').notNull().references(() => produtos.id),
  quantidadeVendida: integer('quantidade_vendida').notNull(),
  precoVenda: real('preco_venda').notNull(),
  tipoAnuncio: text('tipo_anuncio', { enum: ['CLASSICO', 'PREMIUM'] }).notNull(),
  freteCobrado: real('frete_cobrado').notNull(),
  taxaML: real('taxa_ml').notNull(),
  lucroLiquido: real('lucro_liquido').notNull(),
  data: integer('data', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

export const configuracoes = sqliteTable('configuracoes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  taxaClassico: real('taxa_classico').notNull().default(11),
  taxaPremium: real('taxa_premium').notNull().default(16),
  cotacaoDolar: real('cotacao_dolar'),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
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
```

PersistÃªncia:  
Tipo: SQLite local via Drizzle ORM  
LocalizaÃ§Ã£o: Raiz do projeto (./db/data.db)  
Formato: SQLite database  
ObservaÃ§Ãµes: 
- Schema totalmente definido em TypeScript
- Migrations automÃ¡ticas via drizzle-kit push
- Zero configuraÃ§Ã£o manual de tabelas/campos
- Type-safe queries automÃ¡ticos
- Cada instalaÃ§Ã£o tem seu prÃ³prio banco local independente

---

## 9. CASOS DE USO

UC1: Cadastro de Produto  
Ator: UsuÃ¡rio  
Fluxo Principal:
- Preencher dados obrigatÃ³rios
- Salvar produto
- Lista atualiza automaticamente (auto-refresh)
- Visualizar produto cadastrado em lista  
Regras:
- Validar campos obrigatÃ³rios

UC2: SimulaÃ§Ã£o de CenÃ¡rios  
Ator: UsuÃ¡rio  
Fluxo Principal:
- Seleciona produto
- Cria/edita novo cenÃ¡rio
- Salva cenÃ¡rio  
Regras:
- ValidaÃ§Ãµes obrigatÃ³rias

UC3: Registro Manual de Venda  
Ator: UsuÃ¡rio  
Fluxo Principal:
- Seleciona produto em PROD
- Preenche preÃ§o, tipo de anÃºncio, frete, quantidade e data
- Salva venda, deduz estoque automaticamente
Regras:
- ValidaÃ§Ã£o de estoque
- CÃ¡lculo automÃ¡tico de taxa ML/lucro

UC4: Deletar e Restaurar Produto
Ator: UsuÃ¡rio
Fluxo Principal:
- UsuÃ¡rio clica em deletar produto
- ConfirmaÃ§Ã£o: "Tem certeza?"
- Produto marcado com deleted_at (soft delete)
- Produto some da lista principal
- UsuÃ¡rio acessa lixeira
- UsuÃ¡rio clica em restaurar
- Se LAB: restaura em LAB (deleted_at = null)
- Se PROD: move para LAB (tipo = 'LAB', deleted_at = null)

---

## 10. VALIDAÃ‡Ã•ES E REGRAS DE CAMPO

FormulÃ¡rio/Tela: Cadastro de Produto  
Campo 1:  
Tipo: text  
ObrigatÃ³rio: Sim  
ValidaÃ§Ã£o: minLength 3  
Mensagem de erro: "Nome obrigatÃ³rio"

Campo 2:  
Tipo: number  
ObrigatÃ³rio: Sim  
ValidaÃ§Ã£o: minValue 0  
Mensagem de erro: "Valor invÃ¡lido"

FormulÃ¡rio/Tela: Registro de Venda  
Campo 1:  
Tipo: number  
ObrigatÃ³rio: Sim  
ValidaÃ§Ã£o: minValue 1  
Mensagem de erro: "Quantidade obrigatÃ³ria"

Campo 2:  
Tipo: select  
ObrigatÃ³rio: Sim  
ValidaÃ§Ã£o: opÃ§Ãµes vÃ¡lidas  
Mensagem de erro: "Selecione tipo de anÃºncio"

---

## 11. CRITÃ‰RIOS DE ACEITE

Funcionalidades:
[ ] Cadastro de produto funcionando  
[ ] Auto-refresh apÃ³s criar/editar/deletar
[ ] Soft delete e restauraÃ§Ã£o funcionando
[ ] MigraÃ§Ã£o LABâ†’PROD copia produto (mantÃ©m original)
[ ] SimulaÃ§Ã£o de cenÃ¡rios testÃ¡vel  
[ ] Registro de venda deduz estoque

ValidaÃ§Ãµes:
[ ] Todos campos obrigatÃ³rios validados  
[ ] Mensagens de erro adequadas

UX:
[ ] Interface intuitiva  
[ ] Responsivo  
[ ] Loading/empty states visÃ­veis
[ ] OperaÃ§Ãµes rÃ¡pidas (<200ms)

TÃ©cnico:
[ ] CÃ³digo sem erros TypeScript   
[ ] Drizzle ORM funcionando corretamente
[ ] Migrations automÃ¡ticas via script
[ ] Sistema funciona 100% offline (apÃ³s setup inicial)

---

## 12. DEPLOYMENT

Tipo: Instalador Local (nÃ£o vai para cloud)  
Ambiente: Desktop/Servidor local do cliente

**Estrutura de instalaÃ§Ã£o:**
```
sistema-ml/
â”œâ”€â”€ src/
â”‚   â”œâ”€â”€ app/
â”‚   â”œâ”€â”€ db/
â”‚   â”‚   â”œâ”€â”€ schema.ts
â”‚   â”‚   â”œâ”€â”€ index.ts
â”‚   â”‚   â””â”€â”€ migrations/
â”œâ”€â”€ db/
â”‚   â””â”€â”€ data.db (criado automaticamente)
â”œâ”€â”€ .next/
â”œâ”€â”€ package.json
â”œâ”€â”€ drizzle.config.ts
â””â”€â”€ scripts/
    â””â”€â”€ setup-db.ts
```

**Setup automÃ¡tico do banco:**
```typescript
// scripts/setup-db.ts
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

const sqlite = new Database('./db/data.db');
const db = drizzle(sqlite);

// Cria todas as tabelas automaticamente
migrate(db, { migrationsFolder: './src/db/migrations' });
```

**Como rodar:**
```bash
# 1. Instalar dependÃªncias
pnpm install

# 2. Criar banco e tabelas (automÃ¡tico)
pnpm db:push

# 3. Iniciar aplicaÃ§Ã£o
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
    "db:studio": "drizzle-kit studio"
  }
}
```

NÃ£o precisa:
[ ] Deploy em servidor web  
[ ] CI/CD  
[ ] Monitoramento cloud
[ ] Backup automÃ¡tico cloud (usuÃ¡rio faz backup manual do data.db)
[ ] ExecutÃ¡veis externos (tudo via Node.js)

---

## 13. MANUTENÃ‡ÃƒO FUTURA (Opcional)

Features que PODEM ser adicionadas depois (nÃ£o agora):  
- IntegraÃ§Ã£o API ML para vendas
- RelatÃ³rios exportÃ¡veis
- Controle de estoque avanÃ§ado (alerta mÃ­nimo)
- HistÃ³rico grÃ¡fico de vendas/lucro
- Backup automÃ¡tico local agendado

CondiÃ§Ã£o: Implementar apenas se solicitado pelo usuÃ¡rio.

---

## 14. RESUMO EXECUTIVO

O que Ã©: Sistema desktop local para cÃ¡lculo de preÃ§o ideal, lucro lÃ­quido e gestÃ£o bÃ¡sica de vendas/produtos importados focado em uso individual.

Diferencial: 
- Controle total sobre custos, lucro e estoque
- Ambientes LAB/PROD para simulaÃ§Ã£o/produÃ§Ã£o
- 100% local e rÃ¡pido (SQLite)
- Setup automÃ¡tico ZERO configuraÃ§Ã£o manual
- Cada instalaÃ§Ã£o independente (modelo desktop app)

Tecnologia: Next.js 14 + TypeScript + Drizzle ORM + SQLite + shadcn/ui

Complexidade: Medium

Prazo estimado: 4-6 dias Ãºteis de desenvolvimento inicial

UsuÃ¡rio final: Vendedor autÃ´nomo/importador (instalador desktop)

Performance: <200ms para operaÃ§Ãµes CRUD

Vantagens Drizzle vs PocketBase:
âœ… Schema 100% em TypeScript (zero UI manual)
âœ… Type-safety completo e automÃ¡tico
âœ… Migrations via cÃ³digo
âœ… Queries type-safe
âœ… Setup automÃ¡tico via script
âœ… Mais controle e flexibilidade
âœ… Melhor integraÃ§Ã£o com Next.js
âœ… Debugging mais fÃ¡cil