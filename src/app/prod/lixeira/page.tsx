'use client';

import { useState, useEffect } from 'react';
import { LixeiraList } from '@/components/LixeiraList';
import { VendaLixeiraList } from '@/components/VendaLixeiraList';
import type { ProdutoProd } from '@/types/produto';
import type { Venda } from '@/types/venda';
import LoadingSpinner from '@/components/LoadingSpinner';

type AbaAtiva = 'produtos' | 'vendas';

export default function LixeiraProdPage() {
  const [abaAtiva, setAbaAtiva] = useState<AbaAtiva>('produtos');
  const [produtos, setProdutos] = useState<ProdutoProd[]>([]);
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [produtosMap, setProdutosMap] = useState<Map<number, ProdutoProd>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const buscarProdutos = async () => {
    try {
      const response = await fetch('/api/produtos?modo=PROD&deletados=true');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao buscar produtos deletados');
      }
      const data = await response.json();
      setProdutos(data.produtos || []);
    } catch (err: any) {
      console.error('Erro ao buscar produtos deletados:', err);
    }
  };

  const buscarVendas = async () => {
    try {
      const response = await fetch('/api/vendas?deletados=true');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao buscar vendas deletadas');
      }
      const data = await response.json();
      setVendas(data.vendas || []);
    } catch (err: any) {
      console.error('Erro ao buscar vendas deletadas:', err);
    }
  };

  const buscarProdutosParaMap = async () => {
    try {
      const response = await fetch('/api/produtos?modo=PROD');
      if (response.ok) {
        const data = await response.json();
        const map = new Map((data.produtos || []).map((p: ProdutoProd) => [p.id, p]));
        setProdutosMap(map);
      }
    } catch (err) {
      console.error('Erro ao buscar produtos para mapa:', err);
    }
  };

  const carregarDados = async () => {
    try {
      setLoading(true);
      setError(null);
      await Promise.all([
        buscarProdutos(),
        buscarVendas(),
        buscarProdutosParaMap(),
      ]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const handleRestoreProduto = () => {
    buscarProdutos();
  };

  const handleDeletePermanentProduto = () => {
    buscarProdutos();
  };

  const handleRestoreVenda = () => {
    buscarVendas();
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
      <h1 className="text-3xl font-bold mb-6">Lixeira PROD</h1>

      {/* Abas */}
      <div className="flex gap-2 mb-6 border-b">
        <button
          onClick={() => setAbaAtiva('produtos')}
          className={`px-4 py-2 font-medium transition-colors ${
            abaAtiva === 'produtos'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Produtos ({produtos.length})
        </button>
        <button
          onClick={() => setAbaAtiva('vendas')}
          className={`px-4 py-2 font-medium transition-colors ${
            abaAtiva === 'vendas'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Vendas ({vendas.length})
        </button>
      </div>

      {/* Conteúdo das abas */}
      {abaAtiva === 'produtos' && (
        <LixeiraList
          modo="PROD"
          produtos={produtos}
          onRestore={handleRestoreProduto}
          onDeletePermanent={handleDeletePermanentProduto}
          loading={false}
        />
      )}

      {abaAtiva === 'vendas' && (
        <VendaLixeiraList
          vendas={vendas}
          produtos={Array.from(produtosMap.values())}
          onRestore={handleRestoreVenda}
          loading={false}
        />
      )}
    </div>
  );
}
