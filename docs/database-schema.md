# Database Schema - Sistema Gestão ML

## Visão Geral

**Database**: SQLite (local)  
**ORM**: Drizzle ORM  
**Localização**: `./db/data.db`  
**Schema**: `src/db/schema.ts`

---

## Tabelas

### Table: produtos

Armazena informações de produtos importados (LAB e PROD).

**Campos:**

- `id`: INTEGER PRIMARY KEY (autoincrement)
- `nome`: TEXT NOT NULL - Nome do produto
- `precoUSD`: REAL NOT NULL - Preço em dólares
- `cotacao`: REAL NOT NULL - Cotação do dólar usada
- `freteTotal`: REAL NOT NULL - Frete total pago
- `quantidade`: INTEGER NOT NULL DEFAULT 0 - Quantidade em estoque
- `fornecedor`: TEXT - Nome do fornecedor (opcional)
- `tipo`: TEXT NOT NULL DEFAULT 'LAB' - Ambiente ('LAB' | 'PROD')
- `deletedAt`: INTEGER (timestamp) - Soft delete (null = ativo)
- `createdAt`: INTEGER (timestamp) NOT NULL DEFAULT unixepoch()
- `updatedAt`: INTEGER (timestamp) NOT NULL DEFAULT unixepoch()

**Constraints:**

- tipo ENUM: 'LAB' ou 'PROD'
- quantidade >= 0
- Soft delete: deletedAt IS NULL para registros ativos

**Índices Sugeridos:**

- INDEX ON tipo WHERE deletedAt IS NULL
- INDEX ON nome WHERE deletedAt IS NULL

---

### Table: cenarios

Armazena múltiplos cenários de simulação de preço por produto.

**Campos:**

- `id`: INTEGER PRIMARY KEY (autoincrement)
- `produtoId`: INTEGER NOT NULL - FK para produtos.id
- `nome`: TEXT NOT NULL - Nome do cenário (ex: "Cenário 1", "Promoção")
- `precoVendaClassico`: REAL NOT NULL - Preço de venda anúncio clássico
- `precoVendaPremium`: REAL NOT NULL - Preço de venda anúncio premium
- `taxaClassico`: REAL NOT NULL - Taxa ML clássico (%)
- `taxaPremium`: REAL NOT NULL - Taxa ML premium (%)
- `freteCobrado`: REAL NOT NULL - Valor do frete cobrado
- `lucroClassico`: REAL NOT NULL - Lucro líquido clássico (calculado)
- `lucroPremium`: REAL NOT NULL - Lucro líquido premium (calculado)
- `createdAt`: INTEGER (timestamp) NOT NULL DEFAULT unixepoch()
- `updatedAt`: INTEGER (timestamp) NOT NULL DEFAULT unixepoch()

**Relationships:**

- FOREIGN KEY produtoId REFERENCES produtos(id)
- Cascade: ON DELETE CASCADE (se produto deletado, cenários deletados)

**Business Rules:**

- Produto pode ter N cenários
- Cenários são exibidos colapsados por padrão
- Lucros são calculados no momento do save

---

### Table: vendas

Registra vendas manuais de produtos (apenas PROD).

**Campos:**

- `id`: INTEGER PRIMARY KEY (autoincrement)
- `produtoId`: INTEGER NOT NULL - FK para produtos.id
- `quantidadeVendida`: INTEGER NOT NULL - Quantidade vendida
- `precoVenda`: REAL NOT NULL - Preço de venda unitário
- `tipoAnuncio`: TEXT NOT NULL - Tipo ('CLASSICO' | 'PREMIUM')
- `freteCobrado`: REAL NOT NULL - Frete cobrado do cliente
- `taxaML`: REAL NOT NULL - Taxa ML aplicada (%)
- `lucroLiquido`: REAL NOT NULL - Lucro líquido total (calculado)
- `data`: INTEGER (timestamp) NOT NULL - Data da venda
- `createdAt`: INTEGER (timestamp) NOT NULL DEFAULT unixepoch()

**Relationships:**

- FOREIGN KEY produtoId REFERENCES produtos(id)
- Cascade: ON DELETE RESTRICT (não permite deletar produto com vendas)

**Business Rules:**

- Venda DEDUZ automaticamente do estoque do produto
- Validação: não permite venda se estoque < quantidadeVendida
- Validação: apenas produtos tipo='PROD' podem ter vendas
- lucroLiquido calculado: (precoVenda * quantidadeVendida + freteCobrado) - custos - taxaML

