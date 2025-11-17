'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import CompraForm from '@/components/CompraForm';
import Toast from '@/components/Toast';
import LoadingSpinner from '@/components/LoadingSpinner';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { Produto } from '@/db/schema';

export default function NovaCompraPage() {
  const router = useRouter();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
    isVisible: boolean;
  }>({ message: '', type: 'info', isVisible: false });

  const fetchProdutos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // Buscar apenas produtos PROD (produção) para compras
      const response = await fetch('/api/produtos?tipo=PROD');

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.error || 'Erro ao carregar produtos';
        const details = errorData.details ? `\n\nDetalhes: ${errorData.details}` : '';
        throw new Error(errorMsg + details);
      }

      const data = await response.json();
      setProdutos(data.produtos || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error('Erro ao buscar produtos:', err);
      setError(errorMessage);
      setProdutos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProdutos();
  }, [fetchProdutos]);

  const showToast = (
    message: string,
    type: 'success' | 'error' | 'info' = 'info'
  ) => {
    setToast({ message, type, isVisible: true });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, isVisible: false }));
    }, 3000);
  };

  const handleSubmit = async (data: {
    produtoId: number;
    precoUSD: number;
    cotacao: number;
    freteTotal: number;
    quantidadeComprada: number;
    moeda: 'USD' | 'BRL';
    fornecedor?: string;
    observacoes?: string;
    dataCompra?: Date;
  }) => {
    try {
      const response = await fetch('/api/compras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMsg = errorData.error || 'Erro ao registrar compra';
        const details = errorData.details ? `\n\nDetalhes: ${errorData.details}` : '';
        throw new Error(errorMsg + details);
      }

      showToast('Compra registrada com sucesso!', 'success');
      setTimeout(() => {
        router.push('/compras');
        router.refresh();
      }, 1000);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Erro ao registrar compra',
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
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Link
          href="/compras"
          className="flex items-center gap-2 text-primary hover:underline mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Link>
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-md">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Link
        href="/compras"
        className="flex items-center gap-2 text-primary hover:underline mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar
      </Link>

      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold text-foreground mb-6">
          Registrar Nova Compra
        </h1>
        <div className="bg-card border border-border rounded-lg p-6">
          <CompraForm produtos={produtos} onSubmit={handleSubmit} />
        </div>
      </div>

      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast((prev) => ({ ...prev, isVisible: false }))}
      />
    </div>
  );
}

