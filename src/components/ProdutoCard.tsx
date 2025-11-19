'use client';

import Link from 'next/link';
import type { Produto } from '@/db/schema';
import { calcularCustoTotal } from '@/lib/calculators';

interface ProdutoCardProps {
  produto: Produto;
  onEdit?: () => void;
  onDelete?: () => void;
  onMigrate?: () => void;
  jaMigrado?: boolean;
}

export default function ProdutoCard({
  produto,
  onEdit,
  onDelete,
  onMigrate,
  jaMigrado = false,
}: ProdutoCardProps) {
  const isLAB = produto.tipo === 'LAB';
  const moeda = ((produto as any).moeda as 'USD' | 'BRL') || 'USD';
  const precoUSD = (produto as any).precoUSD;
  const cotacao = (produto as any).cotacao;
  const freteTotal = (produto as any).freteTotal;
  
  const temDadosCusto = precoUSD !== undefined && cotacao !== undefined && freteTotal !== undefined;
  
  const custoTotal = produto.quantidade > 0 && temDadosCusto
    ? calcularCustoTotal(
        precoUSD,
        cotacao,
        freteTotal,
        produto.quantidade,
        moeda
      ) * produto.quantidade
    : 0;

  return (
    <div className="border border-border rounded-lg p-4 bg-card hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold text-card-foreground">
              {produto.nome}
            </h3>
            <span className="text-xs text-muted-foreground font-mono">
              ID: {produto.id}
            </span>
            <span
              className={`px-2 py-1 text-xs font-medium rounded ${
                moeda === 'USD'
                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
              }`}
            >
              {moeda}
            </span>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`px-2 py-1 text-xs font-medium rounded ${
                isLAB
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                  : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              }`}
            >
              {produto.tipo}
            </span>
            {produto.fornecedor && (
              <span className="text-sm text-muted-foreground">
                {produto.fornecedor}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm mb-4">
        {temDadosCusto ? (
          <>
            <div>
              <span className="text-muted-foreground">Preço {moeda === 'BRL' ? '(R$)' : 'USD'}:</span>
              <span className="ml-2 font-medium text-card-foreground">
                {moeda === 'BRL' ? 'R$' : '$'}{precoUSD.toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Cotação:</span>
              <span className="ml-2 font-medium text-card-foreground">
                R$ {cotacao.toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Quantidade:</span>
              <span className="ml-2 font-medium text-card-foreground">
                {produto.quantidade}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Frete:</span>
              <span className="ml-2 font-medium text-card-foreground">
                R$ {freteTotal.toFixed(2)}
              </span>
            </div>
          </>
        ) : (
          <>
            <div>
              <span className="text-muted-foreground">Quantidade:</span>
              <span className="ml-2 font-medium text-card-foreground">
                {produto.quantidade}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Custo:</span>
              <span className="ml-2 font-medium text-card-foreground">
                Ver compras
              </span>
            </div>
          </>
        )}
      </div>

      {temDadosCusto && (
        <div className="mb-4 pt-2 border-t border-border">
          <div className="text-sm font-medium text-card-foreground">
            <span className="text-muted-foreground">Custo Total: </span>
            <span className="text-foreground">R$ {custoTotal.toFixed(2)}</span>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Link
          href={`/produtos/${produto.id}`}
          className="flex-1 px-3 py-2 text-sm font-medium text-center border border-border rounded-md hover:bg-accent transition-colors"
        >
          Editar
        </Link>
        {onDelete && (
          <button
            onClick={onDelete}
            className="px-3 py-2 text-sm font-medium border border-destructive text-destructive rounded-md hover:bg-destructive hover:text-destructive-foreground transition-colors"
          >
            Deletar
          </button>
        )}
        {isLAB && (
          jaMigrado ? (
            <button
              disabled
              className="px-3 py-2 text-sm font-medium border border-muted text-muted-foreground rounded-md cursor-not-allowed opacity-50"
              title="Produto já existe em PROD"
            >
              Já em PROD
            </button>
          ) : onMigrate ? (
            <button
              onClick={onMigrate}
              className="px-3 py-2 text-sm font-medium border border-primary text-primary rounded-md hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              Migrar para PROD
            </button>
          ) : null
        )}
      </div>
    </div>
  );
}
