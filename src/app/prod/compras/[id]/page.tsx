'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Package, Calendar, DollarSign, User, Plus, Eye, Trash2, FileText, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import EntregaForm from '@/components/EntregaForm';

export default function CompraDetalhesPage() {
  const params = useParams();
  const router = useRouter();
  const compraId = parseInt(params.id as string);

  const [compra, setCompra] = useState<any>(null);
  const [entregas, setEntregas] = useState<any[]>([]);
  const [produto, setProduto] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [observacoes, setObservacoes] = useState('');
  const [salvandoObs, setSalvandoObs] = useState(false);
  const [obsModificada, setObsModificada] = useState(false);

  useEffect(() => {
    carregarDados();
  }, [compraId]);

  const carregarDados = async () => {
    try {
      console.log('Buscando compra ID:', compraId);
      
      // Buscar compra
      const resCompra = await fetch(`/api/compras/${compraId}`);
      console.log('Status da resposta:', resCompra.status);
      
      const dataCompra = await resCompra.json();
      console.log('Dados recebidos:', dataCompra);
      
      if (!resCompra.ok || !dataCompra.compra) {
        console.error('Compra não encontrada:', dataCompra);
        return;
      }
      
      // Redirecionar para tracking se for compra China
      if (dataCompra.compra.tipoCompra === 'china') {
        router.push(`/prod/compras/${compraId}/tracking`);
        return;
      }

      setCompra(dataCompra.compra);
      setObservacoes(dataCompra.compra.observacoes || '');
      setObsModificada(false);

      // Buscar produto
      const resProduto = await fetch(`/api/produtos/${dataCompra.compra.produtoId}`);
      const dataProduto = await resProduto.json();

      if (!resProduto.ok || !dataProduto.produto) {
        console.error('Produto não encontrado:', dataProduto);
        return;
      }

      setProduto(dataProduto.produto);

      // Buscar entregas
      const resEntregas = await fetch(`/api/entregas?compraId=${compraId}`);
      const dataEntregas = await resEntregas.json();
      setEntregas(dataEntregas.entregas || []);

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const salvarObservacoes = async () => {
    try {
      setSalvandoObs(true);
      const res = await fetch(`/api/compras/${compraId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ observacoes })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error);
      }

      setObsModificada(false);
    } catch (error: any) {
      alert(error.message || 'Erro ao salvar observações');
    } finally {
      setSalvandoObs(false);
    }
  };

  const excluirEntrega = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir esta entrega?\n\nO estoque será ajustado automaticamente.')) {
      return;
    }

    try {
      const res = await fetch(`/api/entregas/${id}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error);
      }

      // Recarregar dados
      carregarDados();
    } catch (error: any) {
      alert(error.message || 'Erro ao excluir entrega');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!compra || !produto) {
    return (
      <div className="container mx-auto p-6">
        <p>Compra não encontrada</p>
      </div>
    );
  }

  const quantidadePendente = compra.quantidadeComprada - (compra.quantidadeRecebida || 0);
  const percentualRecebido = Math.round(((compra.quantidadeRecebida || 0) / compra.quantidadeComprada) * 100);
  const statusBadge = 
    quantidadePendente === 0 ? 'completo' :
    compra.quantidadeRecebida > 0 ? 'parcial' : 'pendente';

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/prod/compras')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Compra #{compra.numeroCompra}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Controle de entregas parciais
            </p>
          </div>
        </div>
        <span className={`
          px-3 py-1 rounded-full text-xs font-semibold
          ${statusBadge === 'completo' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : ''}
          ${statusBadge === 'parcial' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : ''}
          ${statusBadge === 'pendente' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' : ''}
        `}>
          {statusBadge === 'completo' && 'Completo'}
          {statusBadge === 'parcial' && 'Entrega Parcial'}
          {statusBadge === 'pendente' && 'Pendente'}
        </span>
      </div>

      {/* Card Principal */}
      <div className="bg-card border rounded-lg p-6 mb-6">
        {/* Info da Compra */}
        <div className="flex justify-between items-start mb-6 pb-6 border-b">
          <div className="flex-1">
            <h2 className="text-xl font-semibold mb-4">{produto.nome}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Fornecedor:</span>
                <strong>{compra.fornecedor || 'N/A'}</strong>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Custo Unit.:</span>
                <strong>R$ {compra.custoUnitario?.toFixed(2)}</strong>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Data Compra:</span>
                <strong>{new Date(compra.dataCompra * 1000).toLocaleDateString()}</strong>
              </div>
            </div>
          </div>
          <Button onClick={() => setShowForm(true)} className="ml-4">
            <Plus className="w-4 h-4 mr-2" />
            Registrar Entrega
          </Button>
        </div>

        {/* Progresso */}
        <div className="bg-muted/50 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="text-center p-3 bg-card rounded-lg">
              <div className="text-xs text-muted-foreground mb-1">Total Comprado</div>
              <div className="text-2xl font-bold">{compra.quantidadeComprada}</div>
            </div>
            <div className="text-center p-3 bg-card rounded-lg">
              <div className="text-xs text-muted-foreground mb-1">Recebido</div>
              <div className="text-2xl font-bold text-green-600">{compra.quantidadeRecebida || 0}</div>
            </div>
            <div className="text-center p-3 bg-card rounded-lg">
              <div className="text-xs text-muted-foreground mb-1">Pendente</div>
              <div className="text-2xl font-bold text-orange-600">{quantidadePendente}</div>
            </div>
            <div className="text-center p-3 bg-card rounded-lg">
              <div className="text-xs text-muted-foreground mb-1">Entregas</div>
              <div className="text-2xl font-bold text-blue-600">{entregas.length}</div>
            </div>
          </div>

          <div className="bg-muted rounded-full h-6 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-green-500 to-green-600 h-full flex items-center justify-center text-white text-xs font-semibold transition-all"
              style={{ width: `${percentualRecebido}%` }}
            >
              {percentualRecebido > 10 && `${percentualRecebido}% Recebido (${compra.quantidadeRecebida || 0} de ${compra.quantidadeComprada} unidades)`}
            </div>
          </div>
        </div>

        {/* Timeline de Entregas */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Package className="w-5 h-5" />
              Histórico de Entregas
            </h3>
          </div>

          {entregas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-2 opacity-20" />
              <p>Nenhuma entrega registrada ainda</p>
            </div>
          ) : (
            <div className="space-y-4">
              {entregas.map((entrega, index) => (
                <div key={entrega.id} className="flex gap-4 items-start border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  {/* Foto */}
                  {entrega.fotoEtiqueta ? (
                    <img 
                      src={entrega.fotoEtiqueta} 
                      alt="Etiqueta"
                      className="w-20 h-20 object-cover rounded border cursor-pointer hover:opacity-80"
                      onClick={() => window.open(entrega.fotoEtiqueta, '_blank')}
                    />
                  ) : (
                    <div className="w-20 h-20 bg-muted rounded border flex items-center justify-center text-muted-foreground text-xs">
                      Sem foto
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1">
                    <h4 className="font-semibold mb-2">
                      Entrega #{entregas.length - index} - {entrega.quantidadeRecebida} unidades
                    </h4>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(entrega.dataRecebimento * 1000).toLocaleDateString()}
                      </span>
                      {entrega.codigoRastreio && (
                        <span className="flex items-center gap-1">
                          <Package className="w-4 h-4" />
                          {entrega.codigoRastreio}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        Registrado em {new Date(entrega.createdAt * 1000).toLocaleString()}
                      </span>
                    </div>
                    {entrega.observacoes && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {entrega.observacoes}
                      </p>
                    )}
                  </div>

                  {/* Ações */}
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => entrega.fotoEtiqueta && window.open(entrega.fotoEtiqueta, '_blank')}
                      disabled={!entrega.fotoEtiqueta}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => excluirEntrega(entrega.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}

              {/* Pendente */}
              {quantidadePendente > 0 && (
                <div className="flex gap-4 items-start border-2 border-dashed rounded-lg p-4 bg-blue-50/50 dark:bg-blue-950/20">
                  <div className="w-20 h-20 bg-muted rounded border flex items-center justify-center text-muted-foreground">
                    <Package className="w-8 h-8" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-orange-600 mb-1">
                      Pendente - {quantidadePendente} unidades restantes
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Aguardando recebimento
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Observações da Compra */}
        <div className="mt-6 pt-6 border-t">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Observações
            </h3>
            {obsModificada && (
              <Button 
                onClick={salvarObservacoes} 
                disabled={salvandoObs}
                size="sm"
              >
                {salvandoObs ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Salvar
                  </>
                )}
              </Button>
            )}
          </div>
          <textarea
            value={observacoes}
            onChange={(e) => {
              setObservacoes(e.target.value);
              setObsModificada(true);
            }}
            placeholder="Adicione observações sobre esta compra (fornecedor, prazos, condições especiais, etc.)"
            rows={4}
            className="w-full px-4 py-3 border rounded-lg bg-muted/30 focus:ring-2 focus:ring-primary focus:outline-none resize-none"
          />
          {obsModificada && (
            <p className="text-xs text-orange-600 mt-2">
              Alterações não salvas
            </p>
          )}
        </div>
      </div>

      {/* Modal Formulário */}
      {showForm && (
        <EntregaForm
          compraId={compraId}
          quantidadePendente={quantidadePendente}
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            setShowForm(false);
            carregarDados();
          }}
        />
      )}
    </div>
  );
}

