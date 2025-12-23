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
import { RotateCcw, Trash2, CheckSquare, Square } from 'lucide-react';
import EmptyState from './EmptyState';
import LoadingSpinner from './LoadingSpinner';
import type { Venda } from '@/types/venda';
import type { ProdutoProd } from '@/types/produto';

interface VendaLixeiraListProps {
  vendas: Venda[];
  produtos: ProdutoProd[];
  onRestore: () => void;
  onDeletePermanent?: () => void;
  loading?: boolean;
}

export function VendaLixeiraList({
  vendas,
  produtos,
  onRestore,
  onDeletePermanent,
  loading = false,
}: VendaLixeiraListProps) {
  const { toast } = useToast();
  const [restaurandoId, setRestaurandoId] = useState<number | null>(null);
  const [deletandoId, setDeletandoId] = useState<number | null>(null);
  const [vendasSelecionadas, setVendasSelecionadas] = useState<Set<number>>(new Set());
  const [deletandoMultiplas, setDeletandoMultiplas] = useState(false);

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

  const handleDeletePermanent = async (id: number, numeroVenda: string | null) => {
    try {
      setDeletandoId(id);
      const response = await fetch(`/api/vendas/${id}/excluir-permanente`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao excluir venda');
      }

      toast({
        title: 'Venda excluída',
        description: `Venda ${numeroVenda || `#${id}`} foi excluída permanentemente.`,
      });

      if (onDeletePermanent) {
        onDeletePermanent();
      } else {
        onRestore();
      }
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao excluir venda',
        variant: 'destructive',
      });
    } finally {
      setDeletandoId(null);
    }
  };

  // Mapa de produtos para lookup rápido
  const produtosMap = new Map(produtos.map((p) => [p.id, p]));

  // Toggle seleção individual
  const toggleVenda = (id: number) => {
    const novaSelecao = new Set(vendasSelecionadas);
    if (novaSelecao.has(id)) {
      novaSelecao.delete(id);
    } else {
      novaSelecao.add(id);
    }
    setVendasSelecionadas(novaSelecao);
  };

  // Toggle selecionar/desmarcar todas
  const toggleTodas = () => {
    if (vendasSelecionadas.size === vendas.length && vendas.length > 0) {
      setVendasSelecionadas(new Set());
    } else {
      setVendasSelecionadas(new Set(vendas.map((v) => v.id)));
    }
  };

  // Excluir múltiplas permanentemente
  const excluirMultiplasPermanentemente = async () => {
    if (vendasSelecionadas.size === 0) return;

    setDeletandoMultiplas(true);

    try {
      const resultados = await Promise.allSettled(
        Array.from(vendasSelecionadas).map(id =>
          fetch(`/api/vendas/${id}/excluir-permanente`, {
            method: 'DELETE'
          })
        )
      );

      const sucesso = resultados.filter(r => r.status === 'fulfilled').length;
      const falha = resultados.filter(r => r.status === 'rejected').length;

      if (sucesso > 0) {
        toast({
          title: 'Vendas excluídas',
          description: `${sucesso} venda(s) excluída(s) permanentemente${falha > 0 ? `. ${falha} falharam.` : '.'}`,
        });
      }

      setVendasSelecionadas(new Set());
      
      if (onDeletePermanent) {
        onDeletePermanent();
      } else {
        onRestore();
      }
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao excluir vendas',
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
        titulo="Nenhuma venda deletada"
        descricao="Não há vendas na lixeira."
      />
    );
  }

  return (
    <div>
      {/* Barra de seleção múltipla */}
      {vendasSelecionadas.size > 0 && (
        <div className="flex items-center justify-between mb-4 p-3 bg-muted rounded-lg">
          <span className="text-sm font-medium">
            {vendasSelecionadas.size} venda(s) selecionada(s)
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setVendasSelecionadas(new Set())}
            >
              Limpar seleção
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={deletandoMultiplas}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {deletandoMultiplas
                    ? 'Excluindo...'
                    : `Excluir ${vendasSelecionadas.size} permanentemente`
                  }
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-red-600">
                    Excluir {vendasSelecionadas.size} venda(s) permanentemente?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    <span className="font-bold text-red-600">ATENÇÃO: Esta ação é IRREVERSÍVEL!</span>
                    <br /><br />
                    {vendasSelecionadas.size} venda(s) serão excluídas permanentemente do banco de dados.
                    <br /><br />
                    O estoque NÃO será alterado.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={excluirMultiplasPermanentemente}
                    disabled={deletandoMultiplas}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {deletandoMultiplas
                      ? 'Excluindo...'
                      : 'Excluir Permanentemente'
                    }
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-center">
                <button
                  onClick={toggleTodas}
                  className="hover:opacity-70 transition-opacity"
                  title={vendasSelecionadas.size === vendas.length && vendas.length > 0 ? 'Desmarcar todas' : 'Selecionar todas'}
                >
                  {vendasSelecionadas.size === vendas.length && vendas.length > 0 ? (
                    <CheckSquare className="w-5 h-5 text-primary" />
                  ) : (
                    <Square className="w-5 h-5 text-muted-foreground" />
                  )}
                </button>
              </TableHead>
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
              <TableRow 
                key={venda.id}
                className={vendasSelecionadas.has(venda.id) ? 'bg-primary/10' : ''}
              >
                <TableCell className="text-center">
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
                </TableCell>
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
                  <div className="flex gap-1 justify-end">
                    {/* Restaurar */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={restaurandoId === venda.id || deletandoId === venda.id}
                          title="Restaurar venda"
                        >
                          <RotateCcw className="h-4 w-4 text-green-600" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Restaurar venda {venda.numeroVenda || `#${venda.id}`}?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            A venda será restaurada e o estoque será removido do produto.
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

                    {/* Excluir Permanente */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={restaurandoId === venda.id || deletandoId === venda.id}
                          title="Excluir permanentemente"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-red-600">
                            Excluir permanentemente?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            <span className="font-bold text-red-600">ATENÇÃO: Esta ação é IRREVERSÍVEL!</span>
                            <br /><br />
                            A venda {venda.numeroVenda || `#${venda.id}`} será excluída permanentemente do banco de dados.
                            <br /><br />
                            O estoque NÃO será alterado (já foi devolvido quando a venda foi movida para lixeira).
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeletePermanent(venda.id, venda.numeroVenda)}
                            disabled={deletandoId === venda.id}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            {deletandoId === venda.id
                              ? 'Excluindo...'
                              : 'Excluir Permanentemente'}
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
    </div>
  );
}

