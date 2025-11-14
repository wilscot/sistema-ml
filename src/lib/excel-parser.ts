// @ts-ignore - xlsx types may not be perfect
import * as XLSX from 'xlsx';

export interface VendaMLCompleta {
  // Identificação
  numeroVenda: string;
  data: Date;
  estado: string;
  descricaoStatus: string;

  // Produto
  unidades: number;
  tituloAnuncio: string;
  variacao: string;
  precoUnitario: number;
  tipoAnuncio: 'CLASSICO' | 'PREMIUM';

  // Valores financeiros
  receita: number;
  receitaEnvio: number;
  taxaVenda: number;
  taxaEnvio: number;
  total: number;

  // Cliente (Comprador)
  nomeComprador?: string;
  cpfComprador?: string;
  enderecoCompleto?: string;
  cidade?: string;
  estadoComprador?: string;
  cep?: string;
  pais?: string;

  // Envio
  formaEntrega?: string;
  dataCaminho?: string;
  dataEntrega?: string;
  motorista?: string;
  numeroRastreamento?: string;
  urlRastreamento?: string;

  // Faturamento
  dadosPessoaisEmpresa?: string;
  tipoDocumento?: string;
  enderecoDados?: string;
  tipoContribuinte?: string;
  inscricaoEstadual?: string;

  // Anúncio
  numeroAnuncio?: string;
  canalVenda?: string;
  sku?: string;
}

export interface ParseError {
  linha: number;
  motivo: string;
  dados?: any;
}

export interface LinhaIgnorada {
  linha: number;
  motivo: string;
  dados: {
    numeroVenda?: string;
    estado?: string;
    tituloAnuncio?: string;
    [key: string]: any;
  };
}

export interface ParseResult {
  vendas: VendaMLCompleta[];
  erros: ParseError[];
  totalLinhas: number;
  linhasProcessadas: number;
  linhasIgnoradas: LinhaIgnorada[];
  statusDisponiveis: string[];
}

/**
 * Converte string de data do formato ML para Date
 */
