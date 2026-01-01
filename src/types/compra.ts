export interface Compra {
  id: number;
  produtoId: number;
  numeroCompra: string;
  precoUSD: number;
  cotacao: number;
  freteTotal: number;
  quantidadeComprada: number;
  quantidadeDisponivel: number;
  quantidadeRecebida: number;
  moeda: 'USD' | 'BRL';
  fornecedor: string | null;
  observacoes: string | null;
  custoUnitario: number;
  dataCompra: number;
  createdAt: number;
  updatedAt: number;
}

export type CompraInput = Omit<
  Compra,
  | 'id'
  | 'createdAt'
  | 'updatedAt'
  | 'custoUnitario'
  | 'quantidadeDisponivel'
>;
