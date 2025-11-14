'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import FilterTabs from '@/components/FilterTabs';
import ProdutoCard from '@/components/ProdutoCard';
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog';
import Toast from '@/components/Toast';
import LoadingSpinner from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import { Package } from 'lucide-react';
import type { Produto } from '@/db/schema';

export default function ProdutosPage() {
  const router = useRouter();
  const [tipo, setTipo] = useState<'LAB' | 'PROD'>('LAB');
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    produtoId: number | null;
  }>({ isOpen: false, produtoId: null });
  const [migrateDialog, setMigrateDialog] = useState<{
    isOpen: boolean;
    produtoId: number | null;
  }>({ isOpen: false, produtoId: null });
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
    isVisible: boolean;
  }>({ message: '', type: 'info', isVisible: false });

  const fetchProdutos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/produtos?tipo=${tipo}`);
      
      if (!response.ok) {
        throw new Error('Erro ao carregar produtos');
      }

      const data = await response.json();
      setProdutos(data.produtos || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      setProdutos([]);
    } finally {
      setLoading(false);
    }
  }, [tipo]);

  useEffect(() => {
    fetchProdutos();
  }, [fetchProdutos]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type, isVisible: true });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, isVisible: false }));
    }, 3000);
  };

  const handleDelete = (produtoId: number) => {
    setDeleteDialog({ isOpen: true, produtoId });
  };

  const confirmDelete = async () => {
    if (!deleteDialog.produtoId) return;

    try {
      const response = await fetch(`/api/produtos/${deleteDialog.produtoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deletedAt: new Date() }),
      });

      if (!response.ok) {
        throw new Error('Erro ao deletar produto');
      }

      showToast('Produto movido para lixeira', 'success');
      setDeleteDialog({ isOpen: false, produtoId: null });
      fetchProdutos();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Erro ao deletar produto',
        'error'
      );
    }
  };

  const handleMigrate = (produtoId: number) => {
    setMigrateDialog({ isOpen: true, produtoId });
  };

  const confirmMigrate = async () => {
    if (!migrateDialog.produtoId) return;

    try {
      const response = await fetch('/api/produtos/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ produtoId: migrateDialog.produtoId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao migrar produto');
      }

      showToast('Produto migrado para PROD com sucesso', 'success');
      setMigrateDialog({ isOpen: false, produtoId: null });
      fetchProdutos();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Erro ao migrar produto',
        'error'
      );
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-foreground">Produtos</h1>
          <Link
            href="/produtos/novo"
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Novo Produto
          </Link>
        </div>
        <FilterTabs value={tipo} onChange={setTipo} />
      </div>

      {loading && (
        <div className="text-center py-12">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando produtos...</p>
        </div>
      )}

      {error && (
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-md mb-4">
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && produtos.length === 0 && (
        <EmptyState
          title="Nenhum produto cadastrado"
          description={`Crie seu primeiro produto em ${tipo === 'LAB' ? 'Simulação' : 'Produção'} para começar a gerenciar seus produtos.`}
          icon={
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <Package className="w-8 h-8 text-muted-foreground" />
            </div>
          }
          action={{
            label: 'Criar Primeiro Produto',
            onClick: () => {
              router.push('/produtos/novo');
            },
          }}
        />
      )}

      {!loading && !error && produtos.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {produtos.map((produto) => (
            <ProdutoCard
              key={produto.id}
              produto={produto}
              onDelete={() => handleDelete(produto.id)}
              onMigrate={
                produto.tipo === 'LAB'
                  ? () => handleMigrate(produto.id)
                  : undefined
              }
            />
          ))}
        </div>
      )}

      <DeleteConfirmDialog
        isOpen={deleteDialog.isOpen}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteDialog({ isOpen: false, produtoId: null })}
        title="Tem certeza?"
        description="O produto será movido para a lixeira e poderá ser restaurado depois."
      />

      <DeleteConfirmDialog
        isOpen={migrateDialog.isOpen}
        onConfirm={confirmMigrate}
        onCancel={() => setMigrateDialog({ isOpen: false, produtoId: null })}
        title="Migrar produto para PROD?"
        description="Uma cópia do produto será criada em PROD. O produto original permanecerá em LAB."
        confirmText="Migrar"
        confirmVariant="primary"
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
