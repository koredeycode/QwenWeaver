import { tool } from 'ai';
import { z } from 'zod';
import { getQueryProvider } from '@qwenweaver/database';
import type { StreamEmitter } from './types.js';
import { createModuleLogger } from '../logger.js';

const log = createModuleLogger('engine/workspace-tools');

export function createWorkspaceTools(
  executionId: string,
  nodeId: string,
  emitter?: StreamEmitter,
): Record<string, any> {
  const provider = getQueryProvider();

  return {
    workspace_write: tool({
      description:
        'Write a value to the shared workspace blackboard under a key. Other agents can read it. Existing keys are updated (upsert). Keys use dot-path naming like "research.findings".',
      parameters: z.object({
        key: z.string().min(1).max(256).describe('Dot-path key, e.g. "research.findings"'),
        value: z.any().describe('JSON-serializable value to store'),
        valueType: z
          .enum(['text', 'json', 'file_ref', 'image_ref', 'audio_ref'])
          .optional()
          .default('json')
          .describe('Type hint for the value'),
      }),
      execute: async (args: any) => {
        const { key, value, valueType } = args;
        log.info({ executionId, nodeId, key }, 'Workspace write');
        const id = await provider.writeWorkspaceEntry(executionId, nodeId, key, value, valueType);
        if (emitter && !emitter.isClosed()) {
          await emitter.emit('workspace_write', {
            nodeId,
            key,
            valueType,
            timestamp: Date.now(),
          });
        }
        return { success: true, id, key };
      },
    } as any),

    workspace_read: tool({
      description:
        'Read a value from the shared workspace by key. Returns null if the key does not exist.',
      parameters: z.object({
        key: z.string().min(1).max(256).describe('Dot-path key to read'),
      }),
      execute: async (args: any) => {
        const { key } = args;
        log.info({ executionId, nodeId, key }, 'Workspace read');
        const entry = await provider.readWorkspaceEntry(executionId, key);
        return entry?.value ?? null;
      },
    } as any),

    workspace_list: tool({
      description:
        'List all keys in the workspace, optionally filtered by prefix. Returns key, valueType, and creation time.',
      parameters: z.object({
        prefix: z
          .string()
          .optional()
          .describe('Filter keys starting with this prefix (e.g. "research.")'),
      }),
      execute: async (args: any) => {
        const { prefix } = args;
        log.info({ executionId, nodeId, prefix }, 'Workspace list');
        const entries = await provider.listWorkspaceEntries(executionId, undefined, prefix);
        return entries.map((e: any) => ({
          key: e.key,
          value: e.value,
          valueType: e.valueType,
          round: e.round,
          createdAt: e.createdAt,
        }));
      },
    } as any),

    workspace_append: tool({
      description:
        'Append an item to a workspace array. Creates the array if the key does not exist. Uses optimistic concurrency to prevent data loss under concurrent agents.',
      parameters: z.object({
        key: z.string().min(1).max(256).describe('Dot-path key for the array'),
        item: z.any().describe('Item to append to the array'),
      }),
      execute: async (args: any) => {
        const { key, item } = args;
        log.info({ executionId, nodeId, key }, 'Workspace append');
        const maxRetries = 5;
        for (let attempt = 0; attempt < maxRetries; attempt++) {
          const existing = await provider.readWorkspaceEntry(executionId, key);
          const currentRound = existing?.round ?? 0;
          const arr = Array.isArray(existing?.value) ? [...existing.value] : [];
          arr.push(item);
          try {
            const id = await provider.writeWorkspaceEntry(
              executionId,
              nodeId,
              key,
              arr,
              'json',
              undefined,
              currentRound,
            );
            if (emitter && !emitter.isClosed()) {
              await emitter.emit('workspace_write', {
                nodeId,
                key,
                valueType: 'json',
                timestamp: Date.now(),
              });
            }
            return { success: true, id, key, length: arr.length };
          } catch (err) {
            if (String(err).includes('CONCURRENT_MODIFICATION') && attempt < maxRetries - 1) {
              log.warn({ executionId, key, attempt }, 'Workspace append conflict, retrying');
              await new Promise((r) => setTimeout(r, 50 * (attempt + 1)));
              continue;
            }
            throw err;
          }
        }
        throw new Error('Failed to append to workspace after retries');
      },
    } as any),
  };
}
