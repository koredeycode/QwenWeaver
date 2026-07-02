import { streamText, tool, stepCountIs } from 'ai';
import { z } from 'zod';
import { streamSSE } from 'hono/streaming';
import {
  COPILOT_GENERATE_SYSTEM_PROMPT,
  COPILOT_MODIFY_SYSTEM_PROMPT,
  COPILOT_EXPLAIN_SYSTEM_PROMPT,
  CopilotGenerateBody,
} from './schema.js';
import { createModuleLogger } from '../../logger.js';
import { createDiagnosticLogger, type CopilotDiag } from '../../diagnostic-logger.js';
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
  diag: CopilotDiag;
  cleanupTimer: ReturnType<typeof setTimeout>;
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
    log.error({ errors: parsed.error.format() }, 'Init: invalid request body');
    return c.json({ error: 'Invalid request body', details: parsed.error.format() }, 400);
  }
  const userId = c.get('user')!.id;
  const sessionId = crypto.randomUUID();
  const diag = createDiagnosticLogger(sessionId);
  diag.log('SESSION INITIALIZED');
  diag.logJson('REQUEST BODY', raw);
  const cleanupTimer = setTimeout(() => {
    diag.log('SESSION TTL EXPIRED — orphaned session cleaned up');
    diag.close();
    copilotSessions.delete(sessionId);
  }, SESSION_TTL);
  copilotSessions.set(sessionId, { userId, params: parsed.data, diag, cleanupTimer });
  diag.log(
    `Init successful, userId=${userId}, mode=${parsed.data.mode}, model=${parsed.data.model || 'default'}`,
  );
  return c.json({ sessionId }, 200);
};

