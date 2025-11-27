export type TipoAnuncio = 'CLASSICO' | 'PREMIUM';

export interface Venda {
  id: number;
  produtoId: number;
  compraId: number | null;
  quantidadeVendida: number;
  precoVenda: number;
  tipoAnuncio: TipoAnuncio;
  freteCobrado: number;
  taxaML: number;
  custoTotal: number;
  lucroLiquido: number;
  data: number;
  createdAt: number;
}

export type VendaInput = Omit<
  Venda,
  | 'id'
  | 'createdAt'
  | 'compraId'
  | 'taxaML'
  | 'custoTotal'
  | 'lucroLiquido'
>;

export interface VendaML {
  numeroVenda: string;
  data: Date;
  estado: string;
  descricaoStatus: string;
  unidades: number;
  tituloAnuncio: string;
  variacao: string;
  precoUnitario: number;
  tipoAnuncio: TipoAnuncio;
  receita: number;
  receitaEnvio: number;
  taxaVenda: number;
  taxaEnvio: number;
  total: number;
}
