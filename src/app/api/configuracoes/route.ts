import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/db';
import { getConfig } from '@/lib/db-client';
import { eq } from 'drizzle-orm';
import type { Configuracao } from '@/db/schema';

const { configuracoes } = schema;

/**
 * GET /api/configuracoes
 * Retorna configuração global (singleton id=1)
 */
export async function GET(request: NextRequest) {
  try {
    const config = await getConfig();
    return NextResponse.json({ config }, { status: 200 });
  } catch (error) {
    console.error('Erro ao buscar configurações:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar configurações' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/configuracoes
 * Atualiza configuração global (singleton id=1)
 * Body: Partial<Configuracao>
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const updates: Partial<Configuracao> = {};

    // Campos que podem ser atualizados
    if (body.taxaClassico !== undefined) {
      const taxaClassico = parseFloat(body.taxaClassico);
      if (isNaN(taxaClassico) || taxaClassico < 0 || taxaClassico > 100) {
        return NextResponse.json(
          { error: 'Taxa clássico deve estar entre 0 e 100' },
          { status: 400 }
        );
      }
      updates.taxaClassico = taxaClassico;
    }

    if (body.taxaPremium !== undefined) {
      const taxaPremium = parseFloat(body.taxaPremium);
      if (isNaN(taxaPremium) || taxaPremium < 0 || taxaPremium > 100) {
        return NextResponse.json(
          { error: 'Taxa premium deve estar entre 0 e 100' },
          { status: 400 }
        );
      }
      updates.taxaPremium = taxaPremium;
    }

    if (body.cotacaoDolar !== undefined) {
      if (body.cotacaoDolar === null || body.cotacaoDolar === '') {
        updates.cotacaoDolar = null;
      } else {
        const cotacaoDolar = parseFloat(body.cotacaoDolar);
        if (isNaN(cotacaoDolar) || cotacaoDolar <= 0) {
          return NextResponse.json(
            { error: 'Cotação do dólar deve ser um número positivo' },
            { status: 400 }
          );
        }
        updates.cotacaoDolar = cotacaoDolar;
      }
    }

    // Atualizar updatedAt
    updates.updatedAt = new Date();

    // Atualizar no banco (singleton id=1)
    const result = db
      .update(configuracoes)
      .set(updates)
      .where(eq(configuracoes.id, 1))
      .returning()
      .all();

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Erro ao atualizar configurações' },
        { status: 500 }
      );
    }

    return NextResponse.json({ config: result[0] }, { status: 200 });
  } catch (error) {
    console.error('Erro ao atualizar configurações:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar configurações' },
      { status: 500 }
    );
  }
}
