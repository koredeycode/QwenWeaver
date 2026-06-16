import { defineConfig } from 'drizzle-kit';

const url = process.env.DATABASE_URL || './data/dev.db';
const isPostgres = url.startsWith('postgres://') || url.startsWith('postgresql://');

export default defineConfig({
  schema: isPostgres ? './src/schema/pg.ts' : './src/schema/sqlite.ts',
  dialect: isPostgres ? 'postgresql' : 'sqlite',
  dbCredentials: isPostgres
    ? { url }
    : { url },
});
