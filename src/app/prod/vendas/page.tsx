'use client';

import { useState, useEffect } from 'react';
import { Plus, FileSpreadsheet } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import VendaForm from '@/components/VendaForm';
import VendaList from '@/components/VendaList';
import LoadingSpinner from '@/components/LoadingSpinner';
import type { Venda } from '@/types/venda';

interface Produto {
  id: number;
  nome: string;
  quantidade: number | null;
  tipo: string;
  deletedAt: number | null;
  precoUSD?: number;
  cotacao?: number;
  freteTotal?: number;
  moeda?: string;
}

interface Config {
  taxaClassico: number;
  taxaPremium: number;
}

export default function VendasPage() {
  const { toast } = useToast();
  const [modalAberto, setModalAberto] = useState(false);
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [config, setConfig] = useState<Config>({ taxaClassico: 11, taxaPremium: 16 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Buscar vendas
      const vendasRes = await fetch('/api/vendas');
      if (vendasRes.ok) {
        const data = await vendasRes.json();
        const vendasOrdenadas = (data.vendas || []).sort((a: Venda, b: Venda) => b.data - a.data);
        setVendas(vendasOrdenadas);
      }

      // Buscar produtos PROD
      const produtosRes = await fetch('/api/produtos?modo=PROD');
      if (produtosRes.ok) {
        const data = await produtosRes.json();
        // Adicionar tipo 'PROD' para cada produto
        const produtosComTipo: Produto[] = (data.produtos || []).map((p: any) => ({
          ...p,
          tipo: 'PROD',
          deletedAt: p.deletedAt ?? null,
        }));
        setProdutos(produtosComTipo);
      }

      // Buscar configurações
      const configRes = await fetch('/api/configuracoes?modo=PROD');
      if (configRes.ok) {
        const data = await configRes.json();
        setConfig(data.configuracao || config);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: {
    produtoId: number;
    quantidadeVendida: number;
    precoVenda: number;
    tipoAnuncio: 'CLASSICO' | 'PREMIUM';
    freteCobrado: number;
    data: Date;
  }) => {
    try {
      const response = await fetch('/api/vendas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          data: Math.floor(data.data.getTime() / 1000), // Converter para timestamp Unix
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        const errorMessage = error.error || 'Erro ao registrar venda';
        
        // Tratamento especial para erro de estoque
        if (errorMessage.includes('Estoque insuficiente') || errorMessage.includes('estoque')) {
          toast({
            title: 'Estoque insuficiente',
            description: errorMessage,
            variant: 'destructive',
          });
          throw new Error(errorMessage);
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();
      
      toast({
        title: 'Sucesso',
        description: `Venda registrada! Lucro: R$ ${result.venda.lucroLiquido.toFixed(2)}`,
      });
      
      setModalAberto(false);
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao registrar venda',
        variant: 'destructive',
      });
      throw error;
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Vendas PROD</h1>
        <div className="flex gap-2">
          <Link href="/prod/vendas/importar">
            <Button variant="outline">
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Importar Excel ML
            </Button>
          </Link>
          <Button onClick={() => setModalAberto(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Registrar Venda
          </Button>
        </div>
      </div>

      <VendaList 
        vendas={vendas} 
        produtos={produtos} 
        loading={loading}
        onDelete={fetchData}
      />

      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar Nova Venda</DialogTitle>
          </DialogHeader>
          <VendaForm
            produtos={produtos}
            config={config}
            onSubmit={handleSubmit}
            onCancel={() => setModalAberto(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
