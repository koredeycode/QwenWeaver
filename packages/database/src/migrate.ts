import { execSync } from 'node:child_process';
import { createConnection, getConnection } from './index.js';

const packageRoot = new URL('..', import.meta.url).pathname;

export async function pushDatabase(databaseUrl?: string): Promise<void> {
  const { dialect } = createConnection(databaseUrl);

  execSync('pnpm exec drizzle-kit push', {
    cwd: packageRoot,
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl ?? process.env.DATABASE_URL ?? './data/dev.db',
    },
  });

  console.log(`[migrate] Database pushed successfully (${dialect})`);
}

export { getConnection };
