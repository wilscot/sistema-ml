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
import { RotateCcw, Trash2 } from 'lucide-react';
import type { ProdutoLab, ProdutoProd } from '@/types/produto';
import EmptyState from './EmptyState';
import LoadingSpinner from './LoadingSpinner';

interface LixeiraListProps {
  modo: 'LAB' | 'PROD';
  produtos: (ProdutoLab | ProdutoProd)[];
  onRestore: (id: number) => void;
  onDeletePermanent: (id: number) => void;
  loading?: boolean;
}

export function LixeiraList({
  modo,
  produtos,
  onRestore,
  onDeletePermanent,
  loading = false,
}: LixeiraListProps) {
  const { toast } = useToast();
  const [restaurandoId, setRestaurandoId] = useState<number | null>(null);
  const [deletandoId, setDeletandoId] = useState<number | null>(null);

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

  const handleRestore = async (id: number, nome: string) => {
    try {
      setRestaurandoId(id);
      const response = await fetch(
        `/api/produtos/${id}/restaurar?modo=${modo}`,
        {
          method: 'PATCH',
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao restaurar produto');
      }

      toast({
        title: 'Sucesso',
        description:
          modo === 'LAB'
            ? `Produto "${nome}" restaurado!`
            : `Produto "${nome}" movido para LAB!`,
      });

      onRestore(id);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao restaurar produto',
        variant: 'destructive',
      });
    } finally {
      setRestaurandoId(null);
    }
  };

  const handleDeletePermanent = async (id: number, nome: string) => {
    try {
      setDeletandoId(id);
      const response = await fetch(
        `/api/produtos/${id}/permanente?modo=${modo}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao deletar permanentemente');
      }

      toast({
        title: 'Sucesso',
        description: `Produto "${nome}" deletado permanentemente!`,
      });

      onDeletePermanent(id);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao deletar permanentemente',
        variant: 'destructive',
      });
    } finally {
      setDeletandoId(null);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (produtos.length === 0) {
    return (
      <EmptyState
        titulo="Lixeira vazia"
        descricao="Não há produtos deletados."
      />
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            {modo === 'LAB' && (
              <>
                <TableHead>Preço USD</TableHead>
                <TableHead>Cotação</TableHead>
                <TableHead>Frete Total</TableHead>
              </>
            )}
            {modo === 'PROD' && <TableHead>Estoque</TableHead>}
            <TableHead>Fornecedor</TableHead>
            <TableHead>Data Deletado</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {produtos.map((produto) => (
            <TableRow key={produto.id}>
              <TableCell className="font-medium">{produto.nome}</TableCell>
              {modo === 'LAB' && (
                <>
                  <TableCell>
                    ${(produto as ProdutoLab).precoUSD.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    R$ {(produto as ProdutoLab).cotacao.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    R$ {(produto as ProdutoLab).freteTotal.toFixed(2)}
                  </TableCell>
                </>
              )}
              {modo === 'PROD' && (
                <TableCell>{(produto as ProdutoProd).quantidade}</TableCell>
              )}
              <TableCell>{produto.fornecedor || '-'}</TableCell>
              <TableCell>
                {produto.deletedAt ? formatDate(produto.deletedAt) : '-'}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={restaurandoId === produto.id}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          {modo === 'LAB'
                            ? `Restaurar "${produto.nome}"?`
                            : `Mover "${produto.nome}" para LAB?`}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          {modo === 'LAB'
                            ? `O produto "${produto.nome}" será restaurado e voltará a aparecer na lista de produtos LAB.`
                            : `O produto "${produto.nome}" será copiado para LAB. O produto original permanecerá deletado em PROD.`}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleRestore(produto.id, produto.nome)}
                          disabled={restaurandoId === produto.id}
                        >
                          {restaurandoId === produto.id
                            ? 'Restaurando...'
                            : modo === 'LAB'
                            ? 'Restaurar'
                            : 'Mover para LAB'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={deletandoId === produto.id}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Deletar "{produto.nome}" PERMANENTEMENTE?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação não pode ser desfeita. O produto será
                          removido permanentemente do sistema.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() =>
                            handleDeletePermanent(produto.id, produto.nome)
                          }
                          disabled={deletandoId === produto.id}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {deletandoId === produto.id
                            ? 'Deletando...'
                            : 'Deletar Permanentemente'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
