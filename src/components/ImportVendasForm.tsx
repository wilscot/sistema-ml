'use client';

import { useState, useRef } from 'react';
import { parseExcelML, type VendaMLCompleta } from '@/lib/excel-parser';
import { matchProduto } from '@/lib/produto-matcher';
import LoadingSpinner from '@/components/LoadingSpinner';
import ImportExceptionsReport from '@/components/ImportExceptionsReport';
import StatusFilterDialog from '@/components/StatusFilterDialog';
import type { Produto } from '@/db/schema';
import { Upload, FileX, CheckCircle2, AlertCircle } from 'lucide-react';

interface ImportVendasFormProps {
  produtos: Produto[];
  onProcess: (vendas: VendaMLProcessada[]) => void;
  onCancel: () => void;
}

export interface VendaMLProcessada extends VendaMLCompleta {
  produtoId?: number;
  produto?: Produto;
  matchScore?: number;
  erro?: string;
}

export default function ImportVendasForm({
  produtos,
  onProcess,
  onCancel,
}: ImportVendasFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [vendas, setVendas] = useState<VendaMLProcessada[]>([]);
  const [vendasCompletas, setVendasCompletas] = useState<VendaMLCompleta[]>([]);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parseResult, setParseResult] = useState<{
    linhasIgnoradas: any[];
    erros: any[];
    totalLinhas: number;
    linhasProcessadas: number;
  } | null>(null);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [statusDisponiveis, setStatusDisponiveis] = useState<string[]>([]);
  const [statusSelecionados, setStatusSelecionados] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.xlsx')) {
      setError('Por favor, selecione um arquivo .xlsx');
      return;
    }

    setFile(selectedFile);
    setError(null);
    setVendas([]);
    setParseResult(null);
    setProcessing(true);

    try {
      const resultado = await parseExcelML(selectedFile);

      setVendasCompletas(resultado.vendas);
      setStatusDisponiveis(resultado.statusDisponiveis);
      setStatusSelecionados(resultado.statusDisponiveis);
      setParseResult({
        linhasIgnoradas: resultado.linhasIgnoradas,
        erros: resultado.erros,
        totalLinhas: resultado.totalLinhas,
        linhasProcessadas: resultado.linhasProcessadas,
      });

      // Mostrar dialog de seleção de status
      setShowStatusDialog(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erro ao processar arquivo Excel'
      );
      setFile(null);
      setParseResult(null);
    } finally {
      setProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const handleStatusConfirm = (status: string[]) => {
    setStatusSelecionados(status);
    setShowStatusDialog(false);

    // Filtrar vendas pelos status selecionados
    const vendasFiltradas = vendasCompletas.filter((v) =>
      status.includes(v.estado)
    );

    // Processar matching de produtos
    const vendasProcessadas: VendaMLProcessada[] = vendasFiltradas.map(
      (venda) => {
        const match = matchProduto(venda.tituloAnuncio, produtos);

        return {
          ...venda,
          produtoId: match.produto?.id,
          produto: match.produto || undefined,
          matchScore: match.score,
        };
      }
    );

    setVendas(vendasProcessadas);
  };

  const vendasPorStatus = new Map<string, number>();
  vendasCompletas.forEach((v) => {
    const count = vendasPorStatus.get(v.estado) || 0;
    vendasPorStatus.set(v.estado, count + 1);
  });

  const vendasComMatch = vendas.filter((v) => v.produtoId);
  const vendasSemMatch = vendas.filter((v) => !v.produtoId);

  const totalVendas = vendas.length;
  const totalValor = vendas.reduce((sum, v) => sum + (v.precoUnitario * v.unidades || v.total), 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-4">
          Upload do Arquivo Excel
        </h2>

        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            onChange={handleFileInputChange}
            className="hidden"
          />

          {!file && (
            <div className="space-y-4">
              <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
              <div>
                <p className="text-foreground mb-2">
                  Arraste o arquivo Excel aqui ou
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                >
                  Selecionar Arquivo
                </button>
              </div>
              <p className="text-sm text-muted-foreground">
                Apenas arquivos .xlsx do Mercado Livre
              </p>
            </div>
          )}

          {file && (
            <div className="space-y-2">
              <CheckCircle2 className="w-8 h-8 mx-auto text-green-600" />
              <p className="text-foreground font-medium">{file.name}</p>
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setVendas([]);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
                className="text-sm text-destructive hover:underline"
              >
                Remover arquivo
              </button>
            </div>
          )}
        </div>

        {processing && (
          <div className="mt-4 flex items-center gap-2 text-muted-foreground">
            <LoadingSpinner size="sm" />
            <span>Processando arquivo Excel...</span>
          </div>
        )}

        {error && (
          <div className="mt-4 bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-md flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {vendas.length > 0 && (
        <div className="space-y-4">
          <div className="bg-muted/50 p-4 rounded-lg">
            <h3 className="font-semibold text-foreground mb-3">
              Resumo da Importação
            </h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Total de Vendas:</span>
                <span className="ml-2 font-medium text-foreground">
                  {totalVendas}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Total em R$:</span>
                <span className="ml-2 font-medium text-foreground">
                  R$ {totalValor.toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Produtos Encontrados:</span>
                <span className="ml-2 font-medium text-foreground">
                  {vendasComMatch.length} / {totalVendas}
                </span>
              </div>
            </div>
          </div>

          {parseResult && (
            <div className="space-y-3">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 px-4 py-3 rounded-md">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Estatísticas:</strong> {parseResult.linhasProcessadas}{' '}
                  linha(s) processada(s) de {parseResult.totalLinhas} total |{' '}
                  {vendas.length} venda(s) válida(s) encontrada(s)
                </p>
              </div>

              {parseResult.linhasIgnoradas.length > 0 ||
              parseResult.erros.length > 0 ? (
                <ImportExceptionsReport
                  ignoradas={parseResult.linhasIgnoradas}
                  erros={parseResult.erros}
                />
              ) : null}
            </div>
          )}

          {vendasSemMatch.length > 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 px-4 py-3 rounded-md">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <AlertCircle className="w-4 h-4 inline mr-2" />
                {vendasSemMatch.length} venda(s) não encontrou(ram) produto
                correspondente. Será necessário mapear manualmente.
              </p>
            </div>
          )}

          <div className="border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-2 text-left text-foreground">
                      N.º Venda
                    </th>
                    <th className="px-4 py-2 text-left text-foreground">Data</th>
                    <th className="px-4 py-2 text-left text-foreground">
                      Título Anúncio
                    </th>
                    <th className="px-4 py-2 text-left text-foreground">
                      Produto
                    </th>
                    <th className="px-4 py-2 text-right text-foreground">
                      Valor
                    </th>
                    <th className="px-4 py-2 text-center text-foreground">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {vendas.slice(0, 100).map((venda, index) => (
                    <tr
                      key={index}
                      className="border-t border-border hover:bg-muted/50"
                    >
                      <td className="px-4 py-2 text-foreground">
                        {venda.numeroVenda}
                      </td>
                      <td className="px-4 py-2 text-foreground">
                        {venda.data.toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-2 text-foreground">
                        <div className="max-w-xs truncate" title={venda.tituloAnuncio}>
                          {venda.tituloAnuncio}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-foreground">
                        {venda.produto ? (
                          <span className="text-green-600 dark:text-green-400">
                            {venda.produto.nome}
                          </span>
                        ) : (
                          <span className="text-yellow-600 dark:text-yellow-400">
                            Não encontrado
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right text-foreground">
                        R$ {venda.precoUnitario.toFixed(2)}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {venda.produtoId ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto" />
                        ) : (
                          <FileX className="w-5 h-5 text-yellow-600 mx-auto" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {vendas.length > 100 && (
              <div className="px-4 py-2 bg-muted text-sm text-muted-foreground text-center">
                Mostrando 100 de {vendas.length} vendas
              </div>
            )}
            {vendas.length <= 100 && vendas.length > 0 && (
              <div className="px-4 py-2 bg-muted text-sm text-muted-foreground text-center">
                Mostrando {vendas.length} venda(s)
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium border border-border rounded-md hover:bg-accent transition-colors"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => onProcess(vendas)}
          disabled={vendas.length === 0 || processing}
          className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {processing && <LoadingSpinner size="sm" />}
          Confirmar Importação
        </button>
      </div>

      <StatusFilterDialog
        isOpen={showStatusDialog}
        statusDisponiveis={statusDisponiveis}
        statusSelecionados={statusSelecionados}
        onConfirm={handleStatusConfirm}
        onCancel={() => {
          setShowStatusDialog(false);
          setFile(null);
          setVendasCompletas([]);
        }}
        totalVendas={vendasCompletas.length}
        vendasPorStatus={vendasPorStatus}
      />
    </div>
  );
}

