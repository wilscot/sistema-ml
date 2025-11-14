'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import LoadingSpinner from '@/components/LoadingSpinner';
import type { Configuracao } from '@/db/schema';

interface ConfigFormProps {
  config: Configuracao;
  onSubmit: (data: {
    taxaClassico: number;
    taxaPremium: number;
    cotacaoDolar: number | null;
  }) => Promise<void>;
}

export default function ConfigForm({ config, onSubmit }: ConfigFormProps) {
  const [taxaClassico, setTaxaClassico] = useState(
    config.taxaClassico?.toString() || '11'
  );
  const [taxaPremium, setTaxaPremium] = useState(
    config.taxaPremium?.toString() || '16'
  );
  const [cotacaoDolar, setCotacaoDolar] = useState(
    config.cotacaoDolar?.toString() || ''
  );
  const [loading, setLoading] = useState(false);
  const [loadingCotacao, setLoadingCotacao] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (config) {
      setTaxaClassico(config.taxaClassico?.toString() || '11');
      setTaxaPremium(config.taxaPremium?.toString() || '16');
      setCotacaoDolar(config.cotacaoDolar?.toString() || '');
    }
  }, [config]);

  const handleBuscarCotacao = async () => {
    setLoadingCotacao(true);
    try {
      const response = await fetch('/api/cotacao');
      if (response.ok) {
        const data = await response.json();
        if (data.cotacao) {
          setCotacaoDolar(data.cotacao.toFixed(2));
        } else {
          setErrors((prev) => [
            ...prev,
            'Erro ao buscar cotação. Insira manualmente.',
          ]);
        }
      } else {
        setErrors((prev) => [
          ...prev,
          'Erro ao buscar cotação. Insira manualmente.',
        ]);
      }
    } catch (err) {
      setErrors((prev) => [
        ...prev,
        'Erro ao buscar cotação. Insira manualmente.',
      ]);
    } finally {
      setLoadingCotacao(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors([]);

    const parsedTaxaClassico = parseFloat(taxaClassico);
    const parsedTaxaPremium = parseFloat(taxaPremium);
    const parsedCotacaoDolar = cotacaoDolar
      ? parseFloat(cotacaoDolar)
      : null;

    const newErrors: string[] = [];

    if (isNaN(parsedTaxaClassico) || parsedTaxaClassico < 0 || parsedTaxaClassico > 100) {
      newErrors.push('Taxa clássico deve estar entre 0 e 100');
    }

    if (isNaN(parsedTaxaPremium) || parsedTaxaPremium < 0 || parsedTaxaPremium > 100) {
      newErrors.push('Taxa premium deve estar entre 0 e 100');
    }

    if (parsedCotacaoDolar !== null) {
      if (isNaN(parsedCotacaoDolar) || parsedCotacaoDolar <= 0) {
        newErrors.push('Cotação do dólar deve ser um número positivo');
      }
    }

    if (newErrors.length > 0) {
      setErrors(newErrors);
      setLoading(false);
      return;
    }

    await onSubmit({
      taxaClassico: parsedTaxaClassico,
      taxaPremium: parsedTaxaPremium,
      cotacaoDolar: parsedCotacaoDolar,
    });
    setLoading(false);
  };

  const formatDate = (timestamp: Date | null) => {
    if (!timestamp) return 'Nunca';
    try {
      return format(new Date(timestamp), "dd/MM/yyyy 'às' HH:mm");
    } catch {
      return 'Nunca';
    }
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="taxaClassico"
            className="block text-sm font-medium text-foreground mb-1"
          >
            Taxa ML Clássico (%)
          </label>
          <input
            type="number"
            id="taxaClassico"
            value={taxaClassico}
            onChange={(e) => setTaxaClassico(e.target.value)}
            className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:ring-primary focus:border-primary"
            min="0"
            max="100"
            step="0.01"
            required
          />
          <p className="text-xs text-muted-foreground mt-1">
            Taxa aplicada em anúncios clássicos (0-100%)
          </p>
        </div>

        <div>
          <label
            htmlFor="taxaPremium"
            className="block text-sm font-medium text-foreground mb-1"
          >
            Taxa ML Premium (%)
          </label>
          <input
            type="number"
            id="taxaPremium"
            value={taxaPremium}
            onChange={(e) => setTaxaPremium(e.target.value)}
            className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:ring-primary focus:border-primary"
            min="0"
            max="100"
            step="0.01"
            required
          />
          <p className="text-xs text-muted-foreground mt-1">
            Taxa aplicada em anúncios premium (0-100%)
          </p>
        </div>
      </div>

      <div>
        <label
          htmlFor="cotacaoDolar"
          className="block text-sm font-medium text-foreground mb-1"
        >
          Cotação do Dólar (R$)
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            id="cotacaoDolar"
            value={cotacaoDolar}
            onChange={(e) => setCotacaoDolar(e.target.value)}
            className="flex-1 px-3 py-2 border border-input rounded-md bg-background text-foreground focus:ring-primary focus:border-primary"
            step="0.01"
            placeholder="Ex: 5.50"
          />
          <button
            type="button"
            onClick={handleBuscarCotacao}
            disabled={loadingCotacao}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loadingCotacao && <LoadingSpinner size="sm" />}
            {loadingCotacao ? 'Buscando...' : 'Atualizar Cotação'}
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Cotação atual: {config.cotacaoDolar ? `R$ ${config.cotacaoDolar.toFixed(2)}` : 'Não definida'} | Última atualização: {formatDate(config.updatedAt)}
        </p>
      </div>

      <div className="bg-muted p-4 rounded-md">
        <div className="text-sm font-medium text-foreground mb-2">
          Informações
        </div>
        <div className="text-sm text-muted-foreground space-y-1">
          <div>
            As taxas ML são aplicadas automaticamente no cálculo de lucro das
            vendas e cenários.
          </div>
          <div>
            A cotação do dólar pode ser atualizada automaticamente via API ou
            inserida manualmente.
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {loading && <LoadingSpinner size="sm" />}
          {loading ? 'Salvando...' : 'Salvar Configurações'}
        </button>
      </div>
    </form>
  );
}
