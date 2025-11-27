export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

interface ProdutoLabInput {
  nome?: string;
  precoUSD?: number;
  cotacao?: number;
  freteTotal?: number;
}

interface ProdutoProdInput {
  nome?: string;
  quantidade?: number;
}

interface CompraInput {
  produtoId?: number;
  precoUSD?: number;
  cotacao?: number;
  freteTotal?: number;
  quantidadeComprada?: number;
  dataCompra?: string | number | Date;
}

interface VendaInput {
  produtoId?: number;
  quantidadeVendida?: number;
  precoVenda?: number;
  freteCobrado?: number;
  tipoAnuncio?: string;
  data?: string | number | Date;
}

interface CenarioInput {
  produtoId?: number;
  nome?: string;
  precoVendaClassico?: number;
  precoVendaPremium?: number;
}

interface ConfiguracaoInput {
  taxaClassico?: number;
  taxaPremium?: number;
  cotacaoDolar?: number;
}

/**
 * Valida dados de produto LAB
 */
export function validarProdutoLab(
  data: ProdutoLabInput
): ValidationResult {
  const errors: string[] = [];

  if (!data.nome || typeof data.nome !== 'string') {
    errors.push('Nome é obrigatório');
  } else if (data.nome.trim().length < 3) {
    errors.push('Nome deve ter pelo menos 3 caracteres');
  }

  if (data.precoUSD === undefined || data.precoUSD === null) {
    errors.push('Preço USD é obrigatório');
  } else if (typeof data.precoUSD !== 'number' || data.precoUSD <= 0) {
    errors.push('Preço USD deve ser maior que zero');
  }

  if (data.cotacao === undefined || data.cotacao === null) {
    errors.push('Cotação é obrigatória');
  } else if (typeof data.cotacao !== 'number' || data.cotacao <= 0) {
    errors.push('Cotação deve ser maior que zero');
  }

  if (data.freteTotal === undefined || data.freteTotal === null) {
    errors.push('Frete Total é obrigatório');
  } else if (
    typeof data.freteTotal !== 'number' ||
    data.freteTotal < 0
  ) {
    errors.push('Frete Total deve ser maior ou igual a zero');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Valida dados de produto PROD
 */
export function validarProdutoProd(
  data: ProdutoProdInput
): ValidationResult {
  const errors: string[] = [];

  if (!data.nome || typeof data.nome !== 'string') {
    errors.push('Nome é obrigatório');
  } else if (data.nome.trim().length < 3) {
    errors.push('Nome deve ter pelo menos 3 caracteres');
  }

  if (data.quantidade === undefined || data.quantidade === null) {
    errors.push('Quantidade é obrigatória');
  } else if (
    typeof data.quantidade !== 'number' ||
    !Number.isInteger(data.quantidade) ||
    data.quantidade < 0
  ) {
    errors.push('Quantidade deve ser um número inteiro maior ou igual a zero');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Valida dados de compra
 */
export function validarCompra(data: CompraInput): ValidationResult {
  const errors: string[] = [];

  if (data.produtoId === undefined || data.produtoId === null) {
    errors.push('Produto é obrigatório');
  } else if (typeof data.produtoId !== 'number' || data.produtoId <= 0) {
    errors.push('Produto inválido');
  }

  if (data.precoUSD === undefined || data.precoUSD === null) {
    errors.push('Preço USD é obrigatório');
  } else if (typeof data.precoUSD !== 'number' || data.precoUSD <= 0) {
    errors.push('Preço USD deve ser maior que zero');
  }

  if (data.cotacao === undefined || data.cotacao === null) {
    errors.push('Cotação é obrigatória');
  } else if (typeof data.cotacao !== 'number' || data.cotacao <= 0) {
    errors.push('Cotação deve ser maior que zero');
  }

  if (data.freteTotal === undefined || data.freteTotal === null) {
    errors.push('Frete Total é obrigatório');
  } else if (
    typeof data.freteTotal !== 'number' ||
    data.freteTotal < 0
  ) {
    errors.push('Frete Total deve ser maior ou igual a zero');
  }

  if (
    data.quantidadeComprada === undefined ||
    data.quantidadeComprada === null
  ) {
    errors.push('Quantidade Comprada é obrigatória');
  } else if (
    typeof data.quantidadeComprada !== 'number' ||
    !Number.isInteger(data.quantidadeComprada) ||
    data.quantidadeComprada <= 0
  ) {
    errors.push('Quantidade Comprada deve ser um número inteiro maior que zero');
  }

  if (!data.dataCompra) {
    errors.push('Data da Compra é obrigatória');
  } else {
    const date =
      typeof data.dataCompra === 'string'
        ? new Date(data.dataCompra)
        : typeof data.dataCompra === 'number'
          ? new Date(data.dataCompra)
          : data.dataCompra;

    if (isNaN(date.getTime())) {
      errors.push('Data da Compra inválida');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Valida dados de venda
 */
export function validarVenda(data: VendaInput): ValidationResult {
  const errors: string[] = [];

  if (data.produtoId === undefined || data.produtoId === null) {
    errors.push('Produto é obrigatório');
  } else if (typeof data.produtoId !== 'number' || data.produtoId <= 0) {
    errors.push('Produto inválido');
  }

  if (
    data.quantidadeVendida === undefined ||
    data.quantidadeVendida === null
  ) {
    errors.push('Quantidade Vendida é obrigatória');
  } else if (
    typeof data.quantidadeVendida !== 'number' ||
    !Number.isInteger(data.quantidadeVendida) ||
    data.quantidadeVendida <= 0
  ) {
    errors.push('Quantidade Vendida deve ser um número inteiro maior que zero');
  }

  if (data.precoVenda === undefined || data.precoVenda === null) {
    errors.push('Preço de Venda é obrigatório');
  } else if (typeof data.precoVenda !== 'number' || data.precoVenda <= 0) {
    errors.push('Preço de Venda deve ser maior que zero');
  }

  if (data.freteCobrado === undefined || data.freteCobrado === null) {
    errors.push('Frete Cobrado é obrigatório');
  } else if (
    typeof data.freteCobrado !== 'number' ||
    data.freteCobrado < 0
  ) {
    errors.push('Frete Cobrado deve ser maior ou igual a zero');
  }

  if (!data.tipoAnuncio) {
    errors.push('Tipo de Anúncio é obrigatório');
  } else if (
    data.tipoAnuncio !== 'CLASSICO' &&
    data.tipoAnuncio !== 'PREMIUM'
  ) {
    errors.push('Tipo de Anúncio deve ser CLASSICO ou PREMIUM');
  }

  if (!data.data) {
    errors.push('Data é obrigatória');
  } else {
    const date =
      typeof data.data === 'string'
        ? new Date(data.data)
        : typeof data.data === 'number'
          ? new Date(data.data)
          : data.data;

    if (isNaN(date.getTime())) {
      errors.push('Data inválida');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Valida dados de cenário (simulação LAB)
 */
export function validarCenario(data: CenarioInput): ValidationResult {
  const errors: string[] = [];

  if (data.produtoId === undefined || data.produtoId === null) {
    errors.push('Produto é obrigatório');
  } else if (typeof data.produtoId !== 'number' || data.produtoId <= 0) {
    errors.push('Produto inválido');
  }

  if (!data.nome || typeof data.nome !== 'string') {
    errors.push('Nome do Cenário é obrigatório');
  } else if (data.nome.trim().length < 3) {
    errors.push('Nome do Cenário deve ter pelo menos 3 caracteres');
  }

  if (
    data.precoVendaClassico === undefined ||
    data.precoVendaClassico === null
  ) {
    errors.push('Preço Venda Clássico é obrigatório');
  } else if (
    typeof data.precoVendaClassico !== 'number' ||
    data.precoVendaClassico <= 0
  ) {
    errors.push('Preço Venda Clássico deve ser maior que zero');
  }

  if (
    data.precoVendaPremium === undefined ||
    data.precoVendaPremium === null
  ) {
    errors.push('Preço Venda Premium é obrigatório');
  } else if (
    typeof data.precoVendaPremium !== 'number' ||
    data.precoVendaPremium <= 0
  ) {
    errors.push('Preço Venda Premium deve ser maior que zero');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Valida dados de configuração (LAB ou PROD)
 */
export function validarConfiguracao(
  data: ConfiguracaoInput
): ValidationResult {
  const errors: string[] = [];

  if (data.taxaClassico === undefined || data.taxaClassico === null) {
    errors.push('Taxa Clássico é obrigatória');
  } else if (
    typeof data.taxaClassico !== 'number' ||
    data.taxaClassico < 0 ||
    data.taxaClassico > 100
  ) {
    errors.push('Taxa Clássico deve estar entre 0 e 100');
  }

  if (data.taxaPremium === undefined || data.taxaPremium === null) {
    errors.push('Taxa Premium é obrigatória');
  } else if (
    typeof data.taxaPremium !== 'number' ||
    data.taxaPremium < 0 ||
    data.taxaPremium > 100
  ) {
    errors.push('Taxa Premium deve estar entre 0 e 100');
  }

  if (data.cotacaoDolar === undefined || data.cotacaoDolar === null) {
    errors.push('Cotação Dólar é obrigatória');
  } else if (
    typeof data.cotacaoDolar !== 'number' ||
    data.cotacaoDolar <= 0
  ) {
    errors.push('Cotação Dólar deve ser maior que zero');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
