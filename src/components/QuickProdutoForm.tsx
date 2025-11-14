'use client';

import { useState, useEffect } from 'react';
import { buscarCotacaoDolar } from '@/lib/cotacao';
import { calcularCustoTotal } from '@/lib/calculators';
import LoadingSpinner from '@/components/LoadingSpinner';
import type { NovoProduto, Produto } from '@/db/schema';
import { X } from 'lucide-react';

interface QuickProdutoFormProps {
  isOpen: boolean;
  tituloAnuncio: string;
  quantidadeVenda: number;
  vendasComMesmoTitulo: number;
  onSave: (produto: NovoProduto, aplicarParaTodas: boolean, vendaIds?: number[]) => Promise<Produto>;
  onCancel: () => void;
}

export default function QuickProdutoForm({
  isOpen,
  tituloAnuncio,
  quantidadeVenda,
  vendasComMesmoTitulo,
  onSave,
  onCancel,
}: QuickProdutoFormProps) {
  const [nome, setNome] = useState(tituloAnuncio);
  const [moeda, setMoeda] = useState<'USD' | 'BRL'>('USD');
  const [preco, setPreco] = useState('');
  const [cotacao, setCotacao] = useState('');
  const [freteTotal, setFreteTotal] = useState('0');
  const [quantidade, setQuantidade] = useState(quantidadeVenda.toString());
  const [fornecedor, setFornecedor] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingCotacao, setLoadingCotacao] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      setNome(tituloAnuncio);
      setMoeda('USD');
      setPreco('');
      setCotacao('');
      setFreteTotal('0');
      setQuantidade(quantidadeVenda.toString());
      setFornecedor('');
      setErrors([]);
    }
  }, [isOpen, tituloAnuncio, quantidadeVenda]);

  useEffect(() => {
    if (moeda === 'BRL' && isOpen) {
      setCotacao('1.00');
    }
  }, [moeda, isOpen]);

  const handleBuscarCotacao = async () => {
    if (moeda !== 'USD') return;
    setLoadingCotacao(true);
    try {
      const cotacaoAtual = await buscarCotacaoDolar();
      if (cotacaoAtual) {
        setCotacao(cotacaoAtual.toFixed(2));
        setErrors([]);
      } else {
        setErrors(['Não foi possível buscar a cotação. Insira manualmente.']);
      }
    } catch {
      setErrors(['Erro ao buscar cotação. Insira manualmente.']);
    } finally {
      setLoadingCotacao(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);

    const validationErrors: string[] = [];

    if (!nome || nome.trim().length < 3) {
      validationErrors.push('Nome obrigatório (mínimo 3 caracteres)');
    }

    const precoNum = parseFloat(preco);
    if (!preco || isNaN(precoNum) || precoNum <= 0) {
      validationErrors.push('Preço deve ser maior que zero');
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

    const quantidadeNum = parseInt(quantidade);
    if (isNaN(quantidadeNum) || quantidadeNum < quantidadeVenda) {
      validationErrors.push(
        `Quantidade deve ser maior ou igual a ${quantidadeVenda} (quantidade da venda)`
      );
    }

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    try {
      const novoProduto: NovoProduto = {
        nome: nome.trim(),
        precoUSD: precoNum,
        cotacao: cotacaoNum,
        freteTotal: freteTotalNum,
        quantidade: quantidadeNum,
        fornecedor: fornecedor.trim() || null,
        tipo: 'PROD',
        moeda,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Sempre passar para o componente pai decidir
      await onSave(novoProduto, vendasComMesmoTitulo <= 1, []);
    } catch (error) {
      setErrors([
        error instanceof Error ? error.message : 'Erro ao salvar produto',
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const precoNum = parseFloat(preco) || 0;
  const cotacaoNum = parseFloat(cotacao) || 0;
  const freteTotalNum = parseFloat(freteTotal) || 0;
  const quantidadeNum = parseInt(quantidade) || 0;

  const custoUnitario =
    quantidadeNum > 0
      ? calcularCustoTotal(
          precoNum,
          cotacaoNum,
          freteTotalNum,
          quantidadeNum,
          moeda
        )
      : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card border border-border rounded-lg p-6 max-w-2xl w-full mx-4 shadow-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-card-foreground mb-1">
              Cadastrar Novo Produto
            </h3>
            <p className="text-sm text-muted-foreground">
              Produto será criado como tipo PROD e vinculado à venda
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="nome"
              className="block text-sm font-medium text-foreground mb-2"
            >
              Nome do Produto *
            </label>
            <input
              id="nome"
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              required
              minLength={3}
            />
          </div>

          <div>
            <label
              htmlFor="moeda"
              className="block text-sm font-medium text-foreground mb-2"
            >
              Moeda do Produto *
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
                htmlFor="preco"
                className="block text-sm font-medium text-foreground mb-2"
              >
                {moeda === 'BRL' ? 'Preço (R$)' : 'Preço (US$)'} *
              </label>
              <input
                id="preco"
                type="number"
                step="0.01"
                min="0"
                value={preco}
                onChange={(e) => setPreco(e.target.value)}
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
                    {loadingCotacao ? '...' : 'Buscar'}
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
                Frete Total (BRL)
              </label>
              <input
                id="freteTotal"
                type="number"
                step="0.01"
                min="0"
                value={freteTotal}
                onChange={(e) => setFreteTotal(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label
                htmlFor="quantidade"
                className="block text-sm font-medium text-foreground mb-2"
              >
                Quantidade * (mín: {quantidadeVenda})
              </label>
              <input
                id="quantidade"
                type="number"
                min={quantidadeVenda}
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
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

          {custoUnitario > 0 && (
            <div className="bg-muted/50 p-3 rounded-md">
              <p className="text-sm text-muted-foreground">
                Custo Unitário Estimado:
              </p>
              <p className="text-lg font-semibold text-foreground">
                R$ {custoUnitario.toFixed(2)}
              </p>
            </div>
          )}

          {errors.length > 0 && (
            <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-md">
              <ul className="list-disc list-inside space-y-1">
                {errors.map((error, index) => (
                  <li key={index} className="text-sm">
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-2 justify-end pt-4 border-t border-border">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium border border-border rounded-md hover:bg-accent transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading && <LoadingSpinner size="sm" />}
              {loading ? 'Salvando...' : 'Salvar e Vincular'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

