# Database Schema - Sistema ML

## Overview

Supabase PostgreSQL com 2 schemas isolados:
- **lab**: Ambiente de testes/simulação
- **producao**: Ambiente operacional com vendas reais

⚠️ CRITICAL: NUNCA misture schemas em queries. São isolados.

---

## Schema: lab

### Table: lab.produtos_lab
```sql
CREATE TABLE lab.produtos_lab (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(100) NOT NULL,
  preco_usd DECIMAL(10,2) NOT NULL CHECK (preco_usd > 0),
  cotacao DECIMAL(6,2) NOT NULL CHECK (cotacao > 0),
  frete_total DECIMAL(10,2) NOT NULL CHECK (frete_total >= 0),
  quantidade INTEGER NOT NULL CHECK (quantidade > 0),
  quantidade_estoque INTEGER NOT NULL DEFAULT quantidade,
  fornecedor VARCHAR(100),
  frete_real DECIMAL(10,2),
  data_cadastro TIMESTAMP DEFAULT NOW(),
  data_atualizacao TIMESTAMP DEFAULT NOW(),
  UNIQUE(nome)
);
```

**Columns:**
- `id`: UUID primary key
- `nome`: Nome do produto (único)
- `preco_usd`: Preço em dólares
- `cotacao`: Cotação R$/USD usada na compra
- `frete_total`: Frete total da importação
- `quantidade`: Quantidade inicial importada
- `quantidade_estoque`: Estoque atual (atualizado por vendas)
- `fornecedor`: Nome do fornecedor (opcional)
- `frete_real`: Frete real aprendido de vendas (opcional)
- `data_cadastro`: Timestamp de criação
- `data_atualizacao`: Timestamp de última atualização

**Indexes:**
```sql
CREATE INDEX idx_produtos_lab_nome ON lab.produtos_lab(nome);
```

---

### Table: lab.cenarios_lab
```sql
CREATE TABLE lab.cenarios_lab (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID NOT NULL REFERENCES lab.produtos_lab(id) ON DELETE CASCADE,
  nome VARCHAR(50) NOT NULL,
  tipo_anuncio VARCHAR(10) NOT NULL CHECK (tipo_anuncio IN ('classico', 'premium')),
  preco_venda DECIMAL(10,2) NOT NULL CHECK (preco_venda > 0),
  taxa_ml DECIMAL(5,2) NOT NULL CHECK (taxa_ml >= 0 AND taxa_ml <= 100),
  frete_cobrado DECIMAL(10,2) NOT NULL CHECK (frete_cobrado >= 0),
  data_criacao TIMESTAMP DEFAULT NOW(),
  data_atualizacao TIMESTAMP DEFAULT NOW(),
  UNIQUE(produto_id, nome)
);
```

**Columns:**
- `id`: UUID primary key
- `produto_id`: FK para produtos_lab
- `nome`: Nome do cenário (ex: "Agressivo", "Conservador")
- `tipo_anuncio`: 'classico' ou 'premium'
- `preco_venda`: Preço de venda simulado
- `taxa_ml`: Taxa Mercado Livre em % (11 ou 16 por padrão)
- `frete_cobrado`: Valor do frete cobrado do cliente
- `data_criacao`: Timestamp de criação
- `data_atualizacao`: Timestamp de última atualização

**Indexes:**
```sql
CREATE INDEX idx_cenarios_lab_produto ON lab.cenarios_lab(produto_id);
```

---

## Schema: producao

### Table: producao.produtos_producao

**Estrutura idêntica a `lab.produtos_lab`**
```sql
CREATE TABLE producao.produtos_producao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(100) NOT NULL,
  preco_usd DECIMAL(10,2) NOT NULL CHECK (preco_usd > 0),
  cotacao DECIMAL(6,2) NOT NULL CHECK (cotacao > 0),
  frete_total DECIMAL(10,2) NOT NULL CHECK (frete_total >= 0),
  quantidade INTEGER NOT NULL CHECK (quantidade > 0),
  quantidade_estoque INTEGER NOT NULL DEFAULT quantidade,
  fornecedor VARCHAR(100),
  frete_real DECIMAL(10,2),
  data_cadastro TIMESTAMP DEFAULT NOW(),
  data_atualizacao TIMESTAMP DEFAULT NOW(),
  UNIQUE(nome)
);
```

**Indexes:**
```sql
CREATE INDEX idx_produtos_prod_nome ON producao.produtos_producao(nome);
```

---

### Table: producao.cenarios_producao

**Estrutura idêntica a `lab.cenarios_lab`**
```sql
CREATE TABLE producao.cenarios_producao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID NOT NULL REFERENCES producao.produtos_producao(id) ON DELETE CASCADE,
  nome VARCHAR(50) NOT NULL,
  tipo_anuncio VARCHAR(10) NOT NULL CHECK (tipo_anuncio IN ('classico', 'premium')),
  preco_venda DECIMAL(10,2) NOT NULL CHECK (preco_venda > 0),
  taxa_ml DECIMAL(5,2) NOT NULL CHECK (taxa_ml >= 0 AND taxa_ml <= 100),
  frete_cobrado DECIMAL(10,2) NOT NULL CHECK (frete_cobrado >= 0),
  data_criacao TIMESTAMP DEFAULT NOW(),
  data_atualizacao TIMESTAMP DEFAULT NOW(),
  UNIQUE(produto_id, nome)
);
```

