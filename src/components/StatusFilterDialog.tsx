'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface StatusFilterDialogProps {
  isOpen: boolean;
  statusDisponiveis: string[];
  statusSelecionados: string[];
  onConfirm: (status: string[]) => void;
  onCancel: () => void;
  totalVendas: number;
  vendasPorStatus: Map<string, number>;
}

export default function StatusFilterDialog({
  isOpen,
  statusDisponiveis,
  statusSelecionados: initialSelected,
  onConfirm,
  onCancel,
  totalVendas,
  vendasPorStatus,
}: StatusFilterDialogProps) {
  const [statusSelecionados, setStatusSelecionados] = useState<string[]>(
    initialSelected
  );

  useEffect(() => {
    if (isOpen) {
      setStatusSelecionados(initialSelected);
    }
  }, [isOpen, initialSelected]);

  if (!isOpen) return null;

  const todosSelecionados =
    statusSelecionados.length === statusDisponiveis.length &&
    statusDisponiveis.length > 0;

  const toggleSelectAll = () => {
    if (todosSelecionados) {
      setStatusSelecionados([]);
    } else {
      setStatusSelecionados([...statusDisponiveis]);
    }
  };

  const toggleStatus = (status: string) => {
    if (statusSelecionados.includes(status)) {
      setStatusSelecionados(statusSelecionados.filter((s) => s !== status));
    } else {
      setStatusSelecionados([...statusSelecionados, status]);
    }
  };

  const handleConfirm = () => {
    if (statusSelecionados.length > 0) {
      onConfirm(statusSelecionados);
    }
  };

  const totalVendasSelecionadas = statusSelecionados.reduce(
    (sum, status) => sum + (vendasPorStatus.get(status) || 0),
    0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card border border-border rounded-lg p-6 max-w-2xl w-full mx-4 shadow-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-card-foreground mb-1">
              Selecionar Status para Importar
            </h3>
            <p className="text-sm text-muted-foreground">
              Escolha quais status de venda deseja importar. Devoluções e
              reclamações foram automaticamente excluídas.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 mb-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 px-4 py-3 rounded-md">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Total:</strong> {totalVendas} venda(s) disponível(is) |{' '}
              <strong>Selecionadas:</strong> {totalVendasSelecionadas} venda(s)
            </p>
          </div>

          <div className="border border-border rounded-md p-3">
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-border">
              <input
                type="checkbox"
                id="select-all"
                checked={todosSelecionados}
                onChange={toggleSelectAll}
                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary cursor-pointer"
              />
              <label
                htmlFor="select-all"
                className="text-sm font-medium text-foreground cursor-pointer"
              >
                Selecionar todos ({statusDisponiveis.length} status)
              </label>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {statusDisponiveis.map((status) => {
                const count = vendasPorStatus.get(status) || 0;
                const isSelected = statusSelecionados.includes(status);

                return (
                  <div
                    key={status}
                    className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded-md"
                  >
                    <input
                      type="checkbox"
                      id={`status-${status}`}
                      checked={isSelected}
                      onChange={() => toggleStatus(status)}
                      className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary cursor-pointer"
                    />
                    <label
                      htmlFor={`status-${status}`}
                      className="flex-1 text-sm text-foreground cursor-pointer flex items-center justify-between"
                    >
                      <span>{status}</span>
                      <span className="text-muted-foreground text-xs">
                        {count} venda(s)
                      </span>
                    </label>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-4 border-t border-border">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium border border-border rounded-md hover:bg-accent transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={statusSelecionados.length === 0}
            className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continuar ({statusSelecionados.length} status, {totalVendasSelecionadas}{' '}
            vendas)
          </button>
        </div>
      </div>
    </div>
  );
}

