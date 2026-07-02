import { streamText, tool } from 'ai';
import { z } from 'zod';
import { streamSSE } from 'hono/streaming';
import {
  COPILOT_GENERATE_SYSTEM_PROMPT,
  COPILOT_MODIFY_SYSTEM_PROMPT,
  COPILOT_EXPLAIN_SYSTEM_PROMPT,
  CopilotGenerateBody,
} from './schema.js';
import { createModuleLogger } from '../../logger.js';
import { getProvider } from '../../engine/model-router.js'; // Reuse provider singleton
import { getQueryProvider } from '@qwenweaver/database';
import type { Variables } from '../../index.js';
import type { Context } from 'hono';

const log = createModuleLogger('routes/copilot.handlers');

/** Simple action schema — accepts any payload shape. The frontend's normalizeAction
 *  handles diverse formats (payload wrapper, node/edge wrapper, flat fields). */
const ActionSchema = z.object({
  type: z.string(),
  payload: z.any(),
});

// ─── In-memory session store ─────────────────────────────────────────────────
interface CopilotSession {
  userId: string;
  params: z.infer<typeof CopilotGenerateBody>;
}
const copilotSessions = new Map<string, CopilotSession>();
// TTL cleanup
const SESSION_TTL = 120_000;
setInterval(() => {
  // Sessions are deleted after GET stream — this catches orphaned ones
}, SESSION_TTL);

export const handleCopilotInit = async (c: Context<{ Variables: Variables }>) => {
  const raw = await c.req.json();
  const parsed = CopilotGenerateBody.safeParse(raw);
  if (!parsed.success) {
    return c.json({ error: 'Invalid request body', details: parsed.error.format() }, 400);
  }
  const userId = c.get('user')!.id;
  const sessionId = crypto.randomUUID();
  copilotSessions.set(sessionId, { userId, params: parsed.data });
  // Auto-cleanup orphaned sessions after TTL
  setTimeout(() => copilotSessions.delete(sessionId), SESSION_TTL);
  return c.json({ sessionId }, 200);
};

/** Shared AI-generation core — emits SSE events into the provided stream */
async function runCopilotGeneration(
  stream: { writeSSE: (opts: { event: string; data: string; id: string }) => Promise<void> },
  params: z.infer<typeof CopilotGenerateBody>,
  userId: string,
  workflowId?: string,
) {
  const { prompt, canvasState, mode, model: userModel } = params;

  let systemPrompt: string;
  let userMessage = prompt;

  if (mode === 'explain') {
    if (!canvasState) {
      await stream.writeSSE({
        event: 'error',
        data: JSON.stringify({ error: 'canvasState is required for explain mode' }),
        id: crypto.randomUUID().slice(0, 8),
      });
      return;
    }
    systemPrompt = COPILOT_EXPLAIN_SYSTEM_PROMPT;
    userMessage = `Workflow state:\n${JSON.stringify(canvasState, null, 2)}\n\nUser request/focus: ${prompt}`;
  } else if (mode === 'modify') {
    systemPrompt = COPILOT_MODIFY_SYSTEM_PROMPT;
    if (canvasState) {
      userMessage = `Current canvas state:\n${JSON.stringify(canvasState, null, 2)}\n\nUser request: ${prompt}`;
    }
  } else {
    systemPrompt = COPILOT_GENERATE_SYSTEM_PROMPT;
  }

  const validModels = [
    'qwen3.7-max',
    'qwen3.7-plus',
    'qwen3.6-flash',
    'deepseek-v4-pro',
    'deepseek-v4-flash',
  ];
  const modelId = userModel && validModels.includes(userModel) ? userModel : 'qwen3.7-max';

  let pastMessages: any[] = [];
  let dbWorkflow: any = null;

  if (workflowId) {
    try {
      const dbProvider = getQueryProvider();
      dbWorkflow = await dbProvider.getWorkflow(workflowId, userId);
      if (dbWorkflow && dbWorkflow.copilotHistory) {
        pastMessages = dbWorkflow.copilotHistory.map((msg: any) => ({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content,
        }));
      }
    } catch (err) {
      log.warn({ workflowId, error: (err as Error).message }, 'Failed to load copilot history');
    }
  }

  const messages: any[] = [...pastMessages, { role: 'user', content: userMessage }];

  let fullText = '';
  let fullThinking = '';
  let proposalObj: any = null;

  const streamResult = streamText({
    model: getProvider()(modelId),
    system: systemPrompt,
    messages,
    maxSteps: Math.min(Math.max(Number(process.env.MAX_STEPS) || 5, 1), 25),
    providerOptions: {
      alibaba: {
        enableThinking: true,
        thinkingBudget: 4096,
      },
    },
    tools: {
      list_configured_mcps: tool({
        description: "List the user's currently configured/saved MCP servers.",
        parameters: z.object({}),
        execute: async () => {
          try {
            const dbProvider = getQueryProvider();
            const servers = await dbProvider.getMcpServers(userId);
            return { servers };
          } catch (err) {
            return { error: 'Failed to retrieve MCP servers', details: (err as Error).message };
          }
        },
      } as any),
      search_mcp_registry: tool({
        description: 'Search the live MCP registry for tools matching a query.',
        parameters: z.object({
          q: z.string().describe("Search query, e.g. 'github' or 'browser'"),
        }),
        execute: async ({ q }: { q: string }) => {
          try {
            const params = new URLSearchParams({ limit: '20', version: 'latest', q });
            const resp = await fetch(
              `https://registry.modelcontextprotocol.io/v0/servers?${params}`,
              { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10000) },
            );
            if (!resp.ok) return { servers: [] };
            const data = (await resp.json()) as any;
            return { servers: data.servers || [] };
          } catch (err) {
            return { error: 'Failed to search registry', details: (err as Error).message };
          }
        },
      } as any),
      propose_canvas_changes: tool({
        description:
          'CRITICAL: Propose structured edits to the canvas. You MUST provide at least one action. Examples:\n' +
          '  add_node:    {"type":"add_node",    "payload":{"type":"agent","id":"node-1","data":{"label":"My Agent","workerType":"general"},"position":{"x":100,"y":200}}}\n' +
          '  update_node: {"type":"update_node", "payload":{"id":"node-1","data":{"label":"Updated Label"}}}\n' +
          '  add_edge:    {"type":"add_edge",    "payload":{"source":"node-1","target":"node-2"}}\n' +
          '  delete_node: {"type":"delete_node", "payload":{"id":"node-1"}}\n' +
          'Wrap all actions in the "actions" array. Do NOT leave it empty.',
        parameters: z.object({ actions: z.array(ActionSchema).min(1) }),
        execute: async ({ actions: rawActions }: { actions: any[] }) => {
          const proposalId = crypto.randomUUID();
          const actions = Array.isArray(rawActions) ? rawActions : [];
          proposalObj = { id: proposalId, actions, status: 'pending' };
          await stream.writeSSE({
            event: 'proposal',
            data: JSON.stringify({ id: proposalId, actions }),
            id: crypto.randomUUID().slice(0, 8),
          });
          return { status: 'proposal_sent_for_user_approval', proposalId };
        },
      } as any),
    },
  } as any);

  for await (const part of streamResult.fullStream) {
    if (part.type === 'reasoning-delta') {
      const reasoningDelta =
        (part as any).textDelta || (part as any).text || (part as any).reasoning || '';
      if (reasoningDelta) {
        fullThinking += reasoningDelta;
        await stream.writeSSE({
          event: 'thinking',
          data: JSON.stringify({ chunk: reasoningDelta }),
          id: crypto.randomUUID().slice(0, 8),
        });
      }
    } else if (part.type === 'text-delta') {
      const textChunk = (part as any).textDelta || (part as any).text || '';
      if (textChunk) {
        fullText += textChunk;
        await stream.writeSSE({
          event: 'token',
          data: JSON.stringify({ chunk: textChunk }),
          id: crypto.randomUUID().slice(0, 8),
        });
      }
    }
  }

  // Persist history
  if (workflowId && dbWorkflow) {
    try {
      const dbProvider = getQueryProvider();
      const MAX_HISTORY = 50;
      const existingHistory = dbWorkflow.copilotHistory || [];
      const updatedHistory = [
        ...existingHistory.slice(-(MAX_HISTORY - 1)),
        { role: 'user', content: prompt },
        {
          role: 'assistant',
          content: fullText,
          thinking: fullThinking || undefined,
          proposal: proposalObj || undefined,
        },
      ];
      await dbProvider.updateCopilotHistory(workflowId, userId, updatedHistory);
    } catch (err) {
      log.warn({ workflowId, error: (err as Error).message }, 'Failed to save copilot history');
    }
  }

  await stream.writeSSE({
    event: 'complete',
    data: JSON.stringify({ done: true }),
    id: crypto.randomUUID().slice(0, 8),
  });
}

