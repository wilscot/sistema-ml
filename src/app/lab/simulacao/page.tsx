'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CenarioList } from '@/components/CenarioList';
import { CenarioForm } from '@/components/CenarioForm';
import type { ProdutoLab } from '@/types/produto';
import type { Cenario } from '@/types/cenario';

export default function SimulacaoLabPage() {
  const [produtoSelecionado, setProdutoSelecionado] = useState<number | null>(null);
  const [produtos, setProdutos] = useState<ProdutoLab[]>([]);
  const [cenarios, setCenarios] = useState<Cenario[]>([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [loadingProdutos, setLoadingProdutos] = useState(true);
  const [loadingCenarios, setLoadingCenarios] = useState(false);

  const buscarProdutos = async () => {
    try {
      setLoadingProdutos(true);
      const response = await fetch('/api/produtos?modo=LAB');
      if (!response.ok) throw new Error('Erro ao buscar produtos');
      const data = await response.json();
      setProdutos(data.produtos || []);
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
    } finally {
      setLoadingProdutos(false);
    }
  };

  const buscarCenarios = async (produtoId: number) => {
    try {
      setLoadingCenarios(true);
      const response = await fetch(`/api/cenarios?produtoId=${produtoId}`);
      if (!response.ok) throw new Error('Erro ao buscar cenários');
      const data = await response.json();
      setCenarios(data.cenarios || []);
    } catch (error) {
      console.error('Erro ao buscar cenários:', error);
    } finally {
      setLoadingCenarios(false);
    }
  };

  useEffect(() => {
    buscarProdutos();
  }, []);

  useEffect(() => {
    if (produtoSelecionado) {
      buscarCenarios(produtoSelecionado);
    } else {
      setCenarios([]);
    }
  }, [produtoSelecionado]);

  const handleNovoCenario = () => {
    setModalAberto(true);
  };

  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`/api/cenarios/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Erro ao deletar cenário');
      if (produtoSelecionado) {
        buscarCenarios(produtoSelecionado);
      }
    } catch (error) {
      console.error('Erro ao deletar cenário:', error);
    }
  };

  const handleSuccess = () => {
    setModalAberto(false);
    if (produtoSelecionado) {
      buscarCenarios(produtoSelecionado);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-4">Simulação de Cenários LAB</h1>

        <div className="flex items-center gap-4 mb-6">
          <div className="w-64">
            <Select
              value={produtoSelecionado?.toString() || ''}
              onValueChange={(value) => setProdutoSelecionado(parseInt(value, 10))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um produto LAB" />
              </SelectTrigger>
              <SelectContent>
                {loadingProdutos ? (
                  <SelectItem value="loading" disabled>
                    Carregando...
                  </SelectItem>
                ) : produtos.length === 0 ? (
                  <SelectItem value="empty" disabled>
                    Nenhum produto cadastrado
                  </SelectItem>
                ) : (
                  produtos.map((produto) => (
                    <SelectItem key={produto.id} value={produto.id.toString()}>
                      {produto.nome}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {produtoSelecionado && (
            <Button onClick={handleNovoCenario}>+ Novo Cenário</Button>
          )}
        </div>
      </div>

      {produtoSelecionado ? (
        loadingCenarios ? (
          <div className="text-center py-8">Carregando cenários...</div>
        ) : (
          <CenarioList cenarios={cenarios} onDelete={handleDelete} />
        )
      ) : (
        <div className="text-center py-10 text-muted-foreground">
          <p>Selecione um produto para visualizar ou criar cenários de simulação.</p>
        </div>
      )}

      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Novo Cenário de Simulação</DialogTitle>
          </DialogHeader>
          {produtoSelecionado && (
            <CenarioForm produtoId={produtoSelecionado} onSuccess={handleSuccess} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
