export interface Cenario {
  id: number;
  produtoId: number;
  nome: string;
  precoVendaClassico: number;
  precoVendaPremium: number;
  taxaClassico: number;
  taxaPremium: number;
  lucroClassico: number;
  lucroPremium: number;
  createdAt: number;
  updatedAt: number;
}

export type CenarioInput = Omit<
  Cenario,
  | 'id'
  | 'createdAt'
  | 'updatedAt'
  | 'lucroClassico'
  | 'lucroPremium'
>;
