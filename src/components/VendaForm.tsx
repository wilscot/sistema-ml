'use client';

import { useState, useEffect } from 'react';
import {
  calcularCustoTotal,
  calcularTaxaML,
  calcularLucro,
} from '@/lib/calculators';
import LoadingSpinner from '@/components/LoadingSpinner';
import type { Produto } from '@/db/schema';

interface VendaFormProps {
  produtos: Produto[];
  config: { taxaClassico: number; taxaPremium: number };
  onSubmit: (data: {
    produtoId: number;
    quantidadeVendida: number;
    precoVenda: number;
    tipoAnuncio: 'CLASSICO' | 'PREMIUM';
    freteCobrado: number;
    data: Date;
  }) => Promise<void>;
}

export default function VendaForm({ produtos, config, onSubmit }: VendaFormProps) {
  // Filtrar apenas produtos PROD com estoque > 0
  const produtosDisponiveis = produtos.filter(
    (p) => p.tipo === 'PROD' && (p.quantidade || 0) > 0 && !p.deletedAt
  );

  const [produtoId, setProdutoId] = useState<number | ''>('');
  const [quantidadeVendida, setQuantidadeVendida] = useState('');
  const [precoVenda, setPrecoVenda] = useState('');
  const [tipoAnuncio, setTipoAnuncio] = useState<'CLASSICO' | 'PREMIUM'>('CLASSICO');
  const [freteCobrado, setFreteCobrado] = useState('0');
  const [data, setData] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const produtoSelecionado = produtosDisponiveis.find(
    (p) => p.id === produtoId
  );
  const estoqueDisponivel = produtoSelecionado?.quantidade || 0;

  // Calcular valores em tempo real
  const precoVendaNum = parseFloat(precoVenda) || 0;
  const quantidadeNum = parseFloat(quantidadeVendida) || 0;
  const freteNum = parseFloat(freteCobrado) || 0;

  let custoTotal = 0;
  let taxaML = 0;
  let lucroLiquido = 0;

  if (produtoSelecionado && precoVendaNum > 0 && quantidadeNum > 0) {
    // Calcular custo total do produto
    custoTotal = calcularCustoTotal(
      produtoSelecionado.precoUSD,
      produtoSelecionado.cotacao,
      produtoSelecionado.freteTotal,
      produtoSelecionado.quantidade || 1
    );

    // Calcular taxa ML
    const taxaPercent =
      tipoAnuncio === 'CLASSICO' ? config.taxaClassico : config.taxaPremium;
    taxaML = calcularTaxaML(precoVendaNum, taxaPercent);

    // Calcular lucro líquido
    lucroLiquido = calcularLucro(
      precoVendaNum,
      quantidadeNum,
      freteNum,
      custoTotal,
      taxaML
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors([]);

    if (!produtoId) {
      setErrors(['Selecione um produto']);
      setLoading(false);
      return;
    }

    const parsedQuantidade = parseFloat(quantidadeVendida);
    const parsedPreco = parseFloat(precoVenda);
    const parsedFrete = parseFloat(freteCobrado);

    const newErrors: string[] = [];

    if (isNaN(parsedQuantidade) || parsedQuantidade <= 0) {
      newErrors.push('Quantidade deve ser maior que zero');
    }

    if (parsedQuantidade > estoqueDisponivel) {
      newErrors.push(
        `Estoque insuficiente. Disponível: ${estoqueDisponivel}, Solicitado: ${parsedQuantidade}`
      );
    }

    if (isNaN(parsedPreco) || parsedPreco <= 0) {
      newErrors.push('Preço de venda deve ser maior que zero');
    }

    if (isNaN(parsedFrete) || parsedFrete < 0) {
      newErrors.push('Frete cobrado deve ser maior ou igual a zero');
    }

    if (!data) {
      newErrors.push('Data da venda é obrigatória');
    }

    if (newErrors.length > 0) {
      setErrors(newErrors);
      setLoading(false);
      return;
    }

    await onSubmit({
      produtoId: produtoId as number,
      quantidadeVendida: parsedQuantidade,
      precoVenda: parsedPreco,
      tipoAnuncio,
      freteCobrado: parsedFrete,
      data: new Date(data),
    });
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errors.length > 0 && (
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-md">
          <ul className="list-disc list-inside">
            {errors.map((err, index) => (
              <li key={index}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <label
          htmlFor="produtoId"
          className="block text-sm font-medium text-foreground mb-1"
        >
          Produto (PROD com estoque)
        </label>
        <select
          id="produtoId"
          value={produtoId}
          onChange={(e) => {
            setProdutoId(e.target.value ? parseInt(e.target.value) : '');
            setQuantidadeVendida(''); // Reset quantidade ao trocar produto
          }}
          className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:ring-primary focus:border-primary"
          required
        >
          <option value="">Selecione um produto...</option>
          {produtosDisponiveis.map((produto) => (
            <option key={produto.id} value={produto.id}>
              {produto.nome} (Estoque: {produto.quantidade})
            </option>
          ))}
        </select>
        {produtosDisponiveis.length === 0 && (
          <p className="text-sm text-muted-foreground mt-1">
            Nenhum produto PROD com estoque disponível.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="quantidadeVendida"
            className="block text-sm font-medium text-foreground mb-1"
          >
            Quantidade Vendida
            {produtoSelecionado && (
              <span className="text-muted-foreground text-xs ml-1">
                (Máx: {estoqueDisponivel})
              </span>
            )}
          </label>
          <input
            type="number"
            id="quantidadeVendida"
            value={quantidadeVendida}
            onChange={(e) => setQuantidadeVendida(e.target.value)}
            className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:ring-primary focus:border-primary"
            min="1"
            max={estoqueDisponivel}
            required
            disabled={!produtoSelecionado}
          />
        </div>

        <div>
          <label
            htmlFor="precoVenda"
            className="block text-sm font-medium text-foreground mb-1"
          >
            Preço de Venda (R$)
          </label>
          <input
            type="number"
            id="precoVenda"
            value={precoVenda}
            onChange={(e) => setPrecoVenda(e.target.value)}
            className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:ring-primary focus:border-primary"
            step="0.01"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="tipoAnuncio"
            className="block text-sm font-medium text-foreground mb-1"
          >
            Tipo de Anúncio
          </label>
          <select
            id="tipoAnuncio"
            value={tipoAnuncio}
            onChange={(e) =>
              setTipoAnuncio(e.target.value as 'CLASSICO' | 'PREMIUM')
            }
            className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:ring-primary focus:border-primary"
            required
          >
            <option value="CLASSICO">
              Clássico ({config.taxaClassico}%)
            </option>
            <option value="PREMIUM">Premium ({config.taxaPremium}%)</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="freteCobrado"
            className="block text-sm font-medium text-foreground mb-1"
          >
            Frete Cobrado (R$)
          </label>
          <input
            type="number"
            id="freteCobrado"
            value={freteCobrado}
            onChange={(e) => setFreteCobrado(e.target.value)}
            className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:ring-primary focus:border-primary"
            step="0.01"
            required
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="data"
          className="block text-sm font-medium text-foreground mb-1"
        >
          Data da Venda
        </label>
        <input
          type="date"
          id="data"
          value={data}
          onChange={(e) => setData(e.target.value)}
          className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:ring-primary focus:border-primary"
          required
        />
      </div>

      {produtoSelecionado && precoVendaNum > 0 && quantidadeNum > 0 && (
        <div className="bg-muted p-4 rounded-md space-y-2">
          <div className="text-sm font-medium text-foreground mb-2">
            Preview do Cálculo
          </div>
          <div className="text-sm text-muted-foreground space-y-1">
            <div className="flex justify-between">
              <span>Custo Unitário:</span>
              <span className="text-foreground">
                R$ {custoTotal.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Receita Total:</span>
              <span className="text-foreground">
                R$ {(precoVendaNum * quantidadeNum + freteNum).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Taxa ML ({tipoAnuncio === 'CLASSICO' ? config.taxaClassico : config.taxaPremium}%):</span>
              <span className="text-foreground">R$ {taxaML.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Custo Total:</span>
              <span className="text-foreground">
                R$ {(custoTotal * quantidadeNum).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t border-border">
              <span className="font-medium">Lucro Líquido:</span>
              <span
                className={`font-medium ${
                  lucroLiquido >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                R$ {lucroLiquido.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <a
          href="/vendas"
          className="px-4 py-2 text-sm font-medium border border-border rounded-md hover:bg-accent transition-colors"
        >
          Cancelar
        </a>
        <button
          type="submit"
          disabled={loading || !produtoSelecionado}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {loading && <LoadingSpinner size="sm" />}
          {loading ? 'Registrando...' : 'Registrar Venda'}
        </button>
      </div>
    </form>
  );
}
