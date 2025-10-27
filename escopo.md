# ESCOPO DO PROJETO: Sistema de GestÃ£o Mercado Livre

## 1. VISÃƒO GERAL

**DescriÃ§Ã£o:** Sistema web para gestÃ£o completa de produtos importados vendidos no Mercado Livre. Permite cadastrar produtos com custos em dÃ³lar, simular cenÃ¡rios de preÃ§os (ClÃ¡ssico 11% vs Premium 16%), registrar vendas manualmente e controlar estoque bÃ¡sico. Inclui ambientes separados para simulaÃ§Ã£o (LAB) e operaÃ§Ã£o real (PRODUÃ‡ÃƒO).

**Tipo:** Web Application (Progressive Web App ready)

**Objetivo Principal:** Calcular preÃ§os de venda otimizados considerando custos de importaÃ§Ã£o, taxas do ML e frete, alÃ©m de gerenciar vendas e estoque de forma integrada.

**PÃºblico-Alvo:** Vendedor importador individual (uso pessoal inicialmente, com potencial de crescimento)

**Complexidade Estimada:** Medium (sistema modular com 3 Ã¡reas principais + banco de dados)

---

## 2. TECH STACK (OBRIGATÃ“RIO)

### Frontend:
- Framework: **Next.js 14** (App Router)
- Linguagem: **TypeScript** (strict mode)
- Styling: **Tailwind CSS**
- UI Components: **shadcn/ui** (copy-paste, altamente customizÃ¡vel)
- Ãcones: **Lucide React**
- ValidaÃ§Ã£o: **Zod** (type-safe schemas)
- Forms: **React Hook Form** (performance + validaÃ§Ã£o integrada)

### Backend:
- Framework: **Next.js API Routes** (server actions)
- Linguagem: **TypeScript**
- AutenticaÃ§Ã£o: **Nenhuma** (uso local/pessoal por enquanto)

### Database:
- Tipo: **Supabase** (PostgreSQL hospedado)
- Query: **Supabase JS Client** (abstraÃ§Ã£o sobre PostgreSQL)
- Schemas: 2 isolados (`lab` e `producao`)
- Migrations: **Supabase CLI**

### Infraestrutura:
- Deploy: **Vercel** (CI/CD automÃ¡tico, free tier)
- Node Version: **20.x**
- Package Manager: **pnpm**

### APIs Externas:
- **AwesomeAPI** (cotaÃ§Ã£o dÃ³lar): `https://economia.awesomeapi.com.br/json/last/USD-BRL`
- **Mercado Livre API** (futuro, fase 4): ImportaÃ§Ã£o automÃ¡tica de vendas

---

## 3. INTEGRAÃ‡Ã•ES EXTERNAS

**Tem integraÃ§Ãµes com APIs ou serviÃ§os externos?** Sim

### API 1: AwesomeAPI (CotaÃ§Ã£o DÃ³lar)
- **Nome:** AwesomeAPI
- **Tipo:** REST API (pÃºblica, sem autenticaÃ§Ã£o)
- **Endpoints usados:** 
  - `GET /json/last/USD-BRL` (cotaÃ§Ã£o atual)
- **DocumentaÃ§Ã£o:** https://docs.awesomeapi.com.br
- **Uso:** SugestÃ£o automÃ¡tica de cotaÃ§Ã£o no cadastro de produtos

### API 2: Mercado Livre (FUTURO - Fase 4)
- **Nome:** Mercado Livre Developers API
- **Tipo:** REST API
- **AutenticaÃ§Ã£o:** OAuth 2.0 (Client ID + Secret)
- **Endpoints planejados:**
  - `GET /orders/search` (buscar vendas)
  - `GET /items/{id}` (dados do anÃºncio)
- **DocumentaÃ§Ã£o:** https://developers.mercadolivre.com.br
- **Uso:** ImportaÃ§Ã£o automÃ¡tica de vendas (nÃ£o implementar agora)

---

## 4. DEPENDÃŠNCIAS PRINCIPAIS

### ProduÃ§Ã£o:
```json
{
  "next": "^14.2.0",
  "react": "^18.3.0",
  "react-dom": "^18.3.0",
  "typescript": "^5.4.0",
  "tailwindcss": "^3.4.0",
  "@supabase/supabase-js": "^2.45.0",
  "zod": "^3.23.0",
  "react-hook-form": "^7.52.0",
  "@hookform/resolvers": "^3.9.0",
  "lucide-react": "^0.400.0",
  "date-fns": "^3.6.0",
  "sonner": "^1.5.0"
}
```

### Desenvolvimento:
```json
{
  "@types/node": "^20.14.0",
  "@types/react": "^18.3.0",
  "eslint": "^8.57.0",
  "prettier": "^3.3.0",
  "supabase": "^1.191.0"
}
```

---

## 5. REGRAS DE NEGÃ“CIO

### Regra 1: CÃ¡lculo de Custo UnitÃ¡rio do Produto

**DescriÃ§Ã£o:** O custo final de cada unidade importada considera preÃ§o USD, cotaÃ§Ã£o e rateio do frete.

**FÃ³rmula:**
```
Custo por Unidade = (PreÃ§o USD Ã— CotaÃ§Ã£o R$) + (Frete Total Ã· Quantidade)
```

**ValidaÃ§Ãµes:**
- PreÃ§o USD: positivo, min 0.01, max 999999
- CotaÃ§Ã£o: positiva, min 0.01, max 100
- Frete Total: >= 0, max 99999
- Quantidade: inteiro positivo, min 1, max 9999

**ExceÃ§Ãµes:**
- Se frete = 0: custo Ã© apenas (PreÃ§o USD Ã— CotaÃ§Ã£o)
- CotaÃ§Ã£o sugerida automaticamente via API, mas editÃ¡vel manualmente

---

### Regra 2: CÃ¡lculo de Lucro por Tipo de AnÃºncio

