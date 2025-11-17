'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { buscarCotacaoDolar } from '@/lib/cotacao';
import LoadingSpinner from '@/components/LoadingSpinner';
import type { Produto } from '@/db/schema';

interface ProdutoFormProps {
  initialData?: Produto;
  onSubmit: (data: {
    nome: string;
    precoUSD: number;
    cotacao: number;
    freteTotal: number;
    quantidade: number;
    fornecedor?: string | null;
    tipo?: 'LAB' | 'PROD';
    moeda?: 'USD' | 'BRL';
  }) => Promise<void>;
  isEditing?: boolean;
}

export default function ProdutoForm({
  initialData,
  onSubmit,
  isEditing = false,
}: ProdutoFormProps) {
  const [nome, setNome] = useState(initialData?.nome || '');
  const [precoUSD, setPrecoUSD] = useState(
    initialData?.precoUSD?.toString() || ''
  );
  const [cotacao, setCotacao] = useState(
    initialData?.cotacao?.toString() || ''
  );
  const [freteTotal, setFreteTotal] = useState(
    initialData?.freteTotal?.toString() || '0'
  );
  const [quantidade, setQuantidade] = useState(
    initialData?.quantidade?.toString() || '0'
  );
  const [fornecedor, setFornecedor] = useState(
    initialData?.fornecedor || ''
  );
  const [tipo, setTipo] = useState<'LAB' | 'PROD'>(
    initialData?.tipo || 'LAB'
  );
  const [moeda, setMoeda] = useState<'USD' | 'BRL'>(
    (initialData?.moeda as 'USD' | 'BRL') || 'USD'
  );
  const [loading, setLoading] = useState(false);
  const [loadingCotacao, setLoadingCotacao] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // Atualizar campos quando initialData mudar
  useEffect(() => {
    if (initialData) {
      setNome(initialData.nome || '');
      setPrecoUSD(initialData.precoUSD?.toString() || '');
      setCotacao(initialData.cotacao?.toString() || '');
      setFreteTotal(initialData.freteTotal?.toString() || '0');
      setQuantidade(initialData.quantidade?.toString() || '0');
      setFornecedor(initialData.fornecedor || '');
      setTipo(initialData.tipo || 'LAB');
      setMoeda((initialData.moeda as 'USD' | 'BRL') || 'USD');
    }
  }, [initialData]);

  // Quando moeda mudar para BRL, definir cotação como 1.00
  useEffect(() => {
    if (moeda === 'BRL') {
      setCotacao('1.00');
    }
  }, [moeda]);

  const handleBuscarCotacao = async () => {
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

    // Campos de custo são opcionais agora (custos são registrados via compras para PROD)
    // Para produtos LAB, esses campos não são necessários
    const precoUSDNum = parseFloat(precoUSD);
    const cotacaoNum = parseFloat(cotacao);
    const freteTotalNum = parseFloat(freteTotal);
    
    // Validar apenas se os campos foram preenchidos (opcional)
    if (precoUSD && !isNaN(precoUSDNum) && precoUSDNum <= 0) {
      validationErrors.push('Preço em USD deve ser maior que zero');
    }

    if (cotacao && !isNaN(cotacaoNum)) {
      if (moeda === 'BRL') {
        if (cotacaoNum !== 1.0) {
          validationErrors.push('Quando moeda é BRL, cotação deve ser 1.00');
        }
      } else {
        if (cotacaoNum <= 0) {
          validationErrors.push('Cotação deve ser maior que zero');
        }
      }
    }

    if (freteTotal && (isNaN(freteTotalNum) || freteTotalNum < 0)) {
      validationErrors.push('Frete total deve ser maior ou igual a zero');
    }

    const quantidadeNum = parseInt(quantidade);
    if (isNaN(quantidadeNum) || quantidadeNum < 0) {
      validationErrors.push('Quantidade deve ser maior ou igual a zero');
    }

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    try {
      // Enviar apenas campos preenchidos (API ignora campos de custo de qualquer forma)
      await onSubmit({
        nome: nome.trim(),
        precoUSD: precoUSD && !isNaN(precoUSDNum) ? precoUSDNum : 0,
        cotacao: cotacao && !isNaN(cotacaoNum) ? cotacaoNum : 1,
        freteTotal: freteTotal && !isNaN(freteTotalNum) ? freteTotalNum : 0,
        quantidade: quantidadeNum,
        fornecedor: fornecedor.trim() || null,
        tipo: isEditing ? undefined : tipo, // Não permite editar tipo
        moeda,
      });
    } catch (error) {
      setErrors([
        error instanceof Error ? error.message : 'Erro ao salvar produto',
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
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
              htmlFor="precoUSD"
              className="block text-sm font-medium text-foreground mb-2"
            >
              {moeda === 'BRL' ? 'Preço (R$)' : 'Preço (US$)'} *
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
                  {loadingCotacao ? 'Buscando...' : 'Buscar Cotação'}
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
              Quantidade
            </label>
            <input
              id="quantidade"
              type="number"
              min="0"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
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

        {!isEditing && (
          <div>
            <label
              htmlFor="tipo"
              className="block text-sm font-medium text-foreground mb-2"
            >
              Tipo *
            </label>
            <select
              id="tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as 'LAB' | 'PROD')}
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              required
            >
              <option value="LAB">Simulação (LAB)</option>
              <option value="PROD">Produção (PROD)</option>
            </select>
          </div>
        )}

        {isEditing && initialData && (
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Tipo
            </label>
            <div className="px-3 py-2 border border-input rounded-md bg-muted text-muted-foreground">
              {initialData.tipo === 'LAB' ? 'Simulação (LAB)' : 'Produção (PROD)'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              O tipo não pode ser alterado após a criação
            </p>
          </div>
        )}
      </div>

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

      <div className="flex gap-2 justify-end">
        <Link
          href="/produtos"
          className="px-4 py-2 text-sm font-medium border border-border rounded-md hover:bg-accent transition-colors"
        >
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {loading && <LoadingSpinner size="sm" />}
          {loading ? (isEditing ? 'Salvando...' : 'Criando...') : (isEditing ? 'Salvar' : 'Criar')}
        </button>
      </div>
    </form>
  );
}
