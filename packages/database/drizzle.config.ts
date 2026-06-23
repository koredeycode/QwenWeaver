import { defineConfig } from 'drizzle-kit';

const url = process.env.DATABASE_URL || './data/dev.db';
const isPostgres = url.startsWith('postgres://') || url.startsWith('postgresql://');
const isMysql = url.startsWith('mysql://');
const isSelfHosted = !!process.env.TEMPLATE_API_URL;

function schemaPath(): string {
  if (isMysql) {
    return isSelfHosted ? './src/schema/mysql-core.ts' : './src/schema/mysql.ts';
  }
  if (isPostgres) {
    return isSelfHosted ? './src/schema/pg-core.ts' : './src/schema/pg.ts';
  }
  return isSelfHosted ? './src/schema/sqlite-core.ts' : './src/schema/sqlite.ts';
}

function dialect(): 'mysql' | 'postgresql' | 'sqlite' {
  if (isMysql) return 'mysql';
  if (isPostgres) return 'postgresql';
  return 'sqlite';
}

export default defineConfig({
  schema: schemaPath(),
  dialect: dialect(),
  dbCredentials: isMysql
    ? { url }
    : isPostgres
      ? { url }
      : { url },
});