**DescriÃ§Ã£o:** Lucro lÃ­quido considera taxa ML (11% ou 16%), frete cobrado do cliente e custos do produto.

**FÃ³rmula ClÃ¡ssico (11%):**
```
Taxa ML = PreÃ§o Venda Ã— (Taxa ClÃ¡ssico Ã· 100)
Receita LÃ­quida = PreÃ§o Venda - Taxa ML - Frete Cobrado
Lucro = Receita LÃ­quida - Custo UnitÃ¡rio
Margem % = (Lucro Ã· Receita LÃ­quida) Ã— 100
```

**FÃ³rmula Premium (16%):**
```
Taxa ML = PreÃ§o Venda Ã— (Taxa Premium Ã· 100)
Receita LÃ­quida = PreÃ§o Venda - Taxa ML - Frete Cobrado
Lucro = Receita LÃ­quida - Custo UnitÃ¡rio
Margem % = (Lucro Ã· Receita LÃ­quida) Ã— 100
```

**ValidaÃ§Ãµes:**
- PreÃ§o Venda: positivo, min 1, max 999999
- Frete Cobrado: positivo, min 0, max 999
- Taxas: editÃ¡veis nas configuraÃ§Ãµes (default 11% e 16%)

**ExceÃ§Ãµes:**
- Se lucro negativo: destacar em vermelho no UI
- Margem % pode ser negativa (prejuÃ­zo)

---

### Regra 3: SugestÃ£o de PreÃ§o Premium Equivalente

**DescriÃ§Ã£o:** Calcula automaticamente o preÃ§o premium necessÃ¡rio para manter o mesmo lucro do clÃ¡ssico.

**FÃ³rmula:**
```
1. Calcular lucro do clÃ¡ssico:
   ReceitaClassico = PreÃ§oClassico - (PreÃ§oClassico Ã— TaxaClassico) - FreteCobrado
   LucroClassico = ReceitaClassico - CustoUnitario

2. Para manter mesmo lucro no premium:
   ReceitaPremium = LucroClassico + CustoUnitario
   
3. Reverter para encontrar preÃ§o:
   PreÃ§oPremium = (ReceitaPremium + FreteCobrado) Ã· (1 - TaxaPremium)
```

**ValidaÃ§Ãµes:**
- CÃ¡lculo automÃ¡tico, mas sempre editÃ¡vel manualmente
- Se editado manualmente, marcar como "customizado"

---

### Regra 4: Controle de Estoque por Venda

**DescriÃ§Ã£o:** Ao registrar venda, deduzir automaticamente a quantidade vendida do estoque disponÃ­vel.

**LÃ³gica:**
```
Estoque Atual = Quantidade Inicial - Î£(Vendas Registradas)
```

**ValidaÃ§Ãµes:**
- Quantidade vendida <= Estoque atual (impedir venda se insuficiente)
- Ao atingir estoque 0: produto marcado como "Sem estoque" mas permanece visÃ­vel

**ExceÃ§Ãµes:**
- Permitir venda com estoque 0 se usuÃ¡rio forÃ§ar (checkbox "Vender mesmo assim")

---

### Regra 5: MigraÃ§Ã£o LAB â†’ PRODUÃ‡ÃƒO

**DescriÃ§Ã£o:** Produtos cadastrados no ambiente LAB podem ser migrados para PRODUÃ‡ÃƒO mantendo todos os dados.

**LÃ³gica:**
```
1. Copiar produto do schema 'lab' para schema 'producao'
2. Copiar todos cenÃ¡rios associados
3. Gerar novos IDs (UUIDs)
4. Manter produto original no LAB intacto
5. Produto migrado inicia com quantidade original (nÃ£o herda vendas)
```

**ValidaÃ§Ãµes:**
- NÃ£o permitir migraÃ§Ã£o duplicada (checar se produto com mesmo nome jÃ¡ existe em PROD)
- Confirmar migraÃ§Ã£o com modal

---

### Regra 6: Aprendizado de Frete por Produto

**DescriÃ§Ã£o:** Ao cadastrar venda, se informar valor de frete, sistema armazena como "frete real" do produto para usar como sugestÃ£o em novos cenÃ¡rios.

**LÃ³gica:**
```
1. Ao salvar venda com frete informado:
   UPDATE produtos SET frete_real = valor_frete WHERE id = produto_id

2. Ao criar novo cenÃ¡rio:
   Sugerir frete_real se disponÃ­vel, senÃ£o usar default (R$ 19,95)
```

**ValidaÃ§Ãµes:**
- Frete real Ã© opcional (venda pode ser sem informar frete)
- Sempre permitir sobrescrever sugestÃ£o

---

## 6. FUNCIONALIDADES

### FASE 1: Setup Inicial + MÃ³dulo PRODUTOS

#### Feature 1.1: ConfiguraÃ§Ã£o do Supabase
**DescriÃ§Ã£o:** Criar projeto Supabase, schemas LAB e PRODUÃ‡ÃƒO, tabelas bÃ¡sicas.

**Requisitos:**
- Criar projeto no Supabase (free tier)
- Criar schemas: `lab` e `producao`
- Criar tabelas (ver seÃ§Ã£o 8 - Estrutura de Dados)
- Configurar Row Level Security (RLS) desabilitado por enquanto
- Gerar `.env.local` com credenciais

**UI/UX:**
- Sem interface, apenas setup tÃ©cnico

**ValidaÃ§Ãµes:**
- ConexÃ£o funcionando antes de prosseguir

---

#### Feature 1.2: Seletor de Ambiente (LAB/PROD)
**DescriÃ§Ã£o:** BotÃ£o no header para alternar entre LAB e PRODUÃ‡ÃƒO.

**Requisitos:**
- Toggle/switch visÃ­vel em todas as pÃ¡ginas
- State global (Context API ou Zustand)
- Cores distintas: LAB (roxo/azul), PROD (verde/amarelo)
- Persistir escolha no localStorage

