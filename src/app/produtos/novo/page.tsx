'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ProdutoForm from '@/components/ProdutoForm';
import Toast from '@/components/Toast';

export default function NovoProdutoPage() {
  const router = useRouter();
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
    isVisible: boolean;
  }>({ message: '', type: 'info', isVisible: false });

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
    tipo?: 'LAB' | 'PROD';
    moeda?: 'USD' | 'BRL';
  }) => {
    try {
      const response = await fetch('/api/produtos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMsg = errorData.errors?.join(', ') || errorData.error || 'Erro ao criar produto';
        const details = errorData.details ? `\n\nDetalhes: ${errorData.details}` : '';
        throw new Error(errorMsg + details);
      }

      showToast('Produto criado com sucesso!', 'success');
      setTimeout(() => {
        router.push('/produtos');
      }, 1000);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Erro ao criar produto',
        'error'
      );
      throw err;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-6">
          Novo Produto
        </h1>
        <ProdutoForm onSubmit={handleSubmit} isEditing={false} />
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
