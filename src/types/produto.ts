export interface ProdutoLab {
  id: number;
  nome: string;
  precoUSD: number;
  cotacao: number;
  freteTotal: number;
  fornecedor: string | null;
  deletedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface ProdutoProd {
  id: number;
  nome: string;
  fornecedor: string | null;
  quantidade: number;
  deletedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export type Produto = ProdutoLab | ProdutoProd;

export type ProdutoLabInput = Omit<
  ProdutoLab,
  'id' | 'createdAt' | 'updatedAt' | 'deletedAt'
>;

export type ProdutoProdInput = Omit<
  ProdutoProd,
  'id' | 'createdAt' | 'updatedAt' | 'deletedAt'
>;
