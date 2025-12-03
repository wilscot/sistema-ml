import * as XLSX from 'xlsx';
import type { VendaML } from '@/types/venda';
import type { TipoAnuncio } from '@/types/venda';

export interface ParseError {
  linha: number;
  motivo: string;
  dados?: any;
}

export interface LinhaIgnorada {
  linha: number;
  motivo: string;
  dados?: any;
}

export interface ParseResult {
  vendas: VendaML[];
  erros: ParseError[];
  linhasIgnoradas: LinhaIgnorada[];
  totalLinhas: number;
  linhasProcessadas: number;
  statusDisponiveis: string[];
}

// Status válidos para importação
const STATUS_VALIDOS = [
  'Entregue',
  'Venda entregue',
  'A caminho',
  'Reclamação encerrada com reembolso parcial',
];

// Função para verificar se status é válido
function isStatusValido(estado: string | null): boolean {
  if (!estado) return false;
  
  const estadoNormalizado = estado.trim();
  
  // Verificar match exato (case-insensitive)
  return STATUS_VALIDOS.some(
    (statusValido) => 
      statusValido.toLowerCase() === estadoNormalizado.toLowerCase()
  );
}

// Mapeamento de meses em português
const mesesMap: Record<string, number> = {
  janeiro: 0,
  fevereiro: 1,
  março: 2,
  marco: 2, // Sem acento
  abril: 3,
  maio: 4,
  junho: 5,
  julho: 6,
  agosto: 7,
  setembro: 8,
  outubro: 9,
  novembro: 10,
  dezembro: 11,
};

/**
 * Converte número formato brasileiro para número
 * "1.234,56" → 1234.56
 */
function parseNumeroBrasileiro(valor: string | number): number {
  if (typeof valor === 'number') {
    return Math.abs(valor);
  }

  if (!valor || typeof valor !== 'string') {
    return 0;
  }

  let str = valor.toString().trim();

  // Se tem ponto E vírgula: remover pontos, trocar vírgula por ponto
  if (str.includes('.') && str.includes(',')) {
    str = str.replace(/\./g, '').replace(',', '.');
  }
  // Se tem apenas vírgula: trocar vírgula por ponto
  else if (str.includes(',')) {
    str = str.replace(',', '.');
  }

  // Remover caracteres não numéricos (exceto ponto e sinal)
  str = str.replace(/[^\d.-]/g, '');

  const num = parseFloat(str);
  return Math.abs(isNaN(num) ? 0 : num);
}

/**
 * Parseia data no formato ML
 * "15 de janeiro de 2025 14:30" → Date
 */
