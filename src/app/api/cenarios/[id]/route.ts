import { NextRequest, NextResponse } from 'next/server';
import { getDb, getDbInstance, saveDb } from '@/db/index';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10);

    if (isNaN(id) || id <= 0) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      );
    }

    await getDb();
    const db = getDbInstance();

    // Verificar se cenário existe
    const checkResult = db.exec(`SELECT id FROM cenarios_lab WHERE id = ${id}`);
    if (checkResult.length === 0 || checkResult[0].values.length === 0) {
      return NextResponse.json(
        { error: 'Cenário não encontrado' },
        { status: 404 }
      );
    }

    // Hard delete
    db.run(`DELETE FROM cenarios_lab WHERE id = ${id}`);
    saveDb();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao deletar cenário:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao deletar cenário' },
      { status: 500 }
    );
  }
}

