'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Package, DollarSign, Calendar, User, CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ModalRegistrarLink from '@/components/CompraChina/ModalRegistrarLink';
import ModalRegistrarRecebimento from '@/components/CompraChina/ModalRegistrarRecebimento';

export default function TrackingPage() {
  const params = useParams();
  const router = useRouter();
  const compraId = parseInt(params.id as string);

  const [compra, setCompra] = useState<any>(null);
  const [produto, setProduto] = useState<any>(null);
  const [lotes, setLotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loteParaRegistrarLink, setLoteParaRegistrarLink] = useState<any>(null);
  const [loteParaRegistrarRecebimento, setLoteParaRegistrarRecebimento] = useState<any>(null);

  useEffect(() => {
    carregarDados();
  }, [compraId]);

  const carregarDados = async () => {
    try {
      // Buscar compra
      const resCompra = await fetch(`/api/compras/${compraId}`);
      const dataCompra = await resCompra.json();
      
      if (!resCompra.ok || !dataCompra.compra) {
        console.error('Compra nao encontrada:', dataCompra);
        return;
      }
      
      setCompra(dataCompra.compra);

      // Buscar produto
      const resProduto = await fetch(`/api/produtos/${dataCompra.compra.produtoId}`);
      const dataProduto = await resProduto.json();
      setProduto(dataProduto.produto);

      // Buscar lotes
      const resLotes = await fetch(`/api/lotes-china?compraId=${compraId}`);
      const dataLotes = await resLotes.json();
      setLotes(dataLotes.lotes || []);

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
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
        <p>Compra nao encontrada</p>
      </div>
    );
  }

  const lotesComprados = lotes.filter(l => l.linkComprado).length;
  const lotesRecebidos = lotes.filter(l => l.recebido).length;
  const unidadesRecebidas = lotes.filter(l => l.recebido).reduce((sum, l) => sum + l.quantidade, 0);
  const percentualRecebido = compra.quantidadeComprada > 0 
    ? Math.round((unidadesRecebidas / compra.quantidadeComprada) * 100) 
    : 0;

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/prod/compras')}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">
            Compra China #{compra.numeroCompra}
          </h1>
          <p className="text-sm text-muted-foreground">
            {produto.nome} - {compra.quantidadeComprada} unidades
          </p>
        </div>
      </div>

      {/* Card Principal */}
      <div className="bg-card border rounded-lg p-6 mb-6">
        {/* Info da Compra */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-sm">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground" />
            <div>
              <div className="text-xs text-muted-foreground">Fornecedor</div>
              <div className="font-semibold">{compra.fornecedor}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-muted-foreground" />
            <div>
              <div className="text-xs text-muted-foreground">PayPal</div>
              <div className="font-semibold">R$ {(compra.precoUSD * compra.cotacao * compra.quantidadeComprada).toFixed(2)}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-muted-foreground" />
            <div>
              <div className="text-xs text-muted-foreground">Custo Unit.</div>
              <div className="font-semibold">R$ {compra.custoUnitario?.toFixed(2)}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <div>
              <div className="text-xs text-muted-foreground">Data Compra</div>
              <div className="font-semibold">{new Date(compra.dataCompra * 1000).toLocaleDateString()}</div>
            </div>
          </div>
        </div>

        {/* Progresso */}
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="grid grid-cols-4 gap-3 mb-4">
            <div className="text-center p-3 bg-card rounded-lg">
              <div className="text-xs text-muted-foreground mb-1">Total</div>
              <div className="text-xl font-bold">{compra.quantidadeComprada}</div>
            </div>
            <div className="text-center p-3 bg-card rounded-lg">
              <div className="text-xs text-muted-foreground mb-1">Recebido</div>
              <div className="text-xl font-bold text-green-600">{unidadesRecebidas}</div>
            </div>
            <div className="text-center p-3 bg-card rounded-lg">
              <div className="text-xs text-muted-foreground mb-1">Links Pagos</div>
              <div className="text-xl font-bold text-blue-600">{lotesComprados}/{lotes.length}</div>
            </div>
            <div className="text-center p-3 bg-card rounded-lg">
              <div className="text-xs text-muted-foreground mb-1">Lotes OK</div>
              <div className="text-xl font-bold text-green-600">{lotesRecebidos}/{lotes.length}</div>
            </div>
          </div>

          <div className="bg-muted rounded-full h-6 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-green-500 to-green-600 h-full flex items-center justify-center text-white text-xs font-semibold transition-all"
              style={{ width: `${percentualRecebido}%` }}
            >
              {percentualRecebido > 10 && `${percentualRecebido}% Recebido`}
            </div>
          </div>
        </div>
      </div>

      {/* Lotes */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Package className="w-5 h-5" />
          Lotes de Entrega
        </h2>

        {lotes.map((lote) => (
          <div key={lote.id} className="bg-card border rounded-lg p-4">
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-semibold">
                Lote #{lote.numeroLote} ({lote.quantidade} unidades)
              </h3>
              <div className="flex gap-2">
                {lote.linkComprado ? (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs rounded-full flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Link Pago
                  </span>
                ) : null}
                {lote.recebido ? (
                  <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs rounded-full flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Recebido
                  </span>
                ) : null}
                {!lote.linkComprado && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 text-xs rounded-full flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Pendente
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-3">
              {/* Compra do Link */}
              <div className={`border-l-4 pl-4 ${lote.linkComprado ? 'border-blue-500' : 'border-gray-300'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">
                    {lote.linkComprado ? 'Link Comprado' : 'Link Pendente'}
                  </span>
                  {!lote.linkComprado && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setLoteParaRegistrarLink(lote)}
                    >
                      Registrar Compra
                    </Button>
                  )}
                </div>
                
                {lote.linkComprado && (
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Data: {new Date(lote.dataCompraLink * 1000).toLocaleDateString()}</p>
                    <p>Valor: R$ {lote.valorLink?.toFixed(2)}</p>
                    {lote.ordemAliexpress && (
                      <p>Ordem: {lote.ordemAliexpress}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Recebimento */}
              {lote.linkComprado && (
                <div className={`border-l-4 pl-4 ${lote.recebido ? 'border-green-500' : 'border-gray-300'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">
                      {lote.recebido ? 'Recebido' : 'Aguardando Entrega'}
                    </span>
                    {!lote.recebido && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setLoteParaRegistrarRecebimento(lote)}
                      >
                        Marcar Recebido
                      </Button>
                    )}
                  </div>
                  
                  {lote.recebido && (
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Data: {new Date(lote.dataRecebimento * 1000).toLocaleDateString()}</p>
                      {lote.codigoRastreio && <p>Rastreio: {lote.codigoRastreio}</p>}
                      {lote.fotoEtiqueta && (
                        <img 
                          src={lote.fotoEtiqueta} 
                          alt="Etiqueta"
                          className="w-20 h-20 object-cover rounded border mt-2 cursor-pointer"
                          onClick={() => window.open(lote.fotoEtiqueta, '_blank')}
                        />
                      )}
                      {lote.observacoes && <p>Obs: {lote.observacoes}</p>}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Custos */}
      <div className="bg-card border rounded-lg p-6 mt-6">
        <h3 className="font-semibold mb-4">Custos Atualizados</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Pagamento PayPal:</span>
            <strong>R$ {(compra.precoUSD * compra.cotacao * compra.quantidadeComprada).toFixed(2)}</strong>
          </div>
          <div className="flex justify-between">
            <span>Frete real ({lotesComprados} links pagos):</span>
            <strong>R$ {compra.freteReal?.toFixed(2) || '0.00'}</strong>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Frete estimado restante:</span>
            <span>R$ {((compra.freteEstimado || 0) - (compra.freteReal || 0)).toFixed(2)}</span>
          </div>
          <div className="h-px bg-border my-2"></div>
          <div className="flex justify-between text-base">
            <span className="font-semibold">Custo Total Atual:</span>
            <strong className="text-primary">
              R$ {((compra.precoUSD * compra.cotacao * compra.quantidadeComprada) + (compra.freteReal || 0)).toFixed(2)}
            </strong>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Custo Projetado Final:</span>
            <span>
              R$ {((compra.precoUSD * compra.cotacao * compra.quantidadeComprada) + (compra.freteEstimado || 0)).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold">Custo Unitario Atual:</span>
            <strong className="text-primary">R$ {compra.custoUnitario?.toFixed(2)}</strong>
          </div>
        </div>
      </div>

      {/* Modal Registrar Link */}
      {loteParaRegistrarLink && (
        <ModalRegistrarLink
          lote={loteParaRegistrarLink}
          compra={compra}
          onClose={() => setLoteParaRegistrarLink(null)}
          onSuccess={() => {
            setLoteParaRegistrarLink(null);
            carregarDados();
          }}
        />
      )}

      {/* Modal Registrar Recebimento */}
      {loteParaRegistrarRecebimento && (
        <ModalRegistrarRecebimento
          lote={loteParaRegistrarRecebimento}
          onClose={() => setLoteParaRegistrarRecebimento(null)}
          onSuccess={() => {
            setLoteParaRegistrarRecebimento(null);
            carregarDados();
          }}
        />
      )}
    </div>
  );
}

