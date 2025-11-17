# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [Não Lançado]

### Added
- Sistema de Compras com gestão FIFO (First-In, First-Out)
  - Tabela `compras` para registrar entradas de estoque com custos
  - Endpoint `/api/compras` para listar e criar compras
  - Página `/compras` para visualizar todas as compras registradas
  - Página `/compras/novo` para registrar novas compras
  - Componente `CompraForm` com cálculo de custos em tempo real
  - Integração com API de cotação do dólar
  - Funções helper em `db-client.ts` para trabalhar com compras:
    - `getComprasByProdutoId()` - Buscar compras por produto
    - `getComprasDisponiveisProduto()` - Buscar compras disponíveis (FIFO)
    - `getCompraById()` - Buscar compra por ID
    - `getComprasComProdutos()` - Buscar compras com dados do produto
    - `deduzirEstoqueCompra()` - Deduzir estoque de uma compra
- Sistema de exclusão em lote de compras
  - Endpoint `/api/compras/batch-delete` para deletar múltiplas compras
  - Seleção múltipla na página de compras com checkboxes
  - Botão "Selecionar todas" para seleção em massa
  - Dialog de confirmação antes de deletar
  - Validação para impedir exclusão de compras com vendas associadas
  - Reversão automática de estoque ao deletar compras
- Sistema de exclusão em lote de produtos na lixeira
  - Endpoint `/api/produtos/batch-delete` para deletar múltiplos produtos
  - Seleção múltipla na página de lixeira
  - Validação para impedir exclusão de produtos com vendas ou compras associadas
- Scripts de migração e manutenção do banco de dados
  - `scripts/migrar-para-compras.ts` - Migrar dados antigos para nova estrutura
  - `scripts/update-schema.ts` - Atualizar schema do banco
  - `scripts/remover-colunas-antigas-produtos.ts` - Remover colunas obsoletas
  - `scripts/corrigir-foreign-key-compras.ts` - Corrigir foreign keys
  - `scripts/verificar-produto.ts` - Verificar estado do banco
- Novos scripts npm:
  - `pnpm db:update` - Atualizar schema do banco
  - `pnpm db:clean` - Remover colunas antigas
  - `pnpm db:fix-fk` - Corrigir foreign keys

### Changed
- Refatoração do sistema de custos de produtos
  - Campos de custo (`precoUSD`, `cotacao`, `freteTotal`, `moeda`, `fornecedor`) removidos da tabela `produtos`
  - Custos agora são gerenciados exclusivamente através da tabela `compras`
  - Produtos LAB não requerem mais dados de custo no cadastro
  - Produtos PROD devem ter compras registradas para ter custos
- Sistema de vendas atualizado para usar FIFO
  - Vendas agora deduzem estoque usando método FIFO (First-In, First-Out)
  - Cálculo de `lucroLiquido` baseado no custo real da compra (FIFO)
  - Vendas vinculadas à compra original através do campo `compraId`
  - Preview de custos em tempo real no formulário de vendas usando FIFO
  - Alerta visual quando estoque é insuficiente
- Formulário de produtos simplificado
  - Campos de custo tornados opcionais (apenas para produtos LAB antigos)
  - Validação ajustada para não exigir custos no cadastro
- API de produtos atualizada
  - POST `/api/produtos` agora aceita apenas `nome`, `tipo` e `quantidade`
  - PATCH `/api/produtos/[id]` atualizado para novos campos
  - Validação de campos de custo removida
- API de migração atualizada
  - Migração LAB → PROD não requer mais campos de custo
  - Validação simplificada

### Fixed
- Corrigido erro "can't access property toFixed, produto.precoUSD is undefined"
  - Componentes atualizados para verificar existência de campos antes de usar
  - Fallback para valores padrão quando campos não existem
- Corrigido erro "Schema do banco desatualizado" nas telas de vendas e compras
  - Melhor tratamento de erros de schema nas APIs
  - Mensagens de erro mais específicas e acionáveis
- Corrigido erro "Erro ao carregar produtos" na página de nova compra
  - Adicionado parâmetro `tipo=PROD` obrigatório na requisição
- Corrigido erro "NOT NULL constraint failed: produtos.preco_usd"
  - Script para remover colunas antigas do banco
  - Schema atualizado para refletir nova estrutura
- Corrigido erro "FOREIGN KEY constraint failed" ao criar compras
  - Foreign key da tabela `compras` corrigida para apontar para `produtos.id`
  - Script de correção de foreign keys criado
- Corrigido erro "Produto com dados incompletos não pode ser migrado"
  - Validação de migração atualizada para não exigir campos de custo
- Melhorado tratamento de erros em todas as APIs
  - Logs detalhados para debug
  - Mensagens de erro mais específicas
  - Detecção de erros de schema com sugestões de correção

### Removed
- Campos de custo da tabela `produtos`:
  - `precoUSD`
  - `cotacao`
  - `freteTotal`
  - `moeda`
  - `fornecedor`
- Validação de campos de custo no formulário de produtos
- Dependência de campos de custo na migração LAB → PROD

## [0.1.0] - 2025-01-XX

### Added
- Setup inicial do projeto
  - Next.js 14 com App Router
  - TypeScript configurado
  - Tailwind CSS + shadcn/ui para componentes
  - Drizzle ORM + SQLite para banco de dados
  - Scripts de setup e migração do banco
- Sistema de cadastro de produtos
  - Criação de produtos (LAB/PROD)
  - Edição de produtos
  - Soft delete com campo `deletedAt`
  - Auto-refresh após operações
  - Validação de campos obrigatórios
  - Busca de cotação do dólar via API
- Sistema de migração LAB → PROD
  - Copiar produto LAB para PROD
  - Original permanece em LAB
  - Validações de negócio
- Sistema de lixeira e restauração
  - Visualizar produtos deletados
  - Restaurar produtos (LAB → LAB, PROD → LAB)
  - Deletar permanentemente
- Sistema de simulação de cenários
  - Criar/editar/deletar cenários
  - Cálculo automático de lucros
  - Múltiplos cenários por produto LAB
- Sistema de registro de vendas
  - Registrar venda para produto PROD
  - Dedução automática de estoque
  - Cálculo automático de taxa ML e lucro
  - Lista de vendas com totais
- Sistema de configurações globais
  - Editar taxas ML (clássico/premium)
  - Atualizar cotação via API
  - Cálculos usam configurações atualizadas
- Componentes de UI
  - Navbar com navegação completa
  - Cards de produtos e cenários
  - Formulários com validação
  - Dialogs de confirmação
  - Empty states
  - Loading spinners
  - Toast notifications
- Documentação técnica
  - Schema do banco de dados
  - Endpoints da API
  - Validação final do sistema

### Fixed
- Removidos warnings TypeScript
- Corrigido erro de build na API de cotação
- Tratamento de erros em todas as rotas API
- Validações de negócio implementadas

---

## Formato

As categorias são:

- `Added` para novas funcionalidades
- `Changed` para mudanças em funcionalidades existentes
- `Deprecated` para funcionalidades que serão removidas
- `Removed` para funcionalidades removidas
- `Fixed` para correções de bugs
- `Security` para vulnerabilidades corrigidas