**UI/UX:**
- Header fixo no topo
- Ãcone: ðŸ”¬ LAB | ðŸª PROD
- AnimaÃ§Ã£o smooth ao alternar
- Badge visual indicando ambiente ativo

**ValidaÃ§Ãµes:**
- Ao alternar, recarregar lista de produtos do schema correto

---

#### Feature 1.3: Cadastro de Produto
**DescriÃ§Ã£o:** FormulÃ¡rio para cadastrar novo produto com dados de compra.

**Requisitos:**
- Campos:
  - Nome (text, obrigatÃ³rio)
  - PreÃ§o USD (number, obrigatÃ³rio)
  - CotaÃ§Ã£o R$ (number, obrigatÃ³rio, sugestÃ£o via API)
  - Frete Total R$ (number, obrigatÃ³rio)
  - Quantidade (integer, obrigatÃ³rio)
  - Fornecedor (text, opcional)
- BotÃ£o "Buscar CotaÃ§Ã£o Atual" (chama AwesomeAPI)
- Preview do custo unitÃ¡rio calculado
- Salvar no schema ativo (LAB ou PROD)

**UI/UX:**
- Modal ou pÃ¡gina dedicada
- Feedback visual: loading ao buscar cotaÃ§Ã£o
- ValidaÃ§Ã£o em tempo real (Zod + React Hook Form)
- Toast de sucesso ao salvar

**ValidaÃ§Ãµes:**
- Nome: 3-100 caracteres, Ãºnico no ambiente
- PreÃ§o USD: > 0
- CotaÃ§Ã£o: > 0
- Frete: >= 0
- Quantidade: >= 1

---

#### Feature 1.4: Lista de Produtos
**DescriÃ§Ã£o:** Grid/tabela com produtos cadastrados no ambiente ativo.

**Requisitos:**
- Colunas: Nome, Custo Unit., Qtd. Estoque, Fornecedor, AÃ§Ãµes
- AÃ§Ãµes por linha: Editar, Deletar, Simular PreÃ§os, Migrar (se LAB)
- Empty state: "Nenhum produto cadastrado"
- Loading skeleton ao carregar

**UI/UX:**
- Tabela responsiva (mobile: cards empilhados)
- Busca por nome (client-side filter)
- Cores de badge: estoque > 0 (verde), estoque = 0 (vermelho)
- BotÃ£o "+ Novo Produto" destacado

**ValidaÃ§Ãµes:**
- Deletar: confirmar com modal "Tem certeza?"
- NÃ£o permitir deletar produto com vendas registradas (PROD)

---

#### Feature 1.5: EdiÃ§Ã£o de Produto
**DescriÃ§Ã£o:** Editar dados de produto existente (inline ou modal).

**Requisitos:**
- Mesmos campos do cadastro
- Recalcular cenÃ¡rios automaticamente ao salvar
- HistÃ³rico de alteraÃ§Ãµes (opcional, futuro)

**UI/UX:**
- Modal de ediÃ§Ã£o
- Mesmas validaÃ§Ãµes do cadastro
- Destaque visual se houver cenÃ¡rios/vendas vinculados

**ValidaÃ§Ãµes:**
- NÃ£o permitir reduzir quantidade abaixo do jÃ¡ vendido (PROD)

---

#### Feature 1.6: MigraÃ§Ã£o LAB â†’ PROD
**DescriÃ§Ã£o:** Copiar produto e cenÃ¡rios do LAB para PRODUÃ‡ÃƒO.

**Requisitos:**
- BotÃ£o "Migrar para ProduÃ§Ã£o" na lista (apenas se LAB ativo)
- Modal de confirmaÃ§Ã£o listando o que serÃ¡ copiado
- Gerar novos IDs
- Produto original permanece no LAB

**UI/UX:**
- Modal com preview: "Produto X + 2 cenÃ¡rios serÃ£o copiados"
- Checkbox: "Manter produto no LAB" (sempre true)
- Toast de sucesso ao migrar

**ValidaÃ§Ãµes:**
- Checar nome duplicado em PROD (avisar e permitir renomear)

---

### FASE 2: MÃ³dulo SIMULADOR

#### Feature 2.1: Tela de SimulaÃ§Ã£o por Produto
**DescriÃ§Ã£o:** PÃ¡gina dedicada para testar preÃ§os de venda de um produto especÃ­fico.

**Requisitos:**
- Selecionar produto da lista
- Exibir dados do produto (read-only): custo, quantidade, fornecedor
- Lista de cenÃ¡rios (acordeÃ£o/collapse)
- BotÃ£o "+ Novo CenÃ¡rio"

**UI/UX:**
- Header: Nome do produto, custo unitÃ¡rio, estoque
- SeÃ§Ã£o: "CenÃ¡rios de PreÃ§o"
- Cada cenÃ¡rio Ã© um card colapsÃ¡vel (todos recolhidos por default)
- BotÃ£o flutuante/fixo: "+ Novo CenÃ¡rio"

**ValidaÃ§Ãµes:**
- NÃ£o permitir simular produto sem quantidade > 0 (avisar)

---

#### Feature 2.2: Criar/Editar CenÃ¡rio
**DescriÃ§Ã£o:** FormulÃ¡rio dentro de cada card para definir cenÃ¡rio de preÃ§o.

**Requisitos:**
- Campos editÃ¡veis:
  - Nome do CenÃ¡rio (text, obrigatÃ³rio, ex: "Agressivo", "Conservador")
  - Tipo de AnÃºncio (select: ClÃ¡ssico ou Premium)
  - PreÃ§o de Venda (number)
  - Taxa ML % (number, default 11% ou 16%, editÃ¡vel)
  - Frete Cobrado (number, sugestÃ£o: frete_real ou 19.95)
