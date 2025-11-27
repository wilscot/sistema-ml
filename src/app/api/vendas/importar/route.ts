// TODO: POST /api/vendas/importar
// - Receber array de vendas parseadas do Excel
// - Para cada venda:
//   - Buscar produtoId via título do anúncio
//   - Se não encontrar: adicionar em "produtosNaoEncontrados"
//   - Se encontrar: validar estoque
//   - Se estoque OK: processar venda (mesmo fluxo de POST /api/vendas)
// - Retornar: { importadas: X, erros: [...], produtosNaoEncontrados: [...] }

