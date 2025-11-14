'use client';

import { useState, useEffect, useCallback } from 'react';
import CenarioCard from '@/components/CenarioCard';
import CenarioForm from '@/components/CenarioForm';
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog';
import Toast from '@/components/Toast';
import LoadingSpinner from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import { FileText, Package } from 'lucide-react';
import type { Produto, Cenario } from '@/db/schema';

export default function SimulacaoPage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState<number | null>(
    null
  );
  const [produtoData, setProdutoData] = useState<Produto | null>(null);
  const [cenarios, setCenarios] = useState<Cenario[]>([]);
  const [config, setConfig] = useState<{
    taxaClassico: number;
    taxaPremium: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingCenarios, setLoadingCenarios] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingCenario, setEditingCenario] = useState<Cenario | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    cenarioId: number | null;
  }>({ isOpen: false, cenarioId: null });
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
    isVisible: boolean;
  }>({ message: '', type: 'info', isVisible: false });

  const fetchProdutos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/produtos?tipo=LAB');

      if (!response.ok) {
        throw new Error('Erro ao carregar produtos');
      }

      const data = await response.json();
      setProdutos(data.produtos || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      setProdutos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchConfig = useCallback(async () => {
    try {
      const response = await fetch('/api/configuracoes');
      if (response.ok) {
        const data = await response.json();
        setConfig(data.config);
      }
    } catch (err) {
      console.error('Erro ao buscar configurações:', err);
    }
  }, []);

  const fetchCenarios = useCallback(
    async (produtoId: number) => {
      try {
        setLoadingCenarios(true);
        const response = await fetch(`/api/cenarios?produtoId=${produtoId}`);

        if (!response.ok) {
          throw new Error('Erro ao carregar cenários');
        }

        const data = await response.json();
        setCenarios(data.cenarios || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
        setCenarios([]);
      } finally {
        setLoadingCenarios(false);
      }
    },
    []
  );

  const fetchProdutoData = useCallback(async (produtoId: number) => {
    try {
      const response = await fetch(`/api/produtos/${produtoId}`);
      if (response.ok) {
        const data = await response.json();
        setProdutoData(data.produto);
      }
    } catch (err) {
      console.error('Erro ao buscar produto:', err);
    }
  }, []);

  useEffect(() => {
    fetchProdutos();
    fetchConfig();
  }, [fetchProdutos, fetchConfig]);

  useEffect(() => {
    if (produtoSelecionado) {
      fetchCenarios(produtoSelecionado);
      fetchProdutoData(produtoSelecionado);
    } else {
      setCenarios([]);
      setProdutoData(null);
    }
  }, [produtoSelecionado, fetchCenarios, fetchProdutoData]);

  const showToast = (
    message: string,
    type: 'success' | 'error' | 'info' = 'info'
  ) => {
    setToast({ message, type, isVisible: true });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, isVisible: false }));
    }, 3000);
  };

  const handleNovoCenario = () => {
    setEditingCenario(null);
    setShowForm(true);
  };

  const handleEditCenario = (cenarioId: number) => {
    const cenario = cenarios.find((c) => c.id === cenarioId);
    if (cenario) {
      setEditingCenario(cenario);
      setShowForm(true);
    }
  };

  const handleDeleteCenario = (cenarioId: number) => {
    setDeleteDialog({ isOpen: true, cenarioId });
  };

  const confirmDeleteCenario = async () => {
    if (!deleteDialog.cenarioId) return;

    try {
      const response = await fetch(
        `/api/cenarios/${deleteDialog.cenarioId}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao deletar cenário');
      }

      showToast('Cenário deletado com sucesso', 'success');
      setDeleteDialog({ isOpen: false, cenarioId: null });
      if (produtoSelecionado) {
        fetchCenarios(produtoSelecionado);
      }
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Erro ao deletar cenário',
        'error'
      );
    }
  };

  const handleSubmitCenario = async (data: {
    nome: string;
    precoVendaClassico: number;
    precoVendaPremium: number;
    freteCobrado: number;
  }) => {
    if (!produtoSelecionado || !config) return;

    try {
      const url = editingCenario
        ? `/api/cenarios/${editingCenario.id}`
        : '/api/cenarios';
      const method = editingCenario ? 'PATCH' : 'POST';

      const body = editingCenario
        ? {
            ...data,
            taxaClassico: config.taxaClassico,
            taxaPremium: config.taxaPremium,
          }
        : {
            produtoId: produtoSelecionado,
            ...data,
            taxaClassico: config.taxaClassico,
            taxaPremium: config.taxaPremium,
          };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao salvar cenário');
      }

      showToast(
        editingCenario
          ? 'Cenário atualizado com sucesso'
          : 'Cenário criado com sucesso',
        'success'
      );
      setShowForm(false);
      setEditingCenario(null);
      if (produtoSelecionado) {
        fetchCenarios(produtoSelecionado);
      }
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Erro ao salvar cenário',
        'error'
      );
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingCenario(null);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-foreground mb-6">
        Simulação de Cenários
      </h1>

      {loading && (
        <div className="text-center py-12">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando produtos...</p>
        </div>
      )}

      {error && (
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-md mb-4">
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && (
        <div className="space-y-6">
          <div>
            <label
              htmlFor="produto"
              className="block text-sm font-medium text-foreground mb-2"
            >
              Selecionar Produto LAB
            </label>
            <select
              id="produto"
              value={produtoSelecionado || ''}
              onChange={(e) =>
                setProdutoSelecionado(
                  e.target.value ? parseInt(e.target.value) : null
                )
              }
              className="w-full md:w-96 px-3 py-2 border border-input rounded-md bg-background text-foreground focus:ring-primary focus:border-primary"
            >
              <option value="">Selecione um produto...</option>
              {produtos.map((produto) => (
                <option key={produto.id} value={produto.id}>
                  {produto.nome}
                </option>
              ))}
            </select>
          </div>

          {produtoSelecionado && produtoData && config && (
            <>
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-foreground">
                  Cenários do Produto: {produtoData.nome}
                </h2>
                {!showForm && (
                  <button
                    onClick={handleNovoCenario}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                  >
                    Novo Cenário
                  </button>
                )}
              </div>

              {showForm && (
                <div className="border border-border rounded-lg p-6 bg-card">
                  <h3 className="text-lg font-semibold text-card-foreground mb-4">
                    {editingCenario ? 'Editar Cenário' : 'Novo Cenário'}
                  </h3>
                  <CenarioForm
                    produtoId={produtoSelecionado}
                    produto={produtoData}
                    initialData={editingCenario || undefined}
                    config={config}
                    onSubmit={handleSubmitCenario}
                    onCancel={handleCancelForm}
                  />
                </div>
              )}

              {!showForm && (
                <>
                  {loadingCenarios ? (
                    <div className="text-center py-12">
                      <LoadingSpinner size="md" className="mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        Carregando cenários...
                      </p>
                    </div>
                  ) : cenarios.length === 0 ? (
                    <EmptyState
                      title="Nenhum cenário cadastrado"
                      description="Este produto ainda não possui cenários de simulação. Crie seu primeiro cenário para calcular lucros e comparar preços."
                      icon={
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                          <FileText className="w-8 h-8 text-muted-foreground" />
                        </div>
                      }
                      action={{
                        label: 'Criar Primeiro Cenário',
                        onClick: handleNovoCenario,
                      }}
                    />
                  ) : (
                    <div className="space-y-3">
                      {cenarios.map((cenario) => (
                        <CenarioCard
                          key={cenario.id}
                          cenario={cenario}
                          produto={produtoData}
                          onEdit={handleEditCenario}
                          onDelete={handleDeleteCenario}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {!produtoSelecionado && (
            <EmptyState
              title="Selecione um produto"
              description="Selecione um produto LAB para visualizar ou criar cenários de simulação de preços e lucros."
              icon={
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                  <Package className="w-8 h-8 text-muted-foreground" />
                </div>
              }
            />
          )}
        </div>
      )}

      <DeleteConfirmDialog
        isOpen={deleteDialog.isOpen}
        onConfirm={confirmDeleteCenario}
        onCancel={() => setDeleteDialog({ isOpen: false, cenarioId: null })}
        title="Deletar cenário?"
        description="Esta ação não pode ser desfeita. O cenário será removido permanentemente."
        confirmText="Deletar"
        confirmVariant="destructive"
      />

      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast((prev) => ({ ...prev, isVisible: false }))}
      />
    </div>
  );
}
