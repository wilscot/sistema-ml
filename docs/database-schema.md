# Database Schema - Sistema ML v2.0

Sistema com ambientes LAB e PROD completamente isolados.

---

## 🧪 MODO LAB (Simulação)

### Table: produtos_lab

Produtos para simulação (não há compras/vendas reais).

**Campos:**

- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `nome` TEXT NOT NULL
- `precoUSD` REAL NOT NULL (preço em dólares)
- `cotacao` REAL NOT NULL (taxa de conversão USD→BRL)
- `freteTotal` REAL NOT NULL (frete total em BRL)
- `fornecedor` TEXT (opcional)
- `deletedAt` INTEGER (timestamp, soft delete)
- `createdAt` INTEGER NOT NULL DEFAULT (unixepoch())
- `updatedAt` INTEGER NOT NULL DEFAULT (unixepoch())

**Constraints:**

- precoUSD > 0
- cotacao > 0
- freteTotal >= 0

**Índices:**

- PRIMARY KEY (id)
- INDEX on deletedAt (para queries de lixeira)

---

### Table: cenarios_lab

Simulações de preço e lucro para produtos LAB.

**Campos:**

- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `produtoId` INTEGER NOT NULL REFERENCES produtos_lab(id)
- `nome` TEXT NOT NULL (ex: "Cenário Otimista", "Black Friday")
- `precoVendaClassico` REAL NOT NULL
- `precoVendaPremium` REAL NOT NULL
- `taxaClassico` REAL NOT NULL (%, ex: 11.0)
- `taxaPremium` REAL NOT NULL (%, ex: 16.0)
- `lucroClassico` REAL NOT NULL (calculado)
- `lucroPremium` REAL NOT NULL (calculado)
- `createdAt` INTEGER NOT NULL DEFAULT (unixepoch())
- `updatedAt` INTEGER NOT NULL DEFAULT (unixepoch())

**Constraints:**

- precoVendaClassico > 0
- precoVendaPremium > 0
- taxaClassico >= 0 AND taxaClassico <= 100
- taxaPremium >= 0 AND taxaPremium <= 100

**Relacionamentos:**

- `produtoId` → `produtos_lab.id` (CASCADE on delete)

---

### Table: configuracoes_lab

Configurações globais do modo LAB.

**Campos:**

- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `taxaClassico` REAL NOT NULL DEFAULT 11.0 (taxa ML clássico %)
- `taxaPremium` REAL NOT NULL DEFAULT 16.0 (taxa ML premium %)
- `cotacaoDolar` REAL NOT NULL DEFAULT 1.0 (cotação padrão USD→BRL)
- `updatedAt` INTEGER NOT NULL DEFAULT (unixepoch())

**Constraints:**

- Sempre existe apenas 1 registro (singleton)
- taxaClassico >= 0 AND <= 100
- taxaPremium >= 0 AND <= 100
- cotacaoDolar > 0

---

## 🏭 MODO PROD (Operação Real)

### Table: produtos_prod

Produtos em operação (têm compras e vendas reais).

**Campos:**

- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `nome` TEXT NOT NULL
- `fornecedor` TEXT
- `quantidade` INTEGER NOT NULL DEFAULT 0 (estoque atual, calculado via FIFO)
- `deletedAt` INTEGER (timestamp, soft delete)
- `createdAt` INTEGER NOT NULL DEFAULT (unixepoch())
- `updatedAt` INTEGER NOT NULL DEFAULT (unixepoch())

**Constraints:**

- quantidade >= 0

**Observações:**

- Custos/preços NÃO ficam aqui (ficam na tabela compras)
- Estoque é deduzido automaticamente via FIFO ao registrar vendas

---

### Table: compras

Registro de entradas de estoque (compras) para produtos PROD.

**Campos:**

- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `produtoId` INTEGER NOT NULL REFERENCES produtos_prod(id)
- `precoUSD` REAL NOT NULL (preço unitário em USD)
- `cotacao` REAL NOT NULL (taxa conversão na compra)
- `freteTotal` REAL NOT NULL (frete total BRL)
- `quantidadeComprada` INTEGER NOT NULL (quantidade original)
- `quantidadeDisponivel` INTEGER NOT NULL (quantidade restante após vendas)
- `moeda` TEXT NOT NULL DEFAULT 'USD' ('USD' | 'BRL')
- `fornecedor` TEXT
- `observacoes` TEXT
- `custoUnitario` REAL NOT NULL (calculado: (precoUSD × cotacao + frete) ÷ qtd)
- `dataCompra` INTEGER NOT NULL (timestamp)
- `createdAt` INTEGER NOT NULL DEFAULT (unixepoch())
- `updatedAt` INTEGER NOT NULL DEFAULT (unixepoch())

**Constraints:**

- precoUSD > 0
- cotacao > 0
- freteTotal >= 0
- quantidadeComprada > 0
- quantidadeDisponivel >= 0
- quantidadeDisponivel <= quantidadeComprada
- custoUnitario > 0

**Índices:**

- INDEX on (produtoId, dataCompra ASC) (para FIFO)
- INDEX on quantidadeDisponivel (filtrar compras com estoque)

**Relacionamentos:**

- `produtoId` → `produtos_prod.id` (CASCADE on delete)

---

### Table: vendas

Registro de vendas para produtos PROD.

**Campos:**

- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `produtoId` INTEGER NOT NULL REFERENCES produtos_prod(id)
- `compraId` INTEGER REFERENCES compras(id) (última compra usada no FIFO)
- `quantidadeVendida` INTEGER NOT NULL
- `precoVenda` REAL NOT NULL (preço por unidade)
- `tipoAnuncio` TEXT NOT NULL ('CLASSICO' | 'PREMIUM')
- `freteCobrado` REAL NOT NULL DEFAULT 0
- `taxaML` REAL NOT NULL (calculado)
- `custoTotal` REAL NOT NULL (calculado via FIFO)
- `lucroLiquido` REAL NOT NULL (receita - custo - taxa)
- `data` INTEGER NOT NULL (timestamp da venda)
- `createdAt` INTEGER NOT NULL DEFAULT (unixepoch())

**Constraints:**

- quantidadeVendida > 0
- precoVenda > 0
- freteCobrado >= 0
- taxaML >= 0
- tipoAnuncio IN ('CLASSICO', 'PREMIUM')

**Índices:**

- INDEX on (produtoId, data DESC) (histórico de vendas)
- INDEX on data (dashboard métricas)

**Relacionamentos:**

- `produtoId` → `produtos_prod.id` (CASCADE on delete)
- `compraId` → `compras.id` (SET NULL on delete)

**Cálculos Automáticos:**

```
receita = (precoVenda × quantidadeVendida) + freteCobrado
taxaML = precoVenda × (taxaPercent ÷ 100)
custoTotal = SOMA(custo_unitario × qtd_deduzida) via FIFO
lucroLiquido = receita - custoTotal - taxaML
```

---

### Table: configuracoes_prod

Configurações globais do modo PROD.

**Campos:**

- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `taxaClassico` REAL NOT NULL DEFAULT 11.0
- `taxaPremium` REAL NOT NULL DEFAULT 16.0
- `cotacaoDolar` REAL NOT NULL DEFAULT 1.0
- `updatedAt` INTEGER NOT NULL DEFAULT (unixepoch())

**Constraints:**

- Sempre existe apenas 1 registro (singleton)
- taxaClassico >= 0 AND <= 100
- taxaPremium >= 0 AND <= 100
- cotacaoDolar > 0

---

## 🔗 Relacionamentos entre Tabelas

### Modo LAB:

```
produtos_lab (1) ←→ (N) cenarios_lab
produtos_lab (1) ←→ (1) configuracoes_lab (global)
```

