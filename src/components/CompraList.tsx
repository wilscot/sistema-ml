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
import { Trash2, Pencil } from 'lucide-react';
import type { Compra } from '@/types/compra';
import type { ProdutoProd } from '@/types/produto';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import LoadingSpinner from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import { CompraEditDialog } from './CompraEditDialog';

interface CompraListProps {
  compras: Compra[];
  loading?: boolean;
  onDelete?: () => void;
  onUpdate?: () => void;
}

export function CompraList({ compras, loading = false, onDelete, onUpdate }: CompraListProps) {
  const [produtos, setProdutos] = useState<Record<number, ProdutoProd>>({});
  const [compraEditando, setCompraEditando] = useState<Compra | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

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
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nº Compra</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead>Qtd Comprada</TableHead>
              <TableHead>Qtd Disponível</TableHead>
              <TableHead>Status Entrega</TableHead>
              <TableHead>Custo Unitário</TableHead>
              <TableHead>Data Compra</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead className="text-center">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {compras.map((compra) => {
              const produto = produtos[compra.produtoId];
              const produtoNome = produto?.nome || `Produto #${compra.produtoId}`;

              const quantidadeRecebida = compra.quantidadeRecebida || 0;
              const statusEntrega = 
                quantidadeRecebida === 0 ? 'pendente' :
                quantidadeRecebida >= compra.quantidadeComprada ? 'completo' : 'parcial';

              return (
                <TableRow key={compra.id}>
                  <TableCell>
                    <a 
                      href={`/prod/compras/${compra.id}`}
                      className="text-primary hover:underline font-mono text-sm font-semibold"
                    >
                      {compra.numeroCompra || `#${compra.id}`}
                    </a>
                  </TableCell>
                  <TableCell className="font-medium">{produtoNome}</TableCell>
                  <TableCell>{compra.quantidadeComprada}</TableCell>
                  <TableCell>
                    {compra.quantidadeDisponivel === 0 ? (
                      <Badge variant="destructive">Esgotada</Badge>
                    ) : (
                      compra.quantidadeDisponivel
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{quantidadeRecebida}/{compra.quantidadeComprada}</span>
                      {statusEntrega === 'pendente' && (
                        <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 text-xs rounded-full">
                          Pendente
                        </span>
                      )}
                      {statusEntrega === 'parcial' && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs rounded-full">
                          Parcial
                        </span>
                      )}
                      {statusEntrega === 'completo' && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs rounded-full">
                          Completo
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{formatarMoeda(compra.custoUnitario)}</TableCell>
                  <TableCell>{formatarData(compra.dataCompra)}</TableCell>
                  <TableCell>{compra.fornecedor || '-'}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex gap-2 justify-center">
                      {/* Botão Editar */}
                      <button
                        onClick={() => {
                          setCompraEditando(compra);
                          setDialogOpen(true);
                        }}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                        title="Editar compra"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      
                      {/* Botão Excluir */}
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
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Dialog de Edição */}
      <CompraEditDialog
        compra={compraEditando}
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setCompraEditando(null);
        }}
        onSuccess={() => {
          if (onUpdate) {
            onUpdate();
          } else if (onDelete) {
            onDelete();
          } else {
            window.location.reload();
          }
        }}
        produtoNome={compraEditando ? produtos[compraEditando.produtoId]?.nome : undefined}
      />
    </>
  );
}
