import { defineConfig } from 'drizzle-kit';

const url = process.env.DATABASE_URL || '../../apps/api/data/dev.db';
const isPostgres = url.startsWith('postgres://') || url.startsWith('postgresql://');
const isMysql = url.startsWith('mysql://');

function schemaPath(): string {
  if (isMysql) return './src/schema/mysql.ts';
  if (isPostgres) return './src/schema/pg.ts';
  return './src/schema/sqlite.ts';
}

function dialect(): 'mysql' | 'postgresql' | 'sqlite' {
  if (isMysql) return 'mysql';
  if (isPostgres) return 'postgresql';
  return 'sqlite';
}

export default defineConfig({
  schema: schemaPath(),
  dialect: dialect(),
  dbCredentials: { url },
  out: './migrations',
});
