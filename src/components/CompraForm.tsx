'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { calcularCustoUnitario } from '@/lib/calculators';
import { validarCompra } from '@/lib/validators';
import type { CompraInput } from '@/types/compra';
import type { ProdutoProd } from '@/types/produto';
import ProdutoQuickCreateDialog from './ProdutoQuickCreateDialog';

interface CompraFormProps {
  onSuccess: () => void;
}

export function CompraForm({ onSuccess }: CompraFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingCotacao, setLoadingCotacao] = useState(false);
  const [loadingProdutos, setLoadingProdutos] = useState(true);
  const [produtos, setProdutos] = useState<ProdutoProd[]>([]);
  const [produtosAtualizados, setProdutosAtualizados] = useState<ProdutoProd[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [produtoId, setProdutoId] = useState<string>('');
  const [precoUSD, setPrecoUSD] = useState<number | ''>('');
  const [cotacao, setCotacao] = useState<number | ''>('');
  const [freteTotal, setFreteTotal] = useState<number | ''>('');
  const [quantidadeComprada, setQuantidadeComprada] = useState<number | ''>('');
  const [fornecedor, setFornecedor] = useState('');
  const [dataCompra, setDataCompra] = useState('');
  const [observacoes, setObservacoes] = useState('');

  // Buscar produtos PROD
  useEffect(() => {
    const buscarProdutos = async () => {
      try {
        setLoadingProdutos(true);
        const response = await fetch('/api/produtos?modo=PROD');
        if (!response.ok) throw new Error('Erro ao buscar produtos');
        const data = await response.json();
        const produtosList = data.produtos || [];
        setProdutos(produtosList);
        setProdutosAtualizados(produtosList);
      } catch (error) {
        console.error('Erro ao buscar produtos:', error);
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar produtos',
          variant: 'destructive',
        });
      } finally {
        setLoadingProdutos(false);
      }
    };

    buscarProdutos();
  }, [toast]);

  // Data padrão: hoje
  useEffect(() => {
    const hoje = new Date().toISOString().split('T')[0];
    setDataCompra(hoje);
  }, []);

  const handleBuscarCotacao = async () => {
    setLoadingCotacao(true);
    try {
      const response = await fetch('/api/cotacao');
      if (!response.ok) {
        throw new Error('Erro ao buscar cotação');
      }
      const data = await response.json();
      setCotacao(data.cotacao);
      toast({
        title: 'Cotação atualizada',
        description: `Cotação: R$ ${data.cotacao.toFixed(2)}`,
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível buscar cotação. Use valor manual.',
        variant: 'destructive',
      });
    } finally {
      setLoadingCotacao(false);
    }
  };

  // Calcular custos em tempo real
  const custoUnitario =
    precoUSD !== '' &&
    cotacao !== '' &&
    freteTotal !== '' &&
    quantidadeComprada !== '' &&
    typeof precoUSD === 'number' &&
    typeof cotacao === 'number' &&
    typeof freteTotal === 'number' &&
    typeof quantidadeComprada === 'number' &&
    quantidadeComprada > 0
      ? calcularCustoUnitario(precoUSD, cotacao, freteTotal, quantidadeComprada)
      : null;

  const custoTotal =
    custoUnitario !== null && typeof quantidadeComprada === 'number'
      ? custoUnitario * quantidadeComprada
      : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Converter data para timestamp
      const dataCompraTimestamp = Math.floor(
        new Date(dataCompra).getTime() / 1000
      );

      const data: CompraInput = {
        produtoId: parseInt(produtoId),
        precoUSD: typeof precoUSD === 'number' ? precoUSD : parseFloat(precoUSD.toString()),
        cotacao: typeof cotacao === 'number' ? cotacao : parseFloat(cotacao.toString()),
        freteTotal: typeof freteTotal === 'number' ? freteTotal : parseFloat(freteTotal.toString()),
        quantidadeComprada:
          typeof quantidadeComprada === 'number'
            ? quantidadeComprada
            : parseInt(quantidadeComprada.toString()),
        fornecedor: fornecedor || null,
        dataCompra: dataCompraTimestamp,
        observacoes: observacoes || null,
        moeda: 'USD',
      };

      const validation = validarCompra(data);
      if (!validation.valid) {
        toast({
          title: 'Dados inválidos',
          description: validation.errors.join(', '),
          variant: 'destructive',
        });
        return;
      }

      const response = await fetch('/api/compras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao criar compra');
      }

      toast({
        title: 'Sucesso',
        description: 'Compra registrada com sucesso!',
      });

      // Reset form
      setProdutoId('');
      setPrecoUSD('');
      setCotacao('');
      setFreteTotal('');
      setQuantidadeComprada('');
      setFornecedor('');
      const hoje = new Date().toISOString().split('T')[0];
      setDataCompra(hoje);
      setObservacoes('');

      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao registrar compra',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="produtoId">Produto PROD *</Label>
        <Select
          value={produtoId}
          onValueChange={(value) => {
            if (value === '__new__') {
              setDialogOpen(true);
            } else {
              setProdutoId(value);
            }
          }}
          required
          disabled={loadingProdutos}
        >
          <SelectTrigger id="produtoId">
            <SelectValue placeholder={loadingProdutos ? 'Carregando...' : 'Selecione um produto'} />
          </SelectTrigger>
          <SelectContent>
            {/* OPÇÃO CADASTRAR NOVO (PRIMEIRA LINHA) */}
            <SelectItem value="__new__" className="font-medium text-primary">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                <span>Cadastrar novo produto</span>
              </div>
            </SelectItem>
            
            {/* SEPARADOR */}
            <div className="border-t my-1" />
            
            {/* PRODUTOS EXISTENTES */}
            {produtosAtualizados
              .filter((p) => !p.deletedAt)
              .map((produto) => (
                <SelectItem key={produto.id} value={produto.id.toString()}>
                  {produto.nome}
                  {produto.fornecedor && (
                    <span className="text-muted-foreground text-xs ml-2">
                      ({produto.fornecedor})
                    </span>
                  )}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      {/* DIALOG DE CRIAÇÃO RÁPIDA */}
      <ProdutoQuickCreateDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSuccess={(novoProduto) => {
          // Adicionar produto à lista local
          const novoProdutoCompleto: ProdutoProd = {
            id: novoProduto.id,
            nome: novoProduto.nome,
            tipo: 'PROD',
            quantidade: 0,
            deletedAt: null,
            fornecedor: null,
            createdAt: Math.floor(Date.now() / 1000),
            updatedAt: Math.floor(Date.now() / 1000),
          };
          
          setProdutosAtualizados([
            ...produtosAtualizados,
            novoProdutoCompleto,
          ]);
          
          // Selecionar produto recém-criado
          setProdutoId(novoProduto.id.toString());
        }}
      />

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="precoUSD">Preço USD Unitário *</Label>
          <Input
            id="precoUSD"
            type="number"
            step="0.01"
            min="0.01"
            value={precoUSD}
            onChange={(e) =>
              setPrecoUSD(e.target.value ? parseFloat(e.target.value) : '')
            }
            required
            placeholder="0.00"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cotacao">Cotação USD→BRL *</Label>
          <div className="flex gap-2">
            <Input
              id="cotacao"
              type="number"
              step="0.01"
              min="0.01"
              value={cotacao}
              onChange={(e) =>
                setCotacao(e.target.value ? parseFloat(e.target.value) : '')
              }
              required
              placeholder="5.60"
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleBuscarCotacao}
              disabled={loadingCotacao}
            >
              {loadingCotacao ? '...' : 'Buscar'}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="freteTotal">Frete Total BRL *</Label>
          <Input
            id="freteTotal"
            type="number"
            step="0.01"
            min="0"
            value={freteTotal}
            onChange={(e) =>
              setFreteTotal(e.target.value ? parseFloat(e.target.value) : '')
            }
            required
            placeholder="0.00"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="quantidadeComprada">Quantidade Comprada *</Label>
          <Input
            id="quantidadeComprada"
            type="number"
            min="1"
            value={quantidadeComprada}
            onChange={(e) =>
              setQuantidadeComprada(e.target.value ? parseInt(e.target.value) : '')
            }
            required
            placeholder="0"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="fornecedor">Fornecedor</Label>
        <Input
          id="fornecedor"
          value={fornecedor}
          onChange={(e) => setFornecedor(e.target.value)}
          placeholder="Nome do fornecedor (opcional)"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="dataCompra">Data da Compra *</Label>
        <Input
          id="dataCompra"
          type="date"
          value={dataCompra}
          onChange={(e) => setDataCompra(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="observacoes">Observações</Label>
        <textarea
          id="observacoes"
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
          placeholder="Observações adicionais (opcional)"
          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      {custoUnitario !== null && custoTotal !== null && (
        <div className="p-4 bg-muted rounded-md space-y-2">
          <div>
            <p className="text-sm font-medium">Custo Unitário:</p>
            <p className="text-xl font-bold">
              R$ {custoUnitario.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium">Custo Total:</p>
            <p className="text-xl font-bold">R$ {custoTotal.toFixed(2)}</p>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={() => onSuccess()}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Registrando...' : 'Registrar Compra'}
        </Button>
      </div>
    </form>
  );
}