function parseDataML(valor: string): Date | null {
  if (!valor || typeof valor !== 'string') {
    return null;
  }

  const str = valor.trim().toLowerCase();

  // Formato ML: "15 de janeiro de 2025 14:30"
  const regexML = /(\d+)\s+de\s+(\w+)\s+de\s+(\d+)\s+(\d+):(\d+)/;
  const matchML = str.match(regexML);

  if (matchML) {
    const dia = parseInt(matchML[1], 10);
    const mesNome = matchML[2];
    const ano = parseInt(matchML[3], 10);
    const hora = parseInt(matchML[4], 10);
    const minuto = parseInt(matchML[5], 10);

    const mes = mesesMap[mesNome];
    if (mes !== undefined) {
      const data = new Date(ano, mes, dia, hora, minuto);
      if (!isNaN(data.getTime())) {
        return data;
      }
    }
  }

  // Formato ISO: "15/01/2025 14:30"
  const regexISO = /(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/;
  const matchISO = str.match(regexISO);

  if (matchISO) {
    const dia = parseInt(matchISO[1], 10);
    const mes = parseInt(matchISO[2], 10) - 1; // Mês é 0-indexed
    const ano = parseInt(matchISO[3], 10);
    const hora = parseInt(matchISO[4], 10);
    const minuto = parseInt(matchISO[5], 10);

    const data = new Date(ano, mes, dia, hora, minuto);
    if (!isNaN(data.getTime())) {
      return data;
    }
  }

  // Fallback: tentar new Date()
  const data = new Date(str);
  if (!isNaN(data.getTime())) {
    return data;
  }

  return null;
}

/**
 * Verifica se linha é cabeçalho
 */
function isLinhaCabecalho(linha: any[]): boolean {
  if (!linha || linha.length === 0) {
    return false;
  }

  const col0 = String(linha[0] || '').toLowerCase().trim();
  const col7 = String(linha[7] || '').toLowerCase().trim();

  const palavrasCabecalho = [
    'n.º de venda',
    'nº de venda',
    'numero de venda',
    'receita',
    'unidades',
    'data da venda',
    'data',
  ];

  return (
    palavrasCabecalho.some((palavra) => col0.includes(palavra)) ||
    palavrasCabecalho.some((palavra) => col7.includes(palavra))
  );
}

// REMOVIDO: agora usamos isStatusValido() ao invés de isStatusProibido()

/**
 * Normaliza tipo de anúncio
 */
function normalizarTipoAnuncio(valor: string): TipoAnuncio {
  if (!valor || typeof valor !== 'string') {
    return 'CLASSICO';
  }

  const valorLower = valor.toLowerCase().trim();
  return valorLower.includes('premium') ? 'PREMIUM' : 'CLASSICO';
}

/**
 * Parseia arquivo Excel do Mercado Livre
 */
export async function parseExcelML(file: File): Promise<ParseResult> {
  const result: ParseResult = {
    vendas: [],
    erros: [],
    linhasIgnoradas: [],
    totalLinhas: 0,
    linhasProcessadas: 0,
    statusDisponiveis: [],
  };

  try {
    // Ler arquivo
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });

    // Pegar primeira planilha
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      result.erros.push({
        linha: 0,
        motivo: 'Planilha vazia ou sem dados',
      });
      return result;
    }

    const worksheet = workbook.Sheets[sheetName];
    const dados = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: '',
      raw: false,
    }) as any[][];

    result.totalLinhas = dados.length;

    // Processar linhas (começar da linha 7, índice 6)
    const inicioDados = 6; // Linha 7 (índice 6)

    for (let i = inicioDados; i < dados.length; i++) {
      const linha = dados[i];
      const numeroLinha = i + 1; // Linha real no Excel (1-indexed)

      // Ignorar linhas vazias
      if (!linha || linha.length === 0 || linha.every((cell) => !cell || cell === '')) {
        result.linhasIgnoradas.push({
          linha: numeroLinha,
          motivo: 'Linha vazia',
        });
        continue;
      }

      // Ignorar linhas com menos de 34 colunas (necessário para acessar colunas 32 e 33)
      if (linha.length < 34) {
        result.linhasIgnoradas.push({
          linha: numeroLinha,
          motivo: `Linha com menos de 34 colunas (${linha.length})`,
        });
        continue;
      }

      // Ignorar linhas de cabeçalho
      if (isLinhaCabecalho(linha)) {
        result.linhasIgnoradas.push({
          linha: numeroLinha,
          motivo: 'Linha de cabeçalho detectada',
        });
        continue;
      }

      try {
        // Extrair dados das colunas
        const numeroVenda = String(linha[0] || '').trim();
        const nomeComprador = String(linha[32] || '').trim();
        const cpfComprador = String(linha[33] || '').trim().replace(/\D/g, '');
        const dataStr = String(linha[1] || '').trim();
        const estado = String(linha[2] || '').trim();
        const descricaoStatus = String(linha[3] || '').trim();
        const unidades = parseNumeroBrasileiro(linha[6] || 0);
        const precoUnitario = parseNumeroBrasileiro(linha[7] || 0);
        const taxaVenda = parseNumeroBrasileiro(linha[10] || 0);
        const receitaEnvio = parseNumeroBrasileiro(linha[11] || 0);
        const taxaEnvio = parseNumeroBrasileiro(linha[12] || 0);
        const total = parseNumeroBrasileiro(linha[16] || 0);
        const sku = String(linha[18] || '').trim();
        const numeroAnuncio = String(linha[19] || '').trim();
        const canalVenda = String(linha[20] || '').trim();
        let tituloAnuncio = String(linha[21] || '').trim();
        let variacao = String(linha[22] || '').trim();
        const tipoAnuncioStr = String(linha[24] || '').trim();

        // Validações obrigatórias
        if (!numeroVenda) {
          result.linhasIgnoradas.push({
            linha: numeroLinha,
            motivo: 'Número de venda vazio',
            dados: { numeroVenda },
          });
          continue;
        }

        if (!tituloAnuncio || tituloAnuncio === 'Mercado Livre' || tituloAnuncio === canalVenda) {
          // Correção: usar coluna 22 se coluna 21 estiver incorreta
          if (variacao && variacao !== 'Mercado Livre' && variacao !== canalVenda) {
            tituloAnuncio = variacao;
            variacao = '';
          } else {
            result.linhasIgnoradas.push({
              linha: numeroLinha,
              motivo: 'Título do anúncio vazio ou inválido',
              dados: { tituloAnuncio, variacao },
            });
            continue;
          }
        }

        // Parsear data
        const data = parseDataML(dataStr);
        if (!data || isNaN(data.getTime())) {
          result.linhasIgnoradas.push({
            linha: numeroLinha,
            motivo: `Data inválida: "${dataStr}"`,
            dados: { dataStr },
          });
          continue;
        }

        // Validar preço unitário
        if (!precoUnitario || precoUnitario <= 0) {
          result.linhasIgnoradas.push({
            linha: numeroLinha,
            motivo: `Preço unitário inválido: ${precoUnitario}`,
            dados: { precoUnitario },
          });
          continue;
        }

        // Validar unidades
        if (!unidades || unidades <= 0) {
          result.linhasIgnoradas.push({
            linha: numeroLinha,
            motivo: `Unidades inválidas: ${unidades}`,
            dados: { unidades },
          });
          continue;
        }

        // Verificar se status é válido para importação
        if (!isStatusValido(estado)) {
          result.linhasIgnoradas.push({
            linha: numeroLinha,
            motivo: `Status não permitido para importação: "${estado}"`,
            dados: { 
              estado, 
              descricaoStatus,
              statusValidos: STATUS_VALIDOS.join(', ')
            },
          });
          continue;
        }

        // Adicionar status à lista (se não estiver)
        if (estado && !result.statusDisponiveis.includes(estado)) {
          result.statusDisponiveis.push(estado);
        }

        // Calcular receita total
        const receita = precoUnitario * unidades;

        // Normalizar tipo de anúncio
        const tipoAnuncio = normalizarTipoAnuncio(tipoAnuncioStr);

        // Criar objeto VendaML
        const venda: VendaML = {
          numeroVenda,
          nomeComprador,
          cpfComprador,
          data,
          estado,
          descricaoStatus,
          unidades,
          tituloAnuncio,
          variacao,
          precoUnitario,
          tipoAnuncio,
          receita,
          receitaEnvio,
          taxaVenda,
          taxaEnvio,
          total,
        };

        result.vendas.push(venda);
        result.linhasProcessadas++;
      } catch (error: any) {
        result.erros.push({
          linha: numeroLinha,
          motivo: `Erro ao processar linha: ${error.message}`,
          dados: { linha: linha.slice(0, 10) }, // Primeiras 10 colunas para debug
        });
      }
    }
  } catch (error: any) {
    result.erros.push({
      linha: 0,
      motivo: `Erro ao ler arquivo Excel: ${error.message}`,
    });
  }

  // Log de estatísticas
  console.log(`
  ═══════════════════════════════════════
  📊 RESUMO DA IMPORTAÇÃO
  ═══════════════════════════════════════
  Total de linhas: ${result.totalLinhas}
  Vendas válidas: ${result.vendas.length}
  Linhas ignoradas: ${result.linhasIgnoradas.length}
  Erros: ${result.erros.length}
  
  Status aceitos:
  ${STATUS_VALIDOS.map(s => `  ✓ ${s}`).join('\n')}
  ═══════════════════════════════════════
`);

  return result;
}
