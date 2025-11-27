'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  calcularCustoUnitario,
  calcularReceita,
  calcularTaxaML,
  calcularLucroLiquido,
} from '@/lib/calculators';
import { validarCenario } from '@/lib/validators';
import type { Cenario, CenarioInput } from '@/types/cenario';
import type { ProdutoLab } from '@/types/produto';
import type { Configuracao } from '@/types/configuracao';

interface CenarioFormProps {
  produtoId: number;
  cenario?: Cenario;
  onSuccess: () => void;
}

export function CenarioForm({ produtoId, cenario, onSuccess }: CenarioFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  const [nome, setNome] = useState('');
  const [precoVendaClassico, setPrecoVendaClassico] = useState<number | ''>('');
  const [precoVendaPremium, setPrecoVendaPremium] = useState<number | ''>('');

  const [produto, setProduto] = useState<ProdutoLab | null>(null);
  const [config, setConfig] = useState<Configuracao | null>(null);

  // Buscar produto e configurações
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingData(true);

        // Buscar produto
        const produtoResponse = await fetch(`/api/produtos/${produtoId}?modo=LAB`);
        if (!produtoResponse.ok) throw new Error('Produto não encontrado');
        const produtoData = await produtoResponse.json();
        setProduto(produtoData.produto);

        // Buscar configurações
        const configResponse = await fetch('/api/configuracoes?modo=LAB');
        if (!configResponse.ok) throw new Error('Configurações não encontradas');
        const configData = await configResponse.json();
        setConfig(configData.configuracao);
      } catch (error) {
        console.error('Erro ao buscar dados:', error);
        toast({
          title: 'Erro',
          description: 'Erro ao carregar dados do produto',
          variant: 'destructive',
        });
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [produtoId, toast]);

  // Carregar dados do cenário se estiver editando
  useEffect(() => {
    if (cenario) {
      setNome(cenario.nome);
      setPrecoVendaClassico(cenario.precoVendaClassico);
      setPrecoVendaPremium(cenario.precoVendaPremium);
    }
  }, [cenario]);

  // Calcular preview de lucros
  const calcularPreview = () => {
    if (!produto || !config || !precoVendaClassico || !precoVendaPremium) {
      return { lucroClassico: 0, lucroPremium: 0 };
    }

    const custoUnitario = calcularCustoUnitario(
      produto.precoUSD,
      produto.cotacao,
      produto.freteTotal,
      1
    );

    const receitaClassico = calcularReceita(
      Number(precoVendaClassico),
      1,
      0
    );
    const receitaPremium = calcularReceita(
      Number(precoVendaPremium),
      1,
      0
    );

    const taxaMLClassico = calcularTaxaML(
      Number(precoVendaClassico),
      config.taxaClassico
    );
    const taxaMLPremium = calcularTaxaML(
      Number(precoVendaPremium),
      config.taxaPremium
    );

    const lucroClassico = calcularLucroLiquido(
      receitaClassico,
      custoUnitario,
      taxaMLClassico
    );
    const lucroPremium = calcularLucroLiquido(
      receitaPremium,
      custoUnitario,
      taxaMLPremium
    );

    return { lucroClassico, lucroPremium };
  };

  const preview = calcularPreview();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const data: CenarioInput = {
      produtoId,
      nome,
      precoVendaClassico: Number(precoVendaClassico),
      precoVendaPremium: Number(precoVendaPremium),
    };

    const validation = validarCenario(data);
    if (!validation.valid) {
      toast({
        title: 'Erro de Validação',
        description: validation.errors.join(', '),
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/cenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao criar cenário');
      }

      toast({
        title: 'Sucesso',
        description: 'Cenário criado com sucesso!',
      });

      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao criar cenário',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return <div className="py-4 text-center">Carregando dados...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="nome" className="text-right">
          Nome do Cenário
        </Label>
        <Input
          id="nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="col-span-3"
          placeholder="Ex: Black Friday, Promoção Verão"
          required
        />
      </div>

      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="precoVendaClassico" className="text-right">
          Preço Venda Clássico (R$)
        </Label>
        <Input
          id="precoVendaClassico"
          type="number"
          step="0.01"
          value={precoVendaClassico}
          onChange={(e) =>
            setPrecoVendaClassico(e.target.value ? parseFloat(e.target.value) : '')
          }
          className="col-span-3"
          required
        />
      </div>

      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="precoVendaPremium" className="text-right">
          Preço Venda Premium (R$)
        </Label>
        <Input
          id="precoVendaPremium"
          type="number"
          step="0.01"
          value={precoVendaPremium}
          onChange={(e) =>
            setPrecoVendaPremium(e.target.value ? parseFloat(e.target.value) : '')
          }
          className="col-span-3"
          required
        />
      </div>

      {produto && config && precoVendaClassico && precoVendaPremium && (
        <div className="space-y-2 p-4 bg-muted rounded-lg">
          <div className="text-sm font-medium mb-2">Preview de Lucros:</div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-muted-foreground">Lucro Clássico:</div>
              <div
                className={`text-lg font-bold ${
                  preview.lucroClassico >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                R$ {preview.lucroClassico.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Lucro Premium:</div>
              <div
                className={`text-lg font-bold ${
                  preview.lucroPremium >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                R$ {preview.lucroPremium.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => onSuccess()}
          disabled={loading}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Criando...' : 'Criar Cenário'}
        </Button>
      </div>
    </form>
  );
}
