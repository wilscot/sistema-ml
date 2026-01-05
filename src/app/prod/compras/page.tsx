'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { CompraList } from '@/components/CompraList';
import { CompraForm } from '@/components/CompraForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ModalCompraChina from '@/components/CompraChina/ModalCompraChina';
import type { Compra } from '@/types/compra';

export default function ComprasPage() {
  const [modalAberto, setModalAberto] = useState(false);
  const [showModalChina, setShowModalChina] = useState(false);
  const [compras, setCompras] = useState<Compra[]>([]);
  const [loading, setLoading] = useState(true);

  const buscarCompras = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/compras');
      if (!response.ok) throw new Error('Erro ao buscar compras');
      const data = await response.json();
      setCompras(data.compras || []);
    } catch (error) {
      console.error('Erro ao buscar compras:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    buscarCompras();
  }, []);

  const handleNovoCompra = () => {
    setModalAberto(true);
  };

  const handleSuccess = () => {
    setModalAberto(false);
    buscarCompras();
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Compras</h1>
        <div className="flex gap-2">
          <Button onClick={() => setShowModalChina(true)} variant="outline">
            Compra China
          </Button>
          <Button onClick={handleNovoCompra}>+ Registrar Compra</Button>
        </div>
      </div>

      <CompraList compras={compras} loading={loading} onDelete={buscarCompras} />

      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar Nova Compra</DialogTitle>
          </DialogHeader>
          <CompraForm onSuccess={handleSuccess} />
        </DialogContent>
      </Dialog>

      {showModalChina && (
        <ModalCompraChina
          onClose={() => setShowModalChina(false)}
          onSuccess={() => {
            setShowModalChina(false);
            buscarCompras();
          }}
        />
      )}
    </div>
  );
}
