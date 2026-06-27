export interface SidebarSection {
  title: string;
  links: { label: string; to: string }[];
}

export const sidebar: SidebarSection[] = [
  {
    title: 'Getting Started',
    links: [
      { label: 'Overview', to: '/docs' },
      { label: 'Cloud Quickstart', to: '/docs/getting-started' },
    ],
  },
  {
    title: 'User Guide',
    links: [
      { label: 'Building Workflows', to: '/docs/workflow-guide' },
      { label: 'Node Types', to: '/docs/node-types' },
      { label: 'MCP Integration', to: '/docs/mcp' },
    ],
  },
  {
    title: 'Reference',
    links: [
      { label: 'API Reference', to: '/docs/api' },
      { label: 'Architecture', to: '/docs/architecture' },
    ],
  },
];
