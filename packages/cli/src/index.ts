#!/usr/bin/env node

import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { startCommand } from './commands/start.js';
import { buildCommand } from './commands/build.js';
import { migrateCommand } from './commands/migrate.js';
import { configCommand } from './commands/config.js';

const program = new Command();

program
  .name('qwenweaver')
  .description('QwenWeaver — visual multi-agent orchestration platform')
  .version('0.1.0');

program
  .command('init')
  .description('Initialize a new QwenWeaver instance (interactive setup)')
  .action(initCommand);

program
  .command('start')
  .description('Start the QwenWeaver API server')
  .option('-p, --port <number>', 'Port to listen on')
  .option('--password <string>', 'Master password to decrypt config')
  .action(startCommand);

program.command('build').description('Build all packages for production').action(buildCommand);

program
  .command('migrate')
  .description('Run database migrations')
  .option('--seed', 'Also seed the database with demo data')
  .option('--db-url <string>', 'Database URL override')
  .action(migrateCommand);

program
  .command('config')
  .description('View or set configuration values')
  .argument('[key]', 'Config key to view or set')
  .argument('[value]', 'Value to set (omit to view current)')
  .action(configCommand);

program.parse(process.argv);