- SeÃ§Ã£o de Breakdown (read-only):
  - Taxa ML: -R$ XX.XX
  - Frete: -R$ XX.XX
  - Custo Produto: -R$ XXX.XX
  - **LUCRO LÃQUIDO**: R$ XXX.XX (destaque)
  - Margem %: XX.X%
- BotÃ£o "Salvar CenÃ¡rio"

**UI/UX:**
- CÃ¡lculo em tempo real (debounce 300ms)
- Lucro positivo: verde, negativo: vermelho
- SugestÃ£o visual: Ã­cone âš ï¸ se margem < 10%
- Toggle: "Sugerir preÃ§o premium equivalente" (usa Regra 3)

**ValidaÃ§Ãµes:**
- Nome: 3-50 caracteres, Ãºnico para o produto
- PreÃ§o Venda: > 0
- Taxa: 0-100%
- Frete: >= 0

---

#### Feature 2.3: ComparaÃ§Ã£o de CenÃ¡rios
**DescriÃ§Ã£o:** Visualizar mÃºltiplos cenÃ¡rios lado a lado.

**Requisitos:**
- OpÃ§Ã£o "Comparar" (checkbox em cada cenÃ¡rio)
- Modal/seÃ§Ã£o mostrando cenÃ¡rios selecionados em grid
- Destacar cenÃ¡rio com maior lucro

**UI/UX:**
- Grid 2-3 colunas (responsivo)
- Cores diferentes por card
- Badge: "ðŸ† Melhor Lucro"

**ValidaÃ§Ãµes:**
- Permitir comparar no mÃ­nimo 2, mÃ¡ximo 4 cenÃ¡rios

---

#### Feature 2.4: Deletar CenÃ¡rio
**DescriÃ§Ã£o:** Remover cenÃ¡rio que nÃ£o serÃ¡ usado.

**Requisitos:**
- BotÃ£o "Deletar" em cada card de cenÃ¡rio
- ConfirmaÃ§Ã£o: "Tem certeza?"
- NÃ£o permitir deletar se vinculado a venda

**UI/UX:**
- Ãcone lixeira discreto
- AnimaÃ§Ã£o de fade-out ao deletar

**ValidaÃ§Ãµes:**
- MÃ­nimo 0 cenÃ¡rios por produto (pode ficar sem)

---

### FASE 3: MÃ³dulo VENDAS

#### Feature 3.1: Cadastro Manual de Venda
**DescriÃ§Ã£o:** Registrar venda realizada no ML manualmente.

**Requisitos:**
- FormulÃ¡rio:
  - Produto (select dropdown)
  - Quantidade Vendida (integer, max = estoque atual)
  - Tipo de AnÃºncio (select: ClÃ¡ssico ou Premium)
  - PreÃ§o de Venda (number, valor total da venda)
  - Frete Cobrado (number, opcional)
  - Data da Venda (date picker, default hoje)
- Ao salvar:
  - Deduzir do estoque
  - Calcular taxa ML e lucro lÃ­quido
  - Armazenar frete_real no produto (se informado)

**UI/UX:**
- Modal flutuante ou pÃ¡gina dedicada
- BotÃ£o "+ Registrar Venda"
- Preview do lucro antes de salvar
- Toast: "Venda registrada! Estoque atualizado."

**ValidaÃ§Ãµes:**
- Quantidade <= estoque atual (ou forÃ§ar com checkbox)
- PreÃ§o Venda > 0
- Data nÃ£o pode ser futura

---

#### Feature 3.2: HistÃ³rico de Vendas
**DescriÃ§Ã£o:** Tabela com todas as vendas registradas (apenas PROD).

**Requisitos:**
- Colunas:
  - Data
  - Produto
  - Qtd. Vendida
  - PreÃ§o Venda
  - Custo Produto (na Ã©poca da venda)
  - Lucro LÃ­quido
  - Tipo AnÃºncio
- Filtros:
  - Por produto
  - Por perÃ­odo (data range picker)
  - Por tipo de anÃºncio
- Totalizadores: Vendas totais, Lucro total

**UI/UX:**
- Tabela responsiva (mobile: cards)
- Cores: lucro positivo (verde), negativo (vermelho)
- Export CSV (futuro, nÃ£o implementar agora)

**ValidaÃ§Ãµes:**
- Apenas visualizaÃ§Ã£o, sem ediÃ§Ã£o de vendas passadas

---

#### Feature 3.3: AtualizaÃ§Ã£o de Estoque
**DescriÃ§Ã£o:** Estoque atualiza automaticamente ao registrar venda.

**Requisitos:**
- Trigger no banco ou lÃ³gica no backend
- Exibir estoque atualizado em tempo real na lista de produtos

**UI/UX:**
- Badge de estoque muda cor instantaneamente
- AnimaÃ§Ã£o subtle ao atualizar

**ValidaÃ§Ãµes:**
- NÃ£o permitir estoque negativo (hard constraint no DB)

---

### FASE 4: ConfiguraÃ§Ãµes Globais

#### Feature 4.1: Tela de ConfiguraÃ§Ãµes
**DescriÃ§Ã£o:** Ajustar valores padrÃ£o do sistema.

**Requisitos:**
- Campos editÃ¡veis:
  - Taxa ClÃ¡ssico % (default 11%)
  - Taxa Premium % (default 16%)
  - Frete Cobrado Default R$ (default 19.95)
  - CotaÃ§Ã£o Sugerida (manual override da API)
- Salvar no localStorage ou tabela `configuracoes`

**UI/UX:**
- PÃ¡gina dedicada: "/configuracoes"
- Link no menu/sidebar
- FormulÃ¡rio simples com labels claros

**ValidaÃ§Ãµes:**
- Taxas: 0-100%
- Frete: >= 0

---

#### Feature 4.2: Sobre / Ajuda
**DescriÃ§Ã£o:** ExplicaÃ§Ã£o das fÃ³rmulas e como usar o sistema.

