'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ProdutoList } from '@/components/ProdutoList';
import { ProdutoForm } from '@/components/ProdutoForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { ProdutoLab, ProdutoProd } from '@/types/produto';

export default function ProdutosProdPage() {
  const [modalAberto, setModalAberto] = useState(false);
  const [produtoEditando, setProdutoEditando] = useState<ProdutoProd | null>(null);
  const [produtos, setProdutos] = useState<ProdutoProd[]>([]);
  const [loading, setLoading] = useState(true);

  const buscarProdutos = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/produtos?modo=PROD');
      if (!response.ok) throw new Error('Erro ao buscar produtos');
      const data = await response.json();
      setProdutos(data.produtos || []);
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    buscarProdutos();
  }, []);

  const handleNovoProduto = () => {
    setProdutoEditando(null);
    setModalAberto(true);
  };

  const handleEdit = (produto: ProdutoLab | ProdutoProd) => {
    setProdutoEditando(produto as ProdutoProd);
    setModalAberto(true);
  };

  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`/api/produtos/${id}?modo=PROD`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Erro ao deletar produto');
      await buscarProdutos();
    } catch (error) {
      console.error('Erro ao deletar produto:', error);
    }
  };

  const handleSuccess = () => {
    setModalAberto(false);
    setProdutoEditando(null);
    buscarProdutos();
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Produtos PROD</h1>
        <Button onClick={handleNovoProduto}>+ Novo Produto PROD</Button>
      </div>

      <ProdutoList
        modo="PROD"
        produtos={produtos}
        onEdit={handleEdit}
        onDelete={handleDelete}
        loading={loading}
      />

      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {produtoEditando ? 'Editar Produto PROD' : 'Novo Produto PROD'}
            </DialogTitle>
          </DialogHeader>
          <ProdutoForm
            modo="PROD"
            produto={produtoEditando || undefined}
            onSuccess={handleSuccess}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
