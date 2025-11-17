'use client';

import { useState, useEffect, useMemo } from 'react';
import { calcularCustoTotal } from '@/lib/calculators';
import LoadingSpinner from '@/components/LoadingSpinner';
import type { Produto } from '@/db/schema';

interface CompraFormProps {
  produtos: Produto[];
  onSubmit: (data: {
    produtoId: number;
    precoUSD: number;
    cotacao: number;
    freteTotal: number;
    quantidadeComprada: number;
    moeda: 'USD' | 'BRL';
    fornecedor?: string;
    observacoes?: string;
    dataCompra?: Date;
  }) => Promise<void>;
}

export default function CompraForm({ produtos, onSubmit }: CompraFormProps) {
  const [produtoId, setProdutoId] = useState<number | ''>('');
  const [moeda, setMoeda] = useState<'USD' | 'BRL'>('USD');
  const [precoUSD, setPrecoUSD] = useState('');
  const [cotacao, setCotacao] = useState('');
  const [freteTotal, setFreteTotal] = useState('0');
  const [quantidadeComprada, setQuantidadeComprada] = useState('');
  const [fornecedor, setFornecedor] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [dataCompra, setDataCompra] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [loading, setLoading] = useState(false);
  const [loadingCotacao, setLoadingCotacao] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // Quando moeda mudar para BRL, definir cotação como 1.00
  useEffect(() => {
    if (moeda === 'BRL') {
      setCotacao('1.00');
    }
  }, [moeda]);

  const handleBuscarCotacao = async () => {
    if (moeda !== 'USD') return;

    setLoadingCotacao(true);
    setErrors([]);
    try {
      const response = await fetch('/api/cotacao');
      if (!response.ok) {
        throw new Error('Erro ao buscar cotação');
      }

      const data = await response.json();
      if (data.cotacao) {
        setCotacao(data.cotacao.toFixed(2));
      } else {
        setErrors(['Não foi possível buscar a cotação. Insira manualmente.']);
      }
    } catch (error) {
      setErrors([
        'Erro ao buscar cotação. Insira manualmente.',
      ]);
    } finally {
      setLoadingCotacao(false);
    }
  };

  // Cálculos em tempo real
  const calculos = useMemo(() => {
    const precoNum = parseFloat(precoUSD) || 0;
    const cotacaoNum = parseFloat(cotacao) || 0;
    const freteNum = parseFloat(freteTotal) || 0;
    const qtdNum = parseFloat(quantidadeComprada) || 0;

    if (precoNum <= 0 || cotacaoNum <= 0 || qtdNum <= 0) {
      return {
        custoUnitario: 0,
        custoTotal: 0,
      };
    }

    const custoUnitario = calcularCustoTotal(
      precoNum,
      cotacaoNum,
      freteNum,
      qtdNum,
      moeda
    );

    const custoTotal = custoUnitario * qtdNum;

    return {
      custoUnitario,
      custoTotal,
    };
  }, [precoUSD, cotacao, freteTotal, quantidadeComprada, moeda]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);

    const validationErrors: string[] = [];

    if (!produtoId) {
      validationErrors.push('Produto é obrigatório');
    }

    const precoUSDNum = parseFloat(precoUSD);
    if (!precoUSD || isNaN(precoUSDNum) || precoUSDNum <= 0) {
      validationErrors.push('Preço unitário deve ser maior que zero');
    }

    const cotacaoNum = parseFloat(cotacao);
    if (moeda === 'BRL') {
      if (cotacaoNum !== 1.0) {
        validationErrors.push('Quando moeda é BRL, cotação deve ser 1.00');
      }
    } else {
      if (!cotacao || isNaN(cotacaoNum) || cotacaoNum <= 0) {
        validationErrors.push('Cotação deve ser maior que zero');
      }
    }

    const freteTotalNum = parseFloat(freteTotal);
    if (isNaN(freteTotalNum) || freteTotalNum < 0) {
      validationErrors.push('Frete total deve ser maior ou igual a zero');
    }

    const quantidadeNum = parseFloat(quantidadeComprada);
    if (!quantidadeComprada || isNaN(quantidadeNum) || quantidadeNum <= 0) {
      validationErrors.push('Quantidade deve ser maior que zero');
    }

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        produtoId: produtoId as number,
        precoUSD: precoUSDNum,
        cotacao: cotacaoNum,
        freteTotal: freteTotalNum,
        quantidadeComprada: quantidadeNum,
        moeda,
        fornecedor: fornecedor.trim() || undefined,
        observacoes: observacoes.trim() || undefined,
        dataCompra: dataCompra ? new Date(dataCompra) : undefined,
      });

      // Resetar form após submit
      setProdutoId('');
      setMoeda('USD');
      setPrecoUSD('');
      setCotacao('');
      setFreteTotal('0');
      setQuantidadeComprada('');
      setFornecedor('');
      setObservacoes('');
      setDataCompra(new Date().toISOString().split('T')[0]);
      setErrors([]);
    } catch (error) {
      setErrors([
        error instanceof Error ? error.message : 'Erro ao salvar compra',
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errors.length > 0 && (
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-md">
          <ul className="list-disc list-inside">
            {errors.map((err, index) => (
              <li key={index}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label
            htmlFor="produtoId"
            className="block text-sm font-medium text-foreground mb-2"
          >
            Produto *
          </label>
          <select
            id="produtoId"
            value={produtoId}
            onChange={(e) =>
              setProdutoId(e.target.value ? parseInt(e.target.value) : '')
            }
            className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            required
          >
            <option value="">Selecione um produto...</option>
            {produtos.map((produto) => (
              <option key={produto.id} value={produto.id}>
                {produto.nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="moeda"
            className="block text-sm font-medium text-foreground mb-2"
          >
            Moeda *
          </label>
          <select
            id="moeda"
            value={moeda}
            onChange={(e) => setMoeda(e.target.value as 'USD' | 'BRL')}
            className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            required
          >
            <option value="USD">USD</option>
            <option value="BRL">BRL</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="precoUSD"
              className="block text-sm font-medium text-foreground mb-2"
            >
              Preço Unitário ({moeda === 'BRL' ? 'R$' : 'US$'}) *
            </label>
            <input
              id="precoUSD"
              type="number"
              step="0.01"
              min="0"
              value={precoUSD}
              onChange={(e) => setPrecoUSD(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              required
            />
          </div>

          <div>
            <label
              htmlFor="cotacao"
              className="block text-sm font-medium text-foreground mb-2"
            >
              Cotação (BRL/USD) *
            </label>
            <div className="flex gap-2">
              <input
                id="cotacao"
                type="number"
                step="0.01"
                min="0"
                value={cotacao}
                onChange={(e) => setCotacao(e.target.value)}
                disabled={moeda === 'BRL'}
                className="flex-1 px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
                required
              />
              {moeda === 'USD' && (
                <button
                  type="button"
                  onClick={handleBuscarCotacao}
                  disabled={loadingCotacao}
                  className="px-4 py-2 text-sm font-medium border border-border rounded-md hover:bg-accent transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {loadingCotacao && <LoadingSpinner size="sm" />}
                  {loadingCotacao ? 'Buscando...' : 'Buscar'}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="freteTotal"
              className="block text-sm font-medium text-foreground mb-2"
            >
              Frete Total (R$) *
            </label>
            <input
              id="freteTotal"
              type="number"
              step="0.01"
              min="0"
              value={freteTotal}
              onChange={(e) => setFreteTotal(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              required
            />
          </div>

          <div>
            <label
              htmlFor="quantidadeComprada"
              className="block text-sm font-medium text-foreground mb-2"
            >
              Quantidade *
            </label>
            <input
              id="quantidadeComprada"
              type="number"
              step="1"
              min="1"
              value={quantidadeComprada}
              onChange={(e) => setQuantidadeComprada(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              required
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="fornecedor"
            className="block text-sm font-medium text-foreground mb-2"
          >
            Fornecedor
          </label>
          <input
            id="fornecedor"
            type="text"
            value={fornecedor}
            onChange={(e) => setFornecedor(e.target.value)}
            className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div>
          <label
            htmlFor="observacoes"
            className="block text-sm font-medium text-foreground mb-2"
          >
            Observações
          </label>
          <textarea
            id="observacoes"
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>

        <div>
          <label
            htmlFor="dataCompra"
            className="block text-sm font-medium text-foreground mb-2"
          >
            Data da Compra
          </label>
          <input
            id="dataCompra"
            type="date"
            value={dataCompra}
            onChange={(e) => setDataCompra(e.target.value)}
            className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* Preview de cálculos */}
      {(calculos.custoUnitario > 0 || calculos.custoTotal > 0) && (
        <div className="bg-muted/50 border border-border rounded-md p-4 space-y-2">
          <h3 className="text-sm font-semibold text-foreground mb-3">
            Resumo de Custos
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Custo Unitário</p>
              <p className="text-lg font-semibold text-foreground">
                R$ {calculos.custoUnitario.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Custo Total</p>
              <p className="text-lg font-semibold text-foreground">
                R$ {calculos.custoTotal.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-4">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading && <LoadingSpinner size="sm" />}
          {loading ? 'Salvando...' : 'Salvar Compra'}
        </button>
      </div>
    </form>
  );
}

