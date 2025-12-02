import { NextRequest, NextResponse } from 'next/server';
import { getDb, getDbInstance } from '@/db/index';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const searchParams = request.nextUrl.searchParams;
    const modo = searchParams.get('modo');

    if (isNaN(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    if (!modo || (modo !== 'LAB' && modo !== 'PROD')) {
      return NextResponse.json(
        { error: "Query param 'modo' é obrigatório e deve ser 'LAB' ou 'PROD'" },
        { status: 400 }
      );
    }

    getDb();
    const db = getDbInstance();

    const tableName = modo === 'LAB' ? 'produtos_lab' : 'produtos_prod';

    // Verificar se produto existe e está deletado
    const produto = db
      .prepare(`SELECT id FROM ${tableName} WHERE id = ? AND deletedAt IS NOT NULL`)
      .get(id);

    if (!produto) {
      return NextResponse.json(
        { error: 'Produto deletado não encontrado' },
        { status: 404 }
      );
    }

    // Hard delete (apenas da lixeira)
    db.prepare(`DELETE FROM ${tableName} WHERE id = ? AND deletedAt IS NOT NULL`).run(id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao deletar permanentemente:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao deletar permanentemente' },
      { status: 500 }
    );
  }
}

