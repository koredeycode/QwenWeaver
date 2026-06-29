import type { NodePayload } from '@qwenweaver/types';
import type { UpstreamOutputs } from './types.js';

export function buildSystemPrompt(node: NodePayload): string {
  let base = node.data.systemPrompt ?? '';
  if (!base && node.type !== 'supervisor') {
    base = `You are a helpful AI assistant working as part of a multi-agent workflow. Complete your assigned task accurately and concisely.`;
  }

  if (node.type === 'supervisor') {
    base = `${base}\n\nYou are a Supervisor agent. Analyze the outputs from subordinate agents carefully. Use your reasoning capabilities to evaluate arguments, detect contradictions, and produce an authoritative synthesis.`;
  }

  if (node.data.outputFormat) {
    const rules: Record<string, string> = {
      markdown: 'Provide your output formatted in Markdown.',
      html: 'Provide your output as raw, clean HTML tags.',
      json: 'Provide your output as a single, strictly valid raw JSON object. Do not include markdown code block backticks.',
      csv: 'Provide your output strictly formatted in CSV (comma-separated values) format.',
      xml: 'Provide your output as raw, clean XML tags.',
      yaml: 'Provide your output strictly formatted in valid YAML.',
      text: 'Provide your output as plain unformatted text. Do not use Markdown, HTML, or JSON structures.',
      code: 'Provide your output strictly as a clean code block or script without any surrounding conversational text.',
    };
    const formatRule = rules[node.data.outputFormat];
    if (formatRule) {
      base = `${base}\n\n[FORMATTING INSTRUCTION]: ${formatRule}`;
    }
  }

  return base;
}

export function buildUserMessage(node: NodePayload, upstreamOutputs: UpstreamOutputs): string {
  if (upstreamOutputs.size === 0) {
    return node.data.label ?? 'Begin your task.';
  }

  const parts: string[] = [];

  for (const [sourceId, result] of upstreamOutputs) {
    let textContent = result.text;
    if (!textContent && result.outputs) {
      textContent = result.outputs.map((o) => o.value).join('\n\n');
    }
    parts.push(`## Output from upstream agent "${sourceId}":\n${textContent}`);
  }

  const taskContext = node.data.label ? `\n\n## Your task:\n${node.data.label}` : '';

  return parts.join('\n\n---\n\n') + taskContext;
}
