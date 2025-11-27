// TODO: Formulário de venda manual
// - 'use client'
// - Campos:
//   - Select Produto PROD (required)
//   - Quantidade Vendida (number, required, > 0)
//   - Preço Venda (number, required, > 0)
//   - Tipo Anúncio (select: CLASSICO | PREMIUM, required)
//   - Frete Cobrado (number, >= 0)
//   - Data (date, required)
// - Preview em tempo real:
//   - Receita = (preço × qtd) + frete
//   - Taxa ML = preço × (taxa% ÷ 100)
//   - Lucro Estimado (precisa buscar custo FIFO, complexo)
// - Validação: verificar estoque disponível
// - Submit: POST /api/vendas
// - Toast de sucesso/erro

