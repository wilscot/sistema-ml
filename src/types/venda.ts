export type TipoAnuncio = 'CLASSICO' | 'PREMIUM';

export interface Venda {
  id: number;
  produtoId: number;
  compraId: number | null;
  numeroVenda: string | null;
  nomeComprador: string | null;
  cpfComprador: string | null;
  quantidadeVendida: number;
  precoVenda: number;
  tipoAnuncio: TipoAnuncio;
  freteCobrado: number;
  taxaML: number;
  custoTotal: number;
  lucroLiquido: number;
  data: number;
  deletedAt: number | null;
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
  nomeComprador: string;
  cpfComprador: string;
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
