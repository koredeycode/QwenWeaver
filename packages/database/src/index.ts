import { type BetterSQLite3Database, drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import { type PostgresJsDatabase, drizzle as drizzlePg } from 'drizzle-orm/postgres-js';
import Database from 'better-sqlite3';
import postgres from 'postgres';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as pgSchema from './schema/pg.js';
import * as sqliteSchema from './schema/sqlite.js';

type Dialect = 'sqlite' | 'postgres';

function detectDialect(url: string): Dialect {
  if (url.startsWith('postgres://') || url.startsWith('postgresql://')) {
    return 'postgres';
  }
  return 'sqlite';
}

export type DB = BetterSQLite3Database<typeof sqliteSchema> | PostgresJsDatabase<typeof pgSchema>;

let _db: DB | null = null;
let _dialect: Dialect | null = null;

export function createConnection(databaseUrl?: string): { db: DB; dialect: Dialect } {
  const defaultPath = fileURLToPath(new URL('../data/dev.db', import.meta.url));
  const url = databaseUrl ?? process.env.DATABASE_URL ?? defaultPath;
  const dialect = detectDialect(url);

  if (dialect === 'sqlite') {
    if (url !== ':memory:') {
      const dir = dirname(url);
      if (dir && !existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    }
    const client = new Database(url);
    client.pragma('journal_mode = WAL');
    client.pragma('foreign_keys = ON');
    const db = drizzleSqlite(client, { schema: sqliteSchema });
    _db = db;
    _dialect = 'sqlite';
    return { db, dialect };
  }

  const client = postgres(url, { prepare: false });
  const db = drizzlePg(client, { schema: pgSchema });
  _db = db;
  _dialect = 'postgres';
  return { db, dialect };
}

export function getConnection(): { db: DB; dialect: Dialect } {
  if (_db && _dialect) {
    return { db: _db, dialect: _dialect };
  }
  return createConnection();
}

export { pgSchema, sqliteSchema };

// Export all queries for separation of concern
export * from './queries/index.js';
