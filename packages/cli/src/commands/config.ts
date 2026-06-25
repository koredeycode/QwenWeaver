import {
  loadConfig,
  saveConfig,
  configExists,
} from '../config-store.js';
import type { QwenWeaverConfig } from '../config-store.js';

export async function configCommand(key?: string, value?: string): Promise<void> {
  if (!configExists()) {
    console.log('No config found. Run `qwenweaver init` first.');
    return;
  }

  const config = loadConfig();

  if (!key) {
    // Show all values (mask secrets)
    console.log('Current configuration (~/.qwenweaver/config.json):\n');
    for (const [k, v] of Object.entries(config)) {
      const isSecret = k.toLowerCase().includes('secret') || k.toLowerCase().includes('key');
      console.log(`  ${k}: ${isSecret && v ? '****' : v}`);
    }
    console.log('\nUse `qwenweaver config <key> <value>` to set a value.');
    console.log('Use `qwenweaver init` to reconfigure interactively.');
    return;
  }

  if (!value) {
    // Show single value
    const current = (config as any)[key];
    if (current === undefined) {
      console.log(`  Unknown key: ${key}`);
      console.log(`  Valid keys: ${Object.keys(config).join(', ')}`);
      return;
    }
    const isSecret = key.toLowerCase().includes('secret') || key.toLowerCase().includes('key');
    console.log(`  ${key}: ${isSecret && current ? '****' : current}`);
    return;
  }

  // Set a value
  const updated: QwenWeaverConfig = { ...config, [key as keyof QwenWeaverConfig]: value as any };
  saveConfig(updated);
  console.log(`  ✔ Set ${key}=${value}`);
}
