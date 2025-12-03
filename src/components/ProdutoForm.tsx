'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { calcularCustoUnitario } from '@/lib/calculators';
import {
  validarProdutoLab,
  validarProdutoProd,
} from '@/lib/validators';
import type { ProdutoLab, ProdutoProd, ProdutoLabInput, ProdutoProdInput } from '@/types/produto';

interface ProdutoFormProps {
  modo: 'LAB' | 'PROD';
  produto?: ProdutoLab | ProdutoProd;
  onSuccess: () => void;
}

export function ProdutoForm({ modo, produto, onSuccess }: ProdutoFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingCotacao, setLoadingCotacao] = useState(false);

  // Estado para LAB
  const [nome, setNome] = useState('');
  const [precoUSD, setPrecoUSD] = useState<number | ''>('');
  const [cotacao, setCotacao] = useState<number | ''>('');
  const [freteTotal, setFreteTotal] = useState<number | ''>('');
  const [fornecedor, setFornecedor] = useState('');


  // Carregar dados do produto se estiver editando
  useEffect(() => {
    if (produto) {
      setNome(produto.nome);
      setFornecedor(produto.fornecedor || '');

      if (modo === 'LAB') {
        const produtoLab = produto as ProdutoLab;
        setPrecoUSD(produtoLab.precoUSD);
        setCotacao(produtoLab.cotacao);
        setFreteTotal(produtoLab.freteTotal);
      }
    } else {
      // Reset form
      setNome('');
      setPrecoUSD('');
      setCotacao('');
      setFreteTotal('');
      setFornecedor('');
    }
  }, [produto, modo]);

  // Calcular custo unitário em tempo real (LAB)
  const custoUnitario =
    modo === 'LAB' &&
    precoUSD !== '' &&
    cotacao !== '' &&
    freteTotal !== '' &&
    typeof precoUSD === 'number' &&
    typeof cotacao === 'number' &&
    typeof freteTotal === 'number'
      ? calcularCustoUnitario(precoUSD, cotacao, freteTotal, 1)
      : null;

  const handleBuscarCotacao = async () => {
    setLoadingCotacao(true);
    try {
      const response = await fetch('/api/cotacao');
      if (!response.ok) throw new Error('Erro ao buscar cotação');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let data: ProdutoLabInput | ProdutoProdInput;
      let validation;

      if (modo === 'LAB') {
        data = {
          nome,
          precoUSD: typeof precoUSD === 'number' ? precoUSD : parseFloat(precoUSD.toString()),
          cotacao: typeof cotacao === 'number' ? cotacao : parseFloat(cotacao.toString()),
          freteTotal: typeof freteTotal === 'number' ? freteTotal : parseFloat(freteTotal.toString()),
          fornecedor: fornecedor || null,
        };
        validation = validarProdutoLab(data as ProdutoLabInput);
      } else {
        data = {
          nome,
          fornecedor: fornecedor || null,
        };
        validation = validarProdutoProd(data as ProdutoProdInput);
      }

      if (!validation.valid) {
        toast({
          title: 'Dados inválidos',
          description: validation.errors.join(', '),
          variant: 'destructive',
        });
        return;
      }

      const url = produto
        ? `/api/produtos/${produto.id}?modo=${modo}`
        : `/api/produtos?modo=${modo}`;

      const method = produto ? 'PUT' : 'POST';

      const body = produto
        ? { ...data }
        : { modo, ...data };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao salvar produto');
      }

      toast({
        title: 'Sucesso',
        description: produto ? 'Produto atualizado!' : 'Produto criado!',
      });

      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao salvar produto',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="nome">Nome *</Label>
        <Input
          id="nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
          placeholder="Nome do produto"
        />
      </div>

      {modo === 'LAB' ? (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="precoUSD">Preço USD *</Label>
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

          {custoUnitario !== null && (
            <div className="p-4 bg-muted rounded-md">
              <p className="text-sm font-medium">Custo Unitário:</p>
              <p className="text-2xl font-bold">R$ {custoUnitario.toFixed(2)}</p>
            </div>
          )}
        </>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="fornecedor">Fornecedor</Label>
        <Input
          id="fornecedor"
          value={fornecedor}
          onChange={(e) => setFornecedor(e.target.value)}
          placeholder="Nome do fornecedor (opcional)"
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={() => onSuccess()}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Salvando...' : produto ? 'Atualizar' : 'Criar'}
        </Button>
      </div>
    </form>
  );
}
