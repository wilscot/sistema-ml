'use client';

import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ModalCompraChinaProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function ModalCompraChina({ onClose, onSuccess }: ModalCompraChinaProps) {
  const [produtos, setProdutos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Campos do formulario
  const [produtoId, setProdutoId] = useState('');
  const [quantidade, setQuantidade] = useState(12);
  const [paypalUSD, setPaypalUSD] = useState('');
  const [paypalBRL, setPaypalBRL] = useState('');
  const [valorLinkPor2, setValorLinkPor2] = useState('');
  const [quantidadePorLote, setQuantidadePorLote] = useState(2);
  const [fornecedor, setFornecedor] = useState('Elenashi China');
  const [dataCompra, setDataCompra] = useState(new Date().toISOString().split('T')[0]);
  
  // Calculos automaticos
  const cotacao = paypalBRL && paypalUSD ? (parseFloat(paypalBRL) / parseFloat(paypalUSD)) : 0;
  const numLotes = Math.ceil(quantidade / quantidadePorLote);
  const freteEstimado = numLotes * (parseFloat(valorLinkPor2) || 0);
  const custoTotal = (parseFloat(paypalBRL) || 0) + freteEstimado;
  const custoUnitario = quantidade > 0 ? custoTotal / quantidade : 0;
  const custoUnitarioLink = quantidadePorLote > 0 ? parseFloat(valorLinkPor2 || '0') / quantidadePorLote : 0;

  useEffect(() => {
    carregarProdutos();
  }, []);

  const carregarProdutos = async () => {
    try {
      console.log('Carregando produtos...');
      const res = await fetch('/api/produtos?modo=PROD');
      console.log('Status:', res.status);
      
      const data = await res.json();
      console.log('Dados:', data);
      
      setProdutos(data.produtos || []);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!produtoId || !paypalUSD || !paypalBRL || !valorLinkPor2) {
      alert('Preencha todos os campos obrigatorios');
      return;
    }

    try {
      setLoading(true);
      
      const res = await fetch('/api/compras/china', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          produtoId: parseInt(produtoId),
          quantidade,
          paypalUSD: parseFloat(paypalUSD),
          paypalBRL: parseFloat(paypalBRL),
          valorLinkInicial: parseFloat(valorLinkPor2),
          quantidadePorLote,
          fornecedor,
          dataCompra: Math.floor(new Date(dataCompra).getTime() / 1000)
        })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Erro ao criar compra');
      }

      onSuccess();
    } catch (error: any) {
      alert(error.message || 'Erro ao criar compra');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold">Compra China</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Registro simplificado com tracking de lotes
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Produto e Quantidade */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2">
                Produto *
              </label>
              <select
                value={produtoId}
                onChange={(e) => setProdutoId(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
                required
              >
                <option value="">Selecione...</option>
                {produtos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-semibold mb-2">
                Quantidade Total *
              </label>
              <input
                type="number"
                min="1"
                value={quantidade}
                onChange={(e) => setQuantidade(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
                required
              />
            </div>
          </div>

          {/* PayPal */}
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="font-semibold mb-3">Pagamento PayPal</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Valor USD *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={paypalUSD}
                  onChange={(e) => setPaypalUSD(e.target.value)}
                  placeholder="540.00"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  Valor BRL *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={paypalBRL}
                  onChange={(e) => setPaypalBRL(e.target.value)}
                  placeholder="3150.00"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
                  required
                />
              </div>
            </div>
            
            {cotacao > 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                Cotacao: R$ {cotacao.toFixed(3)}
              </p>
            )}
          </div>

          {/* Links AliExpress */}
          <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <h3 className="font-semibold mb-3">Links AliExpress</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Valor do primeiro link *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={valorLinkPor2}
                  onChange={(e) => setValorLinkPor2(e.target.value)}
                  placeholder="165.00"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Copie do AliExpress
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  Unidades por lote
                </label>
                <input
                  type="number"
                  min="1"
                  value={quantidadePorLote}
                  onChange={(e) => setQuantidadePorLote(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>
            </div>
            
            <div className="text-sm text-muted-foreground mt-3 space-y-1">
              <p>Lotes necessarios: {numLotes}</p>
              <p>Frete estimado: R$ {freteEstimado.toFixed(2)}</p>
              <p>Custo por unidade (link): R$ {custoUnitarioLink.toFixed(2)}</p>
            </div>
          </div>

          {/* Resumo */}
          <div className="bg-muted rounded-lg p-4">
            <h3 className="font-semibold mb-3">Resumo</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Pagamento PayPal:</span>
                <strong>R$ {parseFloat(paypalBRL || '0').toFixed(2)}</strong>
              </div>
              <div className="flex justify-between">
                <span>Frete estimado ({numLotes} lotes):</span>
                <strong>R$ {freteEstimado.toFixed(2)}</strong>
              </div>
              <div className="h-px bg-border my-2"></div>
              <div className="flex justify-between text-base">
                <span className="font-semibold">Custo Total:</span>
                <strong className="text-primary">R$ {custoTotal.toFixed(2)}</strong>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Custo Unitario:</span>
                <strong className="text-primary">R$ {custoUnitario.toFixed(2)}</strong>
              </div>
            </div>
          </div>

          {/* Fornecedor e Data */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2">
                Fornecedor
              </label>
              <input
                type="text"
                value={fornecedor}
                onChange={(e) => setFornecedor(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold mb-2">
                Data da Compra
              </label>
              <input
                type="date"
                value={dataCompra}
                onChange={(e) => setDataCompra(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
          </div>

          {/* Botoes */}
          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                'Criar Compra China'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

