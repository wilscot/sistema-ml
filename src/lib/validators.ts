import type { NovoProduto, NovoCenario, NovaVenda } from '@/db/schema';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Valida dados de um novo produto
 */
export function validarProduto(data: NovoProduto): ValidationResult {
  const errors: string[] = [];

  if (!data.nome || data.nome.trim().length < 3) {
    errors.push('Nome obrigatório (mínimo 3 caracteres)');
  }

  if (!data.precoUSD || data.precoUSD <= 0) {
    errors.push('Preço deve ser maior que zero');
  }

  const moeda = data.moeda || 'USD';
  
  if (moeda !== 'USD' && moeda !== 'BRL') {
    errors.push("Moeda deve ser 'USD' ou 'BRL'");
  }

  if (moeda === 'BRL') {
    if (data.cotacao !== undefined && data.cotacao !== 1.0) {
      errors.push('Quando moeda é BRL, cotação deve ser 1.00');
    }
  } else {
    if (!data.cotacao || data.cotacao <= 0) {
      errors.push('Cotação deve ser maior que zero');
    }
  }

  if (data.freteTotal === undefined || data.freteTotal < 0) {
    errors.push('Frete total deve ser maior ou igual a zero');
  }

  if (data.quantidade === undefined || data.quantidade < 0) {
    errors.push('Quantidade deve ser maior ou igual a zero');
  }

  if (data.tipo && data.tipo !== 'LAB' && data.tipo !== 'PROD') {
    errors.push("Tipo deve ser 'LAB' ou 'PROD'");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Valida dados de um novo cenário
 */
export function validarCenario(data: NovoCenario): ValidationResult {
  const errors: string[] = [];

  if (!data.nome || data.nome.trim().length < 1) {
    errors.push('Nome do cenário obrigatório');
  }

  if (!data.produtoId || data.produtoId <= 0) {
    errors.push('ID do produto inválido');
  }

  if (!data.precoVendaClassico || data.precoVendaClassico <= 0) {
    errors.push('Preço de venda clássico deve ser maior que zero');
  }

  if (!data.precoVendaPremium || data.precoVendaPremium <= 0) {
    errors.push('Preço de venda premium deve ser maior que zero');
  }

  if (!data.taxaClassico || data.taxaClassico <= 0) {
    errors.push('Taxa clássico deve ser maior que zero');
  }

  if (!data.taxaPremium || data.taxaPremium <= 0) {
    errors.push('Taxa premium deve ser maior que zero');
  }

  if (data.freteCobrado === undefined || data.freteCobrado < 0) {
    errors.push('Frete cobrado deve ser maior ou igual a zero');
  }

  if (data.lucroClassico === undefined || data.lucroClassico === null) {
    errors.push('Lucro clássico deve ser calculado');
  }

  if (data.lucroPremium === undefined || data.lucroPremium === null) {
    errors.push('Lucro premium deve ser calculado');
  }

  if (data.lucroLiquidoClassico === undefined || data.lucroLiquidoClassico === null) {
    errors.push('Lucro líquido clássico deve ser calculado');
  }

  if (data.lucroLiquidoPremium === undefined || data.lucroLiquidoPremium === null) {
    errors.push('Lucro líquido premium deve ser calculado');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Valida dados de uma nova venda
 */
export function validarVenda(
  data: NovaVenda,
  estoque: number
): ValidationResult {
  const errors: string[] = [];

  if (!data.produtoId || data.produtoId <= 0) {
    errors.push('ID do produto inválido');
  }

  if (!data.quantidadeVendida || data.quantidadeVendida <= 0) {
    errors.push('Quantidade vendida deve ser maior que zero');
  }

  if (data.quantidadeVendida > estoque) {
    errors.push(
      `Estoque insuficiente. Disponível: ${estoque}, Solicitado: ${data.quantidadeVendida}`
    );
  }

  if (!data.precoVenda || data.precoVenda <= 0) {
    errors.push('Preço de venda deve ser maior que zero');
  }

  if (!data.tipoAnuncio || (data.tipoAnuncio !== 'CLASSICO' && data.tipoAnuncio !== 'PREMIUM')) {
    errors.push("Tipo de anúncio deve ser 'CLASSICO' ou 'PREMIUM'");
  }

  if (data.freteCobrado === undefined || data.freteCobrado < 0) {
    errors.push('Frete cobrado deve ser maior ou igual a zero');
  }

  if (!data.taxaML || data.taxaML < 0) {
    errors.push('Taxa ML deve ser maior ou igual a zero');
  }

  if (!data.lucroLiquido || data.lucroLiquido === undefined) {
    errors.push('Lucro líquido deve ser calculado');
  }

  if (!data.data) {
    errors.push('Data da venda obrigatória');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
