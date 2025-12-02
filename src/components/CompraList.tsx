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
import type { Compra } from '@/types/compra';
import type { ProdutoProd } from '@/types/produto';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import LoadingSpinner from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';

interface CompraListProps {
  compras: Compra[];
  loading?: boolean;
}

export function CompraList({ compras, loading = false }: CompraListProps) {
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
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
