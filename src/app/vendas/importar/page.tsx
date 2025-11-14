'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import ImportVendasForm, {
  type VendaMLProcessada,
} from '@/components/ImportVendasForm';
import ProdutoMappingTable from '@/components/ProdutoMappingTable';
import Toast from '@/components/Toast';
import LoadingSpinner from '@/components/LoadingSpinner';
import type { Produto } from '@/db/schema';
import { FileSpreadsheet } from 'lucide-react';

export default function ImportarVendasPage() {
  const router = useRouter();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [vendas, setVendas] = useState<VendaMLProcessada[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
    isVisible: boolean;
  }>({ message: '', type: 'info', isVisible: false });

  const fetchProdutos = useCallback(async () => {
    try {
      setLoading(true);
      const responseLAB = await fetch('/api/produtos?tipo=LAB');
      const responsePROD = await fetch('/api/produtos?tipo=PROD');

      if (!responseLAB.ok || !responsePROD.ok) {
        throw new Error('Erro ao carregar produtos');
      }

      const dataLAB = await responseLAB.json();
      const dataPROD = await responsePROD.json();

      setProdutos([...dataLAB.produtos, ...dataPROD.produtos]);
    } catch (err) {
      console.error('Erro ao buscar produtos:', err);
      setProdutos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProdutos();
  }, [fetchProdutos]);

  // Monitorar mudanças no estado de vendas
  useEffect(() => {
    const vendasComProduto = vendas.filter(v => v.produtoId);
    if (vendas.length > 0) {
      console.log('=== ESTADO DE VENDAS ATUALIZADO ===');
      console.log(`Total de vendas: ${vendas.length}`);
      console.log(`Vendas com produto: ${vendasComProduto.length}`);
      console.log(`Vendas sem produto: ${vendas.length - vendasComProduto.length}`);
      if (vendasComProduto.length > 0) {
        console.log('Primeiras 3 vendas com produto:', vendasComProduto.slice(0, 3).map(v => ({
          numeroVenda: v.numeroVenda,
          produtoId: v.produtoId,
          produtoNome: v.produto?.nome
        })));
      }
    }
  }, [vendas]);

  const showToast = (
    message: string,
    type: 'success' | 'error' | 'info' = 'info'
  ) => {
    setToast({ message, type, isVisible: true });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, isVisible: false }));
    }, 5000);
  };

  const handleProcess = (vendasProcessadas: VendaMLProcessada[]) => {
    setVendas(vendasProcessadas);
  };

  const handleMappingChange = (
    vendaIndex: number,
    produtoId: number | null
  ) => {
    setVendas((prevVendas) => {
      // Usar função de atualização para garantir que estamos usando o estado mais recente
      const updatedVendas = [...prevVendas];
      const produto = produtoId
        ? produtos.find((p) => p.id === produtoId)
        : undefined;

      if (vendaIndex >= 0 && vendaIndex < updatedVendas.length) {
        updatedVendas[vendaIndex] = {
          ...updatedVendas[vendaIndex],
          produtoId: produtoId || undefined,
          produto: produto,
        };
      }

      return updatedVendas;
    });
  };

  // Função para atualizar múltiplas vendas de uma vez
  const handleMappingChangeBatch = (
    indices: number[],
    produtoId: number,
    produto?: Produto
  ) => {
    console.log('=== handleMappingChangeBatch ===');
    console.log('Índices para atualizar:', indices);
    console.log('Produto ID:', produtoId);
    console.log('Produto passado diretamente:', produto);
    console.log('Total de vendas antes:', vendas.length);
    
    setVendas((prevVendas) => {
      console.log('=== DENTRO DE setVendas (handleMappingChangeBatch) ===');
      console.log('Vendas anteriores:', prevVendas.length);
      console.log('Índices para atualizar:', indices);
      console.log('Produto ID:', produtoId);
      
      const updatedVendas = [...prevVendas];
      // Usar produto passado diretamente ou buscar na lista
      const produtoFinal = produto || produtos.find((p) => p.id === produtoId);

      console.log('Produto final usado:', produtoFinal ? { id: produtoFinal.id, nome: produtoFinal.nome } : 'NÃO ENCONTRADO');

      let atualizadas = 0;
      indices.forEach((vendaIndex) => {
        if (vendaIndex >= 0 && vendaIndex < updatedVendas.length) {
          const vendaAntes = updatedVendas[vendaIndex];
          updatedVendas[vendaIndex] = {
            ...updatedVendas[vendaIndex],
            produtoId: produtoId,
            produto: produtoFinal,
          };
          atualizadas++;
          if (atualizadas <= 3 || atualizadas === indices.length) {
            console.log(`[${atualizadas}/${indices.length}] Venda ${vendaIndex} atualizada:`, {
              numeroVenda: updatedVendas[vendaIndex].numeroVenda,
              antes: { produtoId: vendaAntes.produtoId },
              depois: { produtoId: updatedVendas[vendaIndex].produtoId, produtoNome: produtoFinal?.nome }
            });
          }
        } else {
          console.warn(`Índice ${vendaIndex} inválido (max: ${updatedVendas.length - 1})`);
        }
      });

      const totalComProduto = updatedVendas.filter(v => v.produtoId).length;
      console.log(`✓ Total de vendas atualizadas neste batch: ${atualizadas}`);
      console.log(`✓ Total de vendas COM produto após atualização: ${totalComProduto}`);
      console.log('=== FIM setVendas ===');
      
      return updatedVendas;
    });
  };

  const handleImport = async () => {
    const vendasParaImportar = vendas.filter((v) => v.produtoId);

    console.log('=== INICIANDO IMPORTAÇÃO ===');
    console.log('Total de vendas:', vendas.length);
    console.log('Vendas com produtoId:', vendasParaImportar.length);
    console.log('Vendas para importar:', vendasParaImportar.map(v => ({
      numeroVenda: v.numeroVenda,
      produtoId: v.produtoId,
      unidades: v.unidades,
      receita: v.receita
    })));

    if (vendasParaImportar.length === 0) {
      showToast(
        'Nenhuma venda com produto mapeado para importar',
        'error'
      );
      return;
    }

    setImporting(true);

    try {
      const vendasSerializadas = vendasParaImportar.map((v) => ({
        ...v,
        data: v.data.toISOString(),
        produto: undefined,
        matchScore: undefined,
        erro: undefined,
      }));

      console.log('Vendas serializadas para envio:', vendasSerializadas.length);
      console.log('Primeira venda exemplo:', {
        numeroVenda: vendasSerializadas[0]?.numeroVenda,
        produtoId: vendasSerializadas[0]?.produtoId,
        unidades: vendasSerializadas[0]?.unidades,
        receita: vendasSerializadas[0]?.receita,
        data: vendasSerializadas[0]?.data
      });

      const response = await fetch('/api/vendas/importar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendas: vendasSerializadas }),
      });

      const data = await response.json();

      console.log('Resposta da API:', data);

      if (!response.ok) {
        console.error('Erro na importação:', data);
        const errorMsg = data.error || 'Erro ao importar vendas';
        const details = data.erros?.length > 0 
          ? `\nErros: ${data.erros.join(', ')}`
          : '';
        const produtosNaoEncontrados = data.produtosNaoEncontrados?.length > 0
          ? `\nProdutos não encontrados: ${data.produtosNaoEncontrados.join(', ')}`
          : '';
        throw new Error(errorMsg + details + produtosNaoEncontrados);
      }

      if (data.importadas === 0) {
        console.warn('Nenhuma venda foi importada!', data);
        showToast(
          `Nenhuma venda foi importada. Verifique os erros no console.`,
          'error'
        );
        return;
      }

      showToast(
        `${data.importadas} venda(s) importada(s) com sucesso!`,
        'success'
      );

      setTimeout(() => {
        router.push('/vendas');
      }, 2000);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Erro ao importar vendas',
        'error'
      );
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando produtos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <FileSpreadsheet className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">
            Importar Vendas do Mercado Livre
          </h1>
        </div>

        <div className="space-y-6">
          {vendas.length === 0 ? (
            <ImportVendasForm
              produtos={produtos}
              onProcess={handleProcess}
              onCancel={() => router.push('/vendas')}
            />
          ) : (
            <>
              <div className="bg-card border border-border rounded-lg p-6">
                <div className="space-y-4">
                  <div>
                    <h2 className="text-xl font-semibold text-foreground mb-4">
                      Resumo da Importação
                    </h2>
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Total de Vendas:</span>
                          <span className="ml-2 font-medium text-foreground">
                            {vendas.length}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Total em R$:</span>
                          <span className="ml-2 font-medium text-foreground">
                            R$ {vendas.reduce((sum, v) => sum + (v.precoUnitario * v.unidades || v.total), 0).toFixed(2)}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Produtos Mapeados:</span>
                          <span className="ml-2 font-medium text-foreground">
                            {vendas.filter(v => v.produtoId).length} / {vendas.length}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <ProdutoMappingTable
                vendas={vendas}
                produtos={produtos}
                onMappingChange={handleMappingChange}
                onMappingChangeBatch={handleMappingChangeBatch}
                onProdutoCreated={(novoProduto) => {
                  setProdutos((prev) => [...prev, novoProduto]);
                  showToast(`Produto "${novoProduto.nome}" criado com sucesso!`, 'success');
                }}
              />

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setVendas([])}
                  className="px-4 py-2 text-sm font-medium border border-border rounded-md hover:bg-accent transition-colors"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  onClick={handleImport}
                  disabled={importing || vendas.filter((v) => v.produtoId).length === 0}
                  className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {importing && <LoadingSpinner size="sm" />}
                  {importing ? 'Importando...' : 'Confirmar Importação'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast((prev) => ({ ...prev, isVisible: false }))}
      />
    </div>
  );
}

