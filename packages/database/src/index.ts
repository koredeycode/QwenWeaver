import { type BetterSQLite3Database, drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import { type PostgresJsDatabase, drizzle as drizzlePg } from 'drizzle-orm/postgres-js';
import { type MySql2Database, drizzle as drizzleMysql } from 'drizzle-orm/mysql2';
import Database from 'better-sqlite3';
import postgres from 'postgres';
import mysql from 'mysql2/promise';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as pgSchema from './schema/pg.js';
import * as sqliteSchema from './schema/sqlite.js';
import * as mysqlSchema from './schema/mysql.js';

type Dialect = 'sqlite' | 'postgres' | 'mysql';

function detectDialect(url: string): Dialect {
  if (url.startsWith('postgres://') || url.startsWith('postgresql://')) {
    return 'postgres';
  }
  if (url.startsWith('mysql://')) {
    return 'mysql';
  }
  return 'sqlite';
}

export type DB = 
  | BetterSQLite3Database<typeof sqliteSchema> 
  | PostgresJsDatabase<typeof pgSchema>
  | MySql2Database<typeof mysqlSchema>;

let _db: DB | null = null;
let _dialect: Dialect | null = null;

export async function createConnectionAsync(databaseUrl?: string): Promise<{ db: DB; dialect: Dialect }> {
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

  if (dialect === 'mysql') {
    const connection = await mysql.createConnection(url);
    const db = drizzleMysql(connection, { schema: mysqlSchema, mode: 'default' });
    _db = db;
    _dialect = 'mysql';
    return { db, dialect };
  }

  const client = postgres(url, { prepare: false });
  const db = drizzlePg(client, { schema: pgSchema });
  _db = db;
  _dialect = 'postgres';
  return { db, dialect };
}

// Keeping sync fallback for tests/compatibility where possible, but mysql is async.
// If using MySQL, createConnectionAsync MUST be called during startup.
export function createConnection(databaseUrl?: string): { db: DB; dialect: Dialect } {
  const defaultPath = fileURLToPath(new URL('../data/dev.db', import.meta.url));
  const url = databaseUrl ?? process.env.DATABASE_URL ?? defaultPath;
  const dialect = detectDialect(url);

  if (dialect === 'mysql') {
    throw new Error('MySQL requires createConnectionAsync. Please initialize the DB connection asynchronously.');
  }

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

export { pgSchema, sqliteSchema, mysqlSchema };

export * from './queries/index.js';