function parseDataML(dataStr: string | Date): Date | null {
  if (dataStr instanceof Date) {
    return isNaN(dataStr.getTime()) ? null : dataStr;
  }

  if (!dataStr || typeof dataStr !== 'string') {
    return null;
  }

  const str = dataStr.trim();
  if (!str) {
    return null;
  }

  const meses: { [key: string]: number } = {
    janeiro: 0,
    fevereiro: 1,
    março: 2,
    marco: 2,
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

  try {
    const match = str.match(/(\d+)\s+de\s+(\w+)\s+de\s+(\d+)\s+(\d+):(\d+)/);
    if (match) {
      const [, dia, mesStr, ano, hora, minuto] = match;
      const mes = meses[mesStr.toLowerCase()];
      if (mes !== undefined) {
        return new Date(
          parseInt(ano),
          mes,
          parseInt(dia),
          parseInt(hora),
          parseInt(minuto)
        );
      }
    }

    const dateMatch = str.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/);
    if (dateMatch) {
      const [, dia, mes, ano, hora, minuto] = dateMatch;
      return new Date(
        parseInt(ano),
        parseInt(mes) - 1,
        parseInt(dia),
        parseInt(hora),
        parseInt(minuto)
      );
    }

    const dateOnly = new Date(str);
    if (!isNaN(dateOnly.getTime())) {
      return dateOnly;
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Normaliza tipo de anúncio do ML para enum interno
 */
function normalizarTipoAnuncio(tipo: string): 'CLASSICO' | 'PREMIUM' {
  const tipoUpper = tipo?.toUpperCase() || '';
  if (tipoUpper.includes('PREMIUM')) {
    return 'PREMIUM';
  }
  return 'CLASSICO';
}

/**
 * Verifica se status deve ser excluído automaticamente
 */
function isStatusProibido(estado: string): boolean {
  const estadoNormalizado = estado?.trim().toLowerCase() || '';
  const proibidos = ['devolução', 'devolucao', 'reclamação', 'reclamacao'];
  return proibidos.some((p) => estadoNormalizado.includes(p));
}

/**
 * Extrai valor numérico de célula Excel
 */
function extrairNumero(valor: any): number {
  if (valor === null || valor === undefined || valor === '') {
    return 0;
  }
  
  if (typeof valor === 'number') {
    return isNaN(valor) ? 0 : Math.abs(valor);
  }
  
  if (typeof valor === 'string') {
    // Remover formatação brasileira: "1.234,56" -> "1234.56"
    let limpo = valor.trim();
    
    // Se tem ponto e vírgula, assumir formato brasileiro
    if (limpo.includes('.') && limpo.includes(',')) {
      // Remover pontos (milhares) e substituir vírgula por ponto (decimal)
      limpo = limpo.replace(/\./g, '').replace(',', '.');
    } else if (limpo.includes(',')) {
      // Apenas vírgula, pode ser decimal brasileiro
      limpo = limpo.replace(',', '.');
    }
    
    // Remover qualquer caractere não numérico exceto ponto e sinal negativo
    limpo = limpo.replace(/[^\d.-]/g, '');
    
    const num = parseFloat(limpo);
    return isNaN(num) ? 0 : Math.abs(num);
  }
  
  return 0;
}

/**
 * Extrai string de célula Excel
 */
function extrairString(valor: any): string {
  if (valor === null || valor === undefined) {
    return '';
  }
  return String(valor).trim();
}

/**
 * Verifica se uma linha está vazia
 */
function isLinhaVazia(row: any[]): boolean {
  if (!row || row.length === 0) {
    return true;
  }
  return row.every((cell) => {
    const val = String(cell || '').trim();
    return val === '' || val === 'null' || val === 'undefined';
  });
}

/**
 * Processa arquivo Excel do Mercado Livre e retorna resultado detalhado
 */
export async function parseExcelML(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        if (!worksheet) {
          reject(new Error('Planilha vazia ou inválida'));
          return;
        }

        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: '',
        });

        if (jsonData.length < 6) {
          reject(
            new Error(
              'Arquivo Excel muito curto. Verifique se é o formato correto do Mercado Livre.'
            )
          );
          return;
        }

        const vendas: VendaMLCompleta[] = [];
        const erros: ParseError[] = [];
        const linhasIgnoradas: LinhaIgnorada[] = [];
        const statusSet = new Set<string>();
        const startRow = 5;
        let linhasProcessadas = 0;

        // Função para verificar se uma linha é cabeçalho
        const isLinhaCabecalho = (row: any[]): boolean => {
          if (!row || row.length === 0) return false;
          const primeiraColuna = String(row[0] || '').toLowerCase();
          const coluna7 = String(row[7] || '').toLowerCase();
          
          // Se a primeira coluna ou coluna 7 contém texto de cabeçalho, é cabeçalho
          const textosCabecalho = [
            'n.º de venda',
            'número de venda',
            'receita por produtos',
            'unidades',
            'data da venda',
            'receita'
          ];
          
          return textosCabecalho.some(texto => 
            primeiraColuna.includes(texto) || coluna7.includes(texto)
          );
        };

        for (let i = startRow; i < jsonData.length; i++) {
          const row = jsonData[i] as any[];
          const linhaNumero = i + 1;

          if (isLinhaVazia(row)) {
            continue;
          }

          // Pular linhas de cabeçalho
          if (isLinhaCabecalho(row)) {
            linhasIgnoradas.push({
              linha: linhaNumero,
              motivo: 'Linha de cabeçalho detectada',
              dados: {
                primeiraColuna: String(row[0] || ''),
                coluna7: String(row[7] || ''),
              },
            });
            continue;
          }

          if (!row || row.length < 24) {
            linhasIgnoradas.push({
              linha: linhaNumero,
              motivo: `Linha com menos de 24 colunas (encontrado: ${row?.length || 0})`,
              dados: {
                colunas: row?.length || 0,
                primeiraColuna: String(row?.[0] || ''),
              },
            });
            continue;
          }

          linhasProcessadas++;

          try {
            const numeroVenda = extrairString(row[0]);
            const dataStr = row[1];
            const estado = extrairString(row[2]);
            const descricaoStatus = extrairString(row[3]);
            const unidades = Math.max(1, Math.floor(extrairNumero(row[6])));
            // CORREÇÃO: Coluna H (índice 7) é o Preço Unitário de Venda do Anúncio (BRL)
            const precoUnitario = Math.abs(extrairNumero(row[7]));
            // Receita é o preço unitário multiplicado pelas unidades
            const receita = precoUnitario * unidades;
            const taxaVenda = Math.abs(extrairNumero(row[10]));
            const receitaEnvio = Math.abs(extrairNumero(row[11]));
            const taxaEnvio = Math.abs(extrairNumero(row[12]));
            const total = extrairNumero(row[16]);
            const sku = extrairString(row[18]);
            const numeroAnuncio = extrairString(row[19]);
            const canalVenda = extrairString(row[20]);
            // IMPORTANTE: Coluna 21 é o Título do Anúncio, não o Canal de Venda
            let tituloAnuncio = extrairString(row[21]);
            let variacao = extrairString(row[22]);
            
            // CORREÇÃO: Se título está vindo como "Mercado Livre" (que é o canal de venda),
            // significa que a coluna 21 pode estar errada. Tentar usar a coluna 22 como título.
            if (tituloAnuncio === 'Mercado Livre' || tituloAnuncio === canalVenda || !tituloAnuncio) {
              // Se a coluna 22 tem conteúdo válido, usar como título
              if (variacao && variacao.trim() && variacao !== 'Mercado Livre' && variacao !== canalVenda) {
                // A coluna 22 pode ser o título real
                tituloAnuncio = variacao;
                variacao = ''; // Limpar variação já que foi usada como título
              }
            }
            
            // DEBUG: Log para verificar valores das colunas (apenas primeira venda válida)
            if (vendas.length === 0) {
              console.log('=== DEBUG PREÇO UNITÁRIO (PRIMEIRA VENDA) ===');
              console.log('Linha:', linhaNumero);
              console.log('Coluna H (7) - Preço Unitário:', row[7], '->', precoUnitario);
              console.log('Coluna 6 - Unidades:', row[6], '->', unidades);
              console.log('Receita calculada (precoUnitario * unidades):', receita);
              console.log('Coluna 22 (Variação):', row[22]);
              console.log('Coluna 23:', row[23]);
              console.log('Coluna 24 (Tipo anúncio?):', row[24]);
              console.log('Row completo (primeiras 10 colunas):', row.slice(0, 10));
            }
            
            const tipoAnuncioStr = extrairString(row[24]);

            if (!numeroVenda) {
              linhasIgnoradas.push({
                linha: linhaNumero,
                motivo: 'Número de venda vazio',
                dados: {
                  numeroVenda: '',
                  estado,
                  tituloAnuncio,
                },
              });
              continue;
            }

            if (!tituloAnuncio) {
              linhasIgnoradas.push({
                linha: linhaNumero,
                motivo: 'Título do anúncio vazio',
                dados: {
                  numeroVenda,
                  estado,
                  tituloAnuncio: '',
                },
              });
              continue;
            }

            if (isStatusProibido(estado)) {
              linhasIgnoradas.push({
                linha: linhaNumero,
                motivo: `Status proibido: "${estado}" (devolução/reclamação)`,
                dados: {
                  numeroVenda,
                  estado,
                  tituloAnuncio,
                },
              });
              continue;
            }

            const data = parseDataML(dataStr);
            if (!data || isNaN(data.getTime())) {
              linhasIgnoradas.push({
                linha: linhaNumero,
                motivo: `Data inválida: "${dataStr}"`,
                dados: {
                  numeroVenda,
                  estado,
                  tituloAnuncio,
                  dataOriginal: dataStr,
                },
              });
              continue;
            }

            if (isNaN(precoUnitario) || precoUnitario === 0) {
              linhasIgnoradas.push({
                linha: linhaNumero,
                motivo: `Preço unitário não é um número válido: "${row[7]}"`,
                dados: {
                  numeroVenda,
                  estado,
                  tituloAnuncio,
                  precoUnitarioOriginal: row[7],
                },
              });
              continue;
            }

            if (precoUnitario < 0) {
              linhasIgnoradas.push({
                linha: linhaNumero,
                motivo: `Preço unitário negativa: ${precoUnitario}`,
                dados: {
                  numeroVenda,
                  estado,
                  tituloAnuncio,
                  precoUnitario,
                  precoUnitarioOriginal: row[7],
                },
              });
              continue;
            }

            statusSet.add(estado);

            const venda: VendaMLCompleta = {
              numeroVenda,
              data,
              estado,
              descricaoStatus,
              unidades,
              tituloAnuncio,
              variacao,
              precoUnitario,
              tipoAnuncio: normalizarTipoAnuncio(tipoAnuncioStr),
              receita,
              receitaEnvio,
              taxaVenda,
              taxaEnvio,
              total,
              numeroAnuncio,
              canalVenda,
              sku,
              nomeComprador: extrairString(row[32]),
              cpfComprador: extrairString(row[33]),
              enderecoCompleto: extrairString(row[34]),
              cidade: extrairString(row[35]),
              estadoComprador: extrairString(row[36]),
              cep: extrairString(row[37]),
              pais: extrairString(row[38]),
              formaEntrega: extrairString(row[39]),
              dataCaminho: extrairString(row[40]),
              dataEntrega: extrairString(row[41]),
              motorista: extrairString(row[42]),
              numeroRastreamento: extrairString(row[43]),
              urlRastreamento: extrairString(row[44]),
              dadosPessoaisEmpresa: extrairString(row[25]),
              tipoDocumento: extrairString(row[26]),
              enderecoDados: extrairString(row[27]),
              tipoContribuinte: extrairString(row[28]),
              inscricaoEstadual: extrairString(row[29]),
            };

            vendas.push(venda);
          } catch (error) {
            erros.push({
              linha: linhaNumero,
              motivo:
                error instanceof Error
                  ? error.message
                  : 'Erro desconhecido ao processar linha',
              dados: row,
            });
          }
        }

        resolve({
          vendas,
          erros,
          totalLinhas: jsonData.length,
          linhasProcessadas,
          linhasIgnoradas,
          statusDisponiveis: Array.from(statusSet).sort(),
        });
      } catch (error) {
        reject(
          error instanceof Error
            ? error
            : new Error('Erro ao processar arquivo Excel')
        );
      }
    };

    reader.onerror = () => {
      reject(new Error('Erro ao ler arquivo'));
    };

    reader.readAsArrayBuffer(file);
  });
}
