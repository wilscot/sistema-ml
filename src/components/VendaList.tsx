'use client';

import { useState, useMemo } from 'react';
import { Trash2, Search, X, CheckSquare, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import EmptyState from './EmptyState';
import LoadingSpinner from './LoadingSpinner';
import { useToast } from '@/hooks/use-toast';

import type { Venda } from '@/types/venda';

interface Produto {
  id: number;
  nome: string;
}

interface VendaListProps {
  vendas: Venda[];
  produtos: Produto[];
  loading: boolean;
  onDelete?: () => void;
}

export default function VendaList({ vendas, produtos, loading, onDelete }: VendaListProps) {
  const { toast } = useToast();
  const [deletando, setDeletando] = useState<number | null>(null);
  const [filtroProduto, setFiltroProduto] = useState('');
  const [vendasSelecionadas, setVendasSelecionadas] = useState<Set<number>>(new Set());
  const [deletandoMultiplas, setDeletandoMultiplas] = useState(false);

  // Mapa de produtos para lookup rapido
  const produtosMap = useMemo(() => new Map(produtos.map((p) => [p.id, p])), [produtos]);

  // Filtrar vendas por nome do produto
  const vendasFiltradas = useMemo(() => {
    if (!filtroProduto.trim()) return vendas;
    
    const filtroLower = filtroProduto.toLowerCase().trim();
    return vendas.filter((venda) => {
      const produto = produtosMap.get(venda.produtoId);
      const nomeProduto = (venda as any).produtoNome || produto?.nome || '';
      return nomeProduto.toLowerCase().includes(filtroLower);
    });
  }, [vendas, filtroProduto, produtosMap]);

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja deletar esta venda?\n\nAVISO: O estoque NÃO será restaurado automaticamente!')) {
      return;
    }

    setDeletando(id);
    try {
      const response = await fetch(`/api/vendas/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao deletar venda');
      }

      const data = await response.json();
      
      toast({
        title: 'Venda deletada',
        description: data.warning || 'Venda deletada com sucesso',
        variant: 'default',
      });

      if (onDelete) {
        onDelete();
      }
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao deletar venda',
        variant: 'destructive',
      });
    } finally {
      setDeletando(null);
    }
  };

  const toggleVenda = (id: number) => {
    const novaSelecao = new Set(vendasSelecionadas);
    if (novaSelecao.has(id)) {
      novaSelecao.delete(id);
    } else {
      novaSelecao.add(id);
    }
    setVendasSelecionadas(novaSelecao);
  };

  const toggleTodas = () => {
    if (vendasSelecionadas.size === vendasFiltradas.length && vendasFiltradas.length > 0) {
      setVendasSelecionadas(new Set());
    } else {
      setVendasSelecionadas(new Set(vendasFiltradas.map(v => v.id)));
    }
  };

  const deletarSelecionadas = async () => {
    if (vendasSelecionadas.size === 0) return;
    
    const confirmacao = confirm(
      `Deseja realmente excluir ${vendasSelecionadas.size} venda(s) selecionada(s)?\n\nO estoque sera devolvido aos produtos.`
    );
    
    if (!confirmacao) return;
    
    setDeletandoMultiplas(true);
    
    try {
      const promises = Array.from(vendasSelecionadas).map(id =>
        fetch(`/api/vendas/${id}`, { method: 'DELETE' })
      );
      
      await Promise.all(promises);
      
      toast({
        title: 'Vendas deletadas',
        description: `${vendasSelecionadas.size} venda(s) deletada(s) com sucesso`,
        variant: 'default',
      });
      
      setVendasSelecionadas(new Set());
      
      if (onDelete) {
        onDelete();
      }
    } catch (error) {
      console.error('Erro ao deletar vendas:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao deletar algumas vendas',
        variant: 'destructive',
      });
    } finally {
      setDeletandoMultiplas(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (vendas.length === 0) {
    return (
      <EmptyState
        titulo="Nenhuma venda registrada"
        descricao="Clique em + para adicionar uma nova venda."
      />
    );
  }

  // Calcular totais (das vendas filtradas)
  const totalFaturamento = vendasFiltradas.reduce(
    (acc, v) => acc + v.precoVenda * v.quantidadeVendida,
    0
  );
  const totalLucro = vendasFiltradas.reduce((acc, v) => acc + v.lucroLiquido, 0);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('pt-BR');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatCPF = (cpf: string | null) => {
    if (!cpf) return '-';
    const cleaned = cpf.replace(/\D/g, '');
    if (cleaned.length !== 11) return cpf;
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  return (
    <div>
      {/* Campo de filtro por produto */}
      <div className="mb-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Filtrar por nome do produto..."
            value={filtroProduto}
            onChange={(e) => setFiltroProduto(e.target.value)}
            className="w-full pl-10 pr-10 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
          {filtroProduto && (
            <button
              onClick={() => setFiltroProduto('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              title="Limpar filtro"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {filtroProduto && (
          <p className="mt-2 text-sm text-muted-foreground">
            Mostrando {vendasFiltradas.length} de {vendas.length} vendas
          </p>
        )}
      </div>

      {/* Barra de seleção */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {vendasSelecionadas.size > 0 
              ? `${vendasSelecionadas.size} selecionada(s)`
              : `${vendasFiltradas.length} venda(s)`
            }
          </span>
        </div>
        
        {vendasSelecionadas.size > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={deletarSelecionadas}
            disabled={deletandoMultiplas}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {deletandoMultiplas 
              ? 'Deletando...' 
              : `Excluir ${vendasSelecionadas.size} selecionada(s)`
            }
          </Button>
        )}
      </div>

      <div className="overflow-x-auto border border-border rounded-lg">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-3 text-center w-12">
                <button
                  onClick={toggleTodas}
                  className="hover:opacity-70 transition-opacity"
                  title={vendasSelecionadas.size === vendasFiltradas.length && vendasFiltradas.length > 0 ? 'Desmarcar todas' : 'Selecionar todas'}
                >
                  {vendasSelecionadas.size === vendasFiltradas.length && vendasFiltradas.length > 0 ? (
                    <CheckSquare className="w-5 h-5 text-primary" />
                  ) : (
                    <Square className="w-5 h-5 text-muted-foreground" />
                  )}
                </button>
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                Nº Venda
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                Produto
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                Comprador
              </th>
              <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">
                Qtd
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                Preço Venda
              </th>
              <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">
                Tipo
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                Lucro Líquido
              </th>
              <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">
                Data
              </th>
              <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {vendasFiltradas.length === 0 && filtroProduto && (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">
                  Nenhuma venda encontrada para &quot;{filtroProduto}&quot;
                </td>
              </tr>
            )}
            {vendasFiltradas.map((venda) => {
              const produto = produtosMap.get(venda.produtoId);
              const isLucroPositivo = venda.lucroLiquido > 0;

              return (
                <tr 
                  key={venda.id} 
                  className={`hover:bg-muted/50 transition-colors ${
                    vendasSelecionadas.has(venda.id) ? 'bg-primary/10' : ''
                  }`}
                >
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleVenda(venda.id)}
                      className="hover:opacity-70 transition-opacity"
                    >
                      {vendasSelecionadas.has(venda.id) ? (
                        <CheckSquare className="w-5 h-5 text-primary" />
                      ) : (
                        <Square className="w-5 h-5 text-muted-foreground" />
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {venda.numeroVenda ? (
                      <a
                        href={`https://www.mercadolivre.com.br/vendas/${venda.numeroVenda}/detalhe#source=excel`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline font-mono text-xs"
                        title="Abrir venda no Mercado Livre"
                      >
                        {venda.numeroVenda}
                      </a>
                    ) : (
                      <span className="text-muted-foreground text-xs">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">
                    {(venda as any).produtoNome || produto?.nome || `Produto #${venda.produtoId}`}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {venda.nomeComprador ? (
                      <div className="flex flex-col">
                        <span className="text-foreground font-medium">
                          {venda.nomeComprador}
                        </span>
                        {venda.cpfComprador && (
                          <span className="text-xs text-muted-foreground font-mono">
                            CPF: {venda.cpfComprador.replace(
                              /(\d{3})(\d{3})(\d{3})(\d{2})/,
                              '$1.$2.$3-$4'
                            )}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">
                        Venda manual
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-foreground">
                    {venda.quantidadeVendida}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-foreground">
                    {formatCurrency(venda.precoVenda)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        venda.tipoAnuncio === 'PREMIUM'
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                      }`}
                    >
                      {venda.tipoAnuncio}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`inline-flex px-2 py-1 text-sm font-medium rounded ${
                        isLucroPositivo
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                      }`}
                    >
                      {formatCurrency(venda.lucroLiquido)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-muted-foreground">
                    {formatDate(venda.data)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleDelete(venda.id)}
                      disabled={deletando === venda.id}
                      className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors disabled:opacity-50"
                      title="Deletar venda"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Totalizadores */}
      <div className="mt-4 p-4 bg-muted rounded-lg border border-border">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Total Faturamento</p>
            <p className="text-2xl font-bold text-foreground">
              {formatCurrency(totalFaturamento)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Total Lucro</p>
            <p
              className={`text-2xl font-bold ${
                totalLucro > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              }`}
            >
              {formatCurrency(totalLucro)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
