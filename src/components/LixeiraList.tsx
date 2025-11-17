'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import EmptyState from '@/components/EmptyState';
import { Trash2 } from 'lucide-react';
import type { Produto } from '@/db/schema';

interface LixeiraListProps {
  produtos: Produto[];
  onRestore: (produtoId: number) => void;
  onDeletePermanent: (produtoId: number) => void;
  onDeleteBatch?: (ids: number[]) => void;
  loading?: boolean;
}

export default function LixeiraList({
  produtos,
  onRestore,
  onDeletePermanent,
  onDeleteBatch,
  loading = false,
}: LixeiraListProps) {
  const [produtosSelecionados, setProdutosSelecionados] = useState<Set<number>>(
    new Set()
  );
  const [selectAll, setSelectAll] = useState(false);

  useEffect(() => {
    if (produtosSelecionados.size === produtos.length && produtos.length > 0) {
      setSelectAll(true);
    } else {
      setSelectAll(false);
    }
  }, [produtosSelecionados, produtos.length]);

  const toggleProduto = (id: number) => {
    const newSet = new Set(produtosSelecionados);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setProdutosSelecionados(newSet);
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setProdutosSelecionados(new Set());
    } else {
      setProdutosSelecionados(new Set(produtos.map((p) => p.id)));
    }
    setSelectAll(!selectAll);
  };

  const handleDeleteBatch = () => {
    const ids = Array.from(produtosSelecionados);
    if (ids.length > 0 && onDeleteBatch) {
      onDeleteBatch(ids);
      setProdutosSelecionados(new Set());
    }
  };
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

  const numSelecionados = produtosSelecionados.size;
  const podeDeletar = numSelecionados > 0 && !loading && onDeleteBatch;

  return (
    <div className="space-y-4">
      {onDeleteBatch && produtos.length > 0 && (
        <div className="flex items-center justify-between bg-muted/50 border border-border rounded-lg p-4">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectAll}
                onChange={toggleSelectAll}
                disabled={loading}
                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <span className="text-sm font-medium text-foreground">
                Selecionar todos
              </span>
            </label>
            {numSelecionados > 0 && (
              <span className="text-sm text-muted-foreground">
                {numSelecionados} produto(s) selecionado(s)
              </span>
            )}
          </div>
          {podeDeletar && (
            <button
              onClick={handleDeleteBatch}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Deletar Selecionados ({numSelecionados})
            </button>
          )}
        </div>
      )}

      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              {onDeleteBatch && (
                <th className="px-4 py-3 w-12">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={toggleSelectAll}
                    disabled={loading}
                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </th>
              )}
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
            {produtos.map((produto) => {
              const isSelected = produtosSelecionados.has(produto.id);
              return (
                <tr
                  key={produto.id}
                  className={`hover:bg-muted/50 ${isSelected ? 'bg-primary/5' : ''}`}
                >
                  {onDeleteBatch && (
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleProduto(produto.id)}
                        disabled={loading}
                        className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </td>
                  )}
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
                        disabled={loading}
                        className="px-3 py-1 text-sm font-medium border border-primary text-primary rounded-md hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Restaurar
                      </button>
                      <button
                        onClick={() => onDeletePermanent(produto.id)}
                        disabled={loading}
                        className="px-3 py-1 text-sm font-medium border border-destructive text-destructive rounded-md hover:bg-destructive hover:text-destructive-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Deletar Permanente
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
