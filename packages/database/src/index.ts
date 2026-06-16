import { type BetterSQLite3Database, drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import { type PostgresJsDatabase, drizzle as drizzlePg } from 'drizzle-orm/postgres-js';
import Database from 'better-sqlite3';
import postgres from 'postgres';

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
  const url = databaseUrl ?? process.env.DATABASE_URL ?? './data/dev.db';
  const dialect = detectDialect(url);

  if (dialect === 'sqlite') {
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
