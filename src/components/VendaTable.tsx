'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Trash2, Eye } from 'lucide-react';
import { calcularCustoTotal } from '@/lib/calculators';
import type { Venda, Produto } from '@/db/schema';

interface VendaTableProps {
  vendas: (Venda & { produto: Produto })[];
  onDelete: (ids: number[]) => Promise<void>;
  loading?: boolean;
}

export default function VendaTable({
  vendas,
  onDelete,
  loading = false,
}: VendaTableProps) {
  const [vendasSelecionadas, setVendasSelecionadas] = useState<Set<number>>(
    new Set()
  );
  const [selectAll, setSelectAll] = useState(false);

  useEffect(() => {
    if (vendasSelecionadas.size === vendas.length && vendas.length > 0) {
      setSelectAll(true);
    } else {
      setSelectAll(false);
    }
  }, [vendasSelecionadas, vendas.length]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (timestamp: Date | null) => {
    if (!timestamp) return '-';
    try {
      return format(new Date(timestamp), 'dd/MM/yyyy');
    } catch {
      return '-';
    }
  };

  const toggleVenda = (id: number) => {
    const newSet = new Set(vendasSelecionadas);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setVendasSelecionadas(newSet);
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setVendasSelecionadas(new Set());
    } else {
      setVendasSelecionadas(new Set(vendas.map((v) => v.id)));
    }
    setSelectAll(!selectAll);
  };

  const handleDeleteSelected = async () => {
    const ids = Array.from(vendasSelecionadas);
    if (ids.length > 0) {
      await onDelete(ids);
      setVendasSelecionadas(new Set());
    }
  };

  const handleDeleteSingle = async (id: number) => {
    if (!id || isNaN(id)) {
      return;
    }
    await onDelete([id]);
    setVendasSelecionadas((prev) => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  };

  const numSelecionadas = vendasSelecionadas.size;
  const podeDeletar = numSelecionadas > 0 && !loading;

  return (
    <div className="space-y-4">
      {numSelecionadas > 0 && (
        <div className="bg-primary/10 border border-primary rounded-lg p-4 flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">
            {numSelecionadas} venda(s) selecionada(s)
          </span>
          <button
            type="button"
            onClick={handleDeleteSelected}
            disabled={!podeDeletar}
            className="px-4 py-2 text-sm font-medium bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Excluir Selecionadas
          </button>
        </div>
      )}

      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={toggleSelectAll}
                  disabled={loading || vendas.length === 0}
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                Data
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                Produto
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                Qtd
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                Preço
              </th>
              <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">
                Tipo
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                Taxa ML
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                Lucro Bruto
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                Lucro Líquido
              </th>
              <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground w-20">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {vendas.map((venda) => {
              const isSelected = vendasSelecionadas.has(venda.id);
              const podeDeletarVenda = !loading;

              // Calcular custo do produto (se disponível, senão usar lucroLiquido já calculado)
              const precoUSD = (venda.produto as any).precoUSD;
              const cotacao = (venda.produto as any).cotacao;
              const freteTotal = (venda.produto as any).freteTotal;
              const moeda = ((venda.produto as any).moeda as 'USD' | 'BRL') || 'USD';
              
              const temDadosCusto = precoUSD !== undefined && cotacao !== undefined && freteTotal !== undefined;
              
              const custoUnitario = temDadosCusto
                ? calcularCustoTotal(
                    precoUSD,
                    cotacao,
                    freteTotal,
                    venda.produto.quantidade || 1,
                    moeda
                  )
                : 0;
              const custoTotal = temDadosCusto ? custoUnitario * venda.quantidadeVendida : 0;
              const lucroLiquido = temDadosCusto ? venda.lucroLiquido - custoTotal : venda.lucroLiquido;

              return (
                <tr
                  key={venda.id}
                  className={`hover:bg-muted/50 ${isSelected ? 'bg-primary/5' : ''}`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleVenda(venda.id)}
                      disabled={!podeDeletarVenda}
                      className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">
                    {formatDate(venda.data)}
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">
                    {venda.produto.nome}
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground text-right">
                    {venda.quantidadeVendida}
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground text-right">
                    {formatCurrency(venda.precoVenda)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded ${
                        venda.tipoAnuncio === 'CLASSICO'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                          : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                      }`}
                    >
                      {venda.tipoAnuncio}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground text-right">
                    {formatCurrency(venda.taxaML)}
                  </td>
                  <td
                    className={`px-4 py-3 text-sm font-medium text-right ${
                      venda.lucroLiquido >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {formatCurrency(venda.lucroLiquido)}
                  </td>
                  <td
                    className={`px-4 py-3 text-sm font-bold text-right ${
                      lucroLiquido >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {formatCurrency(lucroLiquido)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Link
                        href={`/vendas/${venda.id}`}
                        className="p-2 text-primary hover:bg-primary/10 rounded-md transition-colors"
                        title="Ver detalhes"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDeleteSingle(venda.id)}
                        disabled={!podeDeletarVenda}
                        className="p-2 text-destructive hover:bg-destructive/10 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Excluir venda"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

