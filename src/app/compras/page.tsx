'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import LoadingSpinner from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog';
import Toast from '@/components/Toast';
import { ShoppingBag } from 'lucide-react';
import type { Compra, Produto } from '@/db/schema';

interface CompraComProduto {
  compra: Compra;
  produto: Produto | null;
}

export default function ComprasPage() {
  const [compras, setCompras] = useState<CompraComProduto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comprasSelecionadas, setComprasSelecionadas] = useState<Set<number>>(
    new Set()
  );
  const [selectAll, setSelectAll] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    ids: number[];
  }>({ isOpen: false, ids: [] });
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
    isVisible: boolean;
  }>({ message: '', type: 'info', isVisible: false });

  const fetchCompras = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/compras');

      if (!response.ok) {
        const data = await response.json();
        const errorMsg = data.error || data.details || 'Erro ao carregar compras';
        throw new Error(errorMsg);
      }

      const data = await response.json();
      setCompras(data.compras || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error('Erro ao buscar compras:', err);
      setError(errorMessage);
      setCompras([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompras();
  }, [fetchCompras]);

  useEffect(() => {
    if (comprasSelecionadas.size === compras.length && compras.length > 0) {
      setSelectAll(true);
    } else {
      setSelectAll(false);
    }
  }, [comprasSelecionadas, compras.length]);

  const toggleCompra = (id: number) => {
    const newSet = new Set(comprasSelecionadas);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setComprasSelecionadas(newSet);
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setComprasSelecionadas(new Set());
    } else {
      setComprasSelecionadas(new Set(compras.map((c) => c.compra.id)));
    }
    setSelectAll(!selectAll);
  };

  const showToast = (
    message: string,
    type: 'success' | 'error' | 'info' = 'info'
  ) => {
    setToast({ message, type, isVisible: true });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, isVisible: false }));
    }, 3000);
  };

  const handleDeleteBatch = () => {
    const ids = Array.from(comprasSelecionadas);
    if (ids.length > 0) {
      setDeleteDialog({ isOpen: true, ids });
    }
  };

  const confirmDeleteBatch = async () => {
    const { ids } = deleteDialog;
    if (ids.length === 0) {
      setDeleteDialog({ isOpen: false, ids: [] });
      return;
    }

    try {
      setDeleting(true);
      const response = await fetch('/api/compras/batch-delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Erro ao deletar compras');
      }

      const numDeletadas = data.deletados || 0;
      const numErros = data.erros?.length || 0;
      const erros = data.erros || [];

      if (numErros > 0) {
        const mensagemErro = erros.length <= 3 
          ? erros.join('. ')
          : `${erros.slice(0, 3).join('. ')} e mais ${erros.length - 3} erro(s)...`;
        
        showToast(
          `${numDeletadas} compra(s) deletada(s). ${numErros} erro(s): ${mensagemErro}`,
          numDeletadas > 0 ? 'success' : 'error'
        );
        
        console.error('Erros ao deletar compras:', erros);
      } else {
        showToast(
          `${numDeletadas} compra(s) deletada(s) com sucesso.`,
          'success'
        );
      }

      setDeleteDialog({ isOpen: false, ids: [] });
      setComprasSelecionadas(new Set());
      fetchCompras();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Erro ao deletar compras',
        'error'
      );
    } finally {
      setDeleting(false);
    }
  };

  function formatCurrency(value: number) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }

  function formatDate(date: Date | number | null) {
    if (!date) return '-';
    try {
      return new Intl.DateTimeFormat('pt-BR').format(new Date(date));
    } catch {
      return '-';
    }
  }

  // Calcular resumos
  const totalCompras = compras.length;
  const totalInvestido = compras.reduce(
    (sum, item) => sum + item.compra.custoUnitario * item.compra.quantidadeComprada,
    0
  );
  const estoqueDisponivel = compras.reduce(
    (sum, item) => sum + item.compra.quantidadeDisponivel,
    0
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-foreground">Compras</h1>
        <Link
          href="/compras/novo"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          Nova Compra
        </Link>
      </div>

      {loading && (
        <div className="text-center py-12">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando compras...</p>
        </div>
      )}

      {error && (
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-md mb-4">
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && (
        <>
          {compras.length === 0 ? (
            <EmptyState
              title="Nenhuma compra registrada"
              description="Ainda não há compras registradas no sistema. Registre sua primeira compra para começar a gerenciar seu estoque."
              icon={
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                  <ShoppingBag className="w-8 h-8 text-muted-foreground" />
                </div>
              }
              action={{
                label: 'Nova Compra',
                onClick: () => {
                  window.location.href = '/compras/novo';
                },
              }}
            />
          ) : (
            <>
              {compras.length > 0 && (
                <div className="flex items-center justify-between bg-muted/50 border border-border rounded-lg p-4 mb-6">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectAll}
                        onChange={toggleSelectAll}
                        disabled={deleting}
                        className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <span className="text-sm font-medium text-foreground">
                        Selecionar todas
                      </span>
                    </label>
                    {comprasSelecionadas.size > 0 && (
                      <span className="text-sm text-muted-foreground">
                        {comprasSelecionadas.size} compra(s) selecionada(s)
                      </span>
                    )}
                  </div>
                  {comprasSelecionadas.size > 0 && (
                    <button
                      onClick={handleDeleteBatch}
                      disabled={deleting}
                      className="px-4 py-2 text-sm font-medium bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Deletar Selecionadas ({comprasSelecionadas.size})
                    </button>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-card border border-border rounded-lg p-4">
                  <div className="text-sm text-muted-foreground">
                    Total de Compras
                  </div>
                  <div className="text-2xl font-bold text-foreground">
                    {totalCompras}
                  </div>
                </div>
                <div className="bg-card border border-border rounded-lg p-4">
                  <div className="text-sm text-muted-foreground">
                    Total Investido
                  </div>
                  <div className="text-2xl font-bold text-foreground">
                    {formatCurrency(totalInvestido)}
                  </div>
                </div>
                <div className="bg-card border border-border rounded-lg p-4">
                  <div className="text-sm text-muted-foreground">
                    Estoque Disponível
                  </div>
                  <div className="text-2xl font-bold text-foreground">
                    {estoqueDisponivel}
                  </div>
                </div>
              </div>

              <div className="bg-card border border-border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-foreground w-12">
                          <input
                            type="checkbox"
                            checked={selectAll}
                            onChange={toggleSelectAll}
                            disabled={deleting}
                            className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                          Data
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                          Produto
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-foreground">
                          Qtd Comprada
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-foreground">
                          Qtd Disponível
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-foreground">
                          Custo Unit.
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-foreground">
                          Total
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                          Fornecedor
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {compras.map((item) => {
                        const total = item.compra.custoUnitario * item.compra.quantidadeComprada;
                        const qtdDisponivel = item.compra.quantidadeDisponivel;
                        const isDisponivel = qtdDisponivel > 0;

                        return (
                          <tr key={item.compra.id} className="hover:bg-muted/50">
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={comprasSelecionadas.has(item.compra.id)}
                                onChange={() => toggleCompra(item.compra.id)}
                                disabled={deleting}
                                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                              />
                            </td>
                            <td className="px-4 py-3 text-sm text-foreground">
                              {formatDate(item.compra.dataCompra)}
                            </td>
                            <td className="px-4 py-3 text-sm text-foreground">
                              {item.produto?.nome || '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-foreground text-right">
                              {item.compra.quantidadeComprada}
                            </td>
                            <td className="px-4 py-3 text-sm text-right">
                              <span
                                className={`font-medium ${
                                  isDisponivel ? 'text-green-600' : 'text-red-600'
                                }`}
                              >
                                {qtdDisponivel}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-foreground text-right">
                              {formatCurrency(item.compra.custoUnitario)}
                            </td>
                            <td className="px-4 py-3 text-sm text-foreground text-right">
                              {formatCurrency(total)}
                            </td>
                            <td className="px-4 py-3 text-sm text-foreground">
                              {item.compra.fornecedor || '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}

      <DeleteConfirmDialog
        isOpen={deleteDialog.isOpen}
        onConfirm={confirmDeleteBatch}
        onCancel={() => setDeleteDialog({ isOpen: false, ids: [] })}
        title={`Deletar ${deleteDialog.ids.length} compra(s)?`}
        description={
          deleteDialog.ids.length === 1
            ? 'Esta ação não pode ser desfeita. O estoque do produto será revertido automaticamente.'
            : `Esta ação não pode ser desfeita. O estoque dos produtos será revertido automaticamente. Compras com vendas associadas não podem ser deletadas.`
        }
        confirmText="Deletar"
        confirmVariant="destructive"
      />

      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast((prev) => ({ ...prev, isVisible: false }))}
      />
    </div>
  );
}

