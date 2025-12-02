'use client';

import { useState, useEffect } from 'react';
import { ConfiguracoesForm } from '@/components/ConfiguracoesForm';
import type { Configuracao } from '@/types/configuracao';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function ConfiguracoesLabPage() {
  const [configuracao, setConfiguracao] = useState<Configuracao | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const buscarConfiguracoes = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/configuracoes?modo=LAB');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao buscar configurações');
      }
      const data = await response.json();
      setConfiguracao(data.configuracao);
    } catch (err: any) {
      setError(err.message);
      console.error('Erro ao buscar configurações:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    buscarConfiguracoes();
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 text-center text-red-500">
        <p>Erro ao carregar configurações: {error}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Configurações LAB</h1>
      <div className="max-w-2xl">
        <ConfiguracoesForm
          modo="LAB"
          configuracao={configuracao}
          onSuccess={buscarConfiguracoes}
        />
      </div>
    </div>
  );
}
