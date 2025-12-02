'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { validarConfiguracao } from '@/lib/validators';
import type { Configuracao, ConfiguracaoInput } from '@/types/configuracao';
import LoadingSpinner from '@/components/LoadingSpinner';

interface ConfiguracoesFormProps {
  modo: 'LAB' | 'PROD';
  configuracao: Configuracao | null;
  onSuccess: () => void;
}

export function ConfiguracoesForm({
  modo,
  configuracao,
  onSuccess,
}: ConfiguracoesFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingCotacao, setLoadingCotacao] = useState(false);

  const [taxaClassico, setTaxaClassico] = useState<number | ''>('');
  const [taxaPremium, setTaxaPremium] = useState<number | ''>('');
  const [cotacaoDolar, setCotacaoDolar] = useState<number | ''>('');

  // Preencher campos quando configuracao mudar
  useEffect(() => {
    if (configuracao) {
      setTaxaClassico(configuracao.taxaClassico);
      setTaxaPremium(configuracao.taxaPremium);
      setCotacaoDolar(configuracao.cotacaoDolar);
    }
  }, [configuracao]);

  const handleBuscarCotacao = async () => {
    setLoadingCotacao(true);
    try {
      const response = await fetch('/api/cotacao');
      if (!response.ok) {
        throw new Error('Erro ao buscar cotação');
      }
      const data = await response.json();
      setCotacaoDolar(data.cotacao);
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
      const data: ConfiguracaoInput = {
        taxaClassico:
          typeof taxaClassico === 'number'
            ? taxaClassico
            : parseFloat(taxaClassico.toString()),
        taxaPremium:
          typeof taxaPremium === 'number'
            ? taxaPremium
            : parseFloat(taxaPremium.toString()),
        cotacaoDolar:
          typeof cotacaoDolar === 'number'
            ? cotacaoDolar
            : parseFloat(cotacaoDolar.toString()),
      };

      const validation = validarConfiguracao(data);
      if (!validation.valid) {
        toast({
          title: 'Dados inválidos',
          description: validation.errors.join(', '),
          variant: 'destructive',
        });
        return;
      }

      const response = await fetch(
        `/api/configuracoes?modo=${modo}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao atualizar configurações');
      }

      toast({
        title: 'Sucesso',
        description: 'Configurações atualizadas!',
      });

      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao atualizar configurações',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!configuracao) {
    return <LoadingSpinner />;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="taxaClassico">Taxa Clássico (%) *</Label>
          <Input
            id="taxaClassico"
            type="number"
            step="0.01"
            min="0"
            max="100"
            value={taxaClassico}
            onChange={(e) =>
              setTaxaClassico(
                e.target.value ? parseFloat(e.target.value) : ''
              )
            }
            required
            placeholder="11.0"
          />
          <p className="text-xs text-muted-foreground">
            Taxa do Mercado Livre para anúncios clássicos (0-100%)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="taxaPremium">Taxa Premium (%) *</Label>
          <Input
            id="taxaPremium"
            type="number"
            step="0.01"
            min="0"
            max="100"
            value={taxaPremium}
            onChange={(e) =>
              setTaxaPremium(
                e.target.value ? parseFloat(e.target.value) : ''
              )
            }
            required
            placeholder="16.0"
          />
          <p className="text-xs text-muted-foreground">
            Taxa do Mercado Livre para anúncios premium (0-100%)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="cotacaoDolar">Cotação Dólar (R$) *</Label>
          <div className="flex gap-2">
            <Input
              id="cotacaoDolar"
              type="number"
              step="0.01"
              min="0.01"
              value={cotacaoDolar}
              onChange={(e) =>
                setCotacaoDolar(
                  e.target.value ? parseFloat(e.target.value) : ''
                )
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
              {loadingCotacao ? '...' : 'Buscar Cotação'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Cotação USD → BRL para cálculos de custo
          </p>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="submit" disabled={loading}>
          {loading ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </div>
    </form>
  );
}
