'use client';

import { useState, useEffect, useCallback } from 'react';
import LixeiraList from '@/components/LixeiraList';
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog';
import Toast from '@/components/Toast';
import LoadingSpinner from '@/components/LoadingSpinner';
import type { Produto } from '@/db/schema';

export default function LixeiraPage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    produtoId: number | null;
  }>({ isOpen: false, produtoId: null });
  const [deleteBatchDialog, setDeleteBatchDialog] = useState<{
    isOpen: boolean;
    ids: number[];
  }>({ isOpen: false, ids: [] });
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
    isVisible: boolean;
  }>({ message: '', type: 'info', isVisible: false });

  const fetchProdutos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/produtos/lixeira');

      if (!response.ok) {
        throw new Error('Erro ao carregar produtos da lixeira');
      }

      const data = await response.json();
      setProdutos(data.produtos || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      setProdutos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProdutos();
  }, [fetchProdutos]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type, isVisible: true });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, isVisible: false }));
    }, 3000);
  };

  const handleRestore = async (produtoId: number) => {
    try {
      const response = await fetch('/api/produtos/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ produtoId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao restaurar produto');
      }

      showToast('Produto restaurado com sucesso', 'success');
      fetchProdutos();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Erro ao restaurar produto',
        'error'
      );
    }
  };

  const handleDeletePermanent = async (produtoId: number) => {
    try {
      // Verificar se produto tem vendas antes de mostrar dialog
      const responseVendas = await fetch(`/api/vendas?produtoId=${produtoId}`);
      
      if (responseVendas.ok) {
        const dataVendas = await responseVendas.json();
        const vendas = dataVendas.vendas || [];
        
        if (vendas.length > 0) {
          showToast(
            `Não é possível deletar. Produto tem ${vendas.length} venda(s) registrada(s).`,
            'error'
          );
          return;
        }
      }

      // Se não tem vendas, mostrar dialog de confirmação
      setDeleteDialog({ isOpen: true, produtoId });
    } catch (err) {
      console.error('Erro ao verificar vendas:', err);
      // Continuar mesmo se houver erro na verificação
      setDeleteDialog({ isOpen: true, produtoId });
    }
  };

  const confirmDeletePermanent = async () => {
    if (!deleteDialog.produtoId) return;

    try {
      setDeleting(true);
      const response = await fetch(`/api/produtos/${deleteDialog.produtoId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Erro ao deletar produto permanentemente');
      }

      showToast('Produto deletado permanentemente. Cenários também foram deletados.', 'success');
      setDeleteDialog({ isOpen: false, produtoId: null });
      fetchProdutos();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Erro ao deletar produto';
      showToast(errorMessage, 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteBatch = (ids: number[]) => {
    if (ids.length === 0) return;
    setDeleteBatchDialog({ isOpen: true, ids });
  };

  const confirmDeleteBatch = async () => {
    const { ids } = deleteBatchDialog;
    if (ids.length === 0) {
      setDeleteBatchDialog({ isOpen: false, ids: [] });
      return;
    }

    try {
      setDeleting(true);
      const response = await fetch('/api/produtos/batch-delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Erro ao deletar produtos');
      }

      const numDeletados = data.deletados || 0;
      const numErros = data.erros?.length || 0;
      const erros = data.erros || [];

      if (numErros > 0) {
        // Mostrar mensagem mais detalhada
        const mensagemErro = erros.length <= 3 
          ? erros.join('. ')
          : `${erros.slice(0, 3).join('. ')} e mais ${erros.length - 3} erro(s)...`;
        
        showToast(
          `${numDeletados} produto(s) deletado(s). ${numErros} erro(s): ${mensagemErro}`,
          numDeletados > 0 ? 'success' : 'error'
        );
        
        // Log completo dos erros no console para debug
        console.error('Erros ao deletar produtos:', erros);
      } else {
        showToast(
          `${numDeletados} produto(s) deletado(s) permanentemente.`,
          'success'
        );
      }

      setDeleteBatchDialog({ isOpen: false, ids: [] });
      fetchProdutos();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Erro ao deletar produtos',
        'error'
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-foreground mb-6">Lixeira</h1>

      {loading && (
        <div className="text-center py-12">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando lixeira...</p>
        </div>
      )}

      {error && (
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-md mb-4">
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && (
        <LixeiraList
          produtos={produtos}
          onRestore={handleRestore}
          onDeletePermanent={handleDeletePermanent}
          onDeleteBatch={handleDeleteBatch}
          loading={deleting}
        />
      )}

      <DeleteConfirmDialog
        isOpen={deleteDialog.isOpen}
        onConfirm={confirmDeletePermanent}
        onCancel={() => setDeleteDialog({ isOpen: false, produtoId: null })}
        title="Deletar permanentemente?"
        description="Esta ação não pode ser desfeita. O produto e todos os cenários associados serão removidos permanentemente do sistema."
        confirmText="Deletar Permanentemente"
        confirmVariant="destructive"
      />

      <DeleteConfirmDialog
        isOpen={deleteBatchDialog.isOpen}
        onConfirm={confirmDeleteBatch}
        onCancel={() => setDeleteBatchDialog({ isOpen: false, ids: [] })}
        title={`Deletar ${deleteBatchDialog.ids.length} produto(s) permanentemente?`}
        description={`Esta ação não pode ser desfeita. ${deleteBatchDialog.ids.length} produto(s) e todos os cenários associados serão removidos permanentemente do sistema. Produtos com vendas registradas não serão deletados.`}
        confirmText={`Deletar ${deleteBatchDialog.ids.length} Produto(s)`}
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
