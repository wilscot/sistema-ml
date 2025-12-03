'use client';

import { useState, useEffect } from 'react';
import { ShoppingCart, DollarSign, TrendingUp, BarChart3 } from 'lucide-react';
import { DashboardCard } from '@/components/DashboardCard';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

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
  
  // States para filtro de mês
  const [mesSelecionado, setMesSelecionado] = useState<Date>(new Date());
  const [vendasMes, setVendasMes] = useState<any[]>([]);
  const [loadingVendasMes, setLoadingVendasMes] = useState(false);
  const [metricasMes, setMetricasMes] = useState({
    totalVendas: 0,
    faturamento: 0,
    lucro: 0,
    ticketMedio: 0,
  });
  const [mesesComVendas, setMesesComVendas] = useState<string[]>([]);
  const [mesAtual, setMesAtual] = useState<Date>(new Date());
  const [temVendasMesAtual, setTemVendasMesAtual] = useState(false);

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

  // Buscar meses que têm vendas
  useEffect(() => {
    const buscarMesesComVendas = async () => {
      try {
        const response = await fetch('/api/vendas/meses-disponiveis');
        if (!response.ok) throw new Error('Erro ao buscar meses');
        
        const data = await response.json();
        const meses = data.meses || []; // Array de 'YYYY-MM'
        
        setMesesComVendas(meses);
        
        // Se há vendas, selecionar o mês mais recente
        if (meses.length > 0) {
          const mesRecente = meses[0]; // Já vem ordenado DESC
          const [ano, mes] = mesRecente.split('-');
          setMesSelecionado(new Date(parseInt(ano), parseInt(mes) - 1, 1));
        }
      } catch (error) {
        console.error('Erro ao buscar meses:', error);
      }
    };
    
    buscarMesesComVendas();
  }, []);

  // Verificar se mês atual tem vendas e ajustar mesAtual
  useEffect(() => {
    // Verificar se mês atual tem vendas
    const mesAtualFormatado = format(new Date(), 'yyyy-MM');
    const temVendas = mesesComVendas.includes(mesAtualFormatado);
    
    setTemVendasMesAtual(temVendas);
    
    // Se não tem vendas no mês atual, usar último mês com vendas
    if (!temVendas && mesesComVendas.length > 0) {
      const [ano, mes] = mesesComVendas[0].split('-');
      setMesAtual(new Date(parseInt(ano), parseInt(mes) - 1, 1));
    } else {
      setMesAtual(new Date());
    }
  }, [mesesComVendas]);

  // Função para gerar lista de meses (apenas meses com vendas)
  const gerarListaMeses = () => {
    return mesesComVendas.map((mesAno) => {
      const [ano, mes] = mesAno.split('-');
      const data = new Date(parseInt(ano), parseInt(mes) - 1, 1);
      
      return {
        value: mesAno,
        label: format(data, 'MMMM yyyy', { locale: ptBR }),
        data: data,
      };
    });
  };

  const mesesDisponiveis = gerarListaMeses();

  // useEffect para buscar vendas do mês selecionado
  useEffect(() => {
    const buscarVendasMes = async () => {
      setLoadingVendasMes(true);
      
      try {
        const inicioMes = Math.floor(startOfMonth(mesSelecionado).getTime() / 1000);
        const fimMes = Math.floor(endOfMonth(mesSelecionado).getTime() / 1000);
        
        const response = await fetch(
          `/api/vendas?dataInicio=${inicioMes}&dataFim=${fimMes}`
        );
        
        if (!response.ok) throw new Error('Erro ao buscar vendas');
        
        const data = await response.json();
        const vendas = data.vendas || [];
        
        setVendasMes(vendas);
        
        // Calcular métricas do mês
        const totalVendas = vendas.length;
        const faturamento = vendas.reduce(
          (acc: number, v: any) => acc + (v.precoVenda * v.quantidadeVendida),
          0
        );
        const lucro = vendas.reduce(
          (acc: number, v: any) => acc + v.lucroLiquido,
          0
        );
        const ticketMedio = totalVendas > 0 ? faturamento / totalVendas : 0;
        
        setMetricasMes({
          totalVendas,
          faturamento,
          lucro,
          ticketMedio,
        });
      } catch (error) {
        console.error('Erro ao buscar vendas do mês:', error);
      } finally {
        setLoadingVendasMes(false);
      }
    };
    
    buscarVendasMes();
  }, [mesSelecionado]);

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
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          {temVendasMesAtual 
            ? `Métricas de ${format(mesAtual, 'MMMM yyyy', { locale: ptBR })}`
            : mesesComVendas.length > 0
            ? `Últimas vendas registradas em ${format(mesAtual, 'MMMM yyyy', { locale: ptBR })}`
            : 'Nenhuma venda registrada'
          }
        </p>
      </div>

      {mesesComVendas.length === 0 ? (
        <Card className="col-span-full">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ShoppingCart className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhuma venda registrada</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Comece importando vendas do Mercado Livre ou registrando vendas manualmente.
            </p>
            <div className="flex gap-2">
              <Button asChild variant="outline">
                <Link href="/prod/vendas">Registrar Venda</Link>
              </Button>
              <Button asChild>
                <Link href="/prod/vendas/importar">Importar do ML</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
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

          {/* SEPARADOR */}
          <div className="border-t my-8" />

      {/* SEÇÃO: VENDAS POR MÊS */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Vendas por Mês
            </h2>
            <p className="text-muted-foreground">
              Visualize vendas de meses anteriores
            </p>
          </div>
          
          <div className="w-64">
            <Select
              value={format(mesSelecionado, 'yyyy-MM')}
              onValueChange={(value) => {
                const mes = mesesDisponiveis.find((m) => m.value === value);
                if (mes) setMesSelecionado(mes.data);
              }}
              disabled={mesesDisponiveis.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={
                  mesesDisponiveis.length === 0 
                    ? "Nenhuma venda registrada" 
                    : undefined
                } />
              </SelectTrigger>
              <SelectContent>
                {mesesDisponiveis.length === 0 ? (
                  <SelectItem value="empty" disabled>
                    Nenhum mês disponível
                  </SelectItem>
                ) : (
                  mesesDisponiveis.map((mes) => (
                    <SelectItem key={mes.value} value={mes.value}>
                      {mes.label}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* CARDS DE MÉTRICAS DO MÊS SELECIONADO */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Vendas no Mês
              </CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loadingVendasMes ? '...' : metricasMes.totalVendas}
              </div>
              <p className="text-xs text-muted-foreground">
                {format(mesSelecionado, 'MMMM yyyy', { locale: ptBR })}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Faturamento
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loadingVendasMes ? '...' : `R$ ${metricasMes.faturamento.toFixed(2)}`}
              </div>
              <p className="text-xs text-muted-foreground">
                Receita total do mês
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Lucro Líquido
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${
                metricasMes.lucro >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {loadingVendasMes ? '...' : `R$ ${metricasMes.lucro.toFixed(2)}`}
              </div>
              <p className="text-xs text-muted-foreground">
                Lucro do mês
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Ticket Médio
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loadingVendasMes ? '...' : `R$ ${metricasMes.ticketMedio.toFixed(2)}`}
              </div>
              <p className="text-xs text-muted-foreground">
                Por venda
              </p>
            </CardContent>
          </Card>
        </div>

        {/* TABELA DE VENDAS DO MÊS */}
        <Card>
          <CardHeader>
            <CardTitle>
              Detalhes das Vendas - {format(mesSelecionado, 'MMMM yyyy', { locale: ptBR })}
            </CardTitle>
            <CardDescription>
              {vendasMes.length} venda(s) encontrada(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingVendasMes ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner size="lg" />
              </div>
            ) : vendasMes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma venda neste mês
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium">Data</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Nº Venda</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Comprador</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Produto</th>
                      <th className="px-4 py-3 text-center text-sm font-medium">Qtd</th>
                      <th className="px-4 py-3 text-right text-sm font-medium">Preço</th>
                      <th className="px-4 py-3 text-right text-sm font-medium">Lucro</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {vendasMes.map((venda) => (
                      <tr key={venda.id} className="hover:bg-muted/50">
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {new Date(venda.data * 1000).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-4 py-3 text-sm font-mono">
                          {venda.numeroVenda ? (
                            <a
                              href={`https://www.mercadolivre.com.br/vendas/${venda.numeroVenda}/detalhe#source=excel`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              {venda.numeroVenda}
                            </a>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {venda.nomeComprador || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="max-w-xs">
                            {venda.produtoNome ? (
                              <div>
                                <p className="font-medium truncate" title={venda.produtoNome}>
                                  {venda.produtoNome}
                                </p>
                                {venda.produtoFornecedor && (
                                  <p className="text-xs text-muted-foreground truncate">
                                    {venda.produtoFornecedor}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">
                                Produto #{venda.produtoId}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center text-sm">
                          {venda.quantidadeVendida}
                        </td>
                        <td className="px-4 py-3 text-right text-sm">
                          R$ {venda.precoVenda.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm">
                          <span className={venda.lucroLiquido >= 0 ? 'text-green-600' : 'text-red-600'}>
                            R$ {venda.lucroLiquido.toFixed(2)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-muted font-medium">
                    <tr>
                      <td colSpan={5} className="px-4 py-3 text-right text-sm">
                        TOTAL:
                      </td>
                      <td className="px-4 py-3 text-right text-sm">
                        R$ {metricasMes.faturamento.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm">
                        <span className={metricasMes.lucro >= 0 ? 'text-green-600' : 'text-red-600'}>
                          R$ {metricasMes.lucro.toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
        </>
      )}
    </div>
  );
}