export const handleCopilotStream = async (c: Context<{ Variables: Variables }>) => {
  const sessionId = c.req.param('sessionId');
  const session = copilotSessions.get(sessionId);
  if (!session) {
    return c.json({ error: 'Session not found or expired' }, 404);
  }
  copilotSessions.delete(sessionId); // One-time use

  const userId = c.get('user')!.id;
  if (userId !== session.userId) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const { params } = session;

  c.header('Content-Type', 'text/event-stream');
  c.header('Cache-Control', 'no-cache');
  c.header('Connection', 'keep-alive');
  c.header('X-Accel-Buffering', 'no');

  return streamSSE(c, async (stream) => {
    try {
      await runCopilotGeneration(stream, params, userId, params.workflowId);
    } catch (err) {
      log.error({ error: (err as Error).message }, 'Copilot generation stream failed');
      await stream.writeSSE({
        event: 'error',
        data: JSON.stringify({ error: (err as Error).message }),
        id: crypto.randomUUID().slice(0, 8),
      });
    }
  });
};

const UpdateProposalBody = z.object({
  workflowId: z.string().min(1),
  proposalId: z.string().min(1),
  status: z.enum(['approved', 'rejected', 'pending']),
});

export const handleUpdateProposal = async (c: Context<{ Variables: Variables }>) => {
  const user = c.get('user');
  const userId = user!.id;
  const raw = await c.req.json();

  const parsed = UpdateProposalBody.safeParse(raw);
  if (!parsed.success) {
    return c.json({ error: 'Invalid body', details: parsed.error.format() }, 400);
  }

  const { workflowId, proposalId, status } = parsed.data;

  const provider = getQueryProvider();
  try {
    const workflow = await provider.getWorkflow(workflowId, userId);
    if (!workflow) {
      return c.json({ error: 'Workflow not found' }, 404);
    }

    const history = workflow.copilotHistory || [];
    let updated = false;

    const updatedHistory = history.map((msg: any) => {
      if (msg.role === 'assistant' && msg.proposal && msg.proposal.id === proposalId) {
        updated = true;
        return {
          ...msg,
          proposal: {
            ...msg.proposal,
            status,
          },
        };
      }
      return msg;
    });

    if (!updated) {
      return c.json({ error: 'Proposal not found in history' }, 404);
    }

    await provider.updateCopilotHistory(workflowId, userId, updatedHistory);
    return c.json({ success: true }, 200);
  } catch (err) {
    log.error({ error: (err as Error).message }, 'Failed to update proposal status');
    return c.json({ error: 'Failed to update proposal status' }, 500);
  }
};
