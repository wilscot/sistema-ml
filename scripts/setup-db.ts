import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { configuracoes } from '../src/db/schema';
import { eq } from 'drizzle-orm';

const sqlite = new Database('./db/data.db');
const db = drizzle(sqlite);

console.log('Running migrations...');
migrate(db, { migrationsFolder: './src/db/migrations' });

console.log('Seeding configuracoes...');
const existingConfig = db
  .select()
  .from(configuracoes)
  .where(eq(configuracoes.id, 1))
  .limit(1)
  .all();

if (existingConfig.length === 0) {
  db.insert(configuracoes).values({
    id: 1,
    taxaClassico: 11,
    taxaPremium: 16,
    cotacaoDolar: null,
  }).run();
  console.log('✓ Configurações iniciais criadas (taxaClassico: 11, taxaPremium: 16)');
} else {
  console.log('✓ Configurações já existem');
}

sqlite.close();
console.log('✓ Database setup concluído com sucesso!');
