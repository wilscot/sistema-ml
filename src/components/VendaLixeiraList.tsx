'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { RotateCcw } from 'lucide-react';
import EmptyState from './EmptyState';
import LoadingSpinner from './LoadingSpinner';
import type { Venda } from '@/types/venda';
import type { ProdutoProd } from '@/types/produto';

interface VendaLixeiraListProps {
  vendas: Venda[];
  produtos: ProdutoProd[];
  onRestore: () => void;
  loading?: boolean;
}

export function VendaLixeiraList({
  vendas,
  produtos,
  onRestore,
  loading = false,
}: VendaLixeiraListProps) {
  const { toast } = useToast();
  const [restaurandoId, setRestaurandoId] = useState<number | null>(null);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
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

  const handleRestore = async (id: number, numeroVenda: string | null) => {
    try {
      setRestaurandoId(id);
      const response = await fetch(`/api/vendas/${id}/restaurar`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao restaurar venda');
      }

      toast({
        title: 'Sucesso',
        description: `Venda ${numeroVenda || `#${id}`} restaurada!`,
      });

      onRestore();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao restaurar venda',
        variant: 'destructive',
      });
    } finally {
      setRestaurandoId(null);
    }
  };

  // Mapa de produtos para lookup rápido
  const produtosMap = new Map(produtos.map((p) => [p.id, p]));

  if (loading) {
    return <LoadingSpinner />;
  }

  if (vendas.length === 0) {
    return (
      <EmptyState
        titulo="Nenhuma venda deletada"
        descricao="Não há vendas na lixeira."
      />
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nº Venda</TableHead>
            <TableHead>Produto</TableHead>
            <TableHead>Comprador</TableHead>
            <TableHead className="text-center">Qtd</TableHead>
            <TableHead className="text-right">Preço Venda</TableHead>
            <TableHead className="text-right">Lucro Líquido</TableHead>
            <TableHead>Data Venda</TableHead>
            <TableHead>Data Deletado</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {vendas.map((venda) => {
            const produto = produtosMap.get(venda.produtoId);
            return (
              <TableRow key={venda.id}>
                <TableCell className="font-medium">
                  {venda.numeroVenda ? (
                    <a
                      href={`https://www.mercadolivre.com.br/vendas/${venda.numeroVenda}/detalhe#source=excel`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
                    >
                      {venda.numeroVenda}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {(venda as any).produtoNome || produto?.nome || `Produto #${venda.produtoId}`}
                </TableCell>
                <TableCell>
                  {venda.nomeComprador || venda.cpfComprador ? (
                    <div>
                      <div className="font-medium">{venda.nomeComprador || '-'}</div>
                      {venda.cpfComprador && (
                        <div className="text-xs text-muted-foreground">
                          {formatCPF(venda.cpfComprador)}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-center">{venda.quantidadeVendida}</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(venda.precoVenda)}
                </TableCell>
                <TableCell className="text-right">
                  <span
                    className={`inline-flex px-2 py-1 text-sm font-medium rounded ${
                      venda.lucroLiquido > 0
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                    }`}
                  >
                    {formatCurrency(venda.lucroLiquido)}
                  </span>
                </TableCell>
                <TableCell>{formatDate(venda.data)}</TableCell>
                <TableCell>
                  {venda.deletedAt ? formatDate(venda.deletedAt) : '-'}
                </TableCell>
                <TableCell className="text-right">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={restaurandoId === venda.id}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Restaurar venda {venda.numeroVenda || `#${venda.id}`}?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          A venda será restaurada e voltará a aparecer na lista de vendas.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleRestore(venda.id, venda.numeroVenda)}
                          disabled={restaurandoId === venda.id}
                        >
                          {restaurandoId === venda.id
                            ? 'Restaurando...'
                            : 'Restaurar'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

