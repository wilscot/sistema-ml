'use client';

import { useState, useEffect } from 'react';
import type { Produto, NovoProduto } from '@/db/schema';
import type { VendaMLProcessada } from './ImportVendasForm';
import QuickProdutoForm from './QuickProdutoForm';
import ApplyProdutoDialog from './ApplyProdutoDialog';
import { Search, Plus } from 'lucide-react';

interface ProdutoMappingTableProps {
  vendas: VendaMLProcessada[];
  produtos: Produto[];
  onMappingChange: (
    vendaIndex: number,
    produtoId: number | null
  ) => void;
  onMappingChangeBatch?: (
    indices: number[],
    produtoId: number,
    produto?: Produto
  ) => void;
  onProdutoCreated?: (produto: Produto) => void;
}

export default function ProdutoMappingTable({
  vendas,
  produtos,
  onMappingChange,
  onMappingChangeBatch,
  onProdutoCreated,
}: ProdutoMappingTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showQuickForm, setShowQuickForm] = useState(false);
  const [vendaParaCadastro, setVendaParaCadastro] = useState<VendaMLProcessada | null>(null);
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [produtoParaAplicar, setProdutoParaAplicar] = useState<NovoProduto | null>(null);

  // Debug: Log vendas recebidas
  useEffect(() => {
    console.log('=== VENDAS RECEBIDAS NO MAPPING TABLE ===');
    console.log('Total de vendas:', vendas.length);
    if (vendas.length > 0) {
      vendas.slice(0, 3).forEach((v, idx) => {
        console.log(`Venda ${idx + 1}:`, {
          numero: v.numeroVenda,
          titulo: v.tituloAnuncio,
          precoUnitario: v.precoUnitario,
          temProduto: !!v.produtoId,
        });
      });
    }
  }, [vendas]);

  const produtosFiltrados = produtos.filter((p) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      p.nome.toLowerCase().includes(term) ||
      (p.fornecedor?.toLowerCase().includes(term) ?? false)
    );
  });

  const vendasSemMatch = vendas.filter((v) => !v.produtoId);

  // Debug: verificar estado das vendas
  useEffect(() => {
    console.log('=== VENDAS SEM MATCH ATUALIZADO ===');
    console.log('Total de vendas:', vendas.length);
    console.log('Vendas sem match:', vendasSemMatch.length);
    console.log('Vendas com produto:', vendas.filter(v => v.produtoId).length);
    if (vendasSemMatch.length > 0) {
      console.log('Primeira venda sem match:', {
        numeroVenda: vendasSemMatch[0].numeroVenda,
        produtoId: vendasSemMatch[0].produtoId,
        temProduto: !!vendasSemMatch[0].produtoId
      });
    }
  }, [vendas, vendasSemMatch.length]);

  const vendasComProduto = vendas.filter((v) => v.produtoId);

  // Sempre mostrar a tabela, mesmo quando todas as vendas têm produto
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Mapear Produtos
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          {vendasSemMatch.length > 0 ? (
            <>
              Selecione o produto correspondente para cada venda ou deixe em branco
              para pular. <strong>{vendasComProduto.length} de {vendas.length} vendas</strong> já têm produto mapeado.
            </>
          ) : (
            <>
              Todas as <strong>{vendas.length} vendas</strong> têm produto mapeado. Revise os mapeamentos abaixo ou clique em "Confirmar Importação" para prosseguir.
            </>
          )}
        </p>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <div className="p-4 bg-muted border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar produto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-2 text-left text-foreground">
                  N.º Venda
                </th>
                <th className="px-4 py-2 text-left text-foreground">
                  Título Anúncio
                </th>
                <th className="px-4 py-2 text-left text-foreground">
                  Preço Unitário
                </th>
                <th className="px-4 py-2 text-left text-foreground">
                  Ação
                </th>
              </tr>
            </thead>
            <tbody>
              {vendas.map((venda, index) => {
                const vendaIndex = index;
                const temProdutoVinculado = !!venda.produtoId;
                return (
                  <tr
                    key={vendaIndex}
                    className={`border-t border-border hover:bg-muted/50 ${
                      temProdutoVinculado ? 'bg-green-50 dark:bg-green-900/10' : ''
                    }`}
                  >
                    <td className="px-4 py-2 text-foreground">
                      {venda.numeroVenda}
                    </td>
                    <td className="px-4 py-2 text-foreground">
                      <div
                        className="max-w-md truncate"
                        title={venda.tituloAnuncio}
                      >
                        {venda.tituloAnuncio}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-foreground">
                      R$ {venda.precoUnitario.toFixed(2)}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex gap-2">
                        <select
                          value={venda.produtoId || ''}
                          onChange={(e) =>
                            onMappingChange(
                              vendaIndex,
                              e.target.value ? parseInt(e.target.value) : null
                            )
                          }
                          className="flex-1 px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          <option value="">-- Selecionar --</option>
                          {produtosFiltrados.map((produto) => (
                            <option key={produto.id} value={produto.id}>
                              {produto.nome}
                              {produto.fornecedor && ` (${produto.fornecedor})`}
                            </option>
                          ))}
                        </select>
                        {!temProdutoVinculado && (
                          <button
                            type="button"
                            onClick={() => {
                              setVendaParaCadastro(venda);
                              setShowQuickForm(true);
                            }}
                            className="px-3 py-2 text-sm font-medium border border-primary text-primary rounded-md hover:bg-primary hover:text-primary-foreground transition-colors flex items-center gap-1"
                            title="Cadastrar novo produto"
                          >
                            <Plus className="w-4 h-4" />
                            <span className="hidden sm:inline">Novo</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showQuickForm && vendaParaCadastro && (
        <QuickProdutoForm
          isOpen={showQuickForm}
          tituloAnuncio={vendaParaCadastro.tituloAnuncio}
          quantidadeVenda={vendaParaCadastro.unidades}
          vendasComMesmoTitulo={
            vendas.filter((v) => !v.produtoId).length
          }
          onSave={async (novoProduto: NovoProduto, aplicarParaTodas: boolean, vendaIds?: number[]) => {
            // Se há múltiplas vendas, mostrar dialog de seleção
            const vendasSemProduto = vendas.filter((v) => !v.produtoId);

            if (vendasSemProduto.length > 1) {
              // Sempre mostrar dialog quando há múltiplas vendas
              setProdutoParaAplicar(novoProduto);
              setShowQuickForm(false);
              setShowApplyDialog(true);
              return {} as Produto; // Retorno temporário
            }

            // Criar produto
            const response = await fetch('/api/produtos', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(novoProduto),
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(
                errorData.errors?.join(', ') ||
                  errorData.error ||
                  'Erro ao criar produto'
              );
            }

            const data = await response.json();
            const produtoCriado = data.produto;

            // Aplicar para vendas - ATUALIZAR TODAS DE UMA VEZ
            if (aplicarParaTodas) {
              // Aplicar para todas as vendas sem produto
              console.log('Aplicando para TODAS as vendas sem produto (via QuickForm)...');
              const indicesParaAtualizar: number[] = [];
              vendasSemProduto.forEach((venda, idx) => {
                const vendaIndex = vendas.indexOf(venda);
                if (vendaIndex >= 0) {
                  indicesParaAtualizar.push(vendaIndex);
                  console.log(`[${idx + 1}/${vendasSemProduto.length}] Venda ${venda.numeroVenda} (índice ${vendaIndex}) será mapeada para produto ${produtoCriado.id}`);
                }
              });
              
              // Atualizar todas de uma vez usando batch
              if (onMappingChangeBatch && indicesParaAtualizar.length > 0) {
                console.log(`Atualizando ${indicesParaAtualizar.length} vendas em batch (via QuickForm)...`);
                onMappingChangeBatch(indicesParaAtualizar, produtoCriado.id);
              } else {
                // Fallback: atualizar uma por uma
                indicesParaAtualizar.forEach((vendaIndex) => {
                  onMappingChange(vendaIndex, produtoCriado.id);
                });
              }
              
              console.log(`✓ Aplicado para ${indicesParaAtualizar.length} vendas`);
            } else if (vendaIds && vendaIds.length > 0) {
              // Aplicar apenas para vendas selecionadas (vendaIds são índices dentro de vendasSemProduto)
              console.log('Aplicando para vendas selecionadas (via QuickForm)...');
              const indicesParaAtualizar: number[] = [];
              vendaIds.forEach((index, idx) => {
                if (index >= 0 && index < vendasSemProduto.length) {
                  const venda = vendasSemProduto[index];
                  if (venda) {
                    const vendaIndex = vendas.indexOf(venda);
                    if (vendaIndex >= 0) {
                      indicesParaAtualizar.push(vendaIndex);
                      console.log(`[${idx + 1}/${vendaIds.length}] Venda ${venda.numeroVenda} (índice ${vendaIndex}) será mapeada para produto ${produtoCriado.id}`);
                    }
                  }
                }
              });
              
              // Atualizar todas de uma vez usando batch
              if (onMappingChangeBatch && indicesParaAtualizar.length > 0) {
                console.log(`Atualizando ${indicesParaAtualizar.length} vendas em batch (via QuickForm)...`);
                onMappingChangeBatch(indicesParaAtualizar, produtoCriado.id);
              } else {
                // Fallback: atualizar uma por uma
                indicesParaAtualizar.forEach((vendaIndex) => {
                  onMappingChange(vendaIndex, produtoCriado.id);
                });
              }
              
              console.log(`✓ Aplicado para ${indicesParaAtualizar.length} vendas`);
            } else {
              // Aplicar apenas para a venda atual
              console.log('Aplicando apenas para venda atual...');
              const vendaIndex = vendas.indexOf(vendaParaCadastro);
              if (vendaIndex >= 0) {
                console.log(`Mapeando venda ${vendaParaCadastro.numeroVenda} (índice ${vendaIndex}) -> produto ${produtoCriado.id}`);
                onMappingChange(vendaIndex, produtoCriado.id);
              }
            }

            if (onProdutoCreated) {
              onProdutoCreated(produtoCriado);
            }

            setShowQuickForm(false);
            setVendaParaCadastro(null);

            return produtoCriado;
          }}
          onCancel={() => {
            setShowQuickForm(false);
            setVendaParaCadastro(null);
          }}
        />
      )}

      {showApplyDialog && produtoParaAplicar && vendaParaCadastro && (
        <ApplyProdutoDialog
          isOpen={showApplyDialog}
          produtoNome={produtoParaAplicar.nome}
          vendas={vendas.filter((v) => !v.produtoId)}
          onConfirm={async (aplicarParaTodas: boolean, vendaIds: number[]) => {
            try {
              // Criar produto
              const response = await fetch('/api/produtos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(produtoParaAplicar),
              });

              if (!response.ok) {
                const errorData = await response.json();
                throw new Error(
                  errorData.errors?.join(', ') ||
                    errorData.error ||
                    'Erro ao criar produto'
                );
              }

              const data = await response.json();
              const produtoCriado = data.produto;

              console.log('=== APLICAR PRODUTO ===');
              console.log('Produto criado:', produtoCriado);
              console.log('Aplicar para todas:', aplicarParaTodas);
              console.log('Venda IDs selecionados:', vendaIds);

              // IMPORTANTE: Atualizar a lista de produtos PRIMEIRO
              // para que o produto esteja disponível no select quando as vendas forem atualizadas
              if (onProdutoCreated) {
                console.log('Chamando onProdutoCreated para adicionar produto à lista...');
                onProdutoCreated(produtoCriado);
                // Aguardar um pouco para garantir que o produto foi adicionado à lista
                await new Promise(resolve => setTimeout(resolve, 100));
                console.log('Produto adicionado à lista. Agora atualizando vendas...');
              }

              const vendasSemProduto = vendas.filter((v) => !v.produtoId);
              console.log('Vendas sem produto:', vendasSemProduto.length);
              console.log('Tipo de aplicarParaTodas:', typeof aplicarParaTodas, 'Valor:', aplicarParaTodas);
              console.log('Condição if (aplicarParaTodas):', !!aplicarParaTodas);
              console.log('Comparação aplicarParaTodas === true:', aplicarParaTodas === true);

              // Aplicar para vendas - ATUALIZAR TODAS DE UMA VEZ
              if (aplicarParaTodas === true) {
                console.log('ENTROU NO IF aplicarParaTodas === true');
                // Aplicar para todas as vendas sem produto
                console.log('Aplicando para TODAS as vendas sem produto...');
                console.log(`Total de vendas sem produto: ${vendasSemProduto.length}`);
                console.log(`Total de vendas no array principal: ${vendas.length}`);
                
                const indicesParaAtualizar: number[] = [];
                
                try {
                  for (let idx = 0; idx < vendasSemProduto.length; idx++) {
                    const venda = vendasSemProduto[idx];
                    const vendaIndex = vendas.findIndex(v => v.numeroVenda === venda.numeroVenda);
                    
                    if (vendaIndex >= 0) {
                      indicesParaAtualizar.push(vendaIndex);
                      if (idx < 5 || idx === vendasSemProduto.length - 1) {
                        console.log(`[${idx + 1}/${vendasSemProduto.length}] Venda ${venda.numeroVenda} (índice ${vendaIndex}) será mapeada para produto ${produtoCriado.id}`);
                      }
                    } else {
                      console.warn(`Venda ${venda.numeroVenda} não encontrada no array principal`);
                    }
                  }
                  
                  console.log(`✓ Total de índices coletados: ${indicesParaAtualizar.length}`);
                } catch (error) {
                  console.error('Erro ao coletar índices:', error);
                  throw error;
                }
                
                console.log('=== APÓS COLETAR ÍNDICES ===');
                console.log(`Total de índices para atualizar: ${indicesParaAtualizar.length}`);
                console.log(`onMappingChangeBatch disponível:`, !!onMappingChangeBatch);
                console.log(`onMappingChangeBatch é função:`, typeof onMappingChangeBatch === 'function');
                
                // Atualizar todas as vendas de uma vez usando batch
                if (onMappingChangeBatch && indicesParaAtualizar.length > 0) {
                  console.log(`Atualizando ${indicesParaAtualizar.length} vendas em batch...`);
                  try {
                    // Passar o produto diretamente para evitar problemas de timing com o estado
                    onMappingChangeBatch(indicesParaAtualizar, produtoCriado.id, produtoCriado);
                    console.log(`✓ Batch update chamado com sucesso`);
                  } catch (error) {
                    console.error('Erro ao chamar onMappingChangeBatch:', error);
                    throw error;
                  }
                } else {
                  console.warn('onMappingChangeBatch não disponível, usando fallback...');
                  // Fallback: atualizar uma por uma
                  indicesParaAtualizar.forEach((vendaIndex) => {
                    onMappingChange(vendaIndex, produtoCriado.id);
                  });
                }
                
                console.log(`✓ Aplicado para ${indicesParaAtualizar.length} vendas`);
              } else {
                // vendaIds são índices dentro de vendasSemProduto
                console.log('Aplicando para vendas selecionadas...');
                const indicesParaAtualizar: number[] = [];
                vendaIds.forEach((index, idx) => {
                  if (index >= 0 && index < vendasSemProduto.length) {
                    const venda = vendasSemProduto[index];
                    if (venda) {
                      const vendaIndex = vendas.findIndex(v => v.numeroVenda === venda.numeroVenda);
                      if (vendaIndex >= 0) {
                        indicesParaAtualizar.push(vendaIndex);
                        console.log(`[${idx + 1}/${vendaIds.length}] Venda ${venda.numeroVenda} (índice ${vendaIndex}) será mapeada para produto ${produtoCriado.id}`);
                      } else {
                        console.warn(`Venda ${venda.numeroVenda} não encontrada no array principal`);
                      }
                    }
                  } else {
                    console.warn(`Índice ${index} inválido (max: ${vendasSemProduto.length - 1})`);
                  }
                });
                
                // Atualizar todas as vendas selecionadas de uma vez usando batch
                if (onMappingChangeBatch && indicesParaAtualizar.length > 0) {
                  console.log(`Atualizando ${indicesParaAtualizar.length} vendas em batch...`);
                  // Passar o produto diretamente para evitar problemas de timing com o estado
                  onMappingChangeBatch(indicesParaAtualizar, produtoCriado.id, produtoCriado);
                } else {
                  console.warn('onMappingChangeBatch não disponível, usando fallback...');
                  // Fallback: atualizar uma por uma
                  indicesParaAtualizar.forEach((vendaIndex) => {
                    onMappingChange(vendaIndex, produtoCriado.id);
                  });
                }
                
                console.log(`✓ Aplicado para ${indicesParaAtualizar.length} vendas`);
              }

              // Aguardar um pouco para garantir que o estado seja atualizado antes de fechar o dialog
              await new Promise(resolve => setTimeout(resolve, 200));
              
              setShowApplyDialog(false);
              setProdutoParaAplicar(null);
              setVendaParaCadastro(null);
              
              console.log('Dialog fechado. Vendas devem estar atualizadas.');
            } catch (error) {
              console.error('Erro ao aplicar produto:', error);
              alert(error instanceof Error ? error.message : 'Erro ao aplicar produto');
            }
          }}
          onCancel={() => {
            setShowApplyDialog(false);
            setProdutoParaAplicar(null);
            setShowQuickForm(true);
          }}
        />
      )}
    </div>
  );
}