**Requisitos:**
- PÃ¡gina estÃ¡tica com:
  - ExplicaÃ§Ã£o das taxas ML
  - FÃ³rmulas de cÃ¡lculo
  - FAQ bÃ¡sico
- Link no footer

**UI/UX:**
- Markdown renderizado
- SeÃ§Ãµes colapsÃ¡veis (accordion)

**ValidaÃ§Ãµes:**
- N/A

---

## 7. O QUE NÃƒO FAZER

### Funcionalidades ExcluÃ­das:

#### Sistema:
- âŒ AutenticaÃ§Ã£o/login (uso pessoal local)
- âŒ Multi-usuÃ¡rio ou permissÃµes
- âŒ IntegraÃ§Ã£o automÃ¡tica com ML API (apenas manual por enquanto)
- âŒ NotificaÃ§Ãµes push ou emails
- âŒ Backup automÃ¡tico (usuÃ¡rio faz manualmente via Supabase)
- âŒ HistÃ³rico de alteraÃ§Ãµes (audit log)
- âŒ Undo/redo de operaÃ§Ãµes
- âŒ Dark mode (apenas light por enquanto)
- âŒ InternacionalizaÃ§Ã£o (apenas portuguÃªs BR)
- âŒ PWA offline mode (requer conexÃ£o)

#### Vendas:
- âŒ ImportaÃ§Ã£o de vendas via CSV
- âŒ Export para Excel/PDF (futuro)
- âŒ GrÃ¡ficos ou dashboards visuais
- âŒ RelatÃ³rios customizÃ¡veis
- âŒ Alertas de estoque baixo
- âŒ ProjeÃ§Ãµes de lucro

#### Produtos:
- âŒ Upload de imagens
- âŒ Tags ou categorias
- âŒ Notas ou comentÃ¡rios
- âŒ Duplicar produto
- âŒ Favoritar produtos
- âŒ OrdenaÃ§Ã£o customizÃ¡vel (apenas alfabÃ©tica)
- âŒ Filtros avanÃ§ados

#### Simulador:
- âŒ ComparaÃ§Ã£o entre produtos diferentes
- âŒ GrÃ¡ficos de cenÃ¡rios
- âŒ RecomendaÃ§Ã£o automÃ¡tica de preÃ§o via IA
- âŒ AnÃ¡lise de concorrÃªncia

**Motivo geral:** Manter simplicidade, foco no MVP funcional, adicionar features sob demanda.

---

### Tecnologias ExcluÃ­das:

- âŒ Redux/Zustand (Context API suficiente)
- âŒ Material-UI ou Ant Design (shadcn/ui mais leve)
- âŒ Prisma ORM (Supabase client nativo mais simples)
- âŒ Express/Fastify (Next.js API routes suficiente)
- âŒ Docker (desenvolvimento local, deploy Vercel)
- âŒ Testes automatizados (Jest/Cypress - projeto small/medium)
- âŒ Storybook (componentes simples, nÃ£o justifica)
- âŒ GraphQL (REST simples via Supabase)

**Motivo:** Evitar over-engineering, stack Next.js + Supabase jÃ¡ resolve tudo.

---

## 8. ESTRUTURA DE DADOS

### Interfaces TypeScript:

```typescript
// ========== TIPOS BASE ==========

export type Ambiente = "lab" | "producao";

export type TipoAnuncio = "classico" | "premium";

// ========== PRODUTOS ==========

export interface Produto {
  id: string; // UUID
  ambiente: Ambiente;
  nome: string;
  precoUSD: number;
  cotacao: number;
  freteTotal: number;
  quantidade: number;
  quantidadeEstoque: number; // atualizado por vendas
  fornecedor: string | null;
  freteReal: number | null; // aprendido das vendas
  dataCadastro: string; // ISO 8601
  dataAtualizacao: string;
}

export interface ProdutoInput {
  nome: string;
  precoUSD: number;
  cotacao: number;
  freteTotal: number;
  quantidade: number;
  fornecedor?: string;
}

// ========== CENÃRIOS ==========

export interface Cenario {
  id: string; // UUID
  produtoId: string; // FK
  ambiente: Ambiente;
  nome: string; // "Agressivo", "Conservador", etc
  tipoAnuncio: TipoAnuncio;
  precoVenda: number;
  taxaML: number; // % (11 ou 16 por default)
  freteCobrado: number;
  dataCriacao: string;
  dataAtualizacao: string;
}

export interface CenarioInput {
  produtoId: string;
  nome: string;
  tipoAnuncio: TipoAnuncio;
  precoVenda: number;
  taxaML: number;
  freteCobrado: number;
}

// ========== VENDAS ==========

export interface Venda {
  id: string; // UUID
  produtoId: string; // FK
  quantidadeVendida: number;
  tipoAnuncio: TipoAnuncio;
  precoVenda: number;
  freteCobrado: number | null;
  custoUnitario: number; // snapshot do custo na Ã©poca
  taxaML: number; // calculada
  lucroLiquido: number; // calculado
  dataVenda: string; // date (YYYY-MM-DD)
  dataCadastro: string; // timestamp ISO
}

export interface VendaInput {
  produtoId: string;
  quantidadeVendida: number;
  tipoAnuncio: TipoAnuncio;
  precoVenda: number;
  freteCobrado?: number;
  dataVenda: string;
}

// ========== CONFIGURAÃ‡Ã•ES ==========

export interface Configuracoes {
  id: string; // singleton (sempre id = "1")
  taxaClassico: number; // % (default 11)
  taxaPremium: number; // % (default 16)
  freteDefault: number; // R$ (default 19.95)
  cotacaoManual: number | null; // override da API
  dataAtualizacao: string;
}

// ========== CÃLCULOS (NÃƒO PERSISTIDOS) ==========

export interface CamposCalculados {
  custoUnitario: number;
  taxaMLValor: number;
  receitaLiquida: number;
  lucroLiquido: number;
  margemPorcentagem: number;
}

export type ProdutoCompleto = Produto & { custoUnitario: number };
export type CenarioCompleto = Cenario & CamposCalculados;
export type VendaCompleta = Venda;
```

