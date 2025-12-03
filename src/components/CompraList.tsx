'use client';

import { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Trash2 } from 'lucide-react';
import type { Compra } from '@/types/compra';
import type { ProdutoProd } from '@/types/produto';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import LoadingSpinner from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';

interface CompraListProps {
  compras: Compra[];
  loading?: boolean;
  onDelete?: () => void;
}

export function CompraList({ compras, loading = false, onDelete }: CompraListProps) {
  const [produtos, setProdutos] = useState<Record<number, ProdutoProd>>({});

  useEffect(() => {
    const buscarProdutos = async () => {
      try {
        const response = await fetch('/api/produtos?modo=PROD');
        if (!response.ok) return;
        const data = await response.json();
        const produtosMap: Record<number, ProdutoProd> = {};
        (data.produtos || []).forEach((produto: ProdutoProd) => {
          produtosMap[produto.id] = produto;
        });
        setProdutos(produtosMap);
      } catch (error) {
        console.error('Erro ao buscar produtos:', error);
      }
    };

    buscarProdutos();
  }, []);

  const formatarData = (timestamp: number) => {
    try {
      return format(new Date(timestamp * 1000), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return '-';
    }
  };

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor);
  };

  const truncarTexto = (texto: string | null, maxLength: number = 50) => {
    if (!texto) return '-';
    if (texto.length <= maxLength) return texto;
    return texto.substring(0, maxLength) + '...';
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (compras.length === 0) {
    return (
      <EmptyState
        titulo="Nenhuma compra registrada"
        descricao="Clique em + para adicionar uma nova compra."
      />
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Produto</TableHead>
            <TableHead>Qtd Comprada</TableHead>
            <TableHead>Qtd Disponível</TableHead>
            <TableHead>Custo Unitário</TableHead>
            <TableHead>Data Compra</TableHead>
            <TableHead>Fornecedor</TableHead>
            <TableHead>Observações</TableHead>
            <TableHead className="text-center">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {compras.map((compra) => {
            const produto = produtos[compra.produtoId];
            const produtoNome = produto?.nome || `Produto #${compra.produtoId}`;

            return (
              <TableRow key={compra.id}>
                <TableCell className="font-medium">{produtoNome}</TableCell>
                <TableCell>{compra.quantidadeComprada}</TableCell>
                <TableCell>
                  {compra.quantidadeDisponivel === 0 ? (
                    <Badge variant="destructive">Esgotada</Badge>
                  ) : (
                    compra.quantidadeDisponivel
                  )}
                </TableCell>
                <TableCell>{formatarMoeda(compra.custoUnitario)}</TableCell>
                <TableCell>{formatarData(compra.dataCompra)}</TableCell>
                <TableCell>{compra.fornecedor || '-'}</TableCell>
                <TableCell className="max-w-[200px]">
                  {truncarTexto(compra.observacoes)}
                </TableCell>
                <TableCell className="text-center">
                  <button
                    onClick={async () => {
                      if (!confirm('Tem certeza que deseja excluir esta compra?\n\nEla será movida para a lixeira.')) {
                        return;
                      }
                      
                      try {
                        const res = await fetch(`/api/compras/${compra.id}`, {
                          method: 'DELETE'
                        });
                        
                        if (!res.ok) {
                          const error = await res.json();
                          throw new Error(error.error || 'Erro ao excluir');
                        }
                        
                        if (onDelete) {
                          onDelete();
                        } else {
                          window.location.reload();
                        }
                      } catch (error: any) {
                        alert(error.message || 'Erro ao excluir compra');
                      }
                    }}
                    className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                    title="Excluir compra"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
