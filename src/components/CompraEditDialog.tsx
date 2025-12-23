'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { calcularCustoUnitario } from '@/lib/calculators';
import type { Compra } from '@/types/compra';

interface CompraEditDialogProps {
  compra: Compra | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  produtoNome?: string;
}

export function CompraEditDialog({
  compra,
  open,
  onClose,
  onSuccess,
  produtoNome,
}: CompraEditDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Form state
  const [precoUSD, setPrecoUSD] = useState<number | ''>('');
  const [cotacao, setCotacao] = useState<number | ''>('');
  const [freteTotal, setFreteTotal] = useState<number | ''>('');
  const [quantidadeComprada, setQuantidadeComprada] = useState<number | ''>('');
  const [fornecedor, setFornecedor] = useState('');
  const [observacoes, setObservacoes] = useState('');

  // Quantidade já vendida (não pode reduzir abaixo disso)
  const quantidadeVendida = compra 
    ? compra.quantidadeComprada - compra.quantidadeDisponivel 
    : 0;

  // Carregar dados da compra quando abrir
  useEffect(() => {
    if (compra && open) {
      setPrecoUSD(compra.precoUSD);
      setCotacao(compra.cotacao);
      setFreteTotal(compra.freteTotal);
      setQuantidadeComprada(compra.quantidadeComprada);
      setFornecedor(compra.fornecedor || '');
      setObservacoes(compra.observacoes || '');
    }
  }, [compra, open]);

  // Calcular preview do custo unitário
  const novoCustoUnitario =
    typeof precoUSD === 'number' &&
    typeof cotacao === 'number' &&
    typeof freteTotal === 'number' &&
    typeof quantidadeComprada === 'number' &&
    quantidadeComprada > 0
      ? calcularCustoUnitario(precoUSD, cotacao, freteTotal, quantidadeComprada)
      : null;

  const custoMudou = compra && novoCustoUnitario !== null && 
    Math.abs(novoCustoUnitario - compra.custoUnitario) > 0.01;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!compra) return;

    setLoading(true);

    try {
      // Validar quantidade mínima
      if (typeof quantidadeComprada === 'number' && quantidadeComprada < quantidadeVendida) {
        throw new Error(`Quantidade não pode ser menor que ${quantidadeVendida} (já vendidas)`);
      }

      const response = await fetch(`/api/compras/${compra.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          precoUSD: typeof precoUSD === 'number' ? precoUSD : undefined,
          cotacao: typeof cotacao === 'number' ? cotacao : undefined,
          freteTotal: typeof freteTotal === 'number' ? freteTotal : undefined,
          quantidadeComprada: typeof quantidadeComprada === 'number' ? quantidadeComprada : undefined,
          fornecedor: fornecedor || null,
          observacoes: observacoes || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao atualizar compra');
      }

      const result = await response.json();

      let mensagem = 'Compra atualizada com sucesso!';
      if (result.vendasAtualizadas > 0) {
        mensagem += ` ${result.vendasAtualizadas} venda(s) recalculada(s).`;
      }
      if (result.diferencaEstoque !== 0) {
        const sinal = result.diferencaEstoque > 0 ? '+' : '';
        mensagem += ` Estoque: ${sinal}${result.diferencaEstoque}`;
      }

      toast({
        title: 'Sucesso',
        description: mensagem,
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao atualizar compra',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar Compra</DialogTitle>
        </DialogHeader>

        {compra && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Produto (não editável) */}
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm text-muted-foreground">Produto</p>
              <p className="font-medium">{produtoNome || `Produto #${compra.produtoId}`}</p>
            </div>

            {/* Custos */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-precoUSD">Preço USD Unitário</Label>
                <Input
                  id="edit-precoUSD"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={precoUSD}
                  onChange={(e) =>
                    setPrecoUSD(e.target.value ? parseFloat(e.target.value) : '')
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-cotacao">Cotação USD→BRL</Label>
                <Input
                  id="edit-cotacao"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={cotacao}
                  onChange={(e) =>
                    setCotacao(e.target.value ? parseFloat(e.target.value) : '')
                  }
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-freteTotal">Frete Total BRL</Label>
                <Input
                  id="edit-freteTotal"
                  type="number"
                  step="0.01"
                  min="0"
                  value={freteTotal}
                  onChange={(e) =>
                    setFreteTotal(e.target.value ? parseFloat(e.target.value) : '')
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-quantidadeComprada">
                  Quantidade Comprada
                  {quantidadeVendida > 0 && (
                    <span className="text-xs text-muted-foreground ml-1">
                      (mín: {quantidadeVendida})
                    </span>
                  )}
                </Label>
                <Input
                  id="edit-quantidadeComprada"
                  type="number"
                  min={quantidadeVendida || 1}
                  value={quantidadeComprada}
                  onChange={(e) =>
                    setQuantidadeComprada(e.target.value ? parseInt(e.target.value) : '')
                  }
                  required
                />
              </div>
            </div>

            {/* Fornecedor e Observações */}
            <div className="space-y-2">
              <Label htmlFor="edit-fornecedor">Fornecedor</Label>
              <Input
                id="edit-fornecedor"
                value={fornecedor}
                onChange={(e) => setFornecedor(e.target.value)}
                placeholder="Nome do fornecedor (opcional)"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-observacoes">Observações</Label>
              <textarea
                id="edit-observacoes"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Observações (opcional)"
                className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            {/* Preview do custo */}
            {novoCustoUnitario !== null && (
              <div className={`p-4 rounded-md space-y-2 ${custoMudou ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800' : 'bg-muted'}`}>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Custo Unitário:</span>
                  <div className="text-right">
                    {custoMudou && (
                      <span className="text-sm text-muted-foreground line-through mr-2">
                        {formatarMoeda(compra.custoUnitario)}
                      </span>
                    )}
                    <span className={`text-lg font-bold ${custoMudou ? 'text-yellow-600 dark:text-yellow-400' : ''}`}>
                      {formatarMoeda(novoCustoUnitario)}
                    </span>
                  </div>
                </div>
                
                {custoMudou && (
                  <p className="text-xs text-yellow-600 dark:text-yellow-400">
                    O lucro de todas as vendas vinculadas será recalculado automaticamente.
                  </p>
                )}
              </div>
            )}

            {/* Info sobre quantidade vendida */}
            {quantidadeVendida > 0 && (
              <p className="text-xs text-muted-foreground">
                {quantidadeVendida} unidade(s) já vendida(s) desta compra.
              </p>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

