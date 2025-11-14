'use client';

import { useState, useEffect } from 'react';
import {
  calcularCustoTotal,
  calcularTaxaML,
  calcularLucro,
} from '@/lib/calculators';
import LoadingSpinner from '@/components/LoadingSpinner';
import type { Cenario, Produto } from '@/db/schema';

interface CenarioFormProps {
  produtoId: number;
  produto: Produto;
  initialData?: Cenario;
  config: { taxaClassico: number; taxaPremium: number };
  onSubmit: (data: {
    nome: string;
    precoVendaClassico: number;
    precoVendaPremium: number;
    freteCobrado: number;
  }) => Promise<void>;
  onCancel: () => void;
}

export default function CenarioForm({
  produtoId,
  produto,
  initialData,
  config,
  onSubmit,
  onCancel,
}: CenarioFormProps) {
  const [nome, setNome] = useState(initialData?.nome || '');
  const [precoVendaClassico, setPrecoVendaClassico] = useState(
    initialData?.precoVendaClassico?.toString() || ''
  );
  const [precoVendaPremium, setPrecoVendaPremium] = useState(
    initialData?.precoVendaPremium?.toString() || ''
  );
  const [freteCobrado, setFreteCobrado] = useState(
    initialData?.freteCobrado?.toString() || '0'
  );
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // Calcular valores em tempo real
  const custoTotal = calcularCustoTotal(
    produto.precoUSD,
    produto.cotacao,
    produto.freteTotal,
    produto.quantidade || 1
  );

  const precoClassicoNum = parseFloat(precoVendaClassico) || 0;
  const precoPremiumNum = parseFloat(precoVendaPremium) || 0;
  const freteNum = parseFloat(freteCobrado) || 0;

  const taxaClassicoValor =
    precoClassicoNum > 0
      ? calcularTaxaML(precoClassicoNum, config.taxaClassico)
      : 0;
  const taxaPremiumValor =
    precoPremiumNum > 0
      ? calcularTaxaML(precoPremiumNum, config.taxaPremium)
      : 0;

  const lucroClassico =
    precoClassicoNum > 0
      ? calcularLucro(
          precoClassicoNum,
          1,
          freteNum,
          custoTotal,
          taxaClassicoValor
        )
      : 0;

  const lucroPremium =
    precoPremiumNum > 0
      ? calcularLucro(
          precoPremiumNum,
          1,
          freteNum,
          custoTotal,
          taxaPremiumValor
        )
      : 0;

  useEffect(() => {
    if (initialData) {
      setNome(initialData.nome || '');
      setPrecoVendaClassico(initialData.precoVendaClassico?.toString() || '');
      setPrecoVendaPremium(initialData.precoVendaPremium?.toString() || '');
      setFreteCobrado(initialData.freteCobrado?.toString() || '0');
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors([]);

    const parsedPrecoClassico = parseFloat(precoVendaClassico);
    const parsedPrecoPremium = parseFloat(precoVendaPremium);
    const parsedFrete = parseFloat(freteCobrado);

    const newErrors: string[] = [];
    if (!nome || nome.trim().length < 1) {
      newErrors.push('Nome do cenário é obrigatório');
    }
    if (isNaN(parsedPrecoClassico) || parsedPrecoClassico <= 0) {
      newErrors.push('Preço de venda clássico deve ser maior que zero');
    }
    if (isNaN(parsedPrecoPremium) || parsedPrecoPremium <= 0) {
      newErrors.push('Preço de venda premium deve ser maior que zero');
    }
    if (isNaN(parsedFrete) || parsedFrete < 0) {
      newErrors.push('Frete cobrado deve ser maior ou igual a zero');
    }

    if (newErrors.length > 0) {
      setErrors(newErrors);
      setLoading(false);
      return;
    }

    await onSubmit({
      nome: nome.trim(),
      precoVendaClassico: parsedPrecoClassico,
      precoVendaPremium: parsedPrecoPremium,
      freteCobrado: parsedFrete,
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
          htmlFor="nome"
          className="block text-sm font-medium text-foreground mb-1"
        >
          Nome do Cenário
        </label>
        <input
          type="text"
          id="nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:ring-primary focus:border-primary"
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="precoVendaClassico"
            className="block text-sm font-medium text-foreground mb-1"
          >
            Preço Venda Clássico (R$)
          </label>
          <input
            type="number"
            id="precoVendaClassico"
            value={precoVendaClassico}
            onChange={(e) => setPrecoVendaClassico(e.target.value)}
            className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:ring-primary focus:border-primary"
            step="0.01"
            required
          />
          {precoClassicoNum > 0 && (
            <div className="mt-1 text-sm text-muted-foreground">
              <div>Taxa ({config.taxaClassico}%): R$ {taxaClassicoValor.toFixed(2)}</div>
              <div
                className={
                  lucroClassico >= 0 ? 'text-green-600' : 'text-red-600'
                }
              >
                Lucro: R$ {lucroClassico.toFixed(2)}
              </div>
            </div>
          )}
        </div>

        <div>
          <label
            htmlFor="precoVendaPremium"
            className="block text-sm font-medium text-foreground mb-1"
          >
            Preço Venda Premium (R$)
          </label>
          <input
            type="number"
            id="precoVendaPremium"
            value={precoVendaPremium}
            onChange={(e) => setPrecoVendaPremium(e.target.value)}
            className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:ring-primary focus:border-primary"
            step="0.01"
            required
          />
          {precoPremiumNum > 0 && (
            <div className="mt-1 text-sm text-muted-foreground">
              <div>Taxa ({config.taxaPremium}%): R$ {taxaPremiumValor.toFixed(2)}</div>
              <div
                className={
                  lucroPremium >= 0 ? 'text-green-600' : 'text-red-600'
                }
              >
                Lucro: R$ {lucroPremium.toFixed(2)}
              </div>
            </div>
          )}
        </div>
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

      <div className="bg-muted p-3 rounded-md">
        <div className="text-sm font-medium text-foreground mb-2">
          Resumo do Cálculo
        </div>
        <div className="text-sm text-muted-foreground space-y-1">
          <div>Custo Unitário: R$ {custoTotal.toFixed(2)}</div>
          {precoClassicoNum > 0 && (
            <div>
              Clássico: R$ {precoClassicoNum.toFixed(2)} + R${' '}
              {freteNum.toFixed(2)} - R$ {custoTotal.toFixed(2)} - R${' '}
              {taxaClassicoValor.toFixed(2)} ={' '}
              <span
                className={lucroClassico >= 0 ? 'text-green-600' : 'text-red-600'}
              >
                R$ {lucroClassico.toFixed(2)}
              </span>
            </div>
          )}
          {precoPremiumNum > 0 && (
            <div>
              Premium: R$ {precoPremiumNum.toFixed(2)} + R${' '}
              {freteNum.toFixed(2)} - R$ {custoTotal.toFixed(2)} - R${' '}
              {taxaPremiumValor.toFixed(2)} ={' '}
              <span
                className={lucroPremium >= 0 ? 'text-green-600' : 'text-red-600'}
              >
                R$ {lucroPremium.toFixed(2)}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2">
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
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {loading && <LoadingSpinner size="sm" />}
          {loading ? (initialData ? 'Salvando...' : 'Criando...') : (initialData ? 'Salvar' : 'Criar Cenário')}
        </button>
      </div>
    </form>
  );
}