/** Shared AI-generation core — emits SSE events into the provided stream */
async function runCopilotGeneration(
  stream: { writeSSE: (opts: { event: string; data: string; id: string }) => Promise<void> },
  params: z.infer<typeof CopilotGenerateBody>,
  userId: string,
  diag: CopilotDiag,
  workflowId?: string,
) {
  const { prompt, canvasState, mode, model: userModel } = params;

  diag.log(`=== STARTING COPILOT GENERATION ===`);
  diag.logJson('PARAMS', {
    prompt,
    canvasState: canvasState ? '(present)' : '(none)',
    mode,
    userModel,
  });

  let systemPrompt: string;
  let userMessage = prompt;

  if (mode === 'explain') {
    if (!canvasState) {
      diag.log('ERROR: canvasState missing for explain mode');
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

  diag.log(`Mode: ${mode} | Using system prompt for ${mode}`);
  diag.logJson('SYSTEM PROMPT', systemPrompt);

  const validModels = [
    'qwen3.7-max',
    'qwen3.7-plus',
    'qwen3.6-flash',
    'deepseek-v4-pro',
    'deepseek-v4-flash',
  ];
  const modelId = userModel && validModels.includes(userModel) ? userModel : 'qwen3.7-max';
  diag.log(`Model selected: ${modelId} (user requested: ${userModel || 'none'})`);

  let pastMessages: any[] = [];
  let dbWorkflow: any = null;

  if (workflowId) {
    diag.log(`Loading history for workflowId=${workflowId}`);
    try {
      const dbProvider = getQueryProvider();
      dbWorkflow = await dbProvider.getWorkflow(workflowId, userId);
      if (dbWorkflow && dbWorkflow.copilotHistory) {
        pastMessages = dbWorkflow.copilotHistory.map((msg: any) => ({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content,
        }));
        diag.log(`Loaded ${pastMessages.length} past messages from history`);
      } else {
        diag.log('No copilotHistory found on workflow');
      }
    } catch (err) {
      const msg = (err as Error).message;
      log.warn({ workflowId, error: msg }, 'Failed to load copilot history');
      diag.log(`WARN: Failed to load copilot history: ${msg}`);
    }
  }

  const messages: any[] = [...pastMessages, { role: 'user', content: userMessage }];
  diag.log(`Total messages sent to AI: ${messages.length} (${pastMessages.length} past + 1 user)`);
  diag.logJson('USER MESSAGE', {
    role: 'user',
    content: userMessage.substring(0, 500) + (userMessage.length > 500 ? '... [truncated]' : ''),
  });

  let fullText = '';
  let fullThinking = '';
  let proposalObj: any = null;
  let toolCallCount = 0;

  const toolPropose = tool({
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
      // Qwen model sometimes stringifies the actions array — parse if needed
      let actions: any[] = [];
      if (typeof rawActions === 'string') {
        try {
          actions = JSON.parse(rawActions);
        } catch {
          actions = [];
        }
      } else if (Array.isArray(rawActions)) {
        actions = rawActions;
      }
      proposalObj = { id: proposalId, actions, status: 'pending' };
      diag.logJson('PROPOSAL EXECUTED', { proposalId, actionCount: actions.length, actions });
      await stream.writeSSE({
        event: 'proposal',
        data: JSON.stringify({ id: proposalId, actions }),
        id: crypto.randomUUID().slice(0, 8),
      });
      return { status: 'proposal_sent_for_user_approval', proposalId };
    },
  } as any);

  const toolMcpList = tool({
    description: "List the user's currently configured/saved MCP servers.",
    parameters: z.object({}),
    execute: async () => {
      diag.log('TOOL EXEC: list_configured_mcps');
      try {
        const dbProvider = getQueryProvider();
        const servers = await dbProvider.getMcpServers(userId);
        diag.log(`TOOL RESULT: list_configured_mcps returned ${servers.length} servers`);
        diag.logJson('list_configured_mcps result', servers);
        return { servers };
      } catch (err) {
        const msg = (err as Error).message;
        diag.log(`TOOL ERROR: list_configured_mcps — ${msg}`);
        return { error: 'Failed to retrieve MCP servers', details: msg };
      }
    },
  } as any);

  const toolMcpSearch = tool({
    description: 'Search the live MCP registry for tools matching a query.',
    parameters: z.object({
      q: z.string().describe("Search query, e.g. 'github' or 'browser'"),
    }),
    execute: async ({ q }: { q: string }) => {
      const query = q && q !== 'undefined' ? q : 'video';
      diag.log(`TOOL EXEC: search_mcp_registry q="${q}" → normalized="${query}"`);
      try {
        const params = new URLSearchParams({ limit: '20', version: 'latest', q: query });
        const resp = await fetch(`https://registry.modelcontextprotocol.io/v0/servers?${params}`, {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(10000),
        });
        if (!resp.ok) {
          diag.log(`TOOL RESULT: search_mcp_registry HTTP ${resp.status} — returning empty`);
          return { servers: [] };
        }
        const data = (await resp.json()) as any;
        const servers = data.servers || [];
        diag.log(`TOOL RESULT: search_mcp_registry found ${servers.length} servers`);
        diag.logJson('search_mcp_registry result (first 5)', servers.slice(0, 5));
        return { servers };
      } catch (err) {
        const msg = (err as Error).message;
        diag.log(`TOOL ERROR: search_mcp_registry — ${msg}`);
        return { error: 'Failed to search registry', details: msg };
      }
    },
  } as any);

  const streamResult = streamText({
    model: getProvider()(modelId),
    system: systemPrompt,
    messages,
    stopWhen: stepCountIs(Math.min(Math.max(Number(process.env.MAX_STEPS) || 20, 1), 50)),
    providerOptions: {
      alibaba: {
        enableThinking: true,
        thinkingBudget: 8192,
      },
    },
    tools: {
      list_configured_mcps: toolMcpList,
      search_mcp_registry: toolMcpSearch,
      propose_canvas_changes: toolPropose,
    },
  } as any);

  diag.log('streamText() invoked — processing fullStream...');
  let partIndex = 0;
  let toolInputBuffer = '';

  for await (const part of streamResult.fullStream) {
    partIndex++;
    diag.log(`[part #${partIndex}] type=${part.type}`);

    if (part.type === 'reasoning-delta') {
      const reasoningDelta =
        (part as any).textDelta || (part as any).text || (part as any).reasoning || '';
      if (reasoningDelta) {
        fullThinking += reasoningDelta;
        diag.log(
          `THINKING chunk (${reasoningDelta.length} chars): ${reasoningDelta.substring(0, 200)}`,
        );
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
        diag.log(`TOKEN chunk (${textChunk.length} chars): ${textChunk.substring(0, 200)}`);
        await stream.writeSSE({
          event: 'token',
          data: JSON.stringify({ chunk: textChunk }),
          id: crypto.randomUUID().slice(0, 8),
        });
      }
    } else if (part.type === 'tool-input-start') {
      toolInputBuffer = '';
    } else if (part.type === 'tool-input-delta') {
      const chunk = (part as any).text || (part as any).delta || '';
      if (chunk) toolInputBuffer += chunk;
    } else if (part.type === 'tool-input-end') {
      diag.log(`TOOL INPUT (full JSON): ${toolInputBuffer.substring(0, 1000)}`);
      toolInputBuffer = '';
    } else if (part.type === 'tool-call') {
      toolCallCount++;
      const tc = part as any;
      const toolArgs = tc.args ?? tc.toolCall?.args ?? tc.arguments;
      diag.log(`TOOL CALL #${toolCallCount}: "${tc.toolName}"`);
      diag.logJson(`tool-call #${toolCallCount} args`, toolArgs);
    } else if (part.type === 'tool-result') {
      const tr = part as any;
      diag.log(`TOOL RESULT for "${tr.toolName}"`);
      const toolResult = tr.result ?? tr;
      diag.logJson(`tool-result #${toolCallCount}`, toolResult);
    } else if (part.type === 'error') {
      const errPart = part as any;
      diag.log(`AI STREAM ERROR: ${errPart.error || JSON.stringify(errPart)}`);
    } else {
      diag.log(`UNHANDLED part type: ${part.type}`);
    }
  }

  diag.log(`=== GENERATION COMPLETE ===`);
  diag.log(`Total parts processed: ${partIndex}`);
  diag.log(`Total tool calls: ${toolCallCount}`);
  diag.log(`Full text length: ${fullText.length} chars`);
  diag.log(`Full thinking length: ${fullThinking.length} chars`);
  diag.logJson('FULL TEXT OUTPUT', fullText);
  diag.logJson('PROPOSAL STATE', proposalObj || { status: 'none' });

  // Persist history
  if (workflowId && dbWorkflow) {
    diag.log(`Persisting conversation history to workflow ${workflowId}`);
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
      diag.log(`History persisted (${updatedHistory.length} total entries)`);
    } catch (err) {
      const msg = (err as Error).message;
      log.warn({ workflowId, error: msg }, 'Failed to save copilot history');
      diag.log(`WARN: Failed to persist history: ${msg}`);
    }
  }

  diag.log('Sending complete event to client');
  await stream.writeSSE({
    event: 'complete',
    data: JSON.stringify({ done: true }),
    id: crypto.randomUUID().slice(0, 8),
  });
}

