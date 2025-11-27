export interface Configuracao {
  id: number;
  taxaClassico: number;
  taxaPremium: number;
  cotacaoDolar: number;
  updatedAt: number;
}

export type ConfiguracaoInput = Omit<Configuracao, 'id' | 'updatedAt'>;
