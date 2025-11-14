'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import VendaTable from '@/components/VendaTable';
import DeleteVendasDialog from '@/components/DeleteVendasDialog';
import Toast from '@/components/Toast';
import LoadingSpinner from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import { ShoppingCart } from 'lucide-react';
import type { Venda, Produto } from '@/db/schema';

export default function VendasPage() {
  const [vendas, setVendas] = useState<(Venda & { produto: Produto })[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    ids: number[];
    vendas: (Venda & { produto: Produto })[];
  }>({ isOpen: false, ids: [], vendas: [] });
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
    isVisible: boolean;
  }>({ message: '', type: 'info', isVisible: false });

  const fetchVendas = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/vendas');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Erro ao carregar vendas');
      }
      
      setVendas(data.vendas || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error('Erro ao buscar vendas:', err);
      setError(errorMessage);
      setVendas([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVendas();
  }, [fetchVendas]);

  const showToast = (
    message: string,
    type: 'success' | 'error' | 'info' = 'info'
  ) => {
    setToast({ message, type, isVisible: true });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, isVisible: false }));
    }, 5000);
  };

  const handleDelete = async (ids: number[]) => {
    if (!ids || ids.length === 0) {
      return;
    }
    
    const vendasParaDeletar = vendas.filter((v) => ids.includes(v.id));
    setDeleteDialog({
      isOpen: true,
      ids,
      vendas: vendasParaDeletar,
    });
  };

  const confirmDelete = async () => {
    const { ids } = deleteDialog;
    
    if (!ids || ids.length === 0) {
      setDeleteDialog({ isOpen: false, ids: [], vendas: [] });
      return;
    }
    
    setDeleting(true);

    try {
      const response = await fetch('/api/vendas/batch-delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao excluir vendas');
      }

      const numDeletadas = data.deletadas || 0;
      const numEstornos = data.estornoEstoque?.length || 0;

      showToast(
        `${numDeletadas} venda(s) excluída(s) e estoque revertido${numEstornos > 0 ? ` (${numEstornos} produto(s))` : ''}`,
        'success'
      );

      setDeleteDialog({ isOpen: false, ids: [], vendas: [] });
      await fetchVendas();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Erro ao excluir vendas',
        'error'
      );
    } finally {
      setDeleting(false);
    }
  };

  const cancelDelete = () => {
    setDeleteDialog({ isOpen: false, ids: [], vendas: [] });
  };

  const totalVendas = vendas.length;
  const totalLucro = vendas.reduce((sum, v) => sum + v.lucroLiquido, 0);
  const totalReceita = vendas.reduce(
    (sum, v) => sum + v.precoVenda * v.quantidadeVendida + (v.freteCobrado || 0),
    0
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-foreground">Vendas</h1>
        <div className="flex gap-2">
          <Link
            href="/vendas/importar"
            className="px-4 py-2 border border-border rounded-md hover:bg-accent transition-colors"
          >
            Importar do Excel
          </Link>
          <Link
            href="/vendas/novo"
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Registrar Venda
          </Link>
        </div>
      </div>

      {loading && (
        <div className="text-center py-12">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando vendas...</p>
        </div>
      )}

      {error && (
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-md mb-4">
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && (
        <>
          {vendas.length === 0 ? (
            <EmptyState
              title="Nenhuma venda registrada"
              description="Ainda não há vendas registradas no sistema. Registre sua primeira venda para começar a acompanhar seus lucros."
              icon={
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                  <ShoppingCart className="w-8 h-8 text-muted-foreground" />
                </div>
              }
            />
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-card border border-border rounded-lg p-4">
                  <div className="text-sm text-muted-foreground">
                    Total de Vendas
                  </div>
                  <div className="text-2xl font-bold text-foreground">
                    {totalVendas}
                  </div>
                </div>
                <div className="bg-card border border-border rounded-lg p-4">
                  <div className="text-sm text-muted-foreground">
                    Receita Total
                  </div>
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

              <VendaTable
                vendas={vendas}
                onDelete={handleDelete}
                loading={deleting}
              />
            </>
          )}
        </>
      )}

      <DeleteVendasDialog
        isOpen={deleteDialog.isOpen}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        vendas={deleteDialog.vendas}
        numVendas={deleteDialog.ids.length}
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
