import type { ReactNode } from 'react';

export const integrations: {
  name: string;
  type: string;
  icon: ReactNode;
}[] = [
  {
    name: 'Search',
    type: 'Knowledge retrieval',
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    name: 'Messaging',
    type: 'Team communication',
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    name: 'Analyze',
    type: 'Data processing',
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path d="M18 20V10" strokeLinecap="round" />
        <path d="M12 20V4" strokeLinecap="round" />
        <path d="M6 20v-6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    name: 'Code',
    type: 'Version control',
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
  },
  {
    name: 'Data',
    type: 'Structured sources',
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <rect x="4" y="2" width="16" height="20" rx="2" />
        <path d="M9 8h6" strokeLinecap="round" />
        <path d="M9 12h6" strokeLinecap="round" />
        <path d="M9 16h4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    name: 'Docs',
    type: 'Knowledge base',
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
  {
    name: 'Storage',
    type: 'Databases & files',
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <ellipse cx="12" cy="6" rx="8" ry="3" />
        <path d="M4 6v6c0 1.66 3.58 3 8 3s8-1.34 8-3V6" />
        <path d="M4 12v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" />
      </svg>
    ),
  },
  {
    name: 'API',
    type: 'Custom endpoints',
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path d="M13 2L3 14h6l-2 8 10-12h-6l2-8z" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export const paletteTypes = [
  { label: 'Trigger', color: 'emerald' },
  { label: 'Agent', color: 'orange' },
  { label: 'Supervisor', color: 'blue' },
  { label: 'MCP Tool', color: 'purple' },
];

export type DemoNodeDef = {
  id: string;
  label: string;
  type: 'trigger' | 'agent' | 'supervisor' | 'tool';
};

export const demoNodeDefs: DemoNodeDef[] = [
  { id: 'trigger', label: '', type: 'trigger' },
  { id: 'agent1', label: '', type: 'agent' },
  { id: 'agent2', label: '', type: 'agent' },
  { id: 'supervisor', label: '', type: 'supervisor' },
  { id: 'tool', label: '', type: 'tool' },
];

export const demoEdges = [
  { source: 'trigger', target: 'agent1' },
  { source: 'trigger', target: 'agent2' },
  { source: 'agent1', target: 'supervisor' },
  { source: 'agent2', target: 'supervisor' },
  { source: 'supervisor', target: 'tool' },
];

export const INITIAL_POSITIONS: Record<string, { x: number; y: number }> = {
  trigger: { x: 40, y: 70 },
  agent1: { x: 250, y: 15 },
  agent2: { x: 250, y: 125 },
  supervisor: { x: 480, y: 65 },
  tool: { x: 530, y: 145 },
};

export const NODE_SIZES: Record<string, { w: number; h: number }> = {
  trigger: { w: 160, h: 72 },
  agent: { w: 160, h: 56 },
  supervisor: { w: 180, h: 56 },
  tool: { w: 56, h: 56 },
};

export type Phase = { at: number; statuses: Record<string, 'pending' | 'running' | 'completed'> };

export const phases: Phase[] = [
  { at: 0, statuses: { trigger: 'running' } },
  { at: 1200, statuses: { trigger: 'completed', agent1: 'running', agent2: 'running' } },
  { at: 3000, statuses: { agent1: 'completed', agent2: 'completed', supervisor: 'running' } },
  { at: 4500, statuses: { supervisor: 'completed', tool: 'running' } },
  { at: 5500, statuses: { tool: 'completed' } },
];

export const nodeIds = ['trigger', 'agent1', 'agent2', 'supervisor', 'tool'];
