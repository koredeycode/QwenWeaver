import { generateObject } from 'ai';
import { z } from 'zod';
import { NodePayload, EdgePayload } from '@qwenweaver/types';
import {
  COPILOT_GENERATE_SYSTEM_PROMPT,
  COPILOT_MODIFY_SYSTEM_PROMPT,
  COPILOT_EXPLAIN_SYSTEM_PROMPT,
  CopilotGenerateBody,
} from './schema.js';
import { createModuleLogger } from '../../logger.js';
import { getProvider } from '../../engine/model-router.js'; // Reuse singleton
import type { Variables } from '../../index.js';
import type { RouteHandler } from '@hono/zod-openapi';
import type { copilotRoute } from './index.js';

const log = createModuleLogger('routes/copilot.handlers');


export const handleCopilot: RouteHandler<typeof copilotRoute, { Variables: Variables }> = async (c) => {
  // Validate body through Zod instead of blind cast
  const raw = await c.req.json();
  const parsed = CopilotGenerateBody.safeParse(raw);

  if (!parsed.success) {
    return c.json({ error: 'Invalid request body', details: parsed.error.format() }, 400);
  }

  const { prompt, canvasState, mode } = parsed.data;

  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    return c.json({ error: 'DASHSCOPE_API_KEY not configured' }, 500);
  }

  log.info({ prompt: prompt.slice(0, 100), mode }, 'Copilot generation requested');

  try {
    // Reuse the singleton provider from model-router instead of creating new one
    const provider = getProvider();

    let systemPrompt: string;
    let schema: z.ZodTypeAny;
    let userMessage = prompt;

    if (mode === 'explain') {
      if (!canvasState) {
        return c.json({ error: 'canvasState is required for explain mode' }, 400);
      }
      systemPrompt = COPILOT_EXPLAIN_SYSTEM_PROMPT;
      schema = z.object({
        explanation: z.string(),
      });
      userMessage = `Workflow state:\n${JSON.stringify(canvasState, null, 2)}\n\nUser request/focus: ${prompt}`;
    } else if (mode === 'modify') {
      systemPrompt = COPILOT_MODIFY_SYSTEM_PROMPT;
      schema = z.object({
        nodes: z.array(NodePayload),
        edges: z.array(EdgePayload),
      });
      if (canvasState) {
        userMessage = `Current canvas state:\n${JSON.stringify(canvasState, null, 2)}\n\nUser request: ${prompt}`;
      }
    } else {
      systemPrompt = COPILOT_GENERATE_SYSTEM_PROMPT;
      schema = z.object({
        nodes: z.array(NodePayload),
        edges: z.array(EdgePayload),
      });
    }

    const result = await generateObject({
      model: provider('qwen3-max'),
      system: systemPrompt,
      prompt: userMessage,
      schema,
      providerOptions: {
        alibaba: {
          enableThinking: true,
          thinkingBudget: 4096,
        },
      },
    });

    if (mode === 'explain') {
      const explanation = result.object.explanation;
      log.info('Copilot workflow explanation generated');
      return c.json({ explanation }, 200);
    } else {
      const graphData = result.object as any;
      log.info(
        { nodeCount: graphData.nodes?.length, edgeCount: graphData.edges?.length },
        'Copilot graph generated',
      );
      return c.json({ graph: graphData }, 200);
    }
  } catch (error) {
    const errorMessage = (error as Error).message;
    log.error({ error: errorMessage }, 'Copilot generation failed');
    return c.json({ error: 'Failed to generate graph', details: errorMessage }, 500);
  }
};