---

### PersistÃªncia: PostgreSQL (Supabase)

#### Schema: `lab`

**Tabela: `produtos_lab`**
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

**Tabela: `cenarios_lab`**
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

---

#### Schema: `producao`

**Tabela: `produtos_producao`** (estrutura idÃªntica a `produtos_lab`)
```sql
CREATE TABLE producao.produtos_producao (
  -- [mesma estrutura de produtos_lab]
);
```

**Tabela: `cenarios_producao`** (estrutura idÃªntica a `cenarios_lab`)
```sql
CREATE TABLE producao.cenarios_producao (
  -- [mesma estrutura de cenarios_lab]
);
```

**Tabela: `vendas`** (apenas em PRODUÃ‡ÃƒO)
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

**Tabela: `configuracoes`** (global, Ãºnica linha)
```sql
CREATE TABLE public.configuracoes (
  id VARCHAR(10) PRIMARY KEY DEFAULT '1',
  taxa_classico DECIMAL(5,2) NOT NULL DEFAULT 11.00,
  taxa_premium DECIMAL(5,2) NOT NULL DEFAULT 16.00,
  frete_default DECIMAL(10,2) NOT NULL DEFAULT 19.95,
  cotacao_manual DECIMAL(6,2),
  data_atualizacao TIMESTAMP DEFAULT NOW(),
  CHECK (id = '1') -- garante singleton
);

-- Inserir configuraÃ§Ã£o padrÃ£o
INSERT INTO public.configuracoes (id) VALUES ('1');
```

---

### Ãndices Recomendados:

```sql
-- LAB
CREATE INDEX idx_produtos_lab_nome ON lab.produtos_lab(nome);
CREATE INDEX idx_cenarios_lab_produto ON lab.cenarios_lab(produto_id);

-- PRODUÃ‡ÃƒO
CREATE INDEX idx_produtos_prod_nome ON producao.produtos_producao(nome);
CREATE INDEX idx_cenarios_prod_produto ON producao.cenarios_producao(produto_id);
CREATE INDEX idx_vendas_produto ON producao.vendas(produto_id);
CREATE INDEX idx_vendas_data ON producao.vendas(data_venda);
```

---

## 9. ARQUITETURA DE PASTAS

```
sistema-ml/
â”œâ”€â”€ public/
â”‚   â””â”€â”€ favicon.ico
â”œâ”€â”€ src/
â”‚   â”œâ”€â”€ app/
â”‚   â”‚   â”œâ”€â”€ layout.tsx              # Root layout com providers
â”‚   â”‚   â”œâ”€â”€ page.tsx                # Home (redireciona para /produtos)
â”‚   â”‚   â”œâ”€â”€ produtos/
â”‚   â”‚   â”‚   â”œâ”€â”€ page.tsx            # Lista de produtos
â”‚   â”‚   â”‚   â”œâ”€â”€ novo/
â”‚   â”‚   â”‚   â”‚   â””â”€â”€ page.tsx        # Cadastro
â”‚   â”‚   â”‚   â””â”€â”€ [id]/
â”‚   â”‚   â”‚       â”œâ”€â”€ page.tsx        # Detalhes/EdiÃ§Ã£o
â”‚   â”‚   â”‚       â””â”€â”€ simular/
â”‚   â”‚   â”‚           â””â”€â”€ page.tsx    # Simulador de cenÃ¡rios
â”‚   â”‚   â”œâ”€â”€ vendas/
â”‚   â”‚   â”‚   â”œâ”€â”€ page.tsx            # HistÃ³rico de vendas
â”‚   â”‚   â”‚   â””â”€â”€ nova/
â”‚   â”‚   â”‚       â””â”€â”€ page.tsx        # Registrar venda
â”‚   â”‚   â”œâ”€â”€ configuracoes/
â”‚   â”‚   â”‚   â””â”€â”€ page.tsx            # ConfiguraÃ§Ãµes globais
â”‚   â”‚   â””â”€â”€ sobre/
â”‚   â”‚       â””â”€â”€ page.tsx            # Ajuda/FAQ
â”‚   â”œâ”€â”€ components/
â”‚   â”‚   â”œâ”€â”€ ui/                     # shadcn/ui components
â”‚   â”‚   â”‚   â”œâ”€â”€ button.tsx
â”‚   â”‚   â”‚   â”œâ”€â”€ input.tsx
â”‚   â”‚   â”‚   â”œâ”€â”€ select.tsx
â”‚   â”‚   â”‚   â”œâ”€â”€ dialog.tsx
â”‚   â”‚   â”‚   â”œâ”€â”€ table.tsx
â”‚   â”‚   â”‚   â”œâ”€â”€ toast.tsx
â”‚   â”‚   â”‚   â””â”€â”€ ...
â”‚   â”‚   â”œâ”€â”€ layout/
â”‚   â”‚   â”‚   â”œâ”€â”€ Header.tsx          # Header com toggle LAB/PROD
â”‚   â”‚   â”‚   â”œâ”€â”€ Sidebar.tsx         # Menu lateral
â”‚   â”‚   â”‚   â””â”€â”€ Footer.tsx
â”‚   â”‚   â”œâ”€â”€ produtos/
â”‚   â”‚   â”‚   â”œâ”€â”€ ProdutoForm.tsx     # Form reutilizÃ¡vel
â”‚   â”‚   â”‚   â”œâ”€â”€ ProdutoCard.tsx     # Card de produto na lista
â”‚   â”‚   â”‚   â””â”€â”€ CotacaoFetcher.tsx  # Componente busca cotaÃ§Ã£o
â”‚   â”‚   â”œâ”€â”€ cenarios/
â”‚   â”‚   â”‚   â”œâ”€â”€ CenarioCard.tsx     # Card de cenÃ¡rio
â”‚   â”‚   â”‚   â”œâ”€â”€ CenarioForm.tsx     # Form de cenÃ¡rio
â”‚   â”‚   â”‚   â””â”€â”€ ComparacaoCenarios.tsx
â”‚   â”‚   â””â”€â”€ vendas/
â”‚   â”‚       â”œâ”€â”€ VendaForm.tsx
â”‚   â”‚       â””â”€â”€ VendaTable.tsx
â”‚   â”œâ”€â”€ lib/
â”‚   â”‚   â”œâ”€â”€ supabase.ts             # Cliente Supabase
â”‚   â”‚   â”œâ”€â”€ calculos.ts             # FunÃ§Ãµes de cÃ¡lculo (Regras 1-3)
â”‚   â”‚   â””â”€â”€ utils.ts                # Helpers (cn, formatters)
â”‚   â”œâ”€â”€ hooks/
â”‚   â”‚   â”œâ”€â”€ useAmbiente.ts          # Hook global para LAB/PROD
â”‚   â”‚   â”œâ”€â”€ useProdutos.ts          # Queries de produtos
â”‚   â”‚   â”œâ”€â”€ useCenarios.ts          # Queries de cenÃ¡rios
â”‚   â”‚   â”œâ”€â”€ useVendas.ts            # Queries de vendas
â”‚   â”‚   â””â”€â”€ useConfiguracoes.ts     # Queries de configs
â”‚   â”œâ”€â”€ contexts/
â”‚   â”‚   â””â”€â”€ AmbienteContext.tsx     # Context para ambiente ativo
â”‚   â”œâ”€â”€ types/
â”‚   â”‚   â””â”€â”€ index.ts                # Interfaces TypeScript (SeÃ§Ã£o 8)
â”‚   â””â”€â”€ schemas/
â”‚       â”œâ”€â”€ produto.schema.ts       # Zod schemas
â”‚       â”œâ”€â”€ cenario.schema.ts
â”‚       â””â”€â”€ venda.schema.ts
â”œâ”€â”€ .env.local                      # VariÃ¡veis de ambiente
â”œâ”€â”€ .env.example
â”œâ”€â”€ next.config.js
â”œâ”€â”€ tailwind.config.ts
â”œâ”€â”€ tsconfig.json
â”œâ”€â”€ package.json
â””â”€â”€ README.md
```

