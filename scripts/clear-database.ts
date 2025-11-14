import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { produtos, cenarios, vendas } from '../src/db/schema';

const sqlite = new Database('./db/data.db');
const db = drizzle(sqlite);

console.log('Limpando banco de dados...');

// Deletar todos os registros (manter estrutura)
db.delete(vendas).run();
console.log('✓ Vendas deletadas');

db.delete(cenarios).run();
console.log('✓ Cenários deletados');

db.delete(produtos).run();
console.log('✓ Produtos deletados');

sqlite.close();
console.log('✓ Banco de dados limpo com sucesso!');
console.log('');
console.log('Agora execute: pnpm db:push');

