'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ProdutoList } from '@/components/ProdutoList';
import { ProdutoForm } from '@/components/ProdutoForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { ProdutoLab } from '@/types/produto';

export default function ProdutosLabPage() {
  const [modalAberto, setModalAberto] = useState(false);
  const [produtoEditando, setProdutoEditando] = useState<ProdutoLab | null>(null);
  const [produtos, setProdutos] = useState<ProdutoLab[]>([]);
  const [loading, setLoading] = useState(true);

  const buscarProdutos = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/produtos?modo=LAB');
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

  const handleEdit = (produto: ProdutoLab) => {
    setProdutoEditando(produto);
    setModalAberto(true);
  };

  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`/api/produtos/${id}?modo=LAB`, {
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
        <h1 className="text-3xl font-bold">Produtos LAB</h1>
        <Button onClick={handleNovoProduto}>+ Novo Produto LAB</Button>
      </div>

      {loading ? (
        <div className="text-center py-8">Carregando...</div>
      ) : (
        <ProdutoList
          modo="LAB"
          produtos={produtos}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {produtoEditando ? 'Editar Produto LAB' : 'Novo Produto LAB'}
            </DialogTitle>
          </DialogHeader>
          <ProdutoForm
            modo="LAB"
            produto={produtoEditando || undefined}
            onSuccess={handleSuccess}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
