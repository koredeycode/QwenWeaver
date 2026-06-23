import { execSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..', '..', '..');

interface MigrateOptions {
  seed?: boolean;
  dbUrl?: string;
}

export async function migrateCommand(options: MigrateOptions = {}): Promise<void> {
  const dbPkg = resolve(ROOT, 'packages', 'database');
  const dbUrl = options.dbUrl || process.env.DATABASE_URL || './data/dev.db';

  console.log(`Running database migrations (DATABASE_URL=${dbUrl})...`);

  try {
    execSync('pnpm exec drizzle-kit push', {
      cwd: dbPkg,
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: dbUrl,
      },
    });
    console.log('  ✔ Migrations applied.');
  } catch (err) {
    console.error('  ✖ Migration failed:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  if (options.seed) {
    // Seed only works with SQLite (uses better-sqlite3 directly)
    const isSqlite = !dbUrl.startsWith('postgres') && !dbUrl.startsWith('mysql');
    if (!isSqlite) {
      console.log('  – Skipping seed (only supported for SQLite).');
      return;
    }
    console.log('\nSeeding database...');
    try {
      execSync('pnpm exec tsx src/seed.ts', {
        cwd: dbPkg,
        stdio: 'inherit',
        env: {
          ...process.env,
          DATABASE_URL: dbUrl,
        },
      });
      console.log('  ✔ Seed data inserted.');
    } catch (err) {
      console.error('  ✖ Seed failed:', err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  }
}
