import Fuse from 'fuse.js';
import type { Produto } from '@/db/schema';

export interface MatchResult {
  produto: Produto | null;
  score: number;
  sugestoes: Produto[];
}

/**
 * Remove acentos e normaliza string para comparação
 */
function normalizarTexto(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Match exato por nome normalizado
 */
function matchExato(
  tituloML: string,
  produtos: Produto[]
): Produto | null {
  const tituloNormalizado = normalizarTexto(tituloML);

  for (const produto of produtos) {
    const nomeNormalizado = normalizarTexto(produto.nome);
    if (nomeNormalizado === tituloNormalizado) {
      return produto;
    }
  }

  return null;
}

/**
 * Match por substring (nome do produto contém título ML ou vice-versa)
 */
function matchSubstring(
  tituloML: string,
  produtos: Produto[]
): Produto | null {
  const tituloNormalizado = normalizarTexto(tituloML);

  for (const produto of produtos) {
    const nomeNormalizado = normalizarTexto(produto.nome);

    if (
      nomeNormalizado.includes(tituloNormalizado) ||
      tituloNormalizado.includes(nomeNormalizado)
    ) {
      return produto;
    }
  }

  return null;
}

/**
 * Match usando fuzzy search (Fuse.js)
 */
function matchFuzzy(
  tituloML: string,
  produtos: Produto[]
): MatchResult {
  const fuse = new Fuse(produtos, {
    keys: ['nome'],
    threshold: 0.3,
    includeScore: true,
    minMatchCharLength: 3,
  });

  const results = fuse.search(tituloML);

  if (results.length === 0) {
    return {
      produto: null,
      score: 0,
      sugestoes: [],
    };
  }

  const melhor = results[0];
  const score = melhor.score ? 1 - melhor.score : 0;

  return {
    produto: score >= 0.8 ? melhor.item : null,
    score,
    sugestoes: results.slice(0, 5).map((r) => r.item),
  };
}

/**
 * Encontra produto correspondente ao título do anúncio ML
 * Tenta múltiplas estratégias de matching
 */
export function matchProduto(
  tituloML: string,
  produtos: Produto[]
): MatchResult {
  if (!tituloML || produtos.length === 0) {
    return {
      produto: null,
      score: 0,
      sugestoes: [],
    };
  }

  const matchExatoResult = matchExato(tituloML, produtos);
  if (matchExatoResult) {
    return {
      produto: matchExatoResult,
      score: 1.0,
      sugestoes: [matchExatoResult],
    };
  }

  const matchSubstringResult = matchSubstring(tituloML, produtos);
  if (matchSubstringResult) {
    return {
      produto: matchSubstringResult,
      score: 0.9,
      sugestoes: [matchSubstringResult],
    };
  }

  return matchFuzzy(tituloML, produtos);
}

/**
 * Match múltiplos produtos de uma vez
 */
export function matchProdutos(
  titulos: string[],
  produtos: Produto[]
): Map<string, MatchResult> {
  const resultados = new Map<string, MatchResult>();

  for (const titulo of titulos) {
    resultados.set(titulo, matchProduto(titulo, produtos));
  }

  return resultados;
}

