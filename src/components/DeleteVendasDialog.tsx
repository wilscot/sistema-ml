'use client';

import DeleteConfirmDialog from './DeleteConfirmDialog';
import type { Venda, Produto } from '@/db/schema';

interface DeleteVendasDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  vendas: (Venda & { produto: Produto })[];
  numVendas: number;
}

export default function DeleteVendasDialog({
  isOpen,
  onConfirm,
  onCancel,
  vendas,
  numVendas,
}: DeleteVendasDialogProps) {
  const formatDate = (timestamp: Date | null) => {
    if (!timestamp) return '-';
    try {
      return new Date(timestamp).toLocaleDateString('pt-BR');
    } catch {
      return '-';
    }
  };

  const title = `Excluir ${numVendas} venda(s)?`;
  const description =
    numVendas === 1
      ? 'Esta ação não pode ser desfeita. O estoque será revertido.'
      : `Esta ação não pode ser desfeita. O estoque de ${numVendas} venda(s) será revertido.`;

  const mostrarLista = numVendas <= 5 && vendas.length > 0;

  if (!isOpen) return null;

  if (numVendas === 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full mx-4 shadow-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-start gap-4 mb-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
            <svg
              className="w-6 h-6 text-destructive"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-card-foreground mb-2">
              {title}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">{description}</p>

            {mostrarLista && (
              <div className="bg-muted/50 rounded-md p-3 mb-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Vendas a excluir:
                </p>
                <ul className="space-y-1">
                  {vendas.map((venda) => (
                    <li
                      key={venda.id}
                      className="text-sm text-foreground flex items-center gap-2"
                    >
                      <span className="w-2 h-2 rounded-full bg-destructive"></span>
                      <span>
                        {venda.produto.nome} - {formatDate(venda.data)} (
                        {venda.quantidadeVendida} un.)
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium border border-border rounded-md hover:bg-accent transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 transition-colors"
          >
            Excluir
          </button>
        </div>
      </div>
    </div>
  );
}

