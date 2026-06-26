import { TourStep } from './types.js';

export const tourConfig: TourStep[] = [
  {
    id: 'sidebar-palette',
    title: 'Drag Nodes from the Palette',
    description:
      'The left sidebar has draggable node types. Click any item to place it on the canvas, or drag it into position. Expand the other categories to see Triggers and MCP Tools.',
    targets: [{ type: 'dom_selector', value: '[data-tour="palette"]' }],
  },
  {
    id: 'canvas-node',
    title: 'Select the Agent Node',
    description:
      'Click the agent node on the canvas to select it. A selected node can be configured, connected, or deleted from the inspector.',
    targets: [{ type: 'dom_selector', value: '.react-flow__node-agent' }],
  },
  {
    id: 'inspector-panel',
    title: 'Configure in the Inspector',
    description:
      "The inspector panel appears when a node is selected. Set the agent's name, system prompt, model, and output format.",
    targets: [{ type: 'dom_selector', value: '[data-tour="inspector"]' }],
  },
  {
    id: 'toolbar-run',
    title: 'Run the Workflow',
    description:
      'Once your agents and connections are ready, click "Run Workflow" to execute the graph. Status updates stream in real time.',
    targets: [{ type: 'dom_selector', value: '[data-tour="run-workflow"]' }],
  },
  {
    id: 'toolbar-more',
    title: 'Additional Tools',
    description:
      'The "More" dropdown gives access to Smart Arrange, Import/Export, PNG export, and publishing options.',
    targets: [
      { type: 'dom_selector', value: '[data-tour="more-tools"]' },
      { type: 'dom_selector', value: '[data-tour="more-tools-menu"]' },
    ],
  },
  {
    id: 'toolbar-save',
    title: 'Save Your Work',
    description:
      'Click "Save" to persist your workflow to the server. Saved workflows appear on the dashboard.',
    targets: [{ type: 'dom_selector', value: '[data-tour="save-workflow"]' }],
  },
  {
    id: 'copilot-toggle',
    title: 'Ask Qwen Copilot',
    description:
      'Need help wiring up your workflow? Open the Qwen Copilot and describe what you want to build in plain English.',
    targets: [{ type: 'dom_selector', value: '[data-tour="copilot"]' }],
  },
];
