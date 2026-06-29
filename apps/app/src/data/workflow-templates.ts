import type { Node, Edge } from '@xyflow/react';
import type { NodeData } from '@qwenweaver/types';

export const RESEARCH_WORKFLOW_TEMPLATE: { nodes: Node<NodeData>[]; edges: Edge[] } = {
  nodes: [
    {
      id: 'node-trigger',
      type: 'trigger',
      position: { x: 50, y: 200 },
      data: { label: 'Web Trigger (Cron 9 AM)', outputFormat: 'text' },
    },
    {
      id: 'node-agent-1',
      type: 'agent',
      position: { x: 300, y: 100 },
      data: {
        label: 'Academic Searcher',
        model: 'qwen-plus',
        systemPrompt: 'Scrapes Google Scholar for the latest papers on multi-agent consensus.',
        outputFormat: 'markdown',
      },
    },
    {
      id: 'node-agent-2',
      type: 'agent',
      position: { x: 300, y: 300 },
      data: {
        label: 'Patent Scanner',
        model: 'qwen-plus',
        systemPrompt: 'Queries global patent databases for visual node orchestration systems.',
        outputFormat: 'markdown',
      },
    },
    {
      id: 'node-supervisor',
      type: 'supervisor',
      position: { x: 600, y: 200 },
      data: {
        label: 'Consensus Supervisor',
        model: 'qwen3-max',
        systemPrompt:
          'Review the outputs of both Searcher and Scanner. Synthesize findings. If they contradict, ask them to re-verify.',
        enableThinking: true,
        thinkingBudget: 1024,
        outputFormat: 'json',
      },
    },
    {
      id: 'node-mcp-tool',
      type: 'mcp_tool',
      position: { x: 900, y: 200 },
      data: {
        label: 'GitHub Writer Tool',
        mcpServerId: 'github-server',
        mcpServerUrl: 'http://localhost:8000',
        systemPrompt:
          'Pushes the Synthesized consensus report to repository: qwen-weaver/research-reports',
        outputFormat: 'text',
      },
    },
  ] as Node<NodeData>[],
  edges: [
    {
      id: 'e-t-a1',
      source: 'node-trigger',
      target: 'node-agent-1',
      sourceHandle: 'source',
      targetHandle: 'target-left',
      type: 'animated',
    },
    {
      id: 'e-t-a2',
      source: 'node-trigger',
      target: 'node-agent-2',
      sourceHandle: 'source',
      targetHandle: 'target-left',
      type: 'animated',
    },
    {
      id: 'e-a1-s',
      source: 'node-agent-1',
      target: 'node-supervisor',
      sourceHandle: 'source-right',
      targetHandle: 'target-left',
      type: 'animated',
    },
    {
      id: 'e-a2-s',
      source: 'node-agent-2',
      target: 'node-supervisor',
      sourceHandle: 'source-right',
      targetHandle: 'target-left',
      type: 'animated',
    },
    {
      id: 'e-s-m',
      source: 'node-supervisor',
      target: 'node-mcp-tool',
      sourceHandle: 'source-bottom',
      targetHandle: 'target',
      type: 'animated',
    },
  ] as Edge[],
};

export type WorkflowTemplate = typeof RESEARCH_WORKFLOW_TEMPLATE;
