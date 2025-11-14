import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/db';
import { getProdutoById } from '@/lib/db-client';
import { eq } from 'drizzle-orm';
import {
  calcularCustoTotal,
  calcularTaxaML,
  calcularLucro,
} from '@/lib/calculators';
import type { Cenario } from '@/db/schema';

const { cenarios, produtos } = schema;

/**
 * PATCH /api/cenarios/[id]
 * Atualiza cenário e recalcula lucros se necessário
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);

    if (isNaN(id) || id <= 0) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      );
    }

    // Buscar cenário existente
    const cenarioExistente = db
      .select()
      .from(cenarios)
      .where(eq(cenarios.id, id))
      .limit(1)
      .all();

    if (cenarioExistente.length === 0) {
      return NextResponse.json(
        { error: 'Cenário não encontrado' },
        { status: 404 }
      );
    }

    const cenarioAtual = cenarioExistente[0];
    const body = await request.json();

    // Buscar produto para recalcular custo se necessário
    const produto = await getProdutoById(cenarioAtual.produtoId);

    if (!produto) {
      return NextResponse.json(
        { error: 'Produto associado não encontrado' },
        { status: 404 }
      );
    }

    // Preparar updates
    const updates: Partial<Cenario> = {};

    // Campos que podem ser atualizados
    if (body.nome !== undefined) updates.nome = body.nome;
    if (body.precoVendaClassico !== undefined)
      updates.precoVendaClassico = body.precoVendaClassico;
    if (body.precoVendaPremium !== undefined)
      updates.precoVendaPremium = body.precoVendaPremium;
    if (body.taxaClassico !== undefined) updates.taxaClassico = body.taxaClassico;
    if (body.taxaPremium !== undefined) updates.taxaPremium = body.taxaPremium;
    if (body.freteCobrado !== undefined)
      updates.freteCobrado = body.freteCobrado;

    // Recalcular lucros se preços, taxas ou frete mudaram
    const precoVendaClassico =
      updates.precoVendaClassico ?? cenarioAtual.precoVendaClassico;
    const precoVendaPremium =
      updates.precoVendaPremium ?? cenarioAtual.precoVendaPremium;
    const taxaClassicoPercent =
      updates.taxaClassico ?? cenarioAtual.taxaClassico;
    const taxaPremiumPercent = updates.taxaPremium ?? cenarioAtual.taxaPremium;
    const freteCobrado = updates.freteCobrado ?? cenarioAtual.freteCobrado;

    const precisaRecalcular =
      body.precoVendaClassico !== undefined ||
      body.precoVendaPremium !== undefined ||
      body.taxaClassico !== undefined ||
      body.taxaPremium !== undefined ||
      body.freteCobrado !== undefined;

    if (precisaRecalcular) {
      // Calcular custo total do produto
      const moeda = (produto.moeda as 'USD' | 'BRL') || 'USD';
      const custoTotal = calcularCustoTotal(
        produto.precoUSD,
        produto.cotacao,
        produto.freteTotal,
        produto.quantidade || 1,
        moeda
      );

      // Calcular taxas ML
      const taxaClassicoValor = calcularTaxaML(
        precoVendaClassico,
        taxaClassicoPercent
      );
      const taxaPremiumValor = calcularTaxaML(
        precoVendaPremium,
        taxaPremiumPercent
      );

      // Recalcular lucros
      const lucroClassico = calcularLucro(
        precoVendaClassico,
        1,
        freteCobrado,
        custoTotal,
        taxaClassicoValor
      );

      const lucroPremium = calcularLucro(
        precoVendaPremium,
        1,
        freteCobrado,
        custoTotal,
        taxaPremiumValor
      );

      updates.lucroClassico = lucroClassico;
      updates.lucroPremium = lucroPremium;
      updates.lucroLiquidoClassico = lucroClassico;
      updates.lucroLiquidoPremium = lucroPremium;
    }

    // Atualizar updatedAt
    updates.updatedAt = new Date();

    // Atualizar no banco
    const result = db
      .update(cenarios)
      .set(updates)
      .where(eq(cenarios.id, id))
      .returning()
      .all();

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Erro ao atualizar cenário' },
        { status: 500 }
      );
    }

    return NextResponse.json({ cenario: result[0] }, { status: 200 });
  } catch (error) {
    console.error('Erro ao atualizar cenário:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar cenário' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/cenarios/[id]
 * Deleta cenário permanentemente (hard delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);

    if (isNaN(id) || id <= 0) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      );
    }

    // Verificar se cenário existe
    const cenarioExistente = db
      .select()
      .from(cenarios)
      .where(eq(cenarios.id, id))
      .limit(1)
      .all();

    if (cenarioExistente.length === 0) {
      return NextResponse.json(
        { error: 'Cenário não encontrado' },
        { status: 404 }
      );
    }

    // Deletar permanentemente
    db.delete(cenarios).where(eq(cenarios.id, id)).run();

    return NextResponse.json(null, { status: 204 });
  } catch (error) {
    console.error('Erro ao deletar cenário:', error);
    return NextResponse.json(
      { error: 'Erro ao deletar cenário' },
      { status: 500 }
    );
  }
}
