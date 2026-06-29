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

const ActionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('add_node'),
    payload: z.object({
      type: z
        .string()
        .describe(
          "The node type, e.g. 'agent', 'supervisor', 'trigger', 'input_trigger', 'mcp_tool'",
        ),
      id: z
        .string()
        .optional()
        .describe('Optional unique node ID. If not specified, one will be generated.'),
      position: z
        .object({
          x: z.number(),
          y: z.number(),
        })
        .optional()
        .describe('Position coordinates of the node on the canvas.'),
      data: z
        .object({
          label: z.string().describe('User-friendly name/label of the node'),
          systemPrompt: z
            .string()
            .optional()
            .describe('System prompt instructions for supervisor or agent nodes'),
          model: z.string().optional().describe('AI Model to use'),
          workerType: z
            .string()
            .optional()
            .describe(
              'Preconfigured worker profile type (general, reasoning, fast, image, video, audio)',
            ),
          outputFormat: z.string().optional().describe('Preconfigured expected output format'),
        })
        .describe('Data payload containing specific parameters for the node'),
    }),
  }),
  z.object({
    type: z.literal('add_nodes'),
    payload: z
      .array(
        z.object({
          type: z.string(),
          id: z.string().optional(),
          position: z.object({ x: z.number(), y: z.number() }).optional(),
          data: z.object({
            label: z.string(),
            systemPrompt: z.string().optional(),
            model: z.string().optional(),
            workerType: z.string().optional(),
            outputFormat: z.string().optional(),
          }),
        }),
      )
      .describe('Array of node objects to add in batch'),
  }),
  z.object({
    type: z.literal('delete_node'),
    payload: z.object({
      id: z.string().describe('ID of the node to delete'),
    }),
  }),
  z.object({
    type: z.literal('delete_nodes'),
    payload: z.array(z.string()).describe('Array of node IDs to delete in batch'),
  }),
  z.object({
    type: z.literal('update_node'),
    payload: z.object({
      id: z.string().describe('ID of the node to update'),
      data: z
        .object({
          label: z.string().optional(),
          systemPrompt: z.string().optional(),
          model: z.string().optional(),
          workerType: z.string().optional(),
          outputFormat: z.string().optional(),
          enableThinking: z.boolean().optional(),
          thinkingBudget: z.number().optional(),
        })
        .describe('Partial data object containing fields to update'),
    }),
  }),
  z.object({
    type: z.literal('update_nodes'),
    payload: z
      .array(
        z.object({
          id: z.string(),
          data: z.object({
            label: z.string().optional(),
            systemPrompt: z.string().optional(),
            model: z.string().optional(),
            workerType: z.string().optional(),
            outputFormat: z.string().optional(),
            enableThinking: z.boolean().optional(),
            thinkingBudget: z.number().optional(),
          }),
        }),
      )
      .describe('Array of node updates to apply in batch'),
  }),
  z.object({
    type: z.literal('add_edge'),
    payload: z.object({
      id: z.string().optional().describe('Optional unique edge ID'),
      source: z.string().describe('Source node ID'),
      target: z.string().describe('Target node ID'),
      sourceHandle: z.string().optional(),
      targetHandle: z.string().optional(),
    }),
  }),
  z.object({
    type: z.literal('add_edges'),
    payload: z
      .array(
        z.object({
          id: z.string().optional(),
          source: z.string(),
          target: z.string(),
          sourceHandle: z.string().optional(),
          targetHandle: z.string().optional(),
        }),
      )
      .describe('Array of edges to add in batch'),
  }),
  z.object({
    type: z.literal('delete_edge'),
    payload: z.object({
      id: z.string().describe('ID of the edge to delete'),
    }),
  }),
  z.object({
    type: z.literal('delete_edges'),
    payload: z.array(z.string()).describe('Array of edge IDs to delete in batch'),
  }),
]);

export const handleCopilot = async (c: Context<{ Variables: Variables }>) => {
  const raw = await c.req.json();
  const parsed = CopilotGenerateBody.safeParse(raw);

  if (!parsed.success) {
    return c.json({ error: 'Invalid request body', details: parsed.error.format() }, 400);
  }

  const { prompt, canvasState, mode, model: userModel, workflowId } = parsed.data;

  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    return c.json({ error: 'DASHSCOPE_API_KEY not configured' }, 500);
  }

  log.info(
    { prompt: prompt.slice(0, 100), mode, userModel, workflowId },
    'Copilot streaming generation requested',
  );

  c.header('Content-Type', 'text/event-stream');
  c.header('Cache-Control', 'no-cache');
  c.header('Connection', 'keep-alive');
  c.header('X-Accel-Buffering', 'no');

  return streamSSE(c, async (stream) => {
    try {
      const provider = getProvider();
      const userId = c.get('user')!.id;

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

      // Default to qwen3.7-max if userModel is empty or not matching the valid set
      const validModels = [
        'qwen3.7-max',
        'qwen3.7-plus',
        'qwen3.6-flash',
        'deepseek-v4-pro',
        'deepseek-v4-flash',
      ];
      const modelId = userModel && validModels.includes(userModel) ? userModel : 'qwen3.7-max';

      // Load past messages context if workflowId is specified
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
        model: provider(modelId),
        system: systemPrompt,
        messages: messages,
        maxSteps: 5,
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
                  {
                    headers: { Accept: 'application/json' },
                    signal: AbortSignal.timeout(10000),
                  },
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
              'Propose edits to the canvas (adding nodes/edges, deleting nodes/edges, updating nodes). These actions will not apply automatically; the user must click Approve/Reject.',
            parameters: z.object({
              actions: z.array(ActionSchema),
            }),
            execute: async ({ actions }: { actions: any[] }) => {
              const proposalId = crypto.randomUUID();
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

      // Persist the user prompt and the copilot's structured assistant reply in history
      if (workflowId && dbWorkflow) {
        try {
          const dbProvider = getQueryProvider();
          const existingHistory = dbWorkflow.copilotHistory || [];
          const updatedHistory = [
            ...existingHistory,
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

export const handleUpdateProposal = async (c: Context<{ Variables: Variables }>) => {
  const user = c.get('user');
  const userId = user!.id;
  const raw = await c.req.json();

  const { workflowId, proposalId, status } = raw as {
    workflowId: string;
    proposalId: string;
    status: 'approved' | 'rejected' | 'pending';
  };

  if (!workflowId || !proposalId || !status) {
    return c.json(
      { error: 'Missing parameters: workflowId, proposalId, and status are required' },
      400,
    );
  }

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
    return c.json(
      { error: 'Failed to update proposal status', details: (err as Error).message },
      500,
    );
  }
};
