# História Técnica - Sistema Gestão ML

Este documento registra a cronologia técnica do desenvolvimento, decisões arquiteturais e evolução do sistema.

---

## Fases de Desenvolvimento

### Fase 0.1.0 - Setup Inicial e MVP (2025-01)

**Objetivo**: Criar base funcional do sistema com cadastro de produtos, simulação e vendas básicas.

**Implementações**:
- Setup do projeto Next.js 14 com App Router
- Configuração de TypeScript, Tailwind CSS e shadcn/ui
- Implementação de Drizzle ORM com SQLite
- Schema inicial com tabelas: `produtos`, `cenarios`, `vendas`, `configuracoes`
- Sistema de soft delete com campo `deletedAt`
- Separação de ambientes LAB (simulação) e PROD (produção)
- Migração manual de produtos LAB → PROD
- Sistema de lixeira com restauração
- Cálculo básico de lucros e taxas ML

**Decisões Técnicas**:
- **SQLite local**: Escolhido para simplicidade e portabilidade (sem necessidade de servidor de banco)
- **Drizzle ORM**: Preferido sobre Prisma por ser mais leve e ter melhor suporte a TypeScript
- **Next.js API Routes**: Backend integrado ao frontend para reduzir complexidade
- **Soft delete**: Implementado para permitir restauração de dados

**Limitações Identificadas**:
- Custos armazenados diretamente na tabela `produtos`
- Cálculo de lucro baseado em custo médio simples
- Sem rastreamento de múltiplas compras do mesmo produto
- Impossibilidade de rastrear qual compra originou cada venda

---

### Fase 0.2.0 - Sistema de Compras FIFO (2025-01)

**Problema Identificado**: Lucros Negativos e Imprecisão de Custos

**Contexto do Problema**:
O sistema inicial calculava o lucro usando um custo médio simples armazenado diretamente no produto. Isso gerava problemas:

1. **Lucros Negativos Falsos**: 
   - Produto comprado a R$ 50,00
   - Nova compra do mesmo produto a R$ 80,00 (cotação subiu)
   - Custo médio: R$ 65,00
   - Venda a R$ 70,00 mostrava lucro positivo, mas na verdade estava vendendo estoque antigo (R$ 50,00) com custo calculado errado

2. **Imprecisão de Custos**:
   - Não era possível rastrear qual compra originou cada venda
   - Impossível saber o custo real de cada unidade vendida
   - Dificuldade para análise de rentabilidade por lote

3. **Múltiplas Compras**:
   - Sistema não suportava múltiplas compras do mesmo produto com custos diferentes
   - Cada nova compra sobrescrevia os dados anteriores

**Solução Implementada**: Sistema FIFO (First-In, First-Out)

**Arquitetura da Solução**:

1. **Nova Tabela `compras`**:
   ```typescript
   compras {
     id, produtoId, precoUSD, cotacao, freteTotal,
     quantidadeComprada, quantidadeDisponivel,
     moeda, fornecedor, observacoes,
     custoUnitario, dataCompra
   }
   ```
   - Cada compra é um registro independente
   - `quantidadeDisponivel` rastreia estoque restante de cada compra
   - `custoUnitario` calculado e salvo no momento da compra

2. **Refatoração da Tabela `produtos`**:
   - Removidos campos de custo: `precoUSD`, `cotacao`, `freteTotal`, `moeda`, `fornecedor`
   - Mantidos apenas: `id`, `nome`, `tipo`, `quantidade` (total), timestamps
   - Produtos agora são entidades puras, sem dados de custo

3. **Vínculo Venda → Compra**:
   - Campo `compraId` adicionado em `vendas`
   - Vincula cada venda à primeira compra usada no FIFO
   - Permite rastreabilidade completa

4. **Algoritmo FIFO**:
   ```typescript
   // Ordenar compras por dataCompra ASC (mais antigas primeiro)
   const comprasDisponiveis = getComprasDisponiveisProduto(produtoId)
     .orderBy(compras.dataCompra);
   
   // Deduzir estoque proporcionalmente
   for (const compra of comprasDisponiveis) {
     const qtdUsar = Math.min(quantidadeRestante, compra.quantidadeDisponivel);
     custoTotal += compra.custoUnitario * qtdUsar;
     deduzirEstoqueCompra(compra.id, qtdUsar);
   }
   ```

**Benefícios da Solução**:
- ✅ Lucro calculado com custo real da compra original
- ✅ Suporte a múltiplas compras com custos diferentes
- ✅ Rastreabilidade completa (venda → compra → produto)
- ✅ Cálculo preciso mesmo com variação de cotação
- ✅ Análise de rentabilidade por lote

**Migração de Dados**:
- Script `migrar-para-compras.ts` criado para migrar dados antigos
- Produtos PROD existentes tiveram compras criadas automaticamente
- Colunas antigas removidas do schema via script `remover-colunas-antigas-produtos.ts`

