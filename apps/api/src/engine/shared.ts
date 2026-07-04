import { readFileSync, existsSync } from 'fs';
import { resolve, join } from 'path';
import type { BusMessage } from '@qwenweaver/types';

export function buildChannelId(source: string, target: string): string {
  return [source, target].sort().join('|');
}

export function extractPayloadText(msg?: BusMessage): string | undefined {
  if (!msg) return undefined;
  if (typeof msg.payload === 'string') return msg.payload;
  if (msg.payload && typeof msg.payload === 'object') {
    const p = msg.payload as Record<string, unknown>;
    if (p.text && typeof p.text === 'string') return p.text;
    if (p.value && typeof p.value === 'string') return p.value;
    const outputs = p.outputs as Array<{ type: string; value: string }> | undefined;
    if (outputs && outputs.length > 0) {
      for (const out of outputs) {
        if (out.type === 'text' && out.value && typeof out.value === 'string') {
          const urlMatch = out.value.match(/\/public\/storage\/runs\/(.+)/);
          if (urlMatch) {
            const fullPath = join(process.cwd(), 'public', 'storage', 'runs', urlMatch[1]);
            if (existsSync(fullPath)) {
              const content = readFileSync(fullPath, 'utf-8');
              if (content) return content;
            }
          }
          // Don't return a URL as text — skip to next output
          if (out.value.startsWith('http')) continue;
          return out.value;
        }
      }
      // If no valid text found, don't return the payload dump
      return undefined;
    }
    return undefined;
  }
  return String(msg.payload ?? '');
}
