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
import { Badge } from '@/components/ui/badge';
import type { ProdutoLab, ProdutoProd } from '@/types/produto';
import { Pencil, Trash2, Upload } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';

interface ProdutoListProps {
  modo: 'LAB' | 'PROD';
  produtos: (ProdutoLab | ProdutoProd)[];
  onEdit: (produto: ProdutoLab | ProdutoProd) => void;
  onDelete: (id: number) => void;
  loading?: boolean;
}

export function ProdutoList({
  modo,
  produtos,
  onEdit,
  onDelete,
  loading = false,
}: ProdutoListProps) {
  const { toast } = useToast();
  const [deletandoId, setDeletandoId] = useState<number | null>(null);
  const [exportandoId, setExportandoId] = useState<number | null>(null);

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

  const handleExportar = async (produtoLab: ProdutoLab) => {
    try {
      setExportandoId(produtoLab.id);
      const response = await fetch('/api/produtos/migrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ produtoLabId: produtoLab.id }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao exportar produto');
      }

      toast({
        title: 'Sucesso',
        description: 'Produto exportado para PROD!',
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao exportar produto',
        variant: 'destructive',
      });
    } finally {
      setExportandoId(null);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (produtos.length === 0) {
    return (
      <EmptyState
        titulo="Nenhum produto cadastrado"
        descricao="Clique em + para adicionar um novo produto."
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
                <TableHead>Custo Unitário</TableHead>
              </>
            )}
            <TableHead>Fornecedor</TableHead>
            {modo === 'PROD' && <TableHead>Estoque</TableHead>}
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
                <TableCell>{produto.fornecedor || '-'}</TableCell>
                {modo === 'PROD' && (
                  <TableCell>
                    {(produto as ProdutoProd).quantidade === 0 ? (
                      <Badge variant="destructive">Sem estoque</Badge>
                    ) : (
                      (produto as ProdutoProd).quantidade
                    )}
                  </TableCell>
                )}
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {modo === 'LAB' && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={exportandoId === produto.id}
                            title="Exportar para PROD"
                          >
                            <Upload className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Exportar para PROD</AlertDialogTitle>
                            <AlertDialogDescription>
                              Exportar "{produto.nome}" para PROD? O produto original
                              permanecerá em LAB.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleExportar(produto as ProdutoLab)}
                            >
                              Exportar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
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
