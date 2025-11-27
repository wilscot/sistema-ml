// TODO: GET /api/vendas?produtoId=X&periodo=mes
// - Buscar vendas de um produto (ou todas)
// - Filtrar por período se especificado
// - Ordenar por data DESC
// - Retornar array de vendas

// TODO: POST /api/vendas (registro manual)
// - Validar dados (validators.ts)
// - VERIFICAR ESTOQUE (SUM quantidadeDisponivel >= quantidadeVendida)
// - BEGIN TRANSACTION
// - Buscar compras disponíveis (FIFO: ORDER BY dataCompra ASC)
// - Loop FIFO: deduzir de cada compra
// - Calcular taxaML e lucroLiquido via calculators.ts
// - Inserir venda com custoTotal calculado
// - Atualizar produto.quantidade (decrementar)
// - COMMIT TRANSACTION
// - Retornar venda criada