**Indexes:**
```sql
CREATE INDEX idx_cenarios_prod_produto ON producao.cenarios_producao(produto_id);
```

---

### Table: producao.vendas

**⚠️ Existe APENAS em PRODUÇÃO**
```sql
CREATE TABLE producao.vendas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID NOT NULL REFERENCES producao.produtos_producao(id),
  quantidade_vendida INTEGER NOT NULL CHECK (quantidade_vendida > 0),
  tipo_anuncio VARCHAR(10) NOT NULL CHECK (tipo_anuncio IN ('classico', 'premium')),
  preco_venda DECIMAL(10,2) NOT NULL CHECK (preco_venda > 0),
  frete_cobrado DECIMAL(10,2),
  custo_unitario DECIMAL(10,2) NOT NULL,
  taxa_ml DECIMAL(5,2) NOT NULL,
  lucro_liquido DECIMAL(10,2) NOT NULL,
  data_venda DATE NOT NULL,
  data_cadastro TIMESTAMP DEFAULT NOW()
);
```

**Columns:**
- `id`: UUID primary key
- `produto_id`: FK para produtos_producao
- `quantidade_vendida`: Quantidade vendida
- `tipo_anuncio`: 'classico' ou 'premium'
- `preco_venda`: Preço total da venda
- `frete_cobrado`: Frete cobrado do cliente (opcional)
- `custo_unitario`: Snapshot do custo na época da venda
- `taxa_ml`: Taxa ML calculada (em %)
- `lucro_liquido`: Lucro líquido calculado
- `data_venda`: Data da venda (YYYY-MM-DD)
- `data_cadastro`: Timestamp de registro

**Indexes:**
```sql
CREATE INDEX idx_vendas_produto ON producao.vendas(produto_id);
CREATE INDEX idx_vendas_data ON producao.vendas(data_venda);
```

---

## Schema: public (global)

### Table: public.configuracoes

**Singleton table (apenas 1 linha)**
```sql
CREATE TABLE public.configuracoes (
  id VARCHAR(10) PRIMARY KEY DEFAULT '1',
  taxa_classico DECIMAL(5,2) NOT NULL DEFAULT 11.00,
  taxa_premium DECIMAL(5,2) NOT NULL DEFAULT 16.00,
  frete_default DECIMAL(10,2) NOT NULL DEFAULT 19.95,
  cotacao_manual DECIMAL(6,2),
  data_atualizacao TIMESTAMP DEFAULT NOW(),
  CHECK (id = '1')
);

INSERT INTO public.configuracoes (id) VALUES ('1');
```

**Columns:**
- `id`: Sempre '1' (singleton)
- `taxa_classico`: Taxa padrão para anúncios clássicos (%)
- `taxa_premium`: Taxa padrão para anúncios premium (%)
- `frete_default`: Valor padrão de frete sugerido (R$)
- `cotacao_manual`: Override manual da cotação API (opcional)
- `data_atualizacao`: Timestamp de última atualização

---

## Common Queries

### Buscar todos os produtos (LAB)
```typescript
const { data, error } = await supabase
  .from('lab.produtos_lab')
  .select('*')
  .order('nome', { ascending: true })
```

### Buscar produto com cenários (PRODUÇÃO)
```typescript
const { data, error } = await supabase
  .from('producao.produtos_producao')
  .select(`
    *,
    cenarios:producao.cenarios_producao(*)
  `)
  .eq('id', produtoId)
  .single()
```

### Registrar venda e atualizar estoque (PRODUÇÃO)
```typescript
// 1. Inserir venda
const { data: venda, error: vendaError } = await supabase
  .from('producao.vendas')
  .insert({
    produto_id: produtoId,
    quantidade_vendida: quantidade,
    tipo_anuncio: tipo,
    preco_venda: preco,
    frete_cobrado: frete,
    custo_unitario: custo,
    taxa_ml: taxa,
    lucro_liquido: lucro,
    data_venda: data
  })

// 2. Atualizar estoque
const { error: estoqueError } = await supabase
  .from('producao.produtos_producao')
  .update({
    quantidade_estoque: novoEstoque,
    frete_real: frete || undefined
  })
  .eq('id', produtoId)
```

### Buscar vendas com filtros (PRODUÇÃO)
```typescript
const { data, error } = await supabase
  .from('producao.vendas')
  .select(`
    *,
    produto:producao.produtos_producao(nome)
  `)
  .gte('data_venda', dataInicio)
  .lte('data_venda', dataFim)
  .order('data_venda', { ascending: false })
```

---

## Important Notes

1. **Schema Isolation**: LAB e PRODUÇÃO são completamente isolados. NUNCA fazer joins entre schemas.

2. **Migrations**: Use Supabase CLI para criar migrations na pasta `supabase/migrations/`

3. **Cascading Deletes**: Cenários são deletados automaticamente quando produto é deletado (ON DELETE CASCADE)

4. **Constraints**: Todas as constraints são aplicadas no banco. Client-side validation é adicional, não substitui.

5. **Timestamps**: `data_cadastro` e `data_atualizacao` são gerenciados automaticamente pelo banco.
