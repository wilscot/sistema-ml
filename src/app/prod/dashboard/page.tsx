'use client';

import { useState, useEffect } from 'react';
import { ShoppingCart, DollarSign, TrendingUp } from 'lucide-react';
import { DashboardCard } from '@/components/DashboardCard';

interface DashboardMetrics {
  vendasDoMes: number;
  faturamentoBruto: number;
  lucroLiquido: number;
  variacaoVendas?: number;
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const buscarMetricas = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/dashboard?periodo=mes');
        if (!response.ok) {
          throw new Error('Erro ao buscar métricas');
        }
        const data = await response.json();
        setMetrics(data);
      } catch (err) {
        console.error('Erro ao buscar métricas:', err);
        setError('Erro ao carregar métricas do dashboard');
      } finally {
        setLoading(false);
      }
    };

    buscarMetricas();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
        <div className="text-center py-8">Carregando métricas...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
        <div className="text-center py-8 text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-3">
        <DashboardCard
          titulo="Vendas Este Mês"
          valor={metrics?.vendasDoMes || 0}
          icone={<ShoppingCart className="h-4 w-4" />}
          formatoValor="quantidade"
          variacao={metrics?.variacaoVendas}
        />

        <DashboardCard
          titulo="Faturamento Bruto"
          valor={metrics?.faturamentoBruto || 0}
          icone={<DollarSign className="h-4 w-4" />}
          formatoValor="moeda"
        />

        <DashboardCard
          titulo="Lucro Líquido"
          valor={metrics?.lucroLiquido || 0}
          icone={<TrendingUp className="h-4 w-4" />}
          formatoValor="moeda"
        />
      </div>
    </div>
  );
}
