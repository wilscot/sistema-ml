# Arquitetura do Sistema - Sistema Gestão ML

Documento técnico detalhado sobre a arquitetura, decisões de design, fluxos críticos e limitações do sistema.

---

## 📋 Índice

- [Stack Tecnológico](#-stack-tecnológico)
- [Modelo de Dados](#-modelo-de-dados)
- [Modelo FIFO](#-modelo-fifo)
- [Decisões Arquiteturais](#-decisões-arquiteturais)
- [Fluxos Críticos](#-fluxos-críticos)
- [Limitações Conhecidas](#-limitações-conhecidas)

---

## 🛠️ Stack Tecnológico

### Frontend

| Tecnologia | Versão | Propósito |
|------------|--------|-----------|
| **Next.js** | 14.x | Framework React com App Router |
| **React** | 18.x | Biblioteca UI |
| **TypeScript** | 5.x | Tipagem estática |
| **Tailwind CSS** | 3.x | Framework CSS utility-first |
| **shadcn/ui** | Latest | Componentes UI acessíveis |
| **Lucide React** | Latest | Ícones |

**Justificativa**:
- Next.js App Router oferece roteamento moderno e Server Components
- TypeScript garante type-safety em todo o código
- Tailwind + shadcn/ui fornece UI consistente e customizável

### Backend

| Tecnologia | Versão | Propósito |
|------------|--------|-----------|
| **Next.js API Routes** | 14.x | Endpoints REST |
| **TypeScript** | 5.x | Mesma linguagem frontend/backend |
| **Drizzle ORM** | Latest | ORM type-safe |
| **better-sqlite3** | Latest | Driver SQLite síncrono |
| **SQLite** | 3.x | Banco de dados local |

**Justificativa**:
- API Routes integrado ao Next.js simplifica deploy
- Drizzle ORM é leve e type-safe
- SQLite local não requer servidor separado

### Ferramentas de Desenvolvimento

- **pnpm**: Gerenciador de pacotes (mais rápido que npm)
- **ESLint**: Linter de código
- **Prettier**: Formatador de código
- **drizzle-kit**: CLI para migrations e schema management

---

## 🗄️ Modelo de Dados

### Diagrama de Relacionamentos

```
┌─────────────┐
│  produtos   │
│─────────────│
│ id (PK)     │
│ nome        │
│ tipo        │◄──┐
│ quantidade  │   │
│ deletedAt   │   │
└─────────────┘   │
       │          │
       │ 1        │ N
       │          │
       │ N        │
┌──────┴──────┐   │
│   compras   │   │
│─────────────│   │
│ id (PK)     │   │
│ produtoId   │───┘
│ precoUSD    │
│ cotacao     │
│ freteTotal  │
│ qtdComprada │
│ qtdDisponivel│
│ custoUnitario│
│ dataCompra  │
└─────────────┘
       │
       │ 1
       │
       │ N
┌──────┴──────┐
│   vendas    │
│─────────────│
│ id (PK)     │
│ produtoId   │───┐
│ compraId   │───┼──┐
│ qtdVendida │   │  │
│ precoVenda │   │  │
│ lucroLiquido│  │  │
└─────────────┘  │  │
                 │  │
                 │  │ N
            ┌────┘  │
            │       │
            │ 1     │
      ┌─────┴───┐   │
      │ cenarios│   │
      │─────────│   │
      │ id (PK) │   │
      │ produtoId│──┘
      │ nome     │
      │ precoVenda│
      │ lucro    │
      └──────────┘
```

### Tabelas Principais

#### `produtos`
Armazena informações básicas de produtos. **Não contém dados de custo**.

```typescript
{
  id: number;
  nome: string;
  tipo: 'LAB' | 'PROD';
  quantidade: number;  // Estoque total (soma de compras disponíveis)
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
```

**Responsabilidades**:
- Identificação do produto
- Separação LAB/PROD
- Estoque total (agregado)

#### `compras`
Armazena cada compra individual com custos e estoque disponível.

```typescript
{
  id: number;
  produtoId: number;
  precoUSD: number;
  cotacao: number;
  freteTotal: number;
  quantidadeComprada: number;      // Quantidade original
  quantidadeDisponivel: number;    // Quantidade restante (FIFO)
  moeda: 'USD' | 'BRL';
  fornecedor: string | null;
  observacoes: string | null;
  custoUnitario: number;           // Calculado e salvo
  dataCompra: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

**Responsabilidades**:
- Rastreamento de cada compra
- Cálculo de custo unitário
- Gestão de estoque por compra (FIFO)

#### `vendas`
Armazena vendas com vínculo à compra usada.

```typescript
{
  id: number;
  produtoId: number;
  compraId: number | null;         // Primeira compra usada (FIFO)
  quantidadeVendida: number;
  precoVenda: number;
  tipoAnuncio: 'CLASSICO' | 'PREMIUM';
  freteCobrado: number;
  taxaML: number;
  lucroLiquido: number;            // Calculado com custo FIFO
  data: Date;
  // ... campos adicionais do ML
}
```

**Responsabilidades**:
- Registro de vendas
- Rastreabilidade (compraId)
- Cálculo de lucro com custo real

---

## 🔄 Modelo FIFO

### Conceito

**FIFO (First-In, First-Out)**: Primeiro a entrar, primeiro a sair.

O sistema usa FIFO para:
1. **Deduzir estoque**: Compras mais antigas são usadas primeiro
2. **Calcular custos**: Custo da venda = soma proporcional dos custos das compras usadas
3. **Rastreabilidade**: Cada venda sabe qual compra originou o estoque

### Algoritmo de Dedução

```typescript
// 1. Buscar compras disponíveis ordenadas por data (mais antigas primeiro)
const comprasDisponiveis = getComprasDisponiveisProduto(produtoId)
  .orderBy(compras.dataCompra);  // ASC = FIFO

// 2. Calcular estoque total
const estoqueTotal = comprasDisponiveis.reduce(
  (acc, c) => acc + c.quantidadeDisponivel, 
  0
);

// 3. Validar estoque suficiente
if (estoqueTotal < quantidadeVendida) {
  throw new Error('Estoque insuficiente');
}

// 4. Deduzir proporcionalmente (FIFO)
let quantidadeRestante = quantidadeVendida;
let custoTotalVenda = 0;
let compraUsada = null;

for (const compra of comprasDisponiveis) {
  if (quantidadeRestante === 0) break;
  
  // Usar o mínimo entre quantidade restante e disponível
  const quantidadeDeduzir = Math.min(
    quantidadeRestante,
    compra.quantidadeDisponivel
  );
  
  // Deduzir estoque da compra
  deduzirEstoqueCompra(compra.id, quantidadeDeduzir);
  
  // Acumular custo proporcional
  custoTotalVenda += compra.custoUnitario * quantidadeDeduzir;
  
  quantidadeRestante -= quantidadeDeduzir;
  
  // Vincular à primeira compra usada
  if (!compraUsada && quantidadeDeduzir > 0) {
    compraUsada = compra;
  }
}
```

### Exemplo Prático

**Estado Inicial**:
```
Compra 1 (01/01/2025): 10 unidades a R$ 50,00/unidade
  - quantidadeComprada: 10
  - quantidadeDisponivel: 10
  - custoUnitario: R$ 50,00

Compra 2 (15/01/2025): 5 unidades a R$ 60,00/unidade
  - quantidadeComprada: 5
  - quantidadeDisponivel: 5
  - custoUnitario: R$ 60,00

Produto: quantidade total = 15
```

**Venda de 12 unidades**:

```
Passo 1: Usar Compra 1 (mais antiga)
  - quantidadeDeduzir: min(12, 10) = 10
  - custo: 10 * R$ 50,00 = R$ 500,00
  - Compra 1: quantidadeDisponivel = 0

Passo 2: Usar Compra 2 (próxima)
  - quantidadeDeduzir: min(2, 5) = 2
  - custo: 2 * R$ 60,00 = R$ 120,00
  - Compra 2: quantidadeDisponivel = 3

Resultado:
  - custoTotalVenda: R$ 500,00 + R$ 120,00 = R$ 620,00
  - custoUnitarioMedio: R$ 620,00 / 12 = R$ 51,67
  - compraId na venda: ID da Compra 1 (primeira usada)
  - Produto: quantidade total = 3
```

### Vantagens do FIFO

1. **Precisão Contábil**: Custo reflete o valor real pago na compra
2. **Rastreabilidade**: Sabe-se exatamente qual compra originou cada venda
3. **Análise de Rentabilidade**: Permite analisar lucro por lote/compra
4. **Realidade Física**: Simula comportamento real de estoque

### Implementação Técnica

**Arquivos**:
- `src/lib/db-client.ts`: `getComprasDisponiveisProduto()` - Busca compras ordenadas
- `src/app/api/vendas/route.ts`: Lógica de dedução FIFO
- `src/components/VendaForm.tsx`: Preview de custos FIFO em tempo real

**Ordenação**:
```typescript
.orderBy(compras.dataCompra)  // ASC = mais antigas primeiro
```

**Atualização Atômica**:
```typescript
db.transaction(() => {
  // Todas as operações dentro da transação
  // Garante consistência
});
```

---

## 🏗️ Decisões Arquiteturais

### 1. SQLite Local vs PostgreSQL/MySQL

**Decisão**: SQLite

**Justificativa**:
- ✅ **Zero Configuração**: Funciona out-of-the-box
- ✅ **Portabilidade**: Arquivo único (`data.db`) fácil de backup
- ✅ **Performance**: Adequado para uso single-user
- ✅ **Desktop App**: Ideal para aplicação local

**Trade-offs**:
- ❌ Limitação de concorrência (aceitável para uso local)
- ❌ Sem suporte a múltiplos usuários simultâneos

**Impacto**: Sistema é single-user por design.

---

### 2. Drizzle ORM vs Prisma

**Decisão**: Drizzle ORM

**Justificativa**:
- ✅ **TypeScript First**: Tipos inferidos do schema
- ✅ **Leveza**: Menor bundle size
- ✅ **Controle**: SQL direto quando necessário
- ✅ **Performance**: Menos abstrações

**Alternativa Considerada**: Prisma
- Rejeitada por ser mais pesada e menos flexível

---

### 3. Next.js API Routes vs Express Separado

**Decisão**: API Routes integrado

**Justificativa**:
- ✅ **Simplicidade**: Backend e frontend no mesmo projeto
- ✅ **Type Safety**: Compartilhamento de tipos
- ✅ **Deploy**: Deploy único
- ✅ **Hot Reload**: Desenvolvimento unificado

**Alternativa Considerada**: Express.js separado
- Rejeitada por adicionar complexidade desnecessária

---

### 4. Tabela `compras` Separada vs Campos em `produtos`

**Decisão**: Tabela separada

**Justificativa**:
- ✅ **Múltiplas Compras**: Suporta várias compras do mesmo produto
- ✅ **Histórico Completo**: Mantém registro de todas as compras
- ✅ **Normalização**: Segue princípios de design de banco
- ✅ **Flexibilidade**: Diferentes fornecedores, cotações por compra

**Estrutura**:
```
produtos (1) ──── (N) compras
```

**Benefício**: Permite FIFO e rastreabilidade completa.

---

### 5. Soft Delete vs Hard Delete

**Decisão**: Soft delete com `deletedAt`

**Justificativa**:
- ✅ **Recuperação**: Permite restaurar dados
- ✅ **Auditoria**: Histórico completo
- ✅ **Integridade**: Mantém referências

**Implementação**:
```typescript
deletedAt: integer('deleted_at', { mode: 'timestamp' })

// Queries filtram automaticamente
.where(isNull(produtos.deletedAt))
```

---

### 6. Separação LAB/PROD

**Decisão**: Dois ambientes separados

**Justificativa**:
- ✅ **Simulação Segura**: Testar sem afetar produção
- ✅ **Migração Explícita**: Controle total
- ✅ **Isolamento**: Dados não interferem

**Fluxo**:
1. Criar em LAB
2. Testar cenários
3. Migrar para PROD (cria cópia)
4. Original permanece em LAB

---

### 7. Transações para Operações Críticas

**Decisão**: Usar transações sempre que múltiplas tabelas são modificadas

**Justificativa**:
- ✅ **Atomicidade**: Tudo ou nada
- ✅ **Consistência**: Evita estados inconsistentes
- ✅ **Integridade**: Protege contra falhas parciais

**Casos de Uso**:
- Criar venda (deduz compras + cria venda + atualiza produto)
- Deletar compra (reverte estoque + deleta compra)
- Batch delete (múltiplas operações)

---

## 🔀 Fluxos Críticos

### Fluxo 1: Criar Venda com FIFO

**Endpoint**: `POST /api/vendas`

**Passos**:

1. **Validação Inicial**
   ```typescript
   - Validar campos obrigatórios
   - Verificar se produto existe e é PROD
   - Verificar se produto não está deletado
   ```

2. **Buscar Compras Disponíveis (FIFO)**
   ```typescript
   const comprasDisponiveis = getComprasDisponiveisProduto(produtoId)
     .orderBy(compras.dataCompra);  // ASC = mais antigas primeiro
   ```

3. **Validar Estoque**
   ```typescript
   const estoqueTotal = comprasDisponiveis.reduce(
     (acc, c) => acc + c.quantidadeDisponivel, 
     0
   );
   if (estoqueTotal < quantidadeVendida) {
     throw new Error('Estoque insuficiente');
   }
   ```

4. **Transação: Deduzir Estoque + Criar Venda**
   ```typescript
   db.transaction(() => {
     // Deduzir estoque FIFO
     for (const compra of comprasDisponiveis) {
       const qtdDeduzir = Math.min(quantidadeRestante, compra.quantidadeDisponivel);
       deduzirEstoqueCompra(compra.id, qtdDeduzir);
       custoTotalVenda += compra.custoUnitario * qtdDeduzir;
       quantidadeRestante -= qtdDeduzir;
     }
     
     // Criar venda
     db.insert(vendas).values({
       produtoId,
       compraId: primeiraCompraUsada.id,
       quantidadeVendida,
       lucroLiquido: receitaTotal - custoTotalVenda - taxaML,
       // ...
     });
     
     // Atualizar estoque total do produto
     db.update(produtos)
       .set({ quantidade: sql`${produtos.quantidade} - ${quantidadeVendida}` })
       .where(eq(produtos.id, produtoId));
   });
   ```

**Garantias**:
- ✅ Atomicidade: Tudo ou nada
- ✅ Consistência: Estoque sempre correto
- ✅ Rastreabilidade: Venda vinculada à compra

---

### Fluxo 2: Criar Compra

**Endpoint**: `POST /api/compras`

**Passos**:

1. **Validação**
   ```typescript
   - Validar campos obrigatórios
   - Verificar se produto existe e é PROD
   - Verificar se produto não está deletado
   ```

2. **Calcular Custo Unitário**
   ```typescript
   const custoUnitario = calcularCustoTotal(
     precoUSD,
     cotacao,
     freteTotal,
     quantidadeComprada,
     moeda
   );
   ```

3. **Inserir Compra**
   ```typescript
   db.insert(compras).values({
     produtoId,
     precoUSD,
     cotacao,
     freteTotal,
     quantidadeComprada,
     quantidadeDisponivel: quantidadeComprada,  // Inicial = comprada
     custoUnitario,
     // ...
   });
   ```

4. **Atualizar Estoque do Produto**
   ```typescript
   db.update(produtos)
     .set({
       quantidade: sql`${produtos.quantidade} + ${quantidadeComprada}`,
       updatedAt: new Date()
     })
     .where(eq(produtos.id, produtoId));
   ```

**Garantias**:
- ✅ Custo calculado e salvo
- ✅ Estoque atualizado automaticamente
- ✅ Compra disponível para FIFO

---

### Fluxo 3: Deletar Compra em Lote

**Endpoint**: `DELETE /api/compras/batch-delete`

**Passos**:

1. **Validação por Compra**
   ```typescript
   for (const id of ids) {
     // Verificar se compra existe
     // Verificar se compra tem vendas associadas
     if (vendas.length > 0) {
       // Bloquear exclusão
       erros.push(`Compra ${id}: possui vendas associadas`);
       continue;
     }
   }
   ```

2. **Transação: Reverter Estoque + Deletar**
   ```typescript
   db.transaction(() => {
     for (const id of ids) {
       const compra = buscarCompra(id);
       
       // Reverter estoque (quantidadeDisponivel)
       db.update(produtos)
         .set({
           quantidade: sql`${produtos.quantidade} - ${compra.quantidadeDisponivel}`
         })
         .where(eq(produtos.id, compra.produtoId));
       
       // Deletar compra
       db.delete(compras).where(eq(compras.id, id));
     }
   });
   ```

**Garantias**:
- ✅ Compras com vendas não podem ser deletadas
- ✅ Estoque revertido corretamente
- ✅ Atomicidade garantida

---

### Fluxo 4: Migração LAB → PROD

**Endpoint**: `POST /api/produtos/migrate`

**Passos**:

1. **Validação**
   ```typescript
   - Verificar se produto existe
   - Verificar se é LAB
   - Verificar se não está deletado
   - Verificar se tem nome válido
   ```

2. **Criar Cópia em PROD**
   ```typescript
   db.insert(produtos).values({
     nome: produtoOriginal.nome,
     tipo: 'PROD',
     quantidade: produtoOriginal.quantidade ?? 0,
     // Original permanece em LAB
   });
   ```

**Garantias**:
- ✅ Original permanece em LAB
- ✅ Cópia criada em PROD
- ✅ Dados preservados

---

## ⚠️ Limitações Conhecidas

### 1. SQLite - Limitações de ALTER TABLE

**Problema**: SQLite não suporta `ALTER TABLE DROP COLUMN` diretamente.

**Impacto**: Remover colunas requer recriar tabela.

**Solução**: Scripts de migração customizados (`remover-colunas-antigas-produtos.ts`).

**Workaround**:
```bash
pnpm db:clean  # Recria tabela sem colunas antigas
```

---

### 2. Foreign Keys Após Migrações

**Problema**: Após recriar tabelas, foreign keys podem apontar para tabelas de backup.

**Impacto**: Erro "FOREIGN KEY constraint failed".

**Solução**: Script de correção (`corrigir-foreign-key-compras.ts`).

**Workaround**:
```bash
pnpm db:fix-fk  # Corrige foreign keys
```

---

### 3. Single-User por Design

**Limitação**: SQLite não suporta múltiplos escritores simultâneos eficientemente.

**Impacto**: Sistema é single-user. Múltiplos usuários podem causar locks.

**Solução Atual**: Não há. É uma limitação aceita do design.

**Futuro**: Migrar para PostgreSQL se necessário suporte multi-user.

---

### 4. Sem Backup Automático

**Limitação**: Não há sistema de backup automático.

**Impacto**: Dados podem ser perdidos se arquivo `data.db` for corrompido.

**Solução Atual**: Backup manual do arquivo `db/data.db`.

**Recomendação**: Implementar backup automático periódico.

---

### 5. Validações de Negócio em Código

**Limitação**: Validações de integridade são feitas em código TypeScript, não no banco.

**Impacto**: Possível inconsistência se validações forem contornadas.

**Mitigação**:
- Foreign keys no banco
- Transações para operações críticas
- Validações em múltiplas camadas (frontend + backend)

---

### 6. Sem Índices Otimizados

**Limitação**: Não há índices explícitos para queries FIFO.

**Impacto**: Performance pode degradar com muitas compras.

**Solução Atual**: Ordenação por `dataCompra` funciona, mas pode ser otimizada.

**Futuro**: Adicionar índice em `(produtoId, dataCompra)` para FIFO.

---

### 7. Cálculo de Custo em Tempo Real

**Limitação**: Preview de custos FIFO no frontend recalcula a cada mudança.

**Impacto**: Pode ser lento com muitas compras.

**Mitigação**: 
- Cálculo apenas quando necessário
- Cache de compras disponíveis
- Limite de compras por produto (não implementado)

---

### 8. Sem Versionamento de Schema

**Limitação**: Migrações não são versionadas automaticamente.

**Impacto**: Dificuldade em rastrear histórico de mudanças de schema.

**Solução Atual**: Scripts manuais documentados.

**Futuro**: Usar sistema de migrations versionado (Drizzle migrations).

---

### 9. Sem Rollback de Transações Parciais

**Limitação**: Se transação falhar parcialmente, pode deixar dados inconsistentes.

**Impacto**: Raro, mas possível em casos de erro não tratado.

**Mitigação**:
- Try-catch em todas as transações
- Validações antes de transação
- Logs detalhados para debug

---

### 10. Limitação de Tamanho do Banco

**Limitação**: SQLite tem limite prático de ~140TB, mas performance degrada com muitos registros.

**Impacto**: Sistema pode ficar lento com milhões de vendas/compras.

**Solução Atual**: Não há. Adequado para uso pessoal/pequena equipe.

**Futuro**: Implementar arquivamento de dados antigos se necessário.

---

## 🔐 Segurança e Integridade

### Validações em Múltiplas Camadas

1. **Frontend**: Validação de formulários
2. **API**: Validação de dados e regras de negócio
3. **Database**: Foreign keys e constraints

### Transações para Consistência

Todas as operações que modificam múltiplas tabelas usam transações:

```typescript
db.transaction(() => {
  // Operações atômicas
});
```

### Soft Delete para Recuperação

Produtos deletados podem ser restaurados via lixeira.

---

## 📊 Performance

### Otimizações Implementadas

1. **Queries Direcionadas**: Apenas busca dados necessários
2. **Índices Implícitos**: Primary keys e foreign keys
3. **Transações**: Reduzem round-trips ao banco
4. **Cálculos em Memória**: FIFO calculado em memória (rápido)

### Pontos de Atenção

1. **Muitas Compras**: Query FIFO pode ser lenta sem índice
2. **Muitas Vendas**: Listagem pode ser lenta
3. **Joins Complexos**: Algumas queries fazem múltiplos joins

### Recomendações Futuras

1. Adicionar índices explícitos
2. Implementar paginação
3. Cache de queries frequentes
4. Lazy loading de dados

---

## 🔄 Evolução Futura

### Melhorias Planejadas

1. **Índices Otimizados**: Para queries FIFO
2. **Backup Automático**: Sistema de backup incremental
3. **Migrations Versionadas**: Histórico de mudanças de schema
4. **Paginação**: Para listas grandes
5. **Cache**: Para queries frequentes

### Possíveis Refatorações

1. **Separação de Concerns**: Extrair lógica de negócio para services
2. **Repository Pattern**: Abstrair acesso ao banco
3. **Event System**: Para notificações e auditoria

---

**Última Atualização**: 2025-01  
**Versão**: 0.2.0 (Não Lançado)

