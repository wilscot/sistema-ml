/**
 * Calcula o custo total unitário em BRL
 * @param precoUSD - Preço UNITÁRIO em USD ou BRL (> 0) - JÁ É O PREÇO POR UNIDADE
 * @param cotacao - Cotação BRL/USD (> 0). Se moeda=BRL, será ignorado (usado 1.00)
 * @param freteTotal - Frete total em BRL (>= 0) - será dividido pela quantidade
 * @param quantidade - Quantidade (> 0)
 * @param moeda - Moeda do produto ('USD' | 'BRL'). Default: 'USD'
 * @returns Custo unitário em BRL com 2 casas decimais
 * 
 * Fórmula: (precoUnitario * cotacao) + (freteTotal / quantidade)
 * O preço informado JÁ É unitário, então não divide pela quantidade
 */
export function calcularCustoTotal(
  precoUSD: number,
  cotacao: number,
  freteTotal: number,
  quantidade: number,
  moeda: 'USD' | 'BRL' = 'USD'
): number {
  const cotacaoUsada = moeda === 'BRL' ? 1.0 : cotacao;
  // Preço unitário em BRL (não divide pela quantidade, pois já é unitário)
  const precoUnitarioBRL = precoUSD * cotacaoUsada;
  // Frete unitário (divide o frete total pela quantidade)
  const freteUnitario = quantidade > 0 ? freteTotal / quantidade : 0;
  // Custo unitário total
  const custoTotal = precoUnitarioBRL + freteUnitario;
  return parseFloat(custoTotal.toFixed(2));
}

/**
 * Calcula o valor da taxa ML em BRL
 * @param precoVenda - Preço de venda (> 0)
 * @param taxaPercent - Taxa em % (ex: 11 ou 16)
 * @returns Valor da taxa em BRL com 2 casas decimais
 */
export function calcularTaxaML(
  precoVenda: number,
  taxaPercent: number
): number {
  const taxaML = (precoVenda * taxaPercent) / 100;
  return parseFloat(taxaML.toFixed(2));
}

/**
 * Calcula o lucro líquido total
 * @param precoVenda - Preço unitário (> 0)
 * @param quantidade - Quantidade vendida (> 0)
 * @param freteCobrado - Frete cobrado do cliente (>= 0)
 * @param custoTotal - Custo unitário (> 0)
 * @param taxaML - Valor da taxa ML (>= 0)
 * @returns Lucro líquido total com 2 casas decimais
 */
export function calcularLucro(
  precoVenda: number,
  quantidade: number,
  freteCobrado: number,
  custoTotal: number,
  taxaML: number
): number {
  const receitaTotal = precoVenda * quantidade + freteCobrado;
  const custoTotalCalculado = custoTotal * quantidade;
  const lucro = receitaTotal - custoTotalCalculado - taxaML;
  return parseFloat(lucro.toFixed(2));
}
