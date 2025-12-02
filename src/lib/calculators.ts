/**
 * Biblioteca de cálculos para o sistema de gestão ML
 */

/**
 * Calcula o custo total unitário em BRL
 * @param precoUSD - Preço UNITÁRIO em USD ou BRL (> 0)
 * @param cotacao - Cotação BRL/USD (> 0). Se moeda=BRL, será ignorado (usado 1.00)
 * @param freteTotal - Frete total em BRL (>= 0) - será dividido pela quantidade
 * @param quantidade - Quantidade (> 0)
 * @param moeda - Moeda do produto ('USD' | 'BRL'). Default: 'USD'
 * @returns Custo unitário em BRL com 2 casas decimais
 */
export function calcularCustoTotal(
  precoUSD: number,
  cotacao: number,
  freteTotal: number,
  quantidade: number,
  moeda: 'USD' | 'BRL' = 'USD'
): number {
  const cotacaoUsada = moeda === 'BRL' ? 1.0 : cotacao;
  const precoUnitarioBRL = precoUSD * cotacaoUsada;
  const freteUnitario = quantidade > 0 ? freteTotal / quantidade : 0;
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
 * @param fretePago - Frete PAGO pelo vendedor (>= 0) - É UM CUSTO
 * @param custoTotal - Custo unitário (> 0)
 * @param taxaML - Valor da taxa ML (>= 0)
 * @returns Lucro líquido total com 2 casas decimais
 * 
 * FÓRMULA CORRETA:
 * receita = precoVenda × quantidade (SEM somar frete)
 * lucro = receita - (custoTotal × quantidade) - taxaML - fretePago
 */
export function calcularLucro(
  precoVenda: number,
  quantidade: number,
  fretePago: number,
  custoTotal: number,
  taxaML: number
): number {
  const receitaTotal = precoVenda * quantidade;  // Receita SEM frete
  const custoTotalCalculado = custoTotal * quantidade;
  const lucro = receitaTotal - custoTotalCalculado - taxaML - fretePago;  // Frete é CUSTO
  return parseFloat(lucro.toFixed(2));
}

// Funções de compatibilidade (aliases)
export const calcularCustoUnitario = calcularCustoTotal;

export function calcularReceita(
  precoVenda: number,
  quantidade: number,
  freteCobrado: number
): number {
  // NOTA: Frete NÃO faz parte da receita
  return parseFloat((precoVenda * quantidade).toFixed(2));
}

export function calcularLucroLiquido(
  precoVenda: number,
  quantidade: number,
  fretePago: number,
  custoTotal: number,
  taxaML: number
): number {
  return calcularLucro(precoVenda, quantidade, fretePago, custoTotal, taxaML);
}
