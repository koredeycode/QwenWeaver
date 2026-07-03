import type { BusMessage } from '@qwenweaver/types';

export function buildChannelId(source: string, target: string): string {
  return [source, target].sort().join('|');
}

export function extractPayloadText(msg?: BusMessage): string | undefined {
  if (!msg) return undefined;
  if (typeof msg.payload === 'string') return msg.payload;
  if (msg.payload && typeof msg.payload === 'object') {
    const p = msg.payload as Record<string, unknown>;
    return (p.text as string) ?? (p.value as string) ?? JSON.stringify(msg.payload);
  }
  return String(msg.payload ?? '');
}
