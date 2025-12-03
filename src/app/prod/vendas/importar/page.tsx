'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { parseExcelML, type ParseResult } from '@/lib/excel-parser';
import type { VendaML } from '@/types/venda';
import { ArrowLeft, Upload, CheckCircle2, XCircle, Download } from 'lucide-react';
import Link from 'next/link';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function ImportarVendasPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [file, setFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [vendasSelecionadas, setVendasSelecionadas] = useState<Set<number>>(
    new Set()
  );
  const [loading, setLoading] = useState(false);
  const [importando, setImportando] = useState(false);
  const [errosDetalhados, setErrosDetalhados] = useState<any[]>([]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setLoading(true);
    setVendasSelecionadas(new Set());
    setErrosDetalhados([]);

    try {
      const result = await parseExcelML(selectedFile);
      setParseResult(result);

      // Selecionar todas as vendas válidas por padrão
      const todasSelecionadas = new Set(
        result.vendas.map((_, index) => index)
      );
      setVendasSelecionadas(todasSelecionadas);

      if (result.vendas.length === 0) {
        toast({
          title: 'Nenhuma venda encontrada',
          description: 'O arquivo não contém vendas válidas para importar.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Arquivo processado',
          description: `${result.vendas.length} vendas encontradas. ${result.linhasIgnoradas.length} linhas ignoradas.`,
        });
      }
    } catch (error: any) {
      toast({
        title: 'Erro ao processar arquivo',
        description: error.message || 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleVendaSelecionada = (index: number) => {
    const novasSelecionadas = new Set(vendasSelecionadas);
    if (novasSelecionadas.has(index)) {
      novasSelecionadas.delete(index);
    } else {
      novasSelecionadas.add(index);
    }
    setVendasSelecionadas(novasSelecionadas);
  };

  const toggleTodas = () => {
    if (!parseResult) return;

    if (vendasSelecionadas.size === parseResult.vendas.length) {
      setVendasSelecionadas(new Set());
    } else {
      const todas = new Set(parseResult.vendas.map((_, index) => index));
      setVendasSelecionadas(todas);
    }
  };

  const handleImportar = async () => {
    if (!parseResult || vendasSelecionadas.size === 0) {
      toast({
        title: 'Nenhuma venda selecionada',
        description: 'Selecione pelo menos uma venda para importar.',
        variant: 'destructive',
      });
      return;
    }

    setImportando(true);

    try {
      const vendasParaImportar = Array.from(vendasSelecionadas).map(
        (index) => parseResult.vendas[index]
      );

      const response = await fetch('/api/vendas/importar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendas: vendasParaImportar }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao importar vendas');
      }

      const result = await response.json();

      // Capturar erros detalhados
      if (result.errosDetalhados) {
        setErrosDetalhados(result.errosDetalhados);
      }

      // Toast de sucesso
      toast({
        title: 'Importação concluída',
        description: `${result.importadas} vendas importadas com sucesso!`,
      });

      // Toast de avisos (se houver)
      if (result.produtosNaoEncontrados.length > 0) {
        toast({
          title: 'Produtos não encontrados',
          description: `${result.produtosNaoEncontrados.length} produtos não foram encontrados: ${result.produtosNaoEncontrados.slice(0, 3).join(', ')}${result.produtosNaoEncontrados.length > 3 ? '...' : ''}`,
          variant: 'destructive',
        });
      }

      if (result.erros.length > 0) {
        toast({
          title: 'Erros durante importação',
          description: `${result.erros.length} vendas não puderam ser importadas. Verifique os detalhes abaixo.`,
          variant: 'destructive',
        });
      }

      // Não redirecionar automaticamente se houver erros para o usuário revisar
      if (result.errosDetalhados && result.errosDetalhados.length === 0) {
        setTimeout(() => {
          router.push('/prod/vendas');
        }, 2000);
      }
    } catch (error: any) {
      toast({
        title: 'Erro ao importar',
        description: error.message || 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setImportando(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const baixarLogErros = () => {
    if (errosDetalhados.length === 0) return;

    // Criar cabeçalho CSV
    const headers = ['Linha', 'Nº Venda', 'Produto', 'Motivo', 'Detalhes'];
    const rows = errosDetalhados.map((erro) => [
      erro.linha.toString(),
      erro.numeroVenda,
      erro.titulo,
      erro.motivo,
      erro.detalhes.replace(/"/g, '""'), // Escapar aspas duplas
    ]);

    // Converter para CSV
    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    // Criar blob e download
    const blob = new Blob(['\ufeff' + csvContent], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `log-erros-importacao-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/prod/vendas">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Importar Vendas do Excel ML</h1>
        </div>
      </div>

      {/* Upload */}
      <div className="mb-6">
        <Label htmlFor="file">Selecione o arquivo Excel (.xlsx, .xls)</Label>
        <Input
          id="file"
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileChange}
          disabled={loading}
          className="mt-2"
        />
        {loading && (
          <div className="mt-4">
            <LoadingSpinner size="sm" />
            <p className="text-sm text-muted-foreground mt-2">
              Processando arquivo...
            </p>
          </div>
        )}
      </div>

      {/* Estatísticas */}
      {parseResult && (
        <div className="mb-6 p-4 bg-muted rounded-lg border">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total de Linhas</p>
              <p className="text-2xl font-bold">{parseResult.totalLinhas}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Vendas Válidas</p>
              <p className="text-2xl font-bold text-green-600">
                {parseResult.vendas.length}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Linhas Ignoradas</p>
              <p className="text-2xl font-bold text-yellow-600">
                {parseResult.linhasIgnoradas.length}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Erros</p>
              <p className="text-2xl font-bold text-red-600">
                {parseResult.erros.length}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Avisos - Linhas Ignoradas */}
      {parseResult && parseResult.linhasIgnoradas.length > 0 && (
        <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <XCircle className="w-5 h-5 text-yellow-600" />
            Linhas Ignoradas ({parseResult.linhasIgnoradas.length})
          </h3>
          <div className="max-h-40 overflow-y-auto">
            <ul className="text-sm space-y-1">
              {parseResult.linhasIgnoradas.slice(0, 10).map((linha, index) => (
                <li key={index}>
                  <span className="font-medium">Linha {linha.linha}:</span>{' '}
                  {linha.motivo}
                </li>
              ))}
              {parseResult.linhasIgnoradas.length > 10 && (
                <li className="text-muted-foreground">
                  ... e mais {parseResult.linhasIgnoradas.length - 10} linhas
                </li>
              )}
            </ul>
          </div>
        </div>
      )}

      {/* Avisos - Erros */}
      {parseResult && parseResult.erros.length > 0 && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-600" />
            Erros de Parse ({parseResult.erros.length})
          </h3>
          <div className="max-h-40 overflow-y-auto">
            <ul className="text-sm space-y-1">
              {parseResult.erros.slice(0, 10).map((erro, index) => (
                <li key={index}>
                  <span className="font-medium">Linha {erro.linha}:</span>{' '}
                  {erro.motivo}
                </li>
              ))}
              {parseResult.erros.length > 10 && (
                <li className="text-muted-foreground">
                  ... e mais {parseResult.erros.length - 10} erros
                </li>
              )}
            </ul>
          </div>
        </div>
      )}

      {/* Preview de Vendas */}
      {parseResult && parseResult.vendas.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">
              Preview de Vendas ({vendasSelecionadas.size} selecionadas)
            </h2>
            <Button variant="outline" size="sm" onClick={toggleTodas}>
              {vendasSelecionadas.size === parseResult.vendas.length
                ? 'Desselecionar Todas'
                : 'Selecionar Todas'}
            </Button>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={
                        vendasSelecionadas.size === parseResult.vendas.length &&
                        parseResult.vendas.length > 0
                      }
                      onChange={toggleTodas}
                      className="rounded"
                    />
                  </TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead className="text-center">Unidades</TableHead>
                  <TableHead className="text-right">Preço Unitário</TableHead>
                  <TableHead className="text-center">Tipo</TableHead>
                  <TableHead className="text-right">Receita</TableHead>
                  <TableHead className="text-center">Data</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parseResult.vendas.map((venda, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={vendasSelecionadas.has(index)}
                        onChange={() => toggleVendaSelecionada(index)}
                        className="rounded"
                      />
                    </TableCell>
                    <TableCell className="font-medium max-w-xs truncate">
                      {venda.tituloAnuncio}
                    </TableCell>
                    <TableCell className="text-center">
                      {venda.unidades}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(venda.precoUnitario)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={
                          venda.tipoAnuncio === 'PREMIUM'
                            ? 'default'
                            : 'secondary'
                        }
                        className={
                          venda.tipoAnuncio === 'PREMIUM'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                        }
                      >
                        {venda.tipoAnuncio}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(venda.receita)}
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {formatDate(venda.data)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{venda.estado}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Resultado da Importação - Sucesso */}
      {parseResult && !importando && errosDetalhados.length === 0 && (
        <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
            <h3 className="text-sm font-medium text-green-800 dark:text-green-200">
              Importação concluída com sucesso!
            </h3>
          </div>
        </div>
      )}

      {/* Erros Detalhados */}
      {errosDetalhados.length > 0 && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start gap-2">
              <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                  Erros de Importação ({errosDetalhados.length})
                </h3>
              </div>
            </div>
            <button
              onClick={() => {
                const csv = [
                  'Linha,Nº Venda,Produto,Motivo,Detalhes',
                  ...errosDetalhados.map(e => 
                    `${e.linha},"${e.numeroVenda}","${e.titulo}","${e.motivo}","${e.detalhes}"`
                  )
                ].join('\n');
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `erros-importacao-${Date.now()}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Baixar Log CSV
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-red-100 dark:bg-red-900/30">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium">Linha</th>
                  <th className="px-3 py-2 text-left text-xs font-medium">Nº Venda</th>
                  <th className="px-3 py-2 text-left text-xs font-medium">Produto</th>
                  <th className="px-3 py-2 text-left text-xs font-medium">Motivo</th>
                  <th className="px-3 py-2 text-left text-xs font-medium">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-red-200 dark:divide-red-800">
                {errosDetalhados.map((erro, i) => (
                  <tr key={i} className="text-red-700 dark:text-red-300">
                    <td className="px-3 py-2">{erro.linha}</td>
                    <td className="px-3 py-2 font-mono text-xs">{erro.numeroVenda}</td>
                    <td className="px-3 py-2 max-w-xs truncate" title={erro.titulo}>
                      {erro.titulo}
                    </td>
                    <td className="px-3 py-2 font-medium">{erro.motivo}</td>
                    <td className="px-3 py-2 text-xs max-w-md truncate" title={erro.detalhes}>
                      {erro.detalhes}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Botão Importar */}
      {parseResult && parseResult.vendas.length > 0 && (
        <div className="flex justify-end gap-2">
          <Link href="/prod/vendas">
            <Button variant="outline">Cancelar</Button>
          </Link>
          <Button
            onClick={handleImportar}
            disabled={importando || vendasSelecionadas.size === 0}
          >
            {importando ? (
              <>
                <LoadingSpinner size="sm" />
                <span className="ml-2">Importando...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Importar {vendasSelecionadas.size} Venda(s) Selecionada(s)
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
