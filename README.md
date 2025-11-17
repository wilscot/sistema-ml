# Sistema Gestão ML

Sistema desktop local para gestão de produtos importados, simulação de cenários de preço, controle de estoque e registro de vendas com cálculo automático de lucros usando método FIFO.

## 📋 Índice

- [Features](#-features)
- [Instalação](#-instalação)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Cálculos](#-cálculos)
- [Fluxos Principais](#-fluxos-principais)
- [Troubleshooting](#-troubleshooting)

---

## ✨ Features

### Gestão de Produtos
- ✅ Cadastro de produtos em dois ambientes: **LAB** (simulação) e **PROD** (produção)
- ✅ Migração explícita LAB → PROD (cria cópia, original permanece)
- ✅ Soft delete com lixeira e restauração
- ✅ Exclusão em lote de produtos deletados

### Sistema de Compras (FIFO)
- ✅ Registro de múltiplas compras por produto
- ✅ Cálculo automático de custo unitário
- ✅ Gestão de estoque por compra (quantidade disponível)
- ✅ Rastreabilidade completa (venda → compra → produto)
- ✅ Exclusão em lote de compras (com validações)

### Simulação de Cenários
- ✅ Múltiplos cenários de preço por produto LAB
- ✅ Cálculo automático de lucros (clássico e premium)
- ✅ Preview em tempo real de margens

### Registro de Vendas
- ✅ Vendas com método FIFO (First-In, First-Out)
- ✅ Cálculo automático de taxa ML e lucro líquido
- ✅ Dedução automática de estoque
- ✅ Preview de custos antes de confirmar venda
- ✅ Alertas de estoque insuficiente

### Configurações
- ✅ Taxas ML editáveis (clássico e premium)
- ✅ Cotação do dólar (manual ou via API AwesomeAPI)
- ✅ Cálculos usam configurações atualizadas

---

## 🚀 Instalação

### Pré-requisitos

- **Node.js**: >= 20.0.0
- **pnpm**: >= 8.0.0

### Passo a Passo

1. **Clone o repositório** (ou baixe o projeto)

```bash
cd sistema-ML
```

2. **Instale as dependências**

```bash
pnpm install
```

3. **Configure o banco de dados**

```bash
# Opção 1: Setup simples (recomendado para primeira instalação)
pnpm db:setup

# Opção 2: Setup com Drizzle (se já tiver migrations)
pnpm db:migrate

# Opção 3: Atualizar schema existente
pnpm db:update
```

4. **Inicie o servidor de desenvolvimento**

```bash
pnpm dev
```

5. **Acesse a aplicação**

Abra [http://localhost:3000](http://localhost:3000) no navegador.

### Scripts Disponíveis

```bash
# Desenvolvimento
pnpm dev              # Inicia servidor de desenvolvimento
pnpm build            # Build para produção
pnpm start            # Inicia servidor de produção

# Banco de Dados
pnpm db:setup         # Setup inicial do banco (SQL direto)
pnpm db:migrate       # Aplica migrations do Drizzle
pnpm db:push          # Sincroniza schema (drizzle-kit push)
pnpm db:update       # Atualiza schema (adiciona tabelas/colunas)
pnpm db:clean        # Remove colunas antigas do banco
pnpm db:fix-fk        # Corrige foreign keys
pnpm db:studio        # Abre Drizzle Studio (interface visual)

# Qualidade
pnpm lint             # Executa ESLint
pnpm type-check       # Verifica erros TypeScript
```

---

## 📁 Estrutura do Projeto

```
sistema-ML/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/                # API Routes
│   │   │   ├── compras/        # Endpoints de compras
│   │   │   ├── produtos/       # Endpoints de produtos
│   │   │   ├── vendas/         # Endpoints de vendas
│   │   │   ├── cenarios/       # Endpoints de cenários
│   │   │   └── configuracoes/  # Endpoints de configurações
│   │   ├── compras/            # Páginas de compras
│   │   ├── produtos/            # Páginas de produtos
│   │   ├── vendas/             # Páginas de vendas
│   │   ├── simulacao/          # Página de simulação
│   │   ├── lixeira/            # Página de lixeira
│   │   └── configuracoes/      # Página de configurações
│   ├── components/             # Componentes React
│   │   ├── CompraForm.tsx     # Formulário de compra
│   │   ├── VendaForm.tsx       # Formulário de venda
│   │   ├── ProdutoForm.tsx     # Formulário de produto
│   │   ├── CenarioForm.tsx     # Formulário de cenário
│   │   ├── DeleteConfirmDialog.tsx
│   │   ├── Toast.tsx
│   │   └── ui/                 # Componentes shadcn/ui
│   ├── db/                     # Database
│   │   ├── schema.ts           # Schema Drizzle ORM
│   │   ├── index.ts            # Conexão SQLite
│   │   └── migrations/         # Migrations do Drizzle
│   └── lib/                    # Utilitários
│       ├── calculators.ts      # Funções de cálculo
│       ├── db-client.ts        # Helpers de banco
│       ├── validators.ts       # Validações
│       └── cotacao.ts          # API de cotação
├── scripts/                    # Scripts de manutenção
│   ├── setup-db.ts            # Setup com Drizzle
│   ├── setup-db-simple.ts     # Setup direto SQL
│   ├── update-schema.ts       # Atualizar schema
│   ├── migrar-para-compras.ts # Migração de dados
│   └── remover-colunas-antigas-produtos.ts
├── db/                         # Banco de dados SQLite
│   └── data.db                 # Arquivo do banco (criado automaticamente)
├── docs/                       # Documentação
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.ts
├── drizzle.config.ts
└── README.md
```

---

## 🧮 Cálculos

### Custo Unitário de Compra

Calcula o custo unitário em BRL considerando preço, cotação e frete.

```typescript
custoUnitario = (precoUnitario * cotacao) + (freteTotal / quantidade)
```

**Exemplo**:
- Preço unitário: $10.00 USD
- Cotação: 5.20 BRL/USD
- Frete total: 50.00 BRL
- Quantidade: 10 unidades

```
custoUnitario = (10.00 * 5.20) + (50.00 / 10)
              = 52.00 + 5.00
              = 57.00 BRL/unidade
```

**Função**: `calcularCustoTotal()` em `src/lib/calculators.ts`

---

### Taxa Mercado Livre

Calcula o valor da taxa ML baseado no preço de venda e percentual.

```typescript
taxaML = (precoVenda * taxaPercent) / 100
```

**Exemplo**:
- Preço de venda: 100.00 BRL
- Taxa ML: 11% (clássico)

```
taxaML = (100.00 * 11) / 100
       = 11.00 BRL
```

**Função**: `calcularTaxaML()` em `src/lib/calculators.ts`

---

### Lucro Líquido

Calcula o lucro líquido considerando receita, custos e taxas.

```typescript
receitaTotal = (precoVenda * quantidade) + freteCobrado
custoTotal = custoUnitario * quantidade  // Usando FIFO
lucroLiquido = receitaTotal - custoTotal - taxaML
```

**Exemplo**:
- Preço de venda: 100.00 BRL
- Quantidade: 2 unidades
- Frete cobrado: 15.00 BRL
- Custo unitário (FIFO): 57.00 BRL
- Taxa ML: 11.00 BRL

```
receitaTotal = (100.00 * 2) + 15.00 = 215.00 BRL
custoTotal = 57.00 * 2 = 114.00 BRL
lucroLiquido = 215.00 - 114.00 - 11.00 = 90.00 BRL
```

**Função**: `calcularLucro()` em `src/lib/calculators.ts`

---

### Método FIFO (First-In, First-Out)

O sistema usa FIFO para calcular custos de vendas e deduzir estoque.

**Como funciona**:

1. **Ordenação**: Compras são ordenadas por `dataCompra` (mais antigas primeiro)
2. **Dedução Proporcional**: A venda deduz estoque das compras mais antigas primeiro
3. **Cálculo de Custo**: Soma os custos unitários de cada compra usada, proporcionalmente

**Exemplo Prático**:

```
Compra 1 (01/01): 10 unidades a R$ 50,00/unidade (disponível: 10)
Compra 2 (15/01): 5 unidades a R$ 60,00/unidade (disponível: 5)

Venda: 12 unidades

Processo FIFO:
1. Usa 10 unidades da Compra 1: 10 * R$ 50,00 = R$ 500,00
2. Usa 2 unidades da Compra 2: 2 * R$ 60,00 = R$ 120,00
3. Custo total da venda: R$ 500,00 + R$ 120,00 = R$ 620,00
4. Custo unitário médio: R$ 620,00 / 12 = R$ 51,67/unidade

Resultado:
- Compra 1: disponível = 0 (esgotada)
- Compra 2: disponível = 3 (restam 3 unidades)
```

**Implementação**: `src/app/api/vendas/route.ts` (POST) e `src/lib/db-client.ts`

---

## 🔄 Fluxos Principais

### Fluxo 1: Cadastro de Produto e Compra

```
1. Criar Produto LAB
   └─> Nome, tipo (LAB), quantidade inicial

2. (Opcional) Criar Cenários de Simulação
   └─> Testar diferentes preços e margens

3. Migrar para PROD
   └─> Cria cópia do produto em PROD

4. Registrar Compra
   └─> Seleciona produto PROD
   └─> Informa: preço, cotação, frete, quantidade
   └─> Sistema calcula custoUnitario automaticamente
   └─> Estoque do produto é atualizado
```

### Fluxo 2: Registro de Venda com FIFO

```
1. Selecionar Produto PROD
   └─> Sistema busca compras disponíveis (FIFO)

2. Informar Dados da Venda
   └─> Quantidade, preço, tipo anúncio, frete

3. Preview de Custos (em tempo real)
   └─> Sistema calcula custo via FIFO
   └─> Mostra custo unitário médio e total
   └─> Calcula lucro líquido previsto

4. Confirmar Venda
   └─> TRANSACTION:
       ├─> Deduz estoque das compras (FIFO)
       ├─> Cria registro de venda
       ├─> Atualiza estoque total do produto
       └─> Vincula venda à primeira compra usada
```

### Fluxo 3: Exclusão de Compra

```
1. Selecionar Compra(s) na lista
   └─> Checkbox individual ou "Selecionar todas"

2. Clicar em "Deletar Selecionadas"
   └─> Dialog de confirmação

3. Validação
   └─> Verifica se compra tem vendas associadas
   └─> Se tiver: bloqueia exclusão
   └─> Se não tiver: permite exclusão

4. Exclusão
   └─> TRANSACTION:
       ├─> Reverte estoque do produto (quantidadeDisponivel)
       ├─> Deleta compra permanentemente
       └─> Atualiza estoque total do produto
```

### Fluxo 4: Migração LAB → PROD

```
1. Produto em LAB
   └─> Criado para simulação

2. Testar Cenários
   └─> Criar múltiplos cenários de preço
   └─> Analisar margens e lucros

3. Migrar para PROD
   └─> Clica em "Migrar para Produção"
   └─> Sistema cria cópia do produto
   └─> Original permanece em LAB

4. Registrar Compras
   └─> Agora pode registrar compras no produto PROD
```

---

## 🔧 Troubleshooting

### Erro: "Schema do banco desatualizado"

**Sintoma**: Mensagem de erro ao acessar telas de compras/vendas

**Solução**:
```bash
pnpm db:update
```

Se persistir:
```bash
pnpm db:push
```

---

### Erro: "FOREIGN KEY constraint failed"

**Sintoma**: Erro ao criar compra ou venda

**Causa**: Foreign key apontando para tabela incorreta (após migrações)

**Solução**:
```bash
pnpm db:fix-fk
```

---

### Erro: "NOT NULL constraint failed: produtos.preco_usd"

**Sintoma**: Erro ao criar produto

**Causa**: Banco ainda tem colunas antigas que foram removidas do schema

**Solução**:
```bash
pnpm db:clean
```

Isso remove as colunas antigas (`preco_usd`, `cotacao`, `frete_total`, `moeda`, `fornecedor`) da tabela `produtos`.

---

### Erro: "Produto com dados incompletos não pode ser migrado"

**Sintoma**: Erro ao migrar produto LAB → PROD

**Causa**: Sistema antigo exigia campos de custo para migração

**Solução**: Já corrigido. Produtos LAB podem ser migrados sem dados de custo. Se persistir, verifique se o produto tem pelo menos um nome válido.

---

### Erro: "Erro ao carregar produtos"

**Sintoma**: Página de nova compra não carrega produtos

**Causa**: API requer parâmetro `tipo` que não está sendo enviado

**Solução**: Já corrigido. A página agora envia `?tipo=PROD` automaticamente.

---

### Banco de dados corrompido ou problemas de integridade

**Solução**:

1. **Fazer backup**:
```bash
cp db/data.db db/data.db.backup
```

2. **Verificar integridade**:
```bash
sqlite3 db/data.db "PRAGMA integrity_check;"
```

3. **Recriar banco** (se necessário):
```bash
# Fazer backup dos dados importantes primeiro!
rm db/data.db
pnpm db:setup
```

---

### Problemas com Foreign Keys

**Verificar se estão habilitadas**:
```bash
sqlite3 db/data.db "PRAGMA foreign_keys;"
```

Deve retornar `1`. Se retornar `0`, habilitar:
```bash
sqlite3 db/data.db "PRAGMA foreign_keys = ON;"
```

**Verificar foreign keys da tabela compras**:
```bash
sqlite3 db/data.db "PRAGMA foreign_key_list(compras);"
```

Deve mostrar: `produto_id -> produtos.id`

Se mostrar outra tabela (ex: `produtos_old_backup_...`), executar:
```bash
pnpm db:fix-fk
```

---

### Erro ao buscar cotação do dólar

**Sintoma**: Botão "Buscar Cotação" não funciona

**Causa**: API AwesomeAPI pode estar temporariamente indisponível

**Solução**:
1. Verificar conexão com internet
2. Inserir cotação manualmente
3. Verificar se a API está funcionando: [https://economia.awesomeapi.com.br/json/last/USD-BRL](https://economia.awesomeapi.com.br/json/last/USD-BRL)

---

### Produto não aparece na lista de compras

**Causa**: Produto não foi migrado para PROD ou está deletado

**Solução**:
1. Verificar se produto existe e é do tipo PROD
2. Verificar se produto não está deletado (soft delete)
3. Migrar produto LAB → PROD se necessário

---

### Estoque não atualiza após venda

**Causa**: Erro na transação ou problema de integridade

**Solução**:
1. Verificar logs do servidor (terminal onde `pnpm dev` está rodando)
2. Verificar se a venda foi criada no banco
3. Verificar se as compras foram atualizadas
4. Se necessário, reverter manualmente e tentar novamente

---

### Compras não podem ser deletadas

**Causa**: Compra tem vendas associadas

**Solução**: 
- Não é possível deletar compras que já foram usadas em vendas
- Isso garante integridade dos dados e rastreabilidade
- Se necessário, delete as vendas primeiro (reverte estoque)

---

## 📚 Documentação Adicional

- [CHANGELOG.md](./CHANGELOG.md) - Histórico de mudanças
- [HISTORY.md](./HISTORY.md) - Cronologia técnica e decisões arquiteturais
- [docs/database-schema.md](./docs/database-schema.md) - Schema completo do banco
- [docs/validacao-final.md](./docs/validacao-final.md) - Validação do sistema

---

## 🛠️ Tecnologias

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes, TypeScript
- **Database**: SQLite com Drizzle ORM
- **Package Manager**: pnpm

---

## 📝 Licença

Este projeto é privado e de uso pessoal.

---

**Versão**: 0.2.0 (Não Lançado)  
**Última Atualização**: 2025-01