**Constraints:**

- tipoAnuncio ENUM: 'CLASSICO' ou 'PREMIUM'
- quantidadeVendida > 0
- precoVenda > 0

---

### Table: configuracoes

Armazena configurações globais do sistema (taxa ML, cotação).

**Campos:**

- `id`: INTEGER PRIMARY KEY (autoincrement)
- `taxaClassico`: REAL NOT NULL DEFAULT 11 - Taxa ML clássico (%)
- `taxaPremium`: REAL NOT NULL DEFAULT 16 - Taxa ML premium (%)
- `cotacaoDolar`: REAL - Cotação dólar (pode ser NULL se manual)
- `updatedAt`: INTEGER (timestamp) NOT NULL DEFAULT unixepoch()

**Business Rules:**

- Singleton: apenas 1 registro (id=1)
- Taxas editáveis pelo usuário
- cotacaoDolar pode ser atualizada via API AwesomeAPI ou manual

---

## Relationships Diagram

```
produtos (1) ──── (N) cenarios
    │
    │ (1)
    │
    └──── (N) vendas

configuracoes (singleton - sem FK)
```

---

## Common Queries

### Listar produtos ativos (LAB)

```typescript
const produtosLab = await db
  .select()
  .from(produtos)
  .where(
    and(
      eq(produtos.tipo, 'LAB'),
      isNull(produtos.deletedAt)
    )
  );
```

### Listar produtos ativos (PROD)

```typescript
const produtosProd = await db
  .select()
  .from(produtos)
  .where(
    and(
      eq(produtos.tipo, 'PROD'),
      isNull(produtos.deletedAt)
    )
  );
```

### Buscar produto com cenários

```typescript
const produtoComCenarios = await db
  .select()
  .from(produtos)
  .leftJoin(cenarios, eq(produtos.id, cenarios.produtoId))
  .where(eq(produtos.id, productId));
```

### Registrar venda e atualizar estoque

```typescript
// Transaction: insert venda + update estoque
await db.transaction(async (tx) => {
  // Insert venda
  await tx.insert(vendas).values({
    produtoId,
    quantidadeVendida,
    precoVenda,
    tipoAnuncio,
    freteCobrado,
    taxaML,
    lucroLiquido,
    data: new Date(),
  });
  
  // Update estoque
  await tx
    .update(produtos)
    .set({ 
      quantidade: sql`${produtos.quantidade} - ${quantidadeVendida}` 
    })
    .where(eq(produtos.id, produtoId));
});
```

### Listar vendas com produto

```typescript
const vendasComProduto = await db
  .select({
    venda: vendas,
    produto: produtos,
  })
  .from(vendas)
  .innerJoin(produtos, eq(vendas.produtoId, produtos.id))
  .orderBy(desc(vendas.data));
```

### Soft delete produto

```typescript
await db
  .update(produtos)
  .set({ deletedAt: new Date() })
  .where(eq(produtos.id, productId));
```

### Restaurar produto (LAB)

```typescript
await db
  .update(produtos)
  .set({ deletedAt: null })
  .where(eq(produtos.id, productId));
```

### Restaurar produto PROD → mover para LAB

```typescript
await db
  .update(produtos)
  .set({ 
    deletedAt: null,
    tipo: 'LAB' 
  })
  .where(eq(produtos.id, productId));
```

### Migrar produto LAB → PROD (cópia)

```typescript
// Insert novo produto tipo PROD (mantém original LAB)
const [produtoLab] = await db
  .select()
  .from(produtos)
  .where(eq(produtos.id, labProductId));

await db.insert(produtos).values({
  ...produtoLab,
  id: undefined, // auto increment
  tipo: 'PROD',
  createdAt: new Date(),
  updatedAt: new Date(),
});
```

### Buscar configurações globais

```typescript
const [config] = await db
  .select()
  .from(configuracoes)
  .limit(1);
```

---

## Performance Notes

- **Índices**: Criar índices em `tipo` e `deletedAt` para queries rápidas
- **Soft Delete**: Sempre filtrar `deletedAt IS NULL` nas queries principais
- **Transactions**: Usar para operações que modificam múltiplas tabelas (venda + estoque)
- **SQLite**: Ideal para desktop app (local, rápido, sem configuração)

---

## Migration Strategy

1. Schema definido em `src/db/schema.ts`
2. Migrations auto-geradas: `pnpm db:generate`
3. Apply migrations: `pnpm db:push`
4. Backup manual: copiar `./db/data.db`

