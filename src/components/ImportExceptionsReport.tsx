'use client';

import { useState } from 'react';
import type { LinhaIgnorada, ParseError } from '@/lib/excel-parser';
import { Download, AlertTriangle } from 'lucide-react';

interface ImportExceptionsReportProps {
  ignoradas: LinhaIgnorada[];
  erros?: ParseError[];
}

export default function ImportExceptionsReport({
  ignoradas,
  erros = [],
}: ImportExceptionsReportProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const totalExcecoes = ignoradas.length + erros.length;

  if (totalExcecoes === 0) {
    return null;
  }

  const downloadCSV = () => {
    const linhas: string[] = [];
    linhas.push('Linha,Número Venda,Motivo,Estado,Título Anúncio,Dados Adicionais');

    ignoradas.forEach((item) => {
      const dados = item.dados || {};
      const dadosAdicionais = Object.entries(dados)
        .filter(([key]) => !['numeroVenda', 'estado', 'tituloAnuncio'].includes(key))
        .map(([key, value]) => `${key}: ${value}`)
        .join('; ');

      linhas.push(
        [
          item.linha,
          dados.numeroVenda || '',
          `"${item.motivo}"`,
          dados.estado || '',
          `"${dados.tituloAnuncio || ''}"`,
          `"${dadosAdicionais}"`,
        ].join(',')
      );
    });

    erros.forEach((erro) => {
      linhas.push(
        [
          erro.linha,
          '',
          `"${erro.motivo}"`,
          '',
          '',
          `"${JSON.stringify(erro.dados || {})}"`,
        ].join(',')
      );
    });

    const csvContent = linhas.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `excecoes_importacao_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="border border-yellow-200 dark:border-yellow-800 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
          <span className="font-medium text-yellow-800 dark:text-yellow-200">
            {totalExcecoes} linha(s) não processada(s)
          </span>
        </div>
        <span className="text-sm text-yellow-600 dark:text-yellow-400">
          {isExpanded ? '▼' : '▶'}
        </span>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={downloadCSV}
              className="px-3 py-1 text-sm font-medium border border-yellow-300 dark:border-yellow-700 text-yellow-700 dark:text-yellow-300 rounded-md hover:bg-yellow-100 dark:hover:bg-yellow-900/40 transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download Exceções (CSV)
            </button>
          </div>

          <div className="border border-yellow-200 dark:border-yellow-800 rounded-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-yellow-100 dark:bg-yellow-900/40">
                  <tr>
                    <th className="px-3 py-2 text-left text-yellow-800 dark:text-yellow-200 font-medium">
                      Linha #
                    </th>
                    <th className="px-3 py-2 text-left text-yellow-800 dark:text-yellow-200 font-medium">
                      N° Venda
                    </th>
                    <th className="px-3 py-2 text-left text-yellow-800 dark:text-yellow-200 font-medium">
                      Motivo
                    </th>
                    <th className="px-3 py-2 text-left text-yellow-800 dark:text-yellow-200 font-medium">
                      Estado
                    </th>
                    <th className="px-3 py-2 text-left text-yellow-800 dark:text-yellow-200 font-medium">
                      Título Anúncio
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ignoradas.map((item, index) => {
                    const dados = item.dados || {};
                    return (
                      <tr
                        key={`ignorada-${index}`}
                        className="border-t border-yellow-200 dark:border-yellow-800 hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
                      >
                        <td className="px-3 py-2 text-yellow-900 dark:text-yellow-100 font-mono">
                          {item.linha}
                        </td>
                        <td className="px-3 py-2 text-yellow-900 dark:text-yellow-100">
                          {dados.numeroVenda || '-'}
                        </td>
                        <td className="px-3 py-2 text-yellow-800 dark:text-yellow-200">
                          <span className="font-medium">{item.motivo}</span>
                        </td>
                        <td className="px-3 py-2 text-yellow-900 dark:text-yellow-100">
                          {dados.estado || '-'}
                        </td>
                        <td className="px-3 py-2 text-yellow-900 dark:text-yellow-100">
                          <div
                            className="max-w-xs truncate"
                            title={dados.tituloAnuncio || ''}
                          >
                            {dados.tituloAnuncio || '-'}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {erros.map((erro, index) => (
                    <tr
                      key={`erro-${index}`}
                      className="border-t border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20"
                    >
                      <td className="px-3 py-2 text-red-900 dark:text-red-100 font-mono">
                        {erro.linha}
                      </td>
                      <td className="px-3 py-2 text-red-900 dark:text-red-100">-</td>
                      <td className="px-3 py-2 text-red-800 dark:text-red-200">
                        <span className="font-medium">ERRO: {erro.motivo}</span>
                      </td>
                      <td className="px-3 py-2 text-red-900 dark:text-red-100">-</td>
                      <td className="px-3 py-2 text-red-900 dark:text-red-100">-</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

