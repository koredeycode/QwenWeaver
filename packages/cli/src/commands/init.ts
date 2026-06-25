import {
  loadConfig,
  configExists,
  promptForConfig,
} from '../config-store.js';

export async function initCommand(): Promise<void> {
  console.log('=== QwenWeaver Init ===\n');

  // 1. Collect or confirm configuration
  const existing = configExists() ? loadConfig() : undefined;
  const config = await promptForConfig(
    existing ?? {
      apiSecret: '',
      databaseUrl: './data/dev.db',
      dashscopeApiKey: '',
      corsOrigins: 'http://localhost:5173',
      port: 3001,
      logLevel: 'info',
    },
  );

  // 2. Migrate the database
  console.log('\nRunning database migrations...');
  const { migrateCommand } = await import('./migrate.js');
  await migrateCommand({ seed: true, dbUrl: config.databaseUrl });

  console.log('\n✔ QwenWeaver project initialized successfully!');
  console.log('  Run `qwenweaver start` to start the server.');
}
