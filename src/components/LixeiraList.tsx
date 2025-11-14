'use client';

import { format } from 'date-fns';
import EmptyState from '@/components/EmptyState';
import { Trash2 } from 'lucide-react';
import type { Produto } from '@/db/schema';

interface LixeiraListProps {
  produtos: Produto[];
  onRestore: (produtoId: number) => void;
  onDeletePermanent: (produtoId: number) => void;
}

export default function LixeiraList({
  produtos,
  onRestore,
  onDeletePermanent,
}: LixeiraListProps) {
  const formatDate = (timestamp: Date | null) => {
    if (!timestamp) return '-';
    try {
      return format(new Date(timestamp), "dd/MM/yyyy 'às' HH:mm");
    } catch {
      return '-';
    }
  };

  if (produtos.length === 0) {
    return (
      <EmptyState
        title="Lixeira vazia"
        description="Não há produtos deletados no momento. Produtos deletados aparecerão aqui e poderão ser restaurados."
        icon={
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <Trash2 className="w-8 h-8 text-muted-foreground" />
          </div>
        }
      />
    );
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
              Nome
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
              Tipo
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
              Deletado em
            </th>
            <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
              Ações
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {produtos.map((produto) => (
            <tr key={produto.id} className="hover:bg-muted/50">
              <td className="px-4 py-3 text-sm text-foreground">
                {produto.nome}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`px-2 py-1 text-xs font-medium rounded ${
                    produto.tipo === 'LAB'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                      : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  }`}
                >
                  {produto.tipo}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {formatDate(produto.deletedAt)}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => onRestore(produto.id)}
                    className="px-3 py-1 text-sm font-medium border border-primary text-primary rounded-md hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    Restaurar
                  </button>
                  <button
                    onClick={() => onDeletePermanent(produto.id)}
                    className="px-3 py-1 text-sm font-medium border border-destructive text-destructive rounded-md hover:bg-destructive hover:text-destructive-foreground transition-colors"
                  >
                    Deletar Permanente
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
