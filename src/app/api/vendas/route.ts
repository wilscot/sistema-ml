import { NextRequest, NextResponse } from 'next/server';
import { getDb, getDbInstance, saveDb } from '@/db/index';
import { validarVenda } from '@/lib/validators';
import {
  calcularTaxaML,
  calcularLucroLiquido,
} from '@/lib/calculators';
import type { Venda, VendaInput } from '@/types/venda';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const produtoIdParam = searchParams.get('produtoId');
    const periodoParam = searchParams.get('periodo');
    const deletadosParam = searchParams.get('deletados');

    getDb();
    const db = getDbInstance();

    let vendas: Venda[] = [];
    let query = 'SELECT * FROM vendas WHERE 1=1';
    const params: any[] = [];

    // Filtrar por deletedAt
    if (deletadosParam === 'true') {
      query += ' AND deletedAt IS NOT NULL';
    } else {
      query += ' AND deletedAt IS NULL';
    }

    if (produtoIdParam) {
      const produtoId = parseInt(produtoIdParam, 10);
      if (isNaN(produtoId) || produtoId <= 0) {
        return NextResponse.json(
          { error: 'produtoId deve ser um número válido maior que zero' },
          { status: 400 }
        );
      }
      query += ' AND produtoId = ?';
      params.push(produtoId);
    }

    if (periodoParam === 'mes') {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const startOfMonth = Math.floor(
        new Date(year, month - 1, 1).getTime() / 1000
      );
      const endOfMonth = Math.floor(
        new Date(year, month, 0, 23, 59, 59).getTime() / 1000
      );
      query += ' AND data >= ? AND data <= ?';
      params.push(startOfMonth, endOfMonth);
    }

    query += ' ORDER BY data DESC';

    vendas = db.prepare(query).all(...params) as Venda[];

    return NextResponse.json({ vendas });
  } catch (error) {
    console.error('Erro ao buscar vendas:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar vendas' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = body as VendaInput;

    // Validar dados
    const validation = validarVenda(data);
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Dados inválidos', errors: validation.errors },
        { status: 400 }
      );
    }

    getDb();
    const db = getDbInstance();

    // 1. VERIFICAR ESTOQUE
    const estoqueTotal = db
      .prepare(
        'SELECT COALESCE(SUM(quantidadeDisponivel), 0) as total FROM compras WHERE produtoId = ?'
      )
      .get(data.produtoId!) as { total: number } | undefined;

    if (!estoqueTotal || estoqueTotal.total < data.quantidadeVendida!) {
      return NextResponse.json(
        {
          error: 'Estoque insuficiente',
          estoqueDisponivel: estoqueTotal?.total || 0,
          quantidadeSolicitada: data.quantidadeVendida,
        },
        { status: 400 }
      );
    }

    // 2. BEGIN TRANSACTION
    db.exec('BEGIN TRANSACTION');

    try {
      // 3. BUSCAR COMPRAS DISPONÍVEIS (FIFO - mais antigas primeiro)
      const comprasDisponiveis = db
        .prepare(
          `SELECT * FROM compras 
           WHERE produtoId = ? AND quantidadeDisponivel > 0 
           ORDER BY dataCompra ASC`
        )
        .all(data.produtoId!) as any[];

      if (comprasDisponiveis.length === 0) {
        db.exec('ROLLBACK');
        return NextResponse.json(
          { error: 'Nenhuma compra disponível para este produto' },
          { status: 400 }
        );
      }

      // 4. LOOP FIFO
      let quantidadeRestante = data.quantidadeVendida!;
      let custoTotalAcumulado = 0;
      let ultimaCompraId: number | null = null;

      for (const compra of comprasDisponiveis) {
        if (quantidadeRestante <= 0) break;

        const quantidadeParaDeduzir = Math.min(
          quantidadeRestante,
          compra.quantidadeDisponivel
        );

        const custoParcelaAtual = compra.custoUnitario * quantidadeParaDeduzir;
        custoTotalAcumulado += custoParcelaAtual;

        // UPDATE compras SET quantidadeDisponivel -= quantidadeParaDeduzir
        const novaQuantidadeDisponivel = compra.quantidadeDisponivel - quantidadeParaDeduzir;
        db.prepare(
          'UPDATE compras SET quantidadeDisponivel = ? WHERE id = ?'
        ).run(novaQuantidadeDisponivel, compra.id);

        quantidadeRestante -= quantidadeParaDeduzir;
        ultimaCompraId = compra.id;
      }

      if (quantidadeRestante > 0) {
        db.exec('ROLLBACK');
        return NextResponse.json(
          { error: 'Erro FIFO: quantidade restante não pôde ser deduzida' },
          { status: 500 }
        );
      }

      // 5. CALCULAR VALORES
      // Buscar configurações PROD
      const config = db
        .prepare('SELECT * FROM configuracoes_prod LIMIT 1')
        .get() as any;

      if (!config) {
        db.exec('ROLLBACK');
        return NextResponse.json(
          { error: 'Configurações PROD não encontradas' },
          { status: 500 }
        );
      }

      const taxaPercent =
        data.tipoAnuncio === 'CLASSICO'
          ? config.taxaClassico
          : config.taxaPremium;

      // Taxa ML é calculada sobre o valor total da venda (precoVenda × quantidadeVendida)
      const valorTotalVenda = data.precoVenda! * data.quantidadeVendida!;
      const taxaML = calcularTaxaML(valorTotalVenda, taxaPercent);

      // Custo total unitário (média ponderada das compras usadas)
      const custoTotalUnitario = custoTotalAcumulado / data.quantidadeVendida!;
      const custoTotal = Number(custoTotalUnitario.toFixed(2));

      // Lucro líquido: receita - custo - taxa - frete (frete é CUSTO)
      const lucroLiquido = calcularLucroLiquido(
        data.precoVenda!,
        data.quantidadeVendida!,
        data.freteCobrado!, // Frete PAGO pelo vendedor (é um custo)
        custoTotal,
        taxaML
      );

      // 6. INSERIR VENDA
      // Converter data para timestamp
      let dataTimestamp: number;
      if (typeof data.data === 'string') {
        dataTimestamp = Math.floor(new Date(data.data).getTime() / 1000);
      } else if (typeof data.data === 'number') {
        dataTimestamp = data.data;
      } else if (data.data && typeof data.data === 'object' && 'getTime' in data.data) {
        dataTimestamp = Math.floor((data.data as Date).getTime() / 1000);
      } else {
        dataTimestamp = data.data!;
      }

      const now = Math.floor(Date.now() / 1000);

      const insertResult = db
        .prepare(
          `INSERT INTO vendas (
            produtoId, compraId, quantidadeVendida, precoVenda, tipoAnuncio,
            freteCobrado, taxaML, custoTotal, lucroLiquido, data, createdAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          data.produtoId!,
          ultimaCompraId,
          data.quantidadeVendida!,
          data.precoVenda!,
          data.tipoAnuncio!,
          data.freteCobrado!,
          taxaML,
          custoTotal,
          lucroLiquido,
          dataTimestamp,
          now
        );

      // 7. ATUALIZAR ESTOQUE PRODUTO
      db.prepare(
        'UPDATE produtos_prod SET quantidade = quantidade - ?, updatedAt = ? WHERE id = ?'
      ).run(data.quantidadeVendida!, now, data.produtoId!);

      // 8. COMMIT TRANSACTION
      db.exec('COMMIT');

      // Buscar venda criada
      const venda = db
        .prepare('SELECT * FROM vendas WHERE id = ?')
        .get(insertResult.lastInsertRowid) as Venda;

      if (!venda) {
        return NextResponse.json(
          { error: 'Erro ao criar venda' },
          { status: 500 }
        );
      }

      saveDb();

      return NextResponse.json({ venda }, { status: 201 });
    } catch (error) {
      // ROLLBACK em caso de erro
      db.exec('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Erro ao criar venda:', error);
    return NextResponse.json(
      { error: 'Erro ao criar venda' },
      { status: 500 }
    );
  }
}
