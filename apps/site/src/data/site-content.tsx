import type { ReactNode } from 'react';

export const integrations: {
  name: string;
  type: string;
  icon: ReactNode;
}[] = [
  {
    name: 'Google Scholar',
    type: 'Search',
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
        <path d="M8 11h6" strokeLinecap="round" />
        <path d="M11 8v6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    name: 'Slack',
    type: 'Messaging',
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path d="M14.5 2a2.5 2.5 0 0 1 2.5 2.5v2.5h-2.5a2.5 2.5 0 0 1 0-5z" />
        <path d="M4.5 9.5A2.5 2.5 0 0 1 7 7h2.5v2.5A2.5 2.5 0 0 1 7 12H4.5z" />
        <path d="M9.5 22A2.5 2.5 0 0 1 7 19.5V17h2.5a2.5 2.5 0 0 1 0 5z" />
        <path d="M19.5 14.5A2.5 2.5 0 0 1 17 17h-2.5v-2.5A2.5 2.5 0 0 1 17 12h2.5z" />
        <path d="M12 7v2.5H9.5" />
        <path d="M7 12h2.5v2.5" />
        <path d="M17 12v2.5H14.5" />
        <path d="M12 17v-2.5h2.5" />
      </svg>
    ),
  },
  {
    name: 'GitHub',
    type: 'Code',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
      </svg>
    ),
  },
  {
    name: 'Discord',
    type: 'Community',
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path d="M9 12a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM15 12a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" />
        <path d="M8.5 17c0 0-1.5 0-2.5-1 0 0-4-8 0-13 2-1 4-1 5-1l.5 1C8 4 7 5 7 5c3-1 7-1 10 0 0 0-1-1-2.5-2L15 2c1 0 3 0 5 1 4 5 0 13 0 13-1 1-2.5 1-2.5 1" />
        <path d="M16 17l.5 2.5c-3 .5-6 0-9 0L8 17" />
      </svg>
    ),
  },
  {
    name: 'SEC Filings',
    type: 'Data',
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
    name: 'Notion',
    type: 'Docs',
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M7 7h10" strokeLinecap="round" />
        <path d="M7 12h10" strokeLinecap="round" />
        <path d="M7 17h6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    name: 'Databases',
    type: 'Storage',
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
    name: 'Webhooks',
    type: 'API',
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
  tool: { x: 552, y: 195 },
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
