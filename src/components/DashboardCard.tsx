import { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DashboardCardProps {
  titulo: string;
  valor: number;
  icone: ReactNode;
  variacao?: number;
  formatoValor?: 'quantidade' | 'moeda';
}

export function DashboardCard({
  titulo,
  valor,
  icone,
  variacao,
  formatoValor = 'quantidade',
}: DashboardCardProps) {
  const formatarValor = () => {
    if (formatoValor === 'moeda') {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(valor);
    }
    return `${valor} ${valor === 1 ? 'venda' : 'vendas'}`;
  };

  const formatarVariacao = () => {
    if (variacao === undefined || variacao === null) return null;

    const isPositive = variacao >= 0;
    const simbolo = isPositive ? '↑' : '↓';
    const cor = isPositive ? 'text-green-600' : 'text-red-600';

    return (
      <span className={`text-sm ${cor}`}>
        {simbolo} {Math.abs(variacao)}%
      </span>
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{titulo}</CardTitle>
        <div className="h-4 w-4 text-muted-foreground">{icone}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatarValor()}</div>
        {variacao !== undefined && variacao !== null && (
          <p className="text-xs text-muted-foreground mt-1">
            {formatarVariacao()} vs mês passado
          </p>
        )}
      </CardContent>
    </Card>
  );
}
