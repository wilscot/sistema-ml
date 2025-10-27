# Sistema ML - Gestão Mercado Livre

Sistema web para gestão completa de produtos importados vendidos no Mercado Livre.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Forms**: React Hook Form + Zod
- **Database**: Supabase (PostgreSQL)
- **Deploy**: Vercel

## Getting Started

1. Clone o repositório
2. Copie `.env.example` para `.env.local` e preencha as credenciais do Supabase
3. Instale dependências: `pnpm install`
4. Execute: `pnpm dev`
5. Abra: http://localhost:3000

## Estrutura do Projeto

- `src/app/` - Rotas Next.js (App Router)
- `src/components/` - Componentes React
- `src/lib/` - Utilitários e configurações
- `src/hooks/` - Custom hooks
- `src/types/` - Definições TypeScript
- `src/schemas/` - Schemas Zod
- `docs/` - Documentação técnica

## Ambientes

- **LAB**: Ambiente de testes/simulação
- **PRODUÇÃO**: Ambiente operacional com vendas reais

## Documentação

Veja `docs/` para schemas de banco, integrações de API e fases de implementação.
