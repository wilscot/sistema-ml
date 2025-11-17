'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import LoadingSpinner from '@/components/LoadingSpinner';
import { ArrowLeft, Package, User, Truck, DollarSign } from 'lucide-react';
import type { Venda, Produto } from '@/db/schema';

export default function VendaDetalhesPage() {
  const params = useParams();
  const router = useRouter();
  const [venda, setVenda] = useState<(Venda & { produto: Produto }) | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVenda = async () => {
      try {
        setLoading(true);
        setError(null);
        const id = parseInt(params.id as string);

        if (isNaN(id)) {
          throw new Error('ID inválido');
        }

        const response = await fetch(`/api/vendas/${id}`);

        if (!response.ok) {
          throw new Error('Erro ao carregar venda');
        }

        const data = await response.json();
        setVenda(data.venda);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchVenda();
    }
  }, [params.id]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (timestamp: Date | null) => {
    if (!timestamp) return '-';
    try {
      return new Date(timestamp).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '-';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando detalhes da venda...</p>
        </div>
      </div>
    );
  }

  if (error || !venda) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-md">
          <p>{error || 'Venda não encontrada'}</p>
        </div>
        <div className="mt-4">
          <Link
            href="/vendas"
            className="text-primary hover:underline flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para Vendas
          </Link>
        </div>
      </div>
    );
  }

  const precoUSD = venda.produto ? (venda.produto as any).precoUSD : undefined;
  const cotacao = venda.produto ? (venda.produto as any).cotacao : undefined;
  const freteTotal = venda.produto ? (venda.produto as any).freteTotal : undefined;
  const temDadosCusto = venda.produto && precoUSD !== undefined && cotacao !== undefined && freteTotal !== undefined;
  
  const custoUnitario = temDadosCusto
    ? (precoUSD! * cotacao! + freteTotal!) / (venda.produto.quantidade || 1)
    : 0;
  const custoTotal = temDadosCusto ? custoUnitario * venda.quantidadeVendida : 0;
  const lucroLiquidoCalculado = temDadosCusto ? venda.lucroLiquido - custoTotal : venda.lucroLiquido;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          href="/vendas"
          className="text-primary hover:underline flex items-center gap-2 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para Vendas
        </Link>
        <h1 className="text-3xl font-bold text-foreground">
          Detalhes da Venda #{venda.numeroVenda || venda.id}
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Produto */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <Package className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold text-card-foreground">
              Produto
            </h2>
          </div>
          <div className="space-y-2">
            <p>
              <strong>Nome:</strong>{' '}
              <Link
                href={`/produtos/${venda.produtoId}`}
                className="text-primary hover:underline"
              >
                {venda.produto.nome}
              </Link>
            </p>
            <p>
              <strong>Quantidade:</strong> {venda.quantidadeVendida}
            </p>
            {venda.precoUnitario && (
              <p>
                <strong>Preço Unitário:</strong>{' '}
                {formatCurrency(venda.precoUnitario)}
              </p>
            )}
            {venda.variacao && (
              <p>
                <strong>Variação:</strong> {venda.variacao}
              </p>
            )}
            {venda.numeroAnuncio && (
              <p>
                <strong>Número do Anúncio:</strong> {venda.numeroAnuncio}
              </p>
            )}
            {venda.canalVenda && (
              <p>
                <strong>Canal de Venda:</strong> {venda.canalVenda}
              </p>
            )}
            {venda.sku && (
              <p>
                <strong>SKU:</strong> {venda.sku}
              </p>
            )}
          </div>
        </div>

        {/* Cliente */}
        {(venda.nomeComprador ||
          venda.cpfComprador ||
          venda.enderecoComprador) && (
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <User className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold text-card-foreground">
                Cliente
              </h2>
            </div>
            <div className="space-y-2">
              {venda.nomeComprador && (
                <p>
                  <strong>Nome:</strong> {venda.nomeComprador}
                </p>
              )}
              {venda.cpfComprador && (
                <p>
                  <strong>CPF:</strong> {venda.cpfComprador}
                </p>
              )}
              {venda.enderecoComprador && (
                <p>
                  <strong>Endereço:</strong> {venda.enderecoComprador}
                </p>
              )}
              {venda.cidadeComprador && (
                <p>
                  <strong>Cidade:</strong> {venda.cidadeComprador}
                  {venda.estadoComprador && ` - ${venda.estadoComprador}`}
                </p>
              )}
              {venda.cepComprador && (
                <p>
                  <strong>CEP:</strong> {venda.cepComprador}
                </p>
              )}
              {venda.paisComprador && (
                <p>
                  <strong>País:</strong> {venda.paisComprador}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Envio */}
        {(venda.formaEntrega ||
          venda.numeroRastreamento ||
          venda.dataEntrega) && (
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <Truck className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold text-card-foreground">
                Envio
              </h2>
            </div>
            <div className="space-y-2">
              {venda.formaEntrega && (
                <p>
                  <strong>Forma de Entrega:</strong> {venda.formaEntrega}
                </p>
              )}
              {venda.dataCaminho && (
                <p>
                  <strong>Data em Trânsito:</strong> {venda.dataCaminho}
                </p>
              )}
              {venda.dataEntrega && (
                <p>
                  <strong>Data de Entrega:</strong> {venda.dataEntrega}
                </p>
              )}
              {venda.motorista && (
                <p>
                  <strong>Motorista:</strong> {venda.motorista}
                </p>
              )}
              {venda.numeroRastreamento && (
                <p>
                  <strong>Rastreamento:</strong> {venda.numeroRastreamento}
                </p>
              )}
              {venda.urlRastreamento && (
                <p>
                  <a
                    href={venda.urlRastreamento}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Rastrear encomenda →
                  </a>
                </p>
              )}
            </div>
          </div>
        )}

        {/* Financeiro */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <DollarSign className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold text-card-foreground">
              Valores
            </h2>
          </div>
          <div className="space-y-2">
            {venda.receita && (
              <p>
                <strong>Receita:</strong> {formatCurrency(venda.receita)}
              </p>
            )}
            {venda.receitaEnvio && (
              <p>
                <strong>Receita Envio:</strong>{' '}
                {formatCurrency(venda.receitaEnvio)}
              </p>
            )}
            <p>
              <strong>Preço de Venda:</strong>{' '}
              {formatCurrency(venda.precoVenda)}
            </p>
            <p>
              <strong>Frete Cobrado:</strong>{' '}
              {formatCurrency(venda.freteCobrado)}
            </p>
            <p>
              <strong>Taxa ML:</strong> {formatCurrency(venda.taxaML)}
            </p>
            {venda.taxaEnvio && (
              <p>
                <strong>Taxa Envio:</strong> {formatCurrency(venda.taxaEnvio)}
              </p>
            )}
            <p>
              <strong>Custo do Produto:</strong> {formatCurrency(custoTotal)}
            </p>
            <p>
              <strong>Lucro Bruto:</strong> {formatCurrency(venda.lucroLiquido)}
            </p>
            <p
              className={`text-lg font-bold ${
                lucroLiquidoCalculado >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              <strong>Lucro Líquido:</strong>{' '}
              {formatCurrency(lucroLiquidoCalculado)}
            </p>
          </div>
        </div>
      </div>

      {/* Informações Gerais */}
      <div className="mt-6 bg-card border border-border rounded-lg p-6">
        <h2 className="text-xl font-semibold text-card-foreground mb-4">
          Informações Gerais
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <strong>Data da Venda:</strong> {formatDate(venda.data)}
          </div>
          {venda.estado && (
            <div>
              <strong>Status:</strong> {venda.estado}
            </div>
          )}
          {venda.descricaoStatus && (
            <div>
              <strong>Descrição do Status:</strong> {venda.descricaoStatus}
            </div>
          )}
          <div>
            <strong>Tipo de Anúncio:</strong>{' '}
            <span
              className={`px-2 py-1 text-xs font-medium rounded ${
                venda.tipoAnuncio === 'CLASSICO'
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                  : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
              }`}
            >
              {venda.tipoAnuncio}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

