// TODO: Formulário de compra
// - 'use client'
// - Campos:
//   - Select Produto PROD (required)
//   - Preço USD unitário (number, required, > 0)
//   - Cotação (number, required, > 0)
//   - Frete Total BRL (number, >= 0)
//   - Quantidade Comprada (number, required, > 0)
//   - Fornecedor (text, opcional)
//   - Data da Compra (date, required)
//   - Observações (textarea, opcional)
// - Botão "Buscar Cotação" (chama GET /api/cotacao)
// - Preview em tempo real:
//   - Custo Unitário = (preço × cotação + frete) ÷ qtd
//   - Custo Total = custo unitário × qtd
// - Submit: POST /api/compras
// - Toast de sucesso/erro

