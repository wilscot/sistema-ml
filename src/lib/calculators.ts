/**
 * Calcula o custo unitário de um produto
 * @param precoUSD Preço em dólares
 * @param cotacao Taxa de conversão USD → BRL
 * @param freteTotal Frete total em BRL
 * @param quantidade Quantidade comprada
 * @returns Custo unitário em BRL (arredondado para 2 casas decimais)
 */
export function calcularCustoUnitario(
  precoUSD: number,
  cotacao: number,
  freteTotal: number,
  quantidade: number
): number {
  if (quantidade <= 0) {
    throw new Error('Quantidade deve ser maior que zero');
  }

  const custoTotal = precoUSD * cotacao + freteTotal;
  const custoUnitario = custoTotal / quantidade;

  return Number(custoUnitario.toFixed(2));
}

/**
 * Calcula a taxa do Mercado Livre sobre uma venda
 * @param precoVenda Preço de venda por unidade
 * @param taxaPercent Taxa percentual do ML (ex: 11.0 para 11%)
 * @returns Taxa em BRL (arredondado para 2 casas decimais)
 */
export function calcularTaxaML(
  precoVenda: number,
  taxaPercent: number
): number {
  const taxa = precoVenda * (taxaPercent / 100);
  return Number(taxa.toFixed(2));
}

/**
 * Calcula a receita total de uma venda
 * @param precoVenda Preço de venda por unidade
 * @param quantidadeVendida Quantidade vendida
 * @param freteCobrado Frete cobrado ao cliente
 * @returns Receita total em BRL (arredondado para 2 casas decimais)
 */
export function calcularReceita(
  precoVenda: number,
  quantidadeVendida: number,
  freteCobrado: number
): number {
  const receita = precoVenda * quantidadeVendida + freteCobrado;
  return Number(receita.toFixed(2));
}

/**
 * Calcula o lucro líquido de uma venda
 * @param receita Receita total da venda
 * @param custoTotal Custo total (calculado via FIFO)
 * @param taxaML Taxa do Mercado Livre
 * @returns Lucro líquido em BRL (arredondado para 2 casas decimais)
 */
export function calcularLucroLiquido(
  receita: number,
  custoTotal: number,
  taxaML: number
): number {
  const lucro = receita - custoTotal - taxaML;
  return Number(lucro.toFixed(2));
}
