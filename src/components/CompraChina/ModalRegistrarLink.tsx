'use client';

import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ModalRegistrarLinkProps {
  lote: any;
  compra: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ModalRegistrarLink({ lote, compra, onClose, onSuccess }: ModalRegistrarLinkProps) {
  const [quantidade, setQuantidade] = useState(lote.quantidade);
  const [valorTotal, setValorTotal] = useState('');
  const [dataCompra, setDataCompra] = useState(new Date().toISOString().split('T')[0]);
  const [ordemAliexpress, setOrdemAliexpress] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Calcular custo por unidade
  const custoUnitario = valorTotal && quantidade > 0 
    ? (parseFloat(valorTotal) / quantidade).toFixed(2) 
    : (compra.custoUnitarioLink || 0).toFixed(2);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!valorTotal || parseFloat(valorTotal) <= 0) {
      alert('Informe o valor total pago');
      return;
    }

    try {
      setSubmitting(true);

      const res = await fetch(`/api/lotes-china/${lote.id}/registrar-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantidade,
          valorTotal: parseFloat(valorTotal),
          dataCompra: Math.floor(new Date(dataCompra).getTime() / 1000),
          ordemAliexpress: ordemAliexpress || null
        })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Erro ao registrar link');
      }

      onSuccess();
    } catch (error: any) {
      alert(error.message || 'Erro ao registrar link');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border rounded-lg w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold">Registrar Compra de Link</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Lote #{lote.numeroLote}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Quantidade */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              Quantidade de Unidades
            </label>
            <input
              type="number"
              min="1"
              value={quantidade}
              onChange={(e) => setQuantidade(parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Padrao: {lote.quantidade} unidades
            </p>
          </div>

          {/* Valor Total */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              Valor Total Pago (BRL) *
            </label>
            <input
              type="number"
              step="0.01"
              value={valorTotal}
              onChange={(e) => setValorTotal(e.target.value)}
              placeholder="165.43"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Copie do AliExpress
            </p>
          </div>

          {/* Custo Unitario (calculado) */}
          {valorTotal && (
            <div className="bg-muted rounded-lg p-3">
              <p className="text-sm text-muted-foreground">Custo por unidade:</p>
              <p className="text-lg font-bold">R$ {custoUnitario}</p>
            </div>
          )}

          {/* Data da Compra */}
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
            <p className="text-xs text-muted-foreground mt-1">
              Editavel - ajuste se comprou em outro dia
            </p>
          </div>

          {/* Ordem AliExpress */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              Numero da Ordem (opcional)
            </label>
            <input
              type="text"
              value={ordemAliexpress}
              onChange={(e) => setOrdemAliexpress(e.target.value)}
              placeholder="8207367298811650"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Pode adicionar depois
            </p>
          </div>

          {/* Botoes */}
          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Compra'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

