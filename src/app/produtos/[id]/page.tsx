'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ProdutoForm from '@/components/ProdutoForm';
import Toast from '@/components/Toast';
import LoadingSpinner from '@/components/LoadingSpinner';
import type { Produto } from '@/db/schema';

export default function EditarProdutoPage() {
  const params = useParams();
  const router = useRouter();
  const [produto, setProduto] = useState<Produto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
    isVisible: boolean;
  }>({ message: '', type: 'info', isVisible: false });

  const fetchProduto = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const id = params.id as string;
      const response = await fetch(`/api/produtos/${id}`);

      if (!response.ok) {
        if (response.status === 404) {
          setError('Produto não encontrado');
        } else {
          throw new Error('Erro ao carregar produto');
        }
        return;
      }

      const data = await response.json();
      setProduto(data.produto);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchProduto();
  }, [fetchProduto]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type, isVisible: true });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, isVisible: false }));
    }, 3000);
  };

  const handleSubmit = async (data: {
    nome: string;
    precoUSD: number;
    cotacao: number;
    freteTotal: number;
    quantidade: number;
    fornecedor?: string | null;
    moeda?: 'USD' | 'BRL';
  }) => {
    if (!produto) return;

    try {
      const response = await fetch(`/api/produtos/${produto.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.errors?.join(', ') || errorData.error || 'Erro ao atualizar produto'
        );
      }

      showToast('Produto atualizado!', 'success');
      setTimeout(() => {
        router.push('/produtos');
      }, 1000);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Erro ao atualizar produto',
        'error'
      );
      throw err;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando produto...</p>
        </div>
      </div>
    );
  }

  if (error || !produto) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-md">
          <p>{error || 'Produto não encontrado'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-6">
          Editar Produto
        </h1>
        <ProdutoForm initialData={produto} onSubmit={handleSubmit} isEditing />
        <Toast
          message={toast.message}
          type={toast.type}
          isVisible={toast.isVisible}
          onClose={() => setToast((prev) => ({ ...prev, isVisible: false }))}
        />
      </div>
    </div>
  );
}
