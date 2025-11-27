// TODO: Funções para cálculo de métricas do dashboard
// - getVendasDoMes(db): Promise<number>
//   Query: COUNT vendas WHERE MONTH(data) = current month
// - getFaturamentoBruto(db): Promise<number>
//   Query: SUM((precoVenda × qtd) + frete) WHERE MONTH(data) = current month
// - getLucroLiquido(db): Promise<number>
//   Query: SUM(lucroLiquido) WHERE MONTH(data) = current month
// - getEvolucaoUltimos6Meses(db): Promise<Array>
//   Query: GROUP BY month, SUM lucro
// - getTopProdutosMaisVendidos(db, limit): Promise<Array>
//   Query: GROUP BY produto, ORDER BY SUM(qtd) DESC, LIMIT

