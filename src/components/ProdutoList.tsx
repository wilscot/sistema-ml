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
import { calcularCustoUnitario } from '@/lib/calculators';
import type { ProdutoLab, ProdutoProd } from '@/types/produto';
import { Pencil, Trash2 } from 'lucide-react';

interface ProdutoListProps {
  modo: 'LAB' | 'PROD';
  produtos: (ProdutoLab | ProdutoProd)[];
  onEdit: (produto: ProdutoLab | ProdutoProd) => void;
  onDelete: (id: number) => void;
}

export function ProdutoList({
  modo,
  produtos,
  onEdit,
  onDelete,
}: ProdutoListProps) {
  const { toast } = useToast();
  const [deletandoId, setDeletandoId] = useState<number | null>(null);

  const handleDelete = async (id: number) => {
    try {
      setDeletandoId(id);
      const response = await fetch(`/api/produtos/${id}?modo=${modo}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao deletar produto');
      }

      toast({
        title: 'Sucesso',
        description: 'Produto deletado com sucesso!',
      });

      onDelete(id);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao deletar produto',
        variant: 'destructive',
      });
    } finally {
      setDeletandoId(null);
    }
  };

  if (produtos.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg">Nenhum produto cadastrado.</p>
        <p className="text-sm">Clique em + para adicionar.</p>
      </div>
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
                <TableHead>Custo Unitário</TableHead>
              </>
            )}
            {modo === 'PROD' && <TableHead>Quantidade</TableHead>}
            <TableHead>Fornecedor</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {produtos.map((produto) => {
            const custoUnitario =
              modo === 'LAB'
                ? calcularCustoUnitario(
                    (produto as ProdutoLab).precoUSD,
                    (produto as ProdutoLab).cotacao,
                    (produto as ProdutoLab).freteTotal,
                    1
                  )
                : null;

            return (
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
                    <TableCell className="font-medium">
                      R$ {custoUnitario?.toFixed(2)}
                    </TableCell>
                  </>
                )}
                {modo === 'PROD' && (
                  <TableCell>{(produto as ProdutoProd).quantidade}</TableCell>
                )}
                <TableCell>{produto.fornecedor || '-'}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(produto)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
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
                          <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja deletar o produto "{produto.nome}"?
                            Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(produto.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Deletar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
