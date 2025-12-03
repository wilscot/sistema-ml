'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface ProdutoQuickCreateDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (produto: { id: number; nome: string }) => void;
}

export default function ProdutoQuickCreateDialog({
  open,
  onClose,
  onSuccess,
}: ProdutoQuickCreateDialogProps) {
  const [nome, setNome] = useState('');
  const [fornecedor, setFornecedor] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/produtos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: nome.trim(),
          fornecedor: fornecedor.trim() || null,
          modo: 'PROD',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        
        // Tratar erro de nome duplicado
        if (error.error?.includes('UNIQUE') || error.error?.includes('duplicado') || error.error?.includes('já existe')) {
          toast({
            title: 'Produto já existe',
            description: 'Já existe um produto com este nome. Escolha outro nome.',
            variant: 'destructive',
          });
          return;
        }
        
        throw new Error(error.error || 'Erro ao criar produto');
      }

      const data = await response.json();

      toast({
        title: 'Produto criado!',
        description: `${nome} foi cadastrado com sucesso.`,
      });

      onSuccess({ id: data.produto.id, nome });
      
      // Limpar form e fechar
      setNome('');
      setFornecedor('');
      onClose();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao criar produto',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setNome('');
      setFornecedor('');
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cadastrar Novo Produto</DialogTitle>
          <DialogDescription>
            Cadastre rapidamente um novo produto para adicionar à compra.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome do Produto *</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Xiaomi TV Stick 4K"
              required
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Nome deve ser único
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fornecedor">Fornecedor (opcional)</Label>
            <Input
              id="fornecedor"
              value={fornecedor}
              onChange={(e) => setFornecedor(e.target.value)}
              placeholder="Ex: AliExpress, Amazon"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Criando...' : 'Criar Produto'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

