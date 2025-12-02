'use client';

import { useState } from 'react';
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
import { calcularTaxaML } from '@/lib/calculators';
import LoadingSpinner from '@/components/LoadingSpinner';

interface Produto {
  id: number;
  nome: string;
  quantidade: number | null;
  tipo: string;
  deletedAt: number | null;
  precoUSD?: number;
  cotacao?: number;
  freteTotal?: number;
  moeda?: string;
}

interface Config {
  taxaClassico: number;
  taxaPremium: number;
}

interface VendaFormProps {
  produtos: Produto[];
  config: Config;
  onSubmit: (data: {
    produtoId: number;
    quantidadeVendida: number;
    precoVenda: number;
    tipoAnuncio: 'CLASSICO' | 'PREMIUM';
    freteCobrado: number;
    data: Date;
  }) => Promise<void>;
  onCancel?: () => void;
}

export default function VendaForm({ produtos, config, onSubmit, onCancel }: VendaFormProps) {
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
  const freteCobradoNum = parseFloat(freteCobrado) || 0;

  // Calcular taxa ML
  const taxaPercent = tipoAnuncio === 'CLASSICO' ? config.taxaClassico : config.taxaPremium;
  const taxaMLValor = precoVendaNum > 0 && quantidadeNum > 0
    ? calcularTaxaML(precoVendaNum * quantidadeNum, taxaPercent)
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);

    const validationErrors: string[] = [];

    if (!produtoId) {
      validationErrors.push('Selecione um produto');
    }

    const qtd = parseInt(quantidadeVendida);
    if (isNaN(qtd) || qtd <= 0) {
      validationErrors.push('Quantidade deve ser maior que zero');
    }

    if (qtd > estoqueDisponivel) {
      validationErrors.push(`Estoque insuficiente. Disponível: ${estoqueDisponivel}`);
    }

    const preco = parseFloat(precoVenda);
    if (isNaN(preco) || preco <= 0) {
      validationErrors.push('Preço de venda deve ser maior que zero');
    }

    const frete = parseFloat(freteCobrado);
    if (isNaN(frete) || frete < 0) {
      validationErrors.push('Frete cobrado deve ser maior ou igual a zero');
    }

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        produtoId: produtoId as number,
        quantidadeVendida: qtd,
        precoVenda: preco,
        tipoAnuncio,
        freteCobrado: frete, // Envia como freteCobrado para API
        data: new Date(data),
      });
    } catch (error: any) {
      setErrors([error.message || 'Erro ao registrar venda']);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errors.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
          <ul className="list-disc list-inside text-sm text-red-800 dark:text-red-200 space-y-1">
            {errors.map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="produto">Produto PROD *</Label>
        <Select
          value={produtoId ? produtoId.toString() : ''}
          onValueChange={(value) => setProdutoId(value ? parseInt(value) : '')}
          required
        >
          <SelectTrigger id="produto">
            <SelectValue placeholder="Selecione um produto..." />
          </SelectTrigger>
          <SelectContent>
            {produtosDisponiveis.map((p) => (
              <SelectItem key={p.id} value={p.id.toString()}>
                {p.nome} (Estoque: {p.quantidade})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {produtoSelecionado && (
          <p className="text-xs text-muted-foreground">
            Estoque disponível: {estoqueDisponivel} unidades
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="quantidade">Quantidade Vendida *</Label>
          <Input
            type="number"
            id="quantidade"
            value={quantidadeVendida}
            onChange={(e) => setQuantidadeVendida(e.target.value)}
            min="1"
            max={estoqueDisponivel}
            required
            placeholder="0"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="preco">Preço Venda (R$) *</Label>
          <Input
            type="number"
            id="preco"
            value={precoVenda}
            onChange={(e) => setPrecoVenda(e.target.value)}
            step="0.01"
            min="0.01"
            required
            placeholder="0.00"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="tipo">Tipo de Anúncio *</Label>
          <Select
            value={tipoAnuncio}
            onValueChange={(value) => setTipoAnuncio(value as 'CLASSICO' | 'PREMIUM')}
            required
          >
            <SelectTrigger id="tipo">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CLASSICO">Clássico ({config.taxaClassico}%)</SelectItem>
              <SelectItem value="PREMIUM">Premium ({config.taxaPremium}%)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="frete">Frete Cobrado (R$) *</Label>
          <Input
            type="number"
            id="frete"
            value={freteCobrado}
            onChange={(e) => setFreteCobrado(e.target.value)}
            step="0.01"
            min="0"
            required
            placeholder="0.00"
          />
          <p className="text-xs text-muted-foreground">
            Frete pago pelo vendedor (custo)
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="data">Data da Venda *</Label>
        <Input
          type="date"
          id="data"
          value={data}
          onChange={(e) => setData(e.target.value)}
          required
        />
      </div>

      {produtoSelecionado && precoVendaNum > 0 && quantidadeNum > 0 && (
        <div className="p-4 bg-muted rounded-md space-y-2 border border-border">
          <div className="text-sm font-medium text-foreground mb-2">
            Preview do Cálculo
          </div>
          <div className="text-sm text-muted-foreground space-y-1">
            <div className="flex justify-between">
              <span>Receita Total (sem frete):</span>
              <span className="text-foreground font-medium">
                R$ {(precoVendaNum * quantidadeNum).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-red-600 dark:text-red-400">
              <span>(-) Taxa ML ({taxaPercent}%):</span>
              <span className="font-medium">R$ {taxaMLValor.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-red-600 dark:text-red-400">
              <span>(-) Frete Pago:</span>
              <span className="font-medium">R$ {freteCobradoNum.toFixed(2)}</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground italic mt-2">
            * Lucro líquido será calculado com FIFO no servidor após validação do estoque
          </p>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={loading || !produtoSelecionado}>
          {loading ? 'Registrando...' : 'Registrar Venda'}
        </Button>
      </div>
    </form>
  );
}
