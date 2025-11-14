'use client';

import { useState } from 'react';
import { X, Check } from 'lucide-react';
import type { VendaMLProcessada } from './ImportVendasForm';

interface ApplyProdutoDialogProps {
  isOpen: boolean;
  produtoNome: string;
  vendas: VendaMLProcessada[];
  onConfirm: (aplicarParaTodas: boolean, vendaIds: number[]) => void;
  onCancel: () => void;
}

export default function ApplyProdutoDialog({
  isOpen,
  produtoNome,
  vendas,
  onConfirm,
  onCancel,
}: ApplyProdutoDialogProps) {
  const [aplicarParaTodas, setAplicarParaTodas] = useState(true);
  const [vendasSelecionadas, setVendasSelecionadas] = useState<Set<number>>(
    new Set(vendas.map((_, index) => index))
  );

  if (!isOpen) return null;

  const toggleVenda = (index: number) => {
    const newSet = new Set(vendasSelecionadas);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setVendasSelecionadas(newSet);
  };

  const handleConfirm = () => {
    if (aplicarParaTodas) {
      onConfirm(true, []);
    } else {
      const indices = Array.from(vendasSelecionadas);
      if (indices.length === 0) {
        return;
      }
      onConfirm(false, indices);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card border border-border rounded-lg p-6 max-w-2xl w-full mx-4 shadow-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-card-foreground mb-1">
              Aplicar Produto "{produtoNome}"
            </h3>
            <p className="text-sm text-muted-foreground">
              {vendas.length} venda(s) sem produto vinculado
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

        <div className="space-y-4 mb-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 px-4 py-3 rounded-md">
            <div className="flex items-center gap-2">
              <input
                type="radio"
                id="aplicar-todas"
                checked={aplicarParaTodas}
                onChange={() => setAplicarParaTodas(true)}
                className="w-4 h-4 text-primary border-gray-300 focus:ring-primary cursor-pointer"
              />
              <label
                htmlFor="aplicar-todas"
                className="text-sm font-medium text-blue-800 dark:text-blue-200 cursor-pointer"
              >
                Aplicar para todas as {vendas.length} vendas
              </label>
            </div>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 px-4 py-3 rounded-md">
            <div className="flex items-center gap-2 mb-3">
              <input
                type="radio"
                id="aplicar-selecionadas"
                checked={!aplicarParaTodas}
                onChange={() => setAplicarParaTodas(false)}
                className="w-4 h-4 text-primary border-gray-300 focus:ring-primary cursor-pointer"
              />
              <label
                htmlFor="aplicar-selecionadas"
                className="text-sm font-medium text-yellow-800 dark:text-yellow-200 cursor-pointer"
              >
                Selecionar vendas específicas
              </label>
            </div>

            {!aplicarParaTodas && (
              <div className="mt-3 border border-yellow-200 dark:border-yellow-800 rounded-md p-3 max-h-64 overflow-y-auto">
                <div className="space-y-2">
                  {vendas.map((venda, index) => {
                    const isSelected = vendasSelecionadas.has(index);
                    return (
                      <div
                        key={index}
                        className="flex items-center gap-2 p-2 hover:bg-yellow-100 dark:hover:bg-yellow-900/40 rounded-md"
                      >
                        <input
                          type="checkbox"
                          id={`venda-${index}`}
                          checked={isSelected}
                          onChange={() => toggleVenda(index)}
                          className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary cursor-pointer"
                        />
                        <label
                          htmlFor={`venda-${index}`}
                          className="flex-1 text-sm text-foreground cursor-pointer"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate" title={venda.tituloAnuncio}>
                                {venda.tituloAnuncio}
                              </div>
                              {venda.variacao && (
                                <div className="text-xs text-muted-foreground truncate">
                                  {venda.variacao}
                                </div>
                              )}
                              <div className="text-xs text-muted-foreground">
                                {venda.numeroVenda} - {venda.data.toLocaleDateString('pt-BR')}
                              </div>
                            </div>
                            <span className="text-muted-foreground text-sm font-medium ml-4 whitespace-nowrap">
                              R$ {venda.precoUnitario ? venda.precoUnitario.toFixed(2) : '0.00'}
                            </span>
                          </div>
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
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
            disabled={!aplicarParaTodas && vendasSelecionadas.size === 0}
            className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            {aplicarParaTodas
              ? `Aplicar para todas (${vendas.length})`
              : `Aplicar para ${vendasSelecionadas.size} venda(s)`}
          </button>
        </div>
      </div>
    </div>
  );
}

