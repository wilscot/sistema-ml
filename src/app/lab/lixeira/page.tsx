'use client';

import { useState, useEffect } from 'react';
import { LixeiraList } from '@/components/LixeiraList';
import type { ProdutoLab } from '@/types/produto';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function LixeiraLabPage() {
  const [produtos, setProdutos] = useState<ProdutoLab[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const buscarProdutos = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/produtos?modo=LAB&deletados=true');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao buscar produtos deletados');
      }
      const data = await response.json();
      setProdutos(data.produtos || []);
    } catch (err: any) {
      setError(err.message);
      console.error('Erro ao buscar produtos deletados:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    buscarProdutos();
  }, []);

  const handleRestore = () => {
    buscarProdutos();
  };

  const handleDeletePermanent = () => {
    buscarProdutos();
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 text-center text-red-500">
        <p>Erro ao carregar lixeira: {error}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Lixeira LAB</h1>
      <LixeiraList
        modo="LAB"
        produtos={produtos}
        onRestore={handleRestore}
        onDeletePermanent={handleDeletePermanent}
        loading={loading}
      />
    </div>
  );
}
