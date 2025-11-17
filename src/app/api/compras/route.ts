import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { compras, produtos } from '@/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { calcularCustoTotal } from '@/lib/calculators';

export async function GET() {
  try {
    const result = db
      .select({
        compra: compras,
        produto: produtos,
      })
      .from(compras)
      .leftJoin(produtos, eq(compras.produtoId, produtos.id))
      .orderBy(desc(compras.dataCompra))
      .all();

    return NextResponse.json({ compras: result }, { status: 200 });
  } catch (error) {
    console.error('Erro ao buscar compras:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    
    // Verificar se é erro de coluna não encontrada
    if (errorMessage.includes('no such column') || errorMessage.includes('column') || errorMessage.includes('no such table')) {
      return NextResponse.json(
        { 
          error: 'Schema do banco desatualizado. Execute: pnpm db:push',
          details: errorMessage
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Erro ao buscar compras',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Dados recebidos para criar compra:', JSON.stringify(body, null, 2));

    const {
      produtoId,
      precoUSD,
      cotacao,
      freteTotal,
      quantidadeComprada,
      moeda,
      fornecedor,
      observacoes,
      dataCompra,
    } = body;

    // Validar tipos e valores
    if (!produtoId || typeof produtoId !== 'number' || isNaN(produtoId)) {
      return NextResponse.json(
        { error: 'produtoId deve ser um número válido' },
        { status: 400 }
      );
    }

    if (!precoUSD || !cotacao || !quantidadeComprada) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: produtoId, precoUSD, cotacao, quantidadeComprada' },
        { status: 400 }
      );
    }

    if (typeof precoUSD !== 'number' || typeof cotacao !== 'number' || typeof quantidadeComprada !== 'number') {
      return NextResponse.json(
        { error: 'precoUSD, cotacao e quantidadeComprada devem ser números' },
        { status: 400 }
      );
    }

    if (precoUSD <= 0 || cotacao <= 0 || quantidadeComprada <= 0) {
      return NextResponse.json(
        { error: 'Valores devem ser maiores que zero' },
        { status: 400 }
      );
    }

    // Buscar produto e verificar se existe e está ativo
    const produto = db
      .select()
      .from(produtos)
      .where(eq(produtos.id, produtoId))
      .get();

    if (!produto) {
      console.error(`Produto com ID ${produtoId} não encontrado`);
      return NextResponse.json(
        { error: `Produto com ID ${produtoId} não encontrado` },
        { status: 404 }
      );
    }

    console.log('Produto encontrado:', { 
      id: produto.id, 
      nome: produto.nome, 
      tipo: produto.tipo,
      deletedAt: produto.deletedAt,
      quantidade: produto.quantidade
    });

    // Verificar se produto não está deletado (soft delete)
    if (produto.deletedAt) {
      console.error(`Produto ${produtoId} está deletado (soft delete)`);
      return NextResponse.json(
        { error: 'Produto está deletado e não pode receber compras' },
        { status: 400 }
      );
    }

    // Verificar se produto é do tipo PROD
    if (produto.tipo !== 'PROD') {
      console.error(`Produto ${produtoId} é do tipo ${produto.tipo}, não PROD`);
      return NextResponse.json(
        { error: 'Apenas produtos do tipo PROD podem ter compras registradas' },
        { status: 400 }
      );
    }

    const custoUnitario = calcularCustoTotal(
      precoUSD,
      cotacao,
      freteTotal || 0,
      quantidadeComprada,
      moeda || 'USD'
    );

    console.log('Custo unitário calculado:', custoUnitario);

    const dadosCompra = {
      produtoId,
      precoUSD,
      cotacao,
      freteTotal: freteTotal || 0,
      quantidadeComprada,
      quantidadeDisponivel: quantidadeComprada,
      moeda: moeda || 'USD',
      fornecedor: fornecedor || '',
      observacoes: observacoes || '',
      custoUnitario,
      dataCompra: dataCompra ? new Date(dataCompra) : new Date(),
    };

    console.log('Dados da compra a serem inseridos:', JSON.stringify(dadosCompra, null, 2));

    // Verificar novamente se o produto existe antes de inserir (double-check)
    const produtoVerificacao = db
      .select()
      .from(produtos)
      .where(eq(produtos.id, produtoId))
      .get();

    if (!produtoVerificacao) {
      console.error(`Produto ${produtoId} não encontrado na verificação final`);
      return NextResponse.json(
        { error: `Produto com ID ${produtoId} não encontrado. Tente recarregar a página.` },
        { status: 404 }
      );
    }

    console.log('Verificação final do produto OK:', produtoVerificacao.id);

    let novaCompra;
    try {
      novaCompra = db
        .insert(compras)
        .values(dadosCompra)
        .returning()
        .get();

      if (!novaCompra) {
        console.error('Nenhuma compra retornada após inserção');
        return NextResponse.json(
          { error: 'Erro ao criar compra: nenhum registro retornado' },
          { status: 500 }
        );
      }

      console.log('Compra criada com sucesso:', novaCompra.id);
    } catch (insertError: any) {
      console.error('Erro ao inserir compra:', insertError);
      console.error('Mensagem de erro:', insertError.message);
      console.error('Stack:', insertError.stack);
      
      // Se for erro de foreign key, dar mensagem mais específica
      if (insertError.message?.includes('FOREIGN KEY') || insertError.message?.includes('constraint')) {
        return NextResponse.json(
          { 
            error: `Erro de integridade: produto com ID ${produtoId} não existe ou foi removido. Verifique se o produto foi migrado corretamente para PROD e tente novamente.`,
            details: insertError.message
          },
          { status: 400 }
        );
      }
      
      throw insertError; // Re-throw para ser capturado pelo catch externo
    }

    db.update(produtos)
      .set({
        quantidade: sql`${produtos.quantidade} + ${quantidadeComprada}`,
        updatedAt: new Date(),
      })
      .where(eq(produtos.id, produtoId))
      .run();

    console.log('Estoque do produto atualizado');

    return NextResponse.json({ compra: novaCompra }, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar compra:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'N/A');
    const errorMessage =
      error instanceof Error ? error.message : 'Erro desconhecido';
    
    // Verificar se é erro de schema
    if (errorMessage.includes('no such column') || errorMessage.includes('column') || errorMessage.includes('no such table')) {
      return NextResponse.json(
        { 
          error: 'Schema do banco desatualizado. Execute: pnpm db:update',
          details: errorMessage
        },
        { status: 500 }
      );
    }
    
    // Verificar se é erro de foreign key
    if (errorMessage.includes('FOREIGN KEY') || errorMessage.includes('constraint')) {
      return NextResponse.json(
        { 
          error: 'Erro de integridade: produto não encontrado ou inválido',
          details: errorMessage
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Erro ao criar compra. Tente novamente mais tarde.',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}

