import { execSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..', '..', '..');

export async function buildCommand(): Promise<void> {
  console.log('Building QwenWeaver packages...\n');

  const steps = [
    { name: 'TypeScript packages', cmd: 'pnpm --filter @qwenweaver/types build' },
    { name: 'Database package', cmd: 'pnpm --filter @qwenweaver/database build' },
    { name: 'MCP client package', cmd: 'pnpm --filter @qwenweaver/mcp-client build' },
    { name: 'API package', cmd: 'pnpm --filter @qwenweaver/api build' },
    { name: 'Frontend app', cmd: 'pnpm --filter @qwenweaver/app build' },
    { name: 'CLI package', cmd: 'pnpm --filter @qwenweaver/cli build' },
  ];

  for (const step of steps) {
    process.stdout.write(`  Building ${step.name}...`);
    try {
      execSync(step.cmd, {
        cwd: ROOT,
        stdio: 'pipe',
        env: { ...process.env, NODE_ENV: 'production' },
      });
      console.log(' ✔');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(' ✖');
      console.error(`    Error: ${msg}`);
      process.exit(1);
    }
  }

  console.log('\n✔ All packages built successfully.');
}