---

## Decisões Arquiteturais Justificadas

### 1. SQLite vs PostgreSQL/MySQL

**Decisão**: SQLite para banco local

**Justificativa**:
- **Simplicidade**: Não requer servidor de banco separado
- **Portabilidade**: Arquivo único (`data.db`) fácil de backup/restore
- **Performance**: Adequado para uso single-user/pequena equipe
- **Zero Configuração**: Funciona out-of-the-box após `pnpm install`
- **Desktop App**: Ideal para aplicação desktop local

**Trade-offs Aceitos**:
- Limitação de concorrência (aceitável para uso local)
- Sem suporte a múltiplos usuários simultâneos (requisito não necessário)

---

### 2. Drizzle ORM vs Prisma

**Decisão**: Drizzle ORM

**Justificativa**:
- **TypeScript First**: Tipos inferidos automaticamente do schema
- **Leveza**: Menor overhead e bundle size
- **Controle**: SQL direto quando necessário (`sql` template tag)
- **Migrations**: Controle total sobre migrations via código
- **Performance**: Menos abstrações, queries mais diretas

**Alternativa Considerada**: Prisma
- Rejeitada por ser mais pesada e ter menos flexibilidade para SQL customizado

---

### 3. Next.js API Routes vs Express Separado

**Decisão**: Next.js API Routes integrado

**Justificativa**:
- **Simplicidade**: Backend e frontend no mesmo projeto
- **TypeScript**: Compartilhamento de tipos entre frontend/backend
- **Deploy**: Deploy único simplificado
- **Desenvolvimento**: Hot reload unificado

**Alternativa Considerada**: Express.js separado
- Rejeitada por adicionar complexidade desnecessária para este caso de uso

---

### 4. Soft Delete vs Hard Delete

**Decisão**: Soft delete com campo `deletedAt`

**Justificativa**:
- **Recuperação**: Permite restaurar dados deletados acidentalmente
- **Auditoria**: Histórico completo de produtos
- **Integridade**: Mantém referências em vendas/compras
- **UX**: Lixeira permite visualizar e restaurar

**Implementação**:
```typescript
// Soft delete
deletedAt: integer('deleted_at', { mode: 'timestamp' })

// Queries filtram automaticamente
.where(isNull(produtos.deletedAt))
```

---

### 5. Separação LAB/PROD vs Ambiente Único

**Decisão**: Dois ambientes separados (LAB e PROD)

**Justificativa**:
- **Simulação Segura**: Testar cenários sem afetar dados reais
- **Migração Explícita**: Controle total sobre quando produto vai para produção
- **Isolamento**: Dados de simulação não interferem em produção

**Implementação**:
```typescript
tipo: text('tipo', { enum: ['LAB', 'PROD'] }).notNull()
```

**Fluxo**:
1. Produto criado em LAB (simulação)
2. Usuário testa cenários e ajusta preços
3. Migração explícita LAB → PROD (cria cópia)
4. Original permanece em LAB para futuras simulações

---

### 6. FIFO vs LIFO vs Custo Médio

**Decisão**: FIFO (First-In, First-Out)

**Justificativa**:
- **Realidade Física**: Simula comportamento real de estoque (primeiro a entrar, primeiro a sair)
- **Precisão Contábil**: Método aceito contabilmente
- **Rastreabilidade**: Permite saber exatamente qual compra originou cada venda
- **Análise**: Facilita análise de rentabilidade por lote

**Alternativas Consideradas**:
- **LIFO**: Rejeitado por não refletir realidade física
- **Custo Médio**: Rejeitado por perder rastreabilidade e precisão

**Implementação Técnica**:
```typescript
// Ordenação por dataCompra ASC garante FIFO
.orderBy(compras.dataCompra)

// Dedução proporcional de múltiplas compras
for (const compra of comprasDisponiveis) {
  const qtdUsar = Math.min(quantidadeRestante, compra.quantidadeDisponivel);
  custoTotal += compra.custoUnitario * qtdUsar;
  deduzirEstoqueCompra(compra.id, qtdUsar);
}
```

---

### 7. Tabela `compras` Separada vs Campos em `produtos`

**Decisão**: Tabela `compras` separada

**Justificativa**:
- **Múltiplas Compras**: Suporta várias compras do mesmo produto
- **Histórico**: Mantém histórico completo de todas as compras
- **Rastreabilidade**: Cada compra é um registro independente
- **Flexibilidade**: Permite diferentes fornecedores, cotações, etc. por compra
- **Normalização**: Segue princípios de normalização de banco de dados

**Estrutura**:
```
produtos (1) ──── (N) compras
    │
    └──── (N) vendas
```

**Benefícios**:
- Produto pode ter múltiplas compras com custos diferentes
- Cada venda rastreia qual compra foi usada
- Análise de rentabilidade por compra/lote

