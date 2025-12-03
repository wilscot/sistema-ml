'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertCircle } from 'lucide-react';

interface VendaNaoMapeada {
  index: number;
  numeroVenda: string;
  tituloAnuncio: string;
  unidades: number;
  precoUnitario: number;
}

interface Produto {
  id: number;
  nome: string;
  fornecedor: string | null;
  quantidade: number;
}

interface ProdutoMappingDialogProps {
  open: boolean;
  vendasNaoMapeadas: VendaNaoMapeada[];
  produtosDisponiveis: Produto[];
  onConfirm: (mapeamentos: Record<number, number>) => void;
  onCancel: () => void;
}

export default function ProdutoMappingDialog({
  open,
  vendasNaoMapeadas,
  produtosDisponiveis,
  onConfirm,
  onCancel,
}: ProdutoMappingDialogProps) {
  // Estado: { indexVenda: produtoId }
  const [mapeamentos, setMapeamentos] = useState<Record<number, string>>({});
  const [produtoGlobal, setProdutoGlobal] = useState<string>('');

  // Resetar estados quando dialog é fechado
  useEffect(() => {
    if (!open) {
      setMapeamentos({});
      setProdutoGlobal('');
    }
  }, [open]);

  const aplicarParaTodos = (produtoId: string) => {
    if (!produtoId) return;
    
    // Criar novo objeto com produto aplicado a todos os índices
    const novosMapeamentos: Record<number, string> = {};
    
    vendasNaoMapeadas.forEach((venda) => {
      novosMapeamentos[venda.index] = produtoId;
    });
    
    setMapeamentos(novosMapeamentos);
    setProdutoGlobal(produtoId);
  };

  const limparTodos = () => {
    setMapeamentos({});
    setProdutoGlobal('');
  };

  const handleConfirm = () => {
    // Converter para números
    const mapeamentosNum: Record<number, number> = {};
    for (const [index, produtoId] of Object.entries(mapeamentos)) {
      if (produtoId) {
        mapeamentosNum[parseInt(index)] = parseInt(produtoId);
      }
    }

    // Verificar se todos foram mapeados
    const todosMapeados = vendasNaoMapeadas.every(
      (v) => mapeamentosNum[v.index] !== undefined
    );

    if (!todosMapeados) {
      alert('Por favor, mapeie todos os produtos antes de continuar.');
      return;
    }

    onConfirm(mapeamentosNum);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            Mapeamento Manual de Produtos
          </DialogTitle>
          <DialogDescription>
            Alguns produtos do Excel não foram encontrados automaticamente.
            Selecione o produto correto para cada venda abaixo.
          </DialogDescription>
        </DialogHeader>

        {/* CONTROLE GLOBAL */}
        <div className="border-b pb-4 mb-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-1">
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <span className="text-lg">⚡</span>
                </div>
              </div>
              
              <div className="flex-1 space-y-3">
                <div>
                  <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                    Aplicação em Lote
                  </h4>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    Se todas as vendas abaixo são do mesmo produto, selecione aqui para aplicar a todos de uma vez.
                  </p>
                </div>
                
                <div className="flex items-end gap-2">
                  <div className="flex-1 space-y-1">
                    <Label htmlFor="produto-global" className="text-xs">
                      Selecione o produto:
                    </Label>
                    <Select
                      value={produtoGlobal}
                      onValueChange={(value) => {
                        if (value) {
                          aplicarParaTodos(value);
                        }
                      }}
                    >
                      <SelectTrigger id="produto-global" className="h-9">
                        <SelectValue placeholder="Escolher produto para aplicar a todos..." />
                      </SelectTrigger>
                      <SelectContent>
                        {produtosDisponiveis.map((produto) => (
                          <SelectItem
                            key={produto.id}
                            value={produto.id.toString()}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span>{produto.nome}</span>
                              <span className="text-xs text-muted-foreground ml-4">
                                Estoque: {produto.quantidade}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={limparTodos}
                    disabled={Object.keys(mapeamentos).length === 0}
                    className="h-9"
                  >
                    Limpar Todos
                  </Button>
                </div>
                
                {produtoGlobal && (
                  <div className="flex items-center gap-2 text-xs text-green-700 dark:text-green-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-600 dark:bg-green-400" />
                    <span>
                      Produto aplicado para {vendasNaoMapeadas.length} venda(s).
                      Você ainda pode ajustar individualmente abaixo se necessário.
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* LISTA INDIVIDUAL */}
        <div className="space-y-4 py-4">
          {vendasNaoMapeadas.map((venda) => (
            <div
              key={venda.index}
              className={`border rounded-lg p-4 space-y-3 ${
                produtoGlobal && mapeamentos[venda.index] === produtoGlobal
                  ? 'border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-900/10'
                  : 'border-border'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {produtoGlobal && mapeamentos[venda.index] === produtoGlobal && (
                      <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 mb-1">
                        <span className="w-1 h-1 rounded-full bg-blue-600 dark:bg-blue-400" />
                        <span className="font-medium">Aplicado em lote</span>
                      </div>
                    )}
                    <p className="font-medium text-sm">
                      {venda.tituloAnuncio}
                    </p>
                    {venda.numeroVenda && (
                      <p className="text-xs text-muted-foreground font-mono mt-1">
                        Nº Venda: {venda.numeroVenda}
                      </p>
                    )}
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <div>{venda.unidades} unidade(s)</div>
                    <div>R$ {venda.precoUnitario.toFixed(2)}</div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`produto-${venda.index}`}>
                  Selecione o produto correspondente:
                </Label>
                <Select
                  value={mapeamentos[venda.index] || ''}
                  onValueChange={(value) => {
                    const novosMapeamentos = {
                      ...mapeamentos,
                      [venda.index]: value,
                    };
                    setMapeamentos(novosMapeamentos);
                    
                    // Verificar se todos os produtos ainda são iguais ao produtoGlobal
                    if (produtoGlobal) {
                      const todosIguais = vendasNaoMapeadas.every(
                        (v) => novosMapeamentos[v.index] === produtoGlobal
                      );
                      if (!todosIguais) {
                        setProdutoGlobal('');
                      }
                    }
                  }}
                >
                  <SelectTrigger 
                    id={`produto-${venda.index}`}
                    className={
                      produtoGlobal && mapeamentos[venda.index] === produtoGlobal
                        ? 'border-blue-300 dark:border-blue-700'
                        : ''
                    }
                  >
                    <SelectValue placeholder="Escolha um produto..." />
                  </SelectTrigger>
                  <SelectContent>
                    {produtosDisponiveis.map((produto) => (
                      <SelectItem
                        key={produto.id}
                        value={produto.id.toString()}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span>{produto.nome}</span>
                          <span className="text-xs text-muted-foreground ml-4">
                            Estoque: {produto.quantidade}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onCancel}>
            Cancelar Importação
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={Object.keys(mapeamentos).length !== vendasNaoMapeadas.length}
          >
            Continuar Importação ({vendasNaoMapeadas.length} vendas)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