### Modo PROD:

```
produtos_prod (1) ←→ (N) compras
produtos_prod (1) ←→ (N) vendas
compras (1) ←→ (N) vendas
produtos_prod (1) ←→ (1) configuracoes_prod (global)
```

**Isolamento:**

- LAB e PROD não se comunicam diretamente
- Migração LAB→PROD copia dados (INSERT new record)
- Nenhuma foreign key entre LAB e PROD

---

## 📊 Common Queries

### LAB - Listar produtos ativos

```sql
SELECT * FROM produtos_lab 
WHERE deletedAt IS NULL 
ORDER BY createdAt DESC;
```

### LAB - Buscar cenários de um produto

```sql
SELECT * FROM cenarios_lab 
WHERE produtoId = ? 
ORDER BY createdAt DESC;
```

### PROD - Verificar estoque disponível

```sql
SELECT 
  p.id,
  p.nome,
  p.quantidade as estoque_total,
  SUM(c.quantidadeDisponivel) as estoque_disponivel
FROM produtos_prod p
LEFT JOIN compras c ON c.produtoId = p.id
WHERE p.deletedAt IS NULL
GROUP BY p.id;
```

### PROD - Buscar compras disponíveis para FIFO (ordem: mais antigas primeiro)

```sql
SELECT * FROM compras 
WHERE produtoId = ? AND quantidadeDisponivel > 0 
ORDER BY dataCompra ASC;
```

### PROD - Vendas do mês atual (Dashboard)

```sql
SELECT 
  COUNT(*) as total_vendas,
  SUM(precoVenda * quantidadeVendida + freteCobrado) as faturamento_bruto,
  SUM(lucroLiquido) as lucro_liquido
FROM vendas 
WHERE strftime('%Y-%m', datetime(data, 'unixepoch')) = strftime('%Y-%m', 'now');
```

### PROD - Top 5 produtos mais vendidos

```sql
SELECT 
  p.nome,
  SUM(v.quantidadeVendida) as total_vendido,
  SUM(v.lucroLiquido) as lucro_total
FROM vendas v
JOIN produtos_prod p ON p.id = v.produtoId
GROUP BY p.id
ORDER BY total_vendido DESC
LIMIT 5;
```

### PROD - Histórico de movimentação de uma compra específica

```sql
SELECT 
  v.data,
  v.quantidadeVendida,
  v.custoTotal,
  c.quantidadeDisponivel as estoque_restante_na_compra
FROM vendas v
JOIN compras c ON c.id = v.compraId
WHERE v.compraId = ?
ORDER BY v.data DESC;
```

---

## 🔒 Regras de Integridade

### Soft Delete:

- Produtos deletados: `deletedAt` = timestamp atual
- LAB deletado → restaura em LAB (deletedAt = NULL)
- PROD deletado → move para LAB (INSERT em produtos_lab, deletedAt permanece em PROD)

### FIFO (First In, First Out):

- Vendas deduzem estoque das compras mais antigas primeiro
- Transaction SQL obrigatória para evitar inconsistências
- quantidadeDisponivel NUNCA pode ser negativa

### Configurações Singleton:

- configuracoes_lab e configuracoes_prod têm sempre 1 registro
- Criar via seed se não existir
- Atualizar via UPDATE (nunca INSERT adicional)

---

## 📝 Migrations

**Ordem de criação:**

1. produtos_lab, produtos_prod
2. configuracoes_lab, configuracoes_prod
3. cenarios_lab
4. compras
5. vendas

**Seed inicial:**

```sql
INSERT INTO configuracoes_lab (taxaClassico, taxaPremium, cotacaoDolar) 
VALUES (11.0, 16.0, 5.60);

INSERT INTO configuracoes_prod (taxaClassico, taxaPremium, cotacaoDolar) 
VALUES (11.0, 16.0, 5.60);
```