---

### 8. Transações para Operações Críticas

**Decisão**: Usar transações para operações que modificam múltiplas tabelas

**Justificativa**:
- **Atomicidade**: Garante que todas as operações acontecem ou nenhuma
- **Consistência**: Evita estados inconsistentes (ex: venda criada mas estoque não deduzido)
- **Integridade**: Protege contra falhas parciais

**Casos de Uso**:
1. **Criar Venda**:
   ```typescript
   db.transaction(() => {
     // Deduzir estoque de múltiplas compras (FIFO)
     // Criar registro de venda
     // Atualizar estoque total do produto
   });
   ```

2. **Deletar Compra**:
   ```typescript
   db.transaction(() => {
     // Reverter estoque do produto
     // Deletar compra
   });
   ```

---

### 9. Scripts de Migração e Manutenção

**Decisão**: Scripts TypeScript para migrações manuais

**Justificativa**:
- **SQLite Limitações**: Não suporta `ALTER TABLE DROP COLUMN` diretamente
- **Controle Total**: Scripts permitem lógica complexa de migração
- **Segurança**: Backup automático antes de alterações
- **Verificação**: Scripts verificam estado antes de executar

**Scripts Criados**:
- `migrar-para-compras.ts`: Migra dados antigos para nova estrutura
- `update-schema.ts`: Atualiza schema (adiciona tabelas/colunas)
- `remover-colunas-antigas-produtos.ts`: Remove colunas obsoletas
- `corrigir-foreign-key-compras.ts`: Corrige foreign keys após recriação de tabelas
- `verificar-produto.ts`: Verifica estado do banco para debug

**Padrão de Migração**:
1. Verificar estado atual
2. Criar nova tabela/estrutura
3. Copiar dados existentes
4. Fazer backup da estrutura antiga
5. Renomear nova estrutura
6. Verificar integridade

---

### 10. Validação de Integridade Referencial

**Decisão**: Validações manuais + Foreign Keys

**Justificativa**:
- **SQLite**: Suporta foreign keys mas requer `PRAGMA foreign_keys = ON`
- **Validação Dupla**: Validações em código + constraints no banco
- **Mensagens Claras**: Validações em código permitem mensagens de erro específicas

**Implementação**:
```typescript
// Validação antes de deletar compra
const vendasCompra = db
  .select()
  .from(vendas)
  .where(eq(vendas.compraId, compraId))
  .limit(1)
  .all();

if (vendasCompra.length > 0) {
  return NextResponse.json(
    { error: 'Compra possui vendas associadas' },
    { status: 400 }
  );
}
```

---

## Evolução do Schema

### Schema Inicial (v0.1.0)
```
produtos {
  id, nome, precoUSD, cotacao, freteTotal,
  quantidade, fornecedor, tipo, deletedAt,
  createdAt, updatedAt
}
```

**Problema**: Custos armazenados diretamente no produto, sem suporte a múltiplas compras.

### Schema Refatorado (v0.2.0)
```
produtos {
  id, nome, tipo, quantidade,
  deletedAt, createdAt, updatedAt
}

compras {
  id, produtoId, precoUSD, cotacao, freteTotal,
  quantidadeComprada, quantidadeDisponivel,
  moeda, fornecedor, observacoes,
  custoUnitario, dataCompra,
  createdAt, updatedAt
}

vendas {
  ...campos existentes...,
  compraId  // NOVO: vincula à compra usada
}
```

**Benefício**: Separação de responsabilidades, suporte a múltiplas compras, rastreabilidade completa.

---

## Lições Aprendidas

### 1. Normalização de Dados
Inicialmente, custos estavam na tabela `produtos`. A necessidade de múltiplas compras revelou a importância de normalização adequada.

### 2. Rastreabilidade
O sistema FIFO exigiu rastreamento completo de origem (venda → compra → produto). Isso melhorou significativamente a precisão dos cálculos.

### 3. Migrações de Schema
SQLite tem limitações para `ALTER TABLE`. Scripts de migração customizados foram necessários para refatorações complexas.

### 4. Transações
Operações que modificam múltiplas tabelas (vendas, compras, produtos) requerem transações para garantir consistência.

### 5. Validação em Múltiplas Camadas
Validações em código TypeScript + constraints no banco + validações de negócio garantem integridade completa.

---

## Próximas Evoluções Planejadas

- **Análise de Rentabilidade**: Relatórios por compra/lote
- **Histórico de Cotações**: Rastreamento de variação de cotação ao longo do tempo
- **Alertas de Estoque**: Notificações quando estoque baixo
- **Exportação de Dados**: CSV/Excel para análise externa
- **Backup Automático**: Sistema de backup incremental

---

**Última Atualização**: 2025-01  
**Versão Atual**: 0.2.0 (Não Lançado)

