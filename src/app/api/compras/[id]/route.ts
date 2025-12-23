import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/database';
import { calcularCustoUnitario } from '@/lib/calculators';

interface CompraUpdateInput {
  precoUSD?: number;
  cotacao?: number;
  freteTotal?: number;
  quantidadeComprada?: number;
  fornecedor?: string | null;
  observacoes?: string | null;
}

/**
 * PUT /api/compras/[id]
 * Atualiza uma compra e recalcula vendas vinculadas
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      );
    }

    const db = getDb();
    const body: CompraUpdateInput = await request.json();

    // Buscar compra atual
    const compraAtual = db
      .prepare('SELECT * FROM compras WHERE id = ? AND deletedAt IS NULL')
      .get(id) as any;

    if (!compraAtual) {
      return NextResponse.json(
        { error: 'Compra não encontrada' },
        { status: 404 }
      );
    }

    // Valores atualizados (manter antigo se não fornecido)
    const precoUSD = body.precoUSD ?? compraAtual.precoUSD;
    const cotacao = body.cotacao ?? compraAtual.cotacao;
    const freteTotal = body.freteTotal ?? compraAtual.freteTotal;
    const quantidadeComprada = body.quantidadeComprada ?? compraAtual.quantidadeComprada;
    const fornecedor = body.fornecedor !== undefined ? body.fornecedor : compraAtual.fornecedor;
    const observacoes = body.observacoes !== undefined ? body.observacoes : compraAtual.observacoes;

    // Validar quantidade (não pode ser menor que já vendido)
    const quantidadeVendida = compraAtual.quantidadeComprada - compraAtual.quantidadeDisponivel;
    if (quantidadeComprada < quantidadeVendida) {
      return NextResponse.json(
        { error: `Quantidade não pode ser menor que ${quantidadeVendida} (já vendidas)` },
        { status: 400 }
      );
    }

    // Recalcular custo unitário
    const novoCustoUnitario = calcularCustoUnitario(
      precoUSD,
      cotacao,
      freteTotal,
      quantidadeComprada
    );

    // Calcular nova quantidade disponível
    const novaQuantidadeDisponivel = quantidadeComprada - quantidadeVendida;

    // Diferença de estoque para atualizar produto
    const diferencaEstoque = novaQuantidadeDisponivel - compraAtual.quantidadeDisponivel;

    const now = Math.floor(Date.now() / 1000);

    // Iniciar transação
    const transaction = db.transaction(() => {
      // 1. Atualizar compra
      db.prepare(`
        UPDATE compras 
        SET precoUSD = ?,
            cotacao = ?,
            freteTotal = ?,
            quantidadeComprada = ?,
            quantidadeDisponivel = ?,
            custoUnitario = ?,
            fornecedor = ?,
            observacoes = ?,
            updatedAt = ?
        WHERE id = ?
      `).run(
        precoUSD,
        cotacao,
        freteTotal,
        quantidadeComprada,
        novaQuantidadeDisponivel,
        novoCustoUnitario,
        fornecedor,
        observacoes,
        now,
        id
      );

      // 2. Atualizar estoque do produto se quantidade mudou
      if (diferencaEstoque !== 0) {
        db.prepare(`
          UPDATE produtos_prod 
          SET quantidade = quantidade + ?,
              updatedAt = ?
          WHERE id = ?
        `).run(diferencaEstoque, now, compraAtual.produtoId);
      }

      // 3. Recalcular lucro de TODAS vendas vinculadas a esta compra
      const vendasVinculadas = db
        .prepare('SELECT * FROM vendas WHERE compraId = ? AND deletedAt IS NULL')
        .all(id) as any[];

      for (const venda of vendasVinculadas) {
        // Novo lucro = (precoVenda * quantidade) - frete - taxaML - (novoCusto * quantidade)
        const receitaBruta = venda.precoVenda * venda.quantidadeVendida;
        const custoTotalProdutos = novoCustoUnitario * venda.quantidadeVendida;
        const novoLucro = Number((receitaBruta - venda.freteCobrado - venda.taxaML - custoTotalProdutos).toFixed(2));

        db.prepare(`
          UPDATE vendas 
          SET custoTotal = ?,
              lucroLiquido = ?
          WHERE id = ?
        `).run(custoTotalProdutos, novoLucro, venda.id);
      }

      return vendasVinculadas.length;
    });

    const vendasAtualizadas = transaction();

    return NextResponse.json({
      success: true,
      message: 'Compra atualizada com sucesso',
      compra: {
        id,
        precoUSD,
        cotacao,
        freteTotal,
        quantidadeComprada,
        quantidadeDisponivel: novaQuantidadeDisponivel,
        custoUnitario: novoCustoUnitario,
        fornecedor,
        observacoes
      },
      vendasAtualizadas,
      diferencaEstoque
    });
  } catch (error: any) {
    console.error('Erro ao atualizar compra:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao atualizar compra' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/compras/[id]
 * Soft delete de uma compra
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      );
    }

    const db = getDb();

    // Verificar se compra existe
    const compra = db
      .prepare('SELECT * FROM compras WHERE id = ? AND deletedAt IS NULL')
      .get(id);

    if (!compra) {
      return NextResponse.json(
        { error: 'Compra não encontrada' },
        { status: 404 }
      );
    }

    // Soft delete
    const now = Math.floor(Date.now() / 1000);
    db.prepare('UPDATE compras SET deletedAt = ? WHERE id = ?').run(now, id);

    return NextResponse.json(
      { 
        success: true,
        message: 'Compra excluída com sucesso',
        warning: 'Compra movida para lixeira'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erro ao excluir compra:', error);
    return NextResponse.json(
      { error: 'Erro ao excluir compra' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/compras/[id]
 * Busca uma compra específica
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      );
    }

    const db = getDb();

    const compra = db
      .prepare('SELECT * FROM compras WHERE id = ? AND deletedAt IS NULL')
      .get(id);

    if (!compra) {
      return NextResponse.json(
        { error: 'Compra não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({ compra }, { status: 200 });
  } catch (error) {
    console.error('Erro ao buscar compra:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar compra' },
      { status: 500 }
    );
  }
}