export const handleCopilotStream = async (c: Context<{ Variables: Variables }>) => {
  const sessionId = c.req.param('sessionId');
  if (!sessionId) {
    return c.json({ error: 'Missing sessionId' }, 400);
  }
  const session = copilotSessions.get(sessionId);
  if (!session) {
    return c.json({ error: 'Session not found or expired' }, 404);
  }
  clearTimeout(session.cleanupTimer);
  copilotSessions.delete(sessionId); // One-time use

  const userId = c.get('user')!.id;
  if (userId !== session.userId) {
    session.diag.log('FORBIDDEN: userId mismatch');
    session.diag.close();
    return c.json({ error: 'Forbidden' }, 403);
  }

  const { params, diag } = session;
  diag.log(`STREAM STARTED for session ${sessionId}`);
  diag.log(`userId=${userId}, workflowId=${params.workflowId || 'none'}`);

  c.header('Content-Type', 'text/event-stream');
  c.header('Cache-Control', 'no-cache');
  c.header('Connection', 'keep-alive');
  c.header('X-Accel-Buffering', 'no');

  return streamSSE(c, async (stream) => {
    try {
      await runCopilotGeneration(stream, params, userId, diag, params.workflowId);
      diag.log('Generation completed successfully — closing diag log');
    } catch (err) {
      const msg = (err as Error).message;
      const stack = (err as Error).stack;
      log.error({ error: msg }, 'Copilot generation stream failed');
      diag.log(`FATAL ERROR in generation: ${msg}`);
      if (stack) diag.log(`Stack trace: ${stack}`);
      await stream.writeSSE({
        event: 'error',
        data: JSON.stringify({ error: msg }),
        id: crypto.randomUUID().slice(0, 8),
      });
    } finally {
      diag.close();
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
    log.error({ errors: parsed.error.format() }, 'UpdateProposal: invalid body');
    return c.json({ error: 'Invalid body', details: parsed.error.format() }, 400);
  }

  const { workflowId, proposalId, status } = parsed.data;
  log.info({ workflowId, proposalId, status, userId }, 'UpdateProposal request');

  const provider = getQueryProvider();
  try {
    const workflow = await provider.getWorkflow(workflowId, userId);
    if (!workflow) {
      log.warn({ workflowId, userId }, 'UpdateProposal: workflow not found');
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
      log.warn({ proposalId, workflowId }, 'UpdateProposal: proposal ID not found in history');
      return c.json({ error: 'Proposal not found in history' }, 404);
    }

    await provider.updateCopilotHistory(workflowId, userId, updatedHistory);
    log.info({ workflowId, proposalId, status }, 'UpdateProposal: success');
    return c.json({ success: true }, 200);
  } catch (err) {
    const msg = (err as Error).message;
    log.error({ error: msg }, 'Failed to update proposal status');
    return c.json({ error: 'Failed to update proposal status' }, 500);
  }
};
