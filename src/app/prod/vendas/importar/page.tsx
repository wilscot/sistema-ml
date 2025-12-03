'use client';

import { useState, useRef } from 'react';
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
import { ArrowLeft, Upload, CheckCircle2, XCircle, Download, FileSpreadsheet, Search, X } from 'lucide-react';
import Link from 'next/link';
import LoadingSpinner from '@/components/LoadingSpinner';
import ProdutoMappingDialog from '@/components/ProdutoMappingDialog';
import { useEffect } from 'react';

export default function ImportarVendasPage() {
  const router = useRouter();
  const { toast } = useToast();

  // Buscar produtos cadastrados para mapeamento
  useEffect(() => {
    fetch('/api/produtos?modo=PROD')
      .then((res) => res.json())
      .then((data) => setProdutos(data.produtos || []))
      .catch((err) => console.error('Erro ao buscar produtos:', err));
  }, []);

  const [file, setFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [vendasSelecionadas, setVendasSelecionadas] = useState<Set<number>>(
    new Set()
  );
  const [loading, setLoading] = useState(false);
  const [importando, setImportando] = useState(false);
  const [errosDetalhados, setErrosDetalhados] = useState<any[]>([]);
  const [vendasParseadas, setVendasParseadas] = useState<any[]>([]);
  const [vendasNaoMapeadas, setVendasNaoMapeadas] = useState<any[]>([]);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [showMappingDialog, setShowMappingDialog] = useState(false);
  const [mapeamentosProdutos, setMapeamentosProdutos] = useState<Record<number, number>>({});
  const [resultado, setResultado] = useState<any>(null);
  const [termoBusca, setTermoBusca] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setLoading(true);
    setVendasSelecionadas(new Set());
    setErrosDetalhados([]);
    setResultado(null);
    setShowMappingDialog(false);
    setVendasNaoMapeadas([]);
    setVendasParseadas([]);
    setParseResult(null);

    try {
      const result = await parseExcelML(selectedFile);

      if (result.erros.length > 0) {
        toast({
          title: 'Avisos no arquivo',
          description: `${result.erros.length} aviso(s) encontrado(s). Verifique o preview.`,
          variant: 'default',
        });
      }

      if (result.vendas.length === 0) {
        toast({
          title: 'Nenhuma venda encontrada',
          description: 'O arquivo não contém vendas válidas.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      // APENAS salvar vendas parseadas - NÃO importar ainda
      setVendasParseadas(result.vendas);
      setParseResult(result);

      toast({
        title: 'Planilha carregada!',
        description: `${result.vendas.length} venda(s) encontrada(s). Selecione quais deseja importar.`,
      });
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

  const toggleVenda = (index: number) => {
    const novaSelecao = new Set(vendasSelecionadas);
    if (novaSelecao.has(index)) {
      novaSelecao.delete(index);
    } else {
      novaSelecao.add(index);
    }
    setVendasSelecionadas(novaSelecao);
  };

  const toggleTodas = () => {
    if (vendasSelecionadas.size === vendasParseadas.length) {
      // Desmarcar todas
      setVendasSelecionadas(new Set());
    } else {
      // Marcar todas
      setVendasSelecionadas(new Set(vendasParseadas.map((_, i) => i)));
    }
  };

  const handleImportarSelecionadas = async () => {
    if (vendasSelecionadas.size === 0) {
      toast({
        title: 'Nenhuma venda selecionada',
        description: 'Selecione pelo menos uma venda para importar.',
        variant: 'destructive',
      });
      return;
    }

    // Filtrar apenas vendas selecionadas
    const vendasParaImportar = vendasParseadas.filter((_, index) =>
      vendasSelecionadas.has(index)
    );

    // Tentar match automático de produtos APENAS para vendas selecionadas
    const vendasComMatch: any[] = [];
    const vendasSemMatch: any[] = [];

    vendasParaImportar.forEach((venda, indexRelativo) => {
      // Buscar índice original da venda
      const indexOriginal = vendasParseadas.findIndex(
        (v) =>
          v.numeroVenda === venda.numeroVenda &&
          v.tituloAnuncio === venda.tituloAnuncio
      );

      // Buscar produto por nome (match exato)
      const produtoEncontrado = produtos.find(
        (p) =>
          !p.deletedAt &&
          p.nome.toLowerCase().trim() === venda.tituloAnuncio.toLowerCase().trim()
      );

      if (produtoEncontrado) {
        vendasComMatch.push({
          ...venda,
          index: indexOriginal,
          produtoId: produtoEncontrado.id,
        });
      } else {
        vendasSemMatch.push({
          index: indexOriginal,
          numeroVenda: venda.numeroVenda,
          tituloAnuncio: venda.tituloAnuncio,
          unidades: venda.unidades,
          precoUnitario: venda.precoUnitario,
        });
      }
    });

    // Se há vendas sem match, mostrar dialog de mapeamento
    if (vendasSemMatch.length > 0) {
      setVendasNaoMapeadas(vendasSemMatch);
      setShowMappingDialog(true);
      return;
    }

    // Se todos foram mapeados automaticamente, importar direto
    await processarImportacao(vendasParaImportar, {});
  };

  const processarImportacao = async (
    vendas: any[],
    mapeamentos: Record<number, number>
  ) => {
    setImportando(true);

    try {
      // Aplicar mapeamentos manuais
      // mapeamentos usa índice original da vendaParseadas
      const vendasComProdutoId = vendas.map((venda) => {
        // Encontrar índice original na lista completa
        const indexOriginal = vendasParseadas.findIndex(
          (v) =>
            v.numeroVenda === venda.numeroVenda &&
            v.tituloAnuncio === venda.tituloAnuncio
        );

        // Se tem mapeamento manual, usar
        if (mapeamentos[indexOriginal] !== undefined) {
          return {
            ...venda,
            produtoId: mapeamentos[indexOriginal],
          };
        }

        // Senão, tentar match automático
        const produtoEncontrado = produtos.find(
          (p) =>
            !p.deletedAt &&
            p.nome.toLowerCase().trim() === venda.tituloAnuncio.toLowerCase().trim()
        );

        return {
          ...venda,
          produtoId: produtoEncontrado?.id,
        };
      });

      // Enviar para API
      const response = await fetch('/api/vendas/importar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendas: vendasComProdutoId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao importar vendas');
      }

      const result = await response.json();
      setResultado(result);

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
      if (result.produtosNaoEncontrados && result.produtosNaoEncontrados.length > 0) {
        toast({
          title: 'Produtos não encontrados',
          description: `${result.produtosNaoEncontrados.length} produtos não foram encontrados: ${result.produtosNaoEncontrados.slice(0, 3).join(', ')}${result.produtosNaoEncontrados.length > 3 ? '...' : ''}`,
          variant: 'destructive',
        });
      }

      if (result.erros && result.erros.length > 0) {
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
        title: 'Erro na importação',
        description: error.message || 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setImportando(false);
      setShowMappingDialog(false);
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

      {/* Upload - Destaque */}
      <div className="mb-6">
        <div className="border-2 border-dashed border-primary/30 rounded-lg p-8 bg-primary/5 hover:bg-primary/10 transition-colors">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="p-4 bg-primary/10 rounded-full">
              <FileSpreadsheet className="w-12 h-12 text-primary" />
            </div>
            <div>
              <Label htmlFor="file" className="text-lg font-semibold cursor-pointer">
                Selecione o arquivo Excel do Mercado Livre
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Formatos aceitos: .xlsx, .xls
              </p>
            </div>
            <div>
              <Button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                size="lg"
                className="gap-2"
              >
                <Upload className="w-5 h-5" />
                {file ? 'Trocar Arquivo' : 'Escolher Arquivo'}
              </Button>
              <Input
                ref={fileInputRef}
                id="file"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                disabled={loading}
                className="hidden"
              />
            </div>
            {file && (
              <div className="mt-2 p-3 bg-background rounded-md border border-border">
                <p className="text-sm font-medium text-foreground">
                  Arquivo selecionado: <span className="text-primary">{file.name}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {(file.size / 1024).toFixed(2)} KB
                </p>
              </div>
            )}
          </div>
        </div>
        {loading && (
          <div className="mt-4 flex items-center justify-center gap-3">
            <LoadingSpinner size="sm" />
            <p className="text-sm text-muted-foreground">
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
      {vendasParseadas.length > 0 && !resultado && (() => {
        // Filtrar vendas baseado no termo de busca
        const vendasFiltradas = vendasParseadas.filter((venda) => {
          if (!termoBusca.trim()) return true;
          
          const termo = termoBusca.toLowerCase();
          
          return (
            venda.tituloAnuncio?.toLowerCase().includes(termo) ||
            venda.numeroVenda?.toLowerCase().includes(termo) ||
            venda.nomeComprador?.toLowerCase().includes(termo)
          );
        });

        return (
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">
                Preview das Vendas
              </h3>
              <div className="text-sm text-muted-foreground">
                {vendasParseadas.length} venda(s) total
              </div>
            </div>

            {/* CAMPO DE BUSCA */}
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por produto, nº venda ou comprador..."
                  value={termoBusca}
                  onChange={(e) => setTermoBusca(e.target.value)}
                  className="pl-9"
                />
                {termoBusca && (
                  <button
                    onClick={() => setTermoBusca('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              <div className="text-sm text-muted-foreground whitespace-nowrap">
                {vendasFiltradas.length === vendasParseadas.length
                  ? `${vendasParseadas.length} venda(s)`
                  : `${vendasFiltradas.length} de ${vendasParseadas.length} venda(s)`
                }
              </div>
            </div>

            {/* CONTROLES DE SELEÇÃO */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Marcar/desmarcar apenas vendas FILTRADAS
                    const indicesFiltrados = new Set(
                      vendasFiltradas.map((venda) => 
                        vendasParseadas.findIndex(
                          (v) => v.numeroVenda === venda.numeroVenda &&
                                 v.tituloAnuncio === venda.tituloAnuncio
                        )
                      )
                    );
                    
                    const todasFiltradasSelecionadas = Array.from(indicesFiltrados).every(
                      (i) => vendasSelecionadas.has(i)
                    );
                    
                    if (todasFiltradasSelecionadas) {
                      // Desmarcar filtradas
                      const novaSelecao = new Set(vendasSelecionadas);
                      indicesFiltrados.forEach((i) => novaSelecao.delete(i));
                      setVendasSelecionadas(novaSelecao);
                    } else {
                      // Marcar filtradas
                      const novaSelecao = new Set(vendasSelecionadas);
                      indicesFiltrados.forEach((i) => novaSelecao.add(i));
                      setVendasSelecionadas(novaSelecao);
                    }
                  }}
                >
                  {(() => {
                    const indicesFiltrados = vendasFiltradas.map((venda) => 
                      vendasParseadas.findIndex(
                        (v) => v.numeroVenda === venda.numeroVenda &&
                               v.tituloAnuncio === venda.tituloAnuncio
                      )
                    );
                    const todasFiltradasSelecionadas = indicesFiltrados.every(
                      (i) => vendasSelecionadas.has(i)
                    );
                    return todasFiltradasSelecionadas
                      ? 'Desmarcar Visíveis'
                      : 'Marcar Visíveis';
                  })()}
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleTodas}
                >
                  {vendasSelecionadas.size === vendasParseadas.length
                    ? 'Desmarcar Todas'
                    : 'Marcar Todas'}
                </Button>
              </div>
              
              <span className="text-sm text-muted-foreground">
                {vendasSelecionadas.size} selecionada(s)
              </span>
            </div>

            {/* AVISO SE NENHUMA VENDA FILTRADA */}
            {vendasFiltradas.length === 0 && termoBusca && (
              <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                <p className="mb-2">Nenhuma venda encontrada com "{termoBusca}"</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTermoBusca('')}
                >
                  Limpar Busca
                </Button>
              </div>
            )}

            {/* TABELA (usar vendasFiltradas ao invés de vendasParseadas) */}
            {vendasFiltradas.length > 0 && (
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={(() => {
                              const indicesFiltrados = vendasFiltradas.map((venda) => 
                                vendasParseadas.findIndex(
                                  (v) => v.numeroVenda === venda.numeroVenda &&
                                         v.tituloAnuncio === venda.tituloAnuncio
                                )
                              );
                              return indicesFiltrados.every((i) => vendasSelecionadas.has(i)) &&
                                     indicesFiltrados.length > 0;
                            })()}
                            onChange={() => {
                              // Toggle vendas filtradas
                              const indicesFiltrados = new Set(
                                vendasFiltradas.map((venda) => 
                                  vendasParseadas.findIndex(
                                    (v) => v.numeroVenda === venda.numeroVenda &&
                                           v.tituloAnuncio === venda.tituloAnuncio
                                  )
                                )
                              );
                              
                              const todasFiltradasSelecionadas = Array.from(indicesFiltrados).every(
                                (i) => vendasSelecionadas.has(i)
                              );
                              
                              if (todasFiltradasSelecionadas) {
                                const novaSelecao = new Set(vendasSelecionadas);
                                indicesFiltrados.forEach((i) => novaSelecao.delete(i));
                                setVendasSelecionadas(novaSelecao);
                              } else {
                                const novaSelecao = new Set(vendasSelecionadas);
                                indicesFiltrados.forEach((i) => novaSelecao.add(i));
                                setVendasSelecionadas(novaSelecao);
                              }
                            }}
                            className="w-4 h-4 cursor-pointer"
                          />
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Nº Venda</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Produto</th>
                        <th className="px-4 py-3 text-center text-sm font-medium">Qtd</th>
                        <th className="px-4 py-3 text-right text-sm font-medium">Preço Unit.</th>
                        <th className="px-4 py-3 text-center text-sm font-medium">Tipo</th>
                        <th className="px-4 py-3 text-center text-sm font-medium">Data</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {vendasFiltradas.map((venda) => {
                        // Encontrar índice original da venda
                        const indexOriginal = vendasParseadas.findIndex(
                          (v) => v.numeroVenda === venda.numeroVenda &&
                                 v.tituloAnuncio === venda.tituloAnuncio
                        );
                        
                        return (
                          <tr
                            key={indexOriginal}
                            className={`hover:bg-muted/50 transition-colors ${
                              vendasSelecionadas.has(indexOriginal) ? 'bg-primary/5' : ''
                            }`}
                          >
                            <td className="px-4 py-3 text-center">
                              <input
                                type="checkbox"
                                checked={vendasSelecionadas.has(indexOriginal)}
                                onChange={() => toggleVenda(indexOriginal)}
                                className="w-4 h-4 cursor-pointer"
                              />
                            </td>
                            <td className="px-4 py-3 text-sm font-mono">
                              {venda.numeroVenda || '-'}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {/* DESTACAR TERMO DE BUSCA */}
                              {termoBusca ? (
                                <span
                                  dangerouslySetInnerHTML={{
                                    __html: venda.tituloAnuncio.replace(
                                      new RegExp(termoBusca.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'),
                                      (match) => `<mark class="bg-yellow-200 dark:bg-yellow-800">${match}</mark>`
                                    ),
                                  }}
                                />
                              ) : (
                                venda.tituloAnuncio
                              )}
                            </td>
                            <td className="px-4 py-3 text-center text-sm">
                              {venda.unidades}
                            </td>
                            <td className="px-4 py-3 text-right text-sm">
                              R$ {venda.precoUnitario.toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-center text-sm">
                              <span
                                className={`px-2 py-1 text-xs rounded-full ${
                                  venda.tipoAnuncio === 'PREMIUM'
                                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                }`}
                              >
                                {venda.tipoAnuncio}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center text-sm text-muted-foreground">
                              {new Date(venda.data).toLocaleDateString('pt-BR')}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* BOTÕES DE AÇÃO */}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setVendasParseadas([]);
                  setVendasSelecionadas(new Set());
                  setTermoBusca('');
                  setParseResult(null);
                  setErrosDetalhados([]);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleImportarSelecionadas}
                disabled={vendasSelecionadas.size === 0 || importando}
                size="lg"
              >
                {importando ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Importar Selecionadas ({vendasSelecionadas.size})
                  </>
                )}
              </Button>
            </div>
          </div>
        );
      })()}


      {/* Resultado da Importação - Sucesso */}
      {resultado && !importando && errosDetalhados.length === 0 && (
        <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
            <h3 className="text-sm font-medium text-green-800 dark:text-green-200">
              Importação concluída com sucesso! {resultado.importadas} venda(s) importada(s).
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

      {/* Dialog de Mapeamento */}
      <ProdutoMappingDialog
        open={showMappingDialog}
        vendasNaoMapeadas={vendasNaoMapeadas}
        produtosDisponiveis={produtos.filter((p) => !p.deletedAt)}
        onConfirm={async (mapeamentos) => {
          setMapeamentosProdutos(mapeamentos);
          // Filtrar apenas vendas selecionadas
          const vendasParaImportar = vendasParseadas.filter((_, index) =>
            vendasSelecionadas.has(index)
          );
          await processarImportacao(vendasParaImportar, mapeamentos);
        }}
        onCancel={() => {
          setShowMappingDialog(false);
          setVendasNaoMapeadas([]);
          
          toast({
            title: 'Importação cancelada',
            description: 'Nenhuma venda foi importada.',
          });
        }}
      />

    </div>
  );
}