---

## 10. VARIÃVEIS DE AMBIENTE

**Arquivo: `.env.local`**
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# API Externa
NEXT_PUBLIC_AWESOMEAPI_URL=https://economia.awesomeapi.com.br

# Opcional (futuro)
# MERCADOLIVRE_CLIENT_ID=xxxxx
# MERCADOLIVRE_CLIENT_SECRET=xxxxx
```

**Arquivo: `.env.example`** (commitado no git)
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_AWESOMEAPI_URL=https://economia.awesomeapi.com.br
```

---

## 11. FLUXOS PRINCIPAIS

### Fluxo 1: Cadastrar Produto no LAB

1. UsuÃ¡rio acessa `/produtos`
2. Toggle estÃ¡ em LAB (roxo)
3. Clica "+ Novo Produto"
4. Preenche formulÃ¡rio:
   - Nome: "Mouse Gamer RGB"
   - PreÃ§o USD: 15.00
   - Clica "Buscar CotaÃ§Ã£o" â†’ API retorna 5.85
   - Frete Total: 120.00
   - Quantidade: 10
5. Preview mostra: Custo Unit. = (15 Ã— 5.85) + (120 Ã· 10) = 87.75 + 12.00 = **R$ 99.75**
6. Salva â†’ Toast "Produto cadastrado no LAB!"
7. Produto aparece na lista

---

### Fluxo 2: Simular PreÃ§os de Venda

1. Na lista de produtos (LAB), clica "Simular" no Mouse Gamer
2. Acessa `/produtos/{id}/simular`
3. VÃª header: "Mouse Gamer RGB | Custo: R$ 99.75 | Estoque: 10"
4. Clica "+ Novo CenÃ¡rio"
5. Card de cenÃ¡rio se expande:
   - Nome: "Agressivo"
   - Tipo: Premium (16%)
   - PreÃ§o Venda: 200.00
   - Taxa ML: 16% (default, editÃ¡vel)
   - Frete: 19.95 (sugerido)
6. Breakdown atualiza em tempo real:
   - Taxa ML: -32.00
   - Frete: -19.95
   - Custo: -99.75
   - **LUCRO: R$ 48.30** (verde)
   - Margem: 32.7%
7. Ativa toggle "Sugerir preÃ§o premium equivalente"
8. Sistema sugere: "Para lucro igual ao clÃ¡ssico (R$ 60), use R$ 213.45"
9. Salva cenÃ¡rio â†’ Toast "CenÃ¡rio salvo!"
10. Cria outro cenÃ¡rio "Conservador" (ClÃ¡ssico 11%, R$ 180)
11. Compara ambos lado a lado

---

### Fluxo 3: Migrar para PRODUÃ‡ÃƒO

1. Produto "Mouse Gamer RGB" testado no LAB
2. Clica "Migrar para ProduÃ§Ã£o"
3. Modal confirma: "Migrar Mouse Gamer RGB + 2 cenÃ¡rios?"
4. Confirma â†’ Sistema:
   - Copia para schema `producao`
   - Gera novos UUIDs
   - MantÃ©m produto no LAB
5. Toggle para PROD (verde)
6. Produto aparece na lista de PROD

---

### Fluxo 4: Registrar Venda Manual

