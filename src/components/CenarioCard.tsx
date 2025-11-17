'use client';

import { useState } from 'react';
import type { Cenario, Produto } from '@/db/schema';
import { calcularCustoTotal, calcularTaxaML } from '@/lib/calculators';

interface CenarioCardProps {
  cenario: Cenario;
  produto?: Produto;
  onEdit: (cenarioId: number) => void;
  onDelete: (cenarioId: number) => void;
}

export default function CenarioCard({
  cenario,
  produto,
  onEdit,
  onDelete,
}: CenarioCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  const moeda = produto ? (((produto as any).moeda as 'USD' | 'BRL') || 'USD') : 'USD';
  const precoUSD = produto ? (produto as any).precoUSD : undefined;
  const cotacao = produto ? (produto as any).cotacao : undefined;
  const freteTotal = produto ? (produto as any).freteTotal : undefined;
  
  const temDadosCusto = produto && precoUSD !== undefined && cotacao !== undefined && freteTotal !== undefined;
  
  const custoUnitario = temDadosCusto
    ? calcularCustoTotal(
        precoUSD!,
        cotacao!,
        freteTotal!,
        produto!.quantidade || 1,
        moeda
      )
    : 0;
  const custoTotal = custoUnitario * 1; // quantidade = 1 para cenário

  const taxaClassicoValor = calcularTaxaML(
    cenario.precoVendaClassico,
    cenario.taxaClassico
  );
  const taxaPremiumValor = calcularTaxaML(
    cenario.precoVendaPremium,
    cenario.taxaPremium
  );

  const lucroBrutoClassico =
    cenario.precoVendaClassico + cenario.freteCobrado - taxaClassicoValor;
  const lucroBrutoPremium =
    cenario.precoVendaPremium + cenario.freteCobrado - taxaPremiumValor;

  const lucroLiquidoClassico = cenario.lucroLiquidoClassico ?? cenario.lucroClassico;
  const lucroLiquidoPremium = cenario.lucroLiquidoPremium ?? cenario.lucroPremium;

  const lucroBrutoClassicoPositivo = lucroBrutoClassico >= 0;
  const lucroBrutoPremiumPositivo = lucroBrutoPremium >= 0;
  const lucroLiquidoClassicoPositivo = lucroLiquidoClassico >= 0;
  const lucroLiquidoPremiumPositivo = lucroLiquidoPremium >= 0;

  return (
    <div className="border border-border rounded-lg bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {isOpen ? '▼' : '▶'}
          </span>
          <h3 className="font-medium text-card-foreground">{cenario.nome}</h3>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm">
            <span className="text-muted-foreground">Clássico: </span>
            <span
              className={
                lucroLiquidoClassicoPositivo
                  ? 'text-green-700 dark:text-green-500 font-semibold'
                  : 'text-red-700 dark:text-red-500 font-semibold'
              }
            >
              R$ {lucroLiquidoClassico.toFixed(2)}
            </span>
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">Premium: </span>
            <span
              className={
                lucroLiquidoPremiumPositivo
                  ? 'text-green-700 dark:text-green-500 font-semibold'
                  : 'text-red-700 dark:text-red-500 font-semibold'
              }
            >
              R$ {lucroLiquidoPremium.toFixed(2)}
            </span>
          </div>
        </div>
      </button>

      {isOpen && (
        <div className="px-4 py-4 border-t border-border space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-muted/50 p-3 rounded-md">
              <h4 className="text-sm font-medium text-foreground mb-2">
                Anúncio Clássico
              </h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Preço:</span>
                  <span className="text-foreground">
                    R$ {cenario.precoVendaClassico.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Taxa ({cenario.taxaClassico}%):</span>
                  <span className="text-foreground">
                    R$ {taxaClassicoValor.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Lucro Bruto:</span>
                  <span
                    className={
                      lucroBrutoClassicoPositivo
                        ? 'text-green-600 dark:text-green-500'
                        : 'text-red-600 dark:text-red-500'
                    }
                  >
                    R$ {lucroBrutoClassico.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Custo:</span>
                  <span className="text-gray-500 dark:text-gray-400">
                    R$ {custoTotal.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Lucro Líquido:</span>
                  <span
                    className={
                      lucroLiquidoClassicoPositivo
                        ? 'text-green-700 dark:text-green-400 font-semibold'
                        : 'text-red-700 dark:text-red-400 font-semibold'
                    }
                  >
                    R$ {lucroLiquidoClassico.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-muted/50 p-3 rounded-md">
              <h4 className="text-sm font-medium text-foreground mb-2">
                Anúncio Premium
              </h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Preço:</span>
                  <span className="text-foreground">
                    R$ {cenario.precoVendaPremium.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Taxa ({cenario.taxaPremium}%):</span>
                  <span className="text-foreground">
                    R$ {taxaPremiumValor.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Lucro Bruto:</span>
                  <span
                    className={
                      lucroBrutoPremiumPositivo
                        ? 'text-green-600 dark:text-green-500'
                        : 'text-red-600 dark:text-red-500'
                    }
                  >
                    R$ {lucroBrutoPremium.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Custo:</span>
                  <span className="text-gray-500 dark:text-gray-400">
                    R$ {custoTotal.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Lucro Líquido:</span>
                  <span
                    className={
                      lucroLiquidoPremiumPositivo
                        ? 'text-green-700 dark:text-green-400 font-semibold'
                        : 'text-red-700 dark:text-red-400 font-semibold'
                    }
                  >
                    R$ {lucroLiquidoPremium.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="text-sm">
            <span className="text-muted-foreground">Frete Cobrado: </span>
            <span className="text-foreground">
              R$ {cenario.freteCobrado.toFixed(2)}
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <button
              onClick={() => onEdit(cenario.id)}
              className="px-3 py-1 text-sm font-medium border border-primary text-primary rounded-md hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              Editar
            </button>
            <button
              onClick={() => onDelete(cenario.id)}
              className="px-3 py-1 text-sm font-medium border border-destructive text-destructive rounded-md hover:bg-destructive hover:text-destructive-foreground transition-colors"
            >
              Deletar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
