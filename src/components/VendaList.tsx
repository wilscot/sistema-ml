'use client';

import { format } from 'date-fns';
import EmptyState from '@/components/EmptyState';
import { ShoppingCart } from 'lucide-react';
import type { Venda, Produto } from '@/db/schema';

interface VendaListProps {
  vendas: (Venda & { produto: Produto })[];
}

export default function VendaList({ vendas }: VendaListProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (timestamp: Date | null) => {
    if (!timestamp) return '-';
    try {
      return format(new Date(timestamp), 'dd/MM/yyyy');
    } catch {
      return '-';
    }
  };

  if (vendas.length === 0) {
    return (
      <EmptyState
        title="Nenhuma venda registrada"
        description="Ainda não há vendas registradas no sistema. Registre sua primeira venda para começar a acompanhar seus lucros."
        icon={
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <ShoppingCart className="w-8 h-8 text-muted-foreground" />
          </div>
        }
      />
    );
  }

  const totalVendas = vendas.length;
  const totalLucro = vendas.reduce((sum, v) => sum + v.lucroLiquido, 0);
  const totalReceita = vendas.reduce(
    (sum, v) => sum + v.precoVenda * v.quantidadeVendida + v.freteCobrado,
    0
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Total de Vendas</div>
          <div className="text-2xl font-bold text-foreground">{totalVendas}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Receita Total</div>
          <div className="text-2xl font-bold text-foreground">
            {formatCurrency(totalReceita)}
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Lucro Total</div>
          <div
            className={`text-2xl font-bold ${
              totalLucro >= 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {formatCurrency(totalLucro)}
          </div>
        </div>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                Data
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                Produto
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                Qtd
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                Preço
              </th>
              <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">
                Tipo
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                Taxa ML
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                Lucro
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {vendas.map((venda) => (
              <tr key={venda.id} className="hover:bg-muted/50">
                <td className="px-4 py-3 text-sm text-foreground">
                  {formatDate(venda.data)}
                </td>
                <td className="px-4 py-3 text-sm text-foreground">
                  {venda.produto.nome}
                </td>
                <td className="px-4 py-3 text-sm text-foreground text-right">
                  {venda.quantidadeVendida}
                </td>
                <td className="px-4 py-3 text-sm text-foreground text-right">
                  {formatCurrency(venda.precoVenda)}
                </td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded ${
                      venda.tipoAnuncio === 'CLASSICO'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                    }`}
                  >
                    {venda.tipoAnuncio}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-foreground text-right">
                  {formatCurrency(venda.taxaML)}
                </td>
                <td
                  className={`px-4 py-3 text-sm font-medium text-right ${
                    venda.lucroLiquido >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {formatCurrency(venda.lucroLiquido)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