1. Em PROD, clica "+ Registrar Venda"
2. Modal abre:
   - Produto: Mouse Gamer RGB (select)
   - Quantidade: 1
   - Tipo: Premium
   - PreÃ§o Venda: 200.00
   - Frete Cobrado: 18.50 (editÃ¡vel)
   - Data: hoje (default)
3. Preview mostra: Lucro LÃ­quido = R$ 49.75
4. Salva â†’ Sistema:
   - Deduz estoque: 10 â†’ 9
   - Registra venda na tabela `vendas`
   - Atualiza `frete_real` do produto para 18.50
5. Toast: "Venda registrada! Estoque: 9"
6. Badge do produto muda para "Estoque: 9"

---

### Fluxo 5: Visualizar HistÃ³rico de Vendas

1. Acessa `/vendas` (apenas PROD)
2. VÃª tabela:
   | Data | Produto | Qtd | PreÃ§o | Lucro | Tipo |
   |------|---------|-----|-------|-------|------|
   | 21/10/25 | Mouse Gamer | 1 | 200.00 | 49.75 | Premium |
3. Filtros:
   - Por produto: Mouse Gamer
   - PerÃ­odo: Ãºltimos 30 dias
4. Totalizador: "Vendas: R$ 200 | Lucro: R$ 49.75"

---

## 12. CRITÃ‰RIOS DE ACEITAÃ‡ÃƒO (DoD)

### Geral:
- âœ… Sistema roda localmente com `pnpm dev`
- âœ… Deploy funcional na Vercel
- âœ… ConexÃ£o com Supabase operacional
- âœ… TypeScript strict mode sem erros
- âœ… Responsivo (mobile + desktop)
- âœ… Toast/feedback em todas aÃ§Ãµes CRUD

### MÃ³dulo PRODUTOS:
- âœ… Cadastrar produto com validaÃ§Ã£o Zod
- âœ… Buscar cotaÃ§Ã£o via API funciona
- âœ… Lista produtos com filtro por nome
- âœ… Editar produto recalcula cenÃ¡rios
- âœ… Deletar confirma com modal
- âœ… MigraÃ§Ã£o LABâ†’PROD funciona sem erros

### MÃ³dulo SIMULADOR:
- âœ… Criar cenÃ¡rio calcula lucro em tempo real
- âœ… SugestÃ£o de preÃ§o premium equivalente precisa
- âœ… Comparar atÃ© 4 cenÃ¡rios lado a lado
- âœ… Deletar cenÃ¡rio (se nÃ£o vinculado a venda)

### MÃ³dulo VENDAS:
- âœ… Registrar venda deduz estoque
- âœ… HistÃ³rico filtra por produto e perÃ­odo
- âœ… Totalizadores corretos
- âœ… NÃ£o permitir venda com estoque insuficiente (sem forÃ§ar)

### ConfiguraÃ§Ãµes:
- âœ… Editar taxas ML e frete default funciona
- âœ… MudanÃ§as refletem em novos cenÃ¡rios

---

## 13. ROADMAP FUTURO (PÃ³s-MVP)

### Fase 5: IntegraÃ§Ãµes AvanÃ§adas
- [ ] API Mercado Livre: importaÃ§Ã£o automÃ¡tica de vendas
- [ ] Webhook ML: notificaÃ§Ã£o de nova venda
- [ ] SincronizaÃ§Ã£o de estoque em tempo real

### Fase 6: Analytics & Reports
- [ ] Dashboard visual com grÃ¡ficos (Recharts)
- [ ] RelatÃ³rios exportÃ¡veis (PDF/Excel)
- [ ] AnÃ¡lise de tendÃªncias de lucro
- [ ] ProjeÃ§Ãµes de estoque

### Fase 7: Melhorias UX
- [ ] Dark mode
- [ ] PWA completo (offline mode)
- [ ] Drag-and-drop para reordenar produtos
- [ ] Atalhos de teclado
- [ ] Multi-idioma (EN, ES)

### Fase 8: Escalabilidade
- [ ] AutenticaÃ§Ã£o (Supabase Auth)
- [ ] Multi-usuÃ¡rio com permissÃµes
- [ ] Backup automÃ¡tico
- [ ] Logs de auditoria
- [ ] Testes automatizados (Jest + Cypress)

---

## 14. OBSERVAÃ‡Ã•ES FINAIS

### Para o desenvolvedor:

1. **Prioridade 1:** Fase 1 (Setup + Produtos) â†’ Fase 2 (Simulador) â†’ Fase 3 (Vendas) â†’ Fase 4 (Configs)
2. **NÃ£o pular etapas:** Cada fase depende da anterior
3. **Commits atÃ´micos:** Um commit por feature completa
4. **Testar manualmente:** Cada CRUD antes de prosseguir
5. **FÃ³rmulas crÃ­ticas:** Validar cÃ¡lculos com calculadora antes de implementar

### Stack justificada:
- **Next.js 14:** SSR + RSC para performance
- **Supabase:** PostgreSQL gerenciado, zero config
- **shadcn/ui:** Componentes bonitos, acessÃ­veis, customizÃ¡veis
- **Zod + RHF:** ValidaÃ§Ã£o type-safe, DX excelente
- **Vercel:** Deploy instantÃ¢neo, CI/CD grÃ¡tis

### DecisÃµes tÃ©cnicas importantes:
- **Schemas separados (lab/producao):** Isolamento total de dados, facilita testes
- **CÃ¡lculos no frontend:** Performance (sem RTT), UX instantÃ¢nea
- **Context API (nÃ£o Zustand):** Projeto simples, nÃ£o justifica lib externa
- **ValidaÃ§Ã£o dupla:** Client (UX) + Database (seguranÃ§a)

---

**VersÃ£o:** 2.0  
**Ãšltima atualizaÃ§Ã£o:** 21/10/2025  
**Status:** Aprovado para desenvolvimento  
**Estimativa:** 40-60 horas (1-2 semanas, desenvolvedor pleno)