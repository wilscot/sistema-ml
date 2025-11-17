# Guia de Contribuição

Este documento fornece diretrizes para contribuir com o projeto Sistema Gestão ML.

## 📋 Índice

- [Padrão de Commits](#-padrão-de-commits)
- [Estrutura de Mensagens](#-estrutura-de-mensagens)
- [Tipos de Commit](#-tipos-de-commit)
- [Exemplos Práticos](#-exemplos-práticos)
- [Workflow de Desenvolvimento](#-workflow-de-desenvolvimento)
- [Convenções de Código](#-convenções-de-código)

---

## 📝 Padrão de Commits

Este projeto segue o padrão [Conventional Commits](https://www.conventionalcommits.org/).

### Configuração do Template

O template de commit já está configurado localmente. Para usar globalmente:

```bash
git config --global commit.template .gitmessage
```

Ou apenas para este repositório (já configurado):

```bash
git config commit.template .gitmessage
```

Agora, ao executar `git commit` sem `-m`, o editor abrirá com o template.

### Formato

```
<tipo>(<escopo>): <assunto>

<corpo opcional>

<rodapé opcional>
```

---

## 🏗️ Estrutura de Mensagens

### Tipo (obrigatório)

Indica a natureza da mudança. Veja [Tipos de Commit](#-tipos-de-commit) abaixo.

### Escopo (opcional)

Indica a área do código afetada. Exemplos:
- `produtos` - Funcionalidades de produtos
- `compras` - Sistema de compras
- `vendas` - Sistema de vendas
- `cenarios` - Simulação de cenários
- `api` - Endpoints da API
- `ui` - Componentes de interface
- `db` - Schema e migrations
- `docs` - Documentação
- `config` - Configurações

### Assunto (obrigatório)

- **Imperativo, presente**: "adiciona" não "adicionou" ou "adicionando"
- **Primeira letra minúscula**
- **Sem ponto final**
- **Máximo 50 caracteres**
- **Descreve o que foi feito, não como**

### Corpo (opcional)

- Explique o **"o quê"** e **"por quê"**, não o "como"
- Quebra de linha após 72 caracteres
- Use para explicar contexto e decisões
- Lista de mudanças com `-` ou `*`

### Rodapé (opcional)

- Referências a issues: `Fixes #123`, `Closes #45`
- Breaking changes: `BREAKING CHANGE: descrição`

---

## 🏷️ Tipos de Commit

### `feat`

Nova funcionalidade para o usuário.

```bash
feat(compras): adiciona exclusão em lote de compras
feat(api): adiciona endpoint de batch delete para produtos
feat(ui): adiciona preview de custos FIFO no formulário de vendas
```

### `fix`

Correção de bug.

```bash
fix(api): corrige erro de foreign key em compras
fix(vendas): corrige cálculo de lucro com múltiplas compras
fix(ui): corrige validação de campos opcionais no formulário
```

### `docs`

Mudanças apenas na documentação.

```bash
docs(readme): adiciona seção de troubleshooting
docs(api): atualiza documentação de endpoints
docs(history): documenta decisão arquitetural do FIFO
```

### `style`

Mudanças que não afetam o significado do código (formatação, espaços, etc).

```bash
style(components): formata código com Prettier
style(api): corrige indentação em route.ts
```

### `refactor`

Refatoração de código sem mudança de funcionalidade.

```bash
refactor(produtos): remove campos de custo do schema
refactor(calculators): simplifica função de cálculo de lucro
refactor(db-client): extrai lógica FIFO para função separada
```

### `perf`

Melhoria de performance.

```bash
perf(api): otimiza query de compras disponíveis
perf(db): adiciona índice em dataCompra para FIFO
```

### `test`

Adição ou correção de testes.

```bash
test(calculators): adiciona testes para cálculo FIFO
test(api): corrige testes de exclusão em lote
```

### `chore`

Mudanças em build, dependências, scripts, configurações.

```bash
chore(deps): atualiza dependências do projeto
chore(scripts): adiciona script de verificação de schema
chore(config): atualiza configuração do TypeScript
```

### `db`

Mudanças no banco de dados (schema, migrations, scripts).

```bash
db(schema): adiciona tabela compras
db(migration): cria script de migração para FIFO
db(fix): corrige foreign key da tabela compras
```

---

## 💡 Exemplos Práticos

### Exemplo 1: Nova Funcionalidade

```bash
feat(compras): adiciona sistema de exclusão em lote

Implementa funcionalidade para deletar múltiplas compras
simultaneamente com validações de integridade.

- Adiciona endpoint /api/compras/batch-delete
- Implementa seleção múltipla na UI
- Valida compras com vendas associadas
- Reverte estoque automaticamente

Fixes #23
```

### Exemplo 2: Correção de Bug

```bash
fix(api): corrige erro de foreign key em compras

Foreign key estava apontando para tabela de backup após
migração de schema. Script de correção recria tabela
com foreign key apontando para produtos.id.

- Cria script corrigir-foreign-key-compras.ts
- Adiciona comando pnpm db:fix-fk
- Verifica integridade após correção

Fixes #45
```

### Exemplo 3: Refatoração

```bash
refactor(produtos): remove campos de custo do schema

Custos agora são gerenciados exclusivamente via tabela
compras. Simplifica schema e permite múltiplas compras
por produto com custos diferentes.

- Remove precoUSD, cotacao, freteTotal, moeda, fornecedor
- Atualiza API para não exigir campos de custo
- Cria script de migração de dados

BREAKING CHANGE: Campos de custo removidos de produtos.
Use tabela compras para registrar custos.
```

### Exemplo 4: Documentação

```bash
docs(readme): adiciona seção de troubleshooting

Inclui soluções para erros comuns:
- Schema desatualizado
- Foreign key incorreta
- Colunas antigas no banco
- Problemas de integridade
```

### Exemplo 5: Mudança no Banco

```bash
db(schema): adiciona campo compraId em vendas

Permite rastrear qual compra originou cada venda,
essencial para análise de rentabilidade por lote.

- Adiciona compraId em schema.ts
- Atualiza API de vendas para vincular compra
- Cria migration script
```

### Exemplo 6: Correção Simples

```bash
fix(ui): corrige validação de campos opcionais

Campos de custo agora são opcionais no formulário
de produtos, permitindo criar produtos LAB sem
dados de custo.
```

### Exemplo 7: Melhoria de Performance

```bash
perf(api): otimiza query de compras disponíveis

Adiciona ordenação por dataCompra no banco em vez
de ordenar em memória, melhorando performance com
muitas compras.
```

### Exemplo 8: Script de Manutenção

```bash
chore(scripts): adiciona script de verificação de schema

Cria script para verificar estado do banco e identificar
problemas de schema ou foreign keys antes de erros.

- Adiciona scripts/verificar-produto.ts
- Útil para debug e troubleshooting
```

---

## 🔄 Workflow de Desenvolvimento

### 1. Criar Branch

```bash
git checkout -b feat/nova-funcionalidade
# ou
git checkout -b fix/corrige-bug
```

### 2. Fazer Mudanças

- Siga as [Convenções de Código](#-convenções-de-código)
- Teste localmente
- Verifique TypeScript: `pnpm type-check`
- Verifique lint: `pnpm lint`

### 3. Commit

```bash
git add .
git commit
# Editor abrirá com template .gitmessage
```

### 4. Push

```bash
git push origin feat/nova-funcionalidade
```

---

## 📐 Convenções de Código

### TypeScript

- Use tipos explícitos quando necessário
- Evite `any`, prefira tipos específicos
- Use interfaces para objetos complexos
- Exporte tipos quando reutilizáveis

### Nomenclatura

- **Componentes**: PascalCase (`CompraForm.tsx`)
- **Funções**: camelCase (`calcularCustoTotal`)
- **Constantes**: UPPER_SNAKE_CASE (`TAXA_CLASSICO`)
- **Arquivos**: kebab-case para rotas (`batch-delete/route.ts`)

### Estrutura de Arquivos

- **API Routes**: `src/app/api/<recurso>/route.ts`
- **Pages**: `src/app/<recurso>/page.tsx`
- **Components**: `src/components/<Nome>.tsx`
- **Utils**: `src/lib/<nome>.ts`

### Imports

```typescript
// 1. Bibliotecas externas
import { NextRequest, NextResponse } from 'next/server';
import { eq, desc } from 'drizzle-orm';

// 2. Imports internos (absolutos)
import { db } from '@/db';
import { calcularCustoTotal } from '@/lib/calculators';

// 3. Imports relativos
import CompraForm from '../components/CompraForm';
```

### Tratamento de Erros

```typescript
try {
  // código
} catch (error) {
  console.error('Contexto do erro:', error);
  const errorMessage = error instanceof Error 
    ? error.message 
    : 'Erro desconhecido';
  
  // Retornar resposta apropriada
  return NextResponse.json(
    { error: 'Mensagem amigável', details: errorMessage },
    { status: 500 }
  );
}
```

### Validações

- Valide dados na API, não apenas no frontend
- Retorne mensagens de erro claras e específicas
- Use códigos HTTP apropriados (400, 404, 500)

### Transações

Use transações para operações que modificam múltiplas tabelas:

```typescript
db.transaction(() => {
  // Operação 1
  // Operação 2
  // Operação 3
});
```

---

## ✅ Checklist Antes de Commitar

- [ ] Código testado localmente
- [ ] TypeScript sem erros (`pnpm type-check`)
- [ ] Lint sem erros (`pnpm lint`)
- [ ] Mensagem de commit segue padrão
- [ ] Documentação atualizada (se necessário)
- [ ] Breaking changes documentados (se houver)

---

## 🚫 O Que Evitar

### Mensagens de Commit Ruins

```bash
# ❌ Ruim
git commit -m "fix"
git commit -m "corrige bug"
git commit -m "WIP"
git commit -m "atualiza coisas"
git commit -m "mudanças diversas"

# ✅ Bom
git commit -m "fix(api): corrige erro de foreign key em compras"
git commit -m "feat(compras): adiciona exclusão em lote"
```

### Commits Muito Grandes

Evite commits que fazem muitas coisas diferentes. Prefira commits menores e focados:

```bash
# ❌ Ruim: Um commit fazendo tudo
feat: adiciona sistema de compras completo

# ✅ Bom: Commits separados
feat(db): adiciona tabela compras
feat(api): adiciona endpoint de compras
feat(ui): adiciona formulário de compras
```

---

## 📚 Recursos

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
- [Keep a Changelog](https://keepachangelog.com/)

---

**Última Atualização**: 2025-01

