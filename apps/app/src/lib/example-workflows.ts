export interface ExampleNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    model?: string;
    systemPrompt?: string;
    enableThinking?: boolean;
    thinkingBudget?: number;
    mcpServerId?: string;
    mcpServerUrl?: string;
    iconUrl?: string;
    outputFormat?: string;
  };
}

export interface ExampleEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
}

export interface ExampleWorkflow {
  id: string;
  name: string;
  description: string;
  nodes: ExampleNode[];
  edges: ExampleEdge[];
}

export const EXAMPLE_WORKFLOWS: ExampleWorkflow[] = [
  {
    id: 'research-swarm',
    name: 'Academic Research Swarm',
    description:
      'Scrapes databases for latest research papers, scans patents, and synthesizes findings using a Consensus Supervisor.',
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
          label: 'AlphaCreek SEC Filings',
          mcpServerId: 'ai.alphacreek/alphacreek-mcp',
          mcpServerUrl: 'https://mcp.alphacreek.ai/mcp',
          iconUrl: 'https://www.alphacreek.ai/assets/images/logo/logo400x400.png',
          systemPrompt:
            'Retrieve the latest SEC filings for companies referenced in the research report.',
          outputFormat: 'text',
        },
      },
    ],
    edges: [
      { id: 'e-t-a1', source: 'node-trigger', target: 'node-agent-1', type: 'animated' },
      { id: 'e-t-a2', source: 'node-trigger', target: 'node-agent-2', type: 'animated' },
      { id: 'e-a1-s', source: 'node-agent-1', target: 'node-supervisor', type: 'animated' },
      { id: 'e-a2-s', source: 'node-agent-2', target: 'node-supervisor', type: 'animated' },
      { id: 'e-s-m', source: 'node-supervisor', target: 'node-mcp-tool', type: 'animated' },
    ],
  },
  {
    id: 'translation-pipeline',
    name: 'Translation & Localization Pipeline',
    description:
      'Automates multi-language translation and context review before publishing localized files to the directory.',
    nodes: [
      {
        id: 'node-trigger-input',
        type: 'input_trigger',
        position: { x: 50, y: 200 },
        data: {
          label: 'Translate QwenWeaver marketing landing page into simplified Chinese.',
          outputFormat: 'text',
        },
      },
      {
        id: 'node-translator',
        type: 'agent',
        position: { x: 350, y: 200 },
        data: {
          label: 'Linguistic Translator',
          model: 'qwen-plus',
          systemPrompt:
            'Translate the upstream text context into natural-sounding Simplified Chinese. Retain technical jargon.',
          outputFormat: 'markdown',
        },
      },
      {
        id: 'node-reviewer',
        type: 'supervisor',
        position: { x: 650, y: 200 },
        data: {
          label: 'Linguistic Peer Reviewer',
          model: 'qwen3-max',
          systemPrompt:
            'Compare the translation with the original english prompt. Ensure tone, accuracy, and format. If anything is wrong, reject and feedback.',
          enableThinking: true,
          thinkingBudget: 1024,
          outputFormat: 'markdown',
        },
      },
      {
        id: 'node-mcp-saver',
        type: 'mcp_tool',
        position: { x: 950, y: 200 },
        data: {
          label: 'Tandem Docs MCP',
          mcpServerId: 'ac.tandem/docs-mcp',
          mcpServerUrl: 'https://tandem.ac/mcp',
          systemPrompt:
            'Search and retrieve relevant documentation to verify translation accuracy.',
          outputFormat: 'text',
        },
      },
    ],
    edges: [
      { id: 'e-ti-tr', source: 'node-trigger-input', target: 'node-translator', type: 'animated' },
      { id: 'e-tr-rev', source: 'node-translator', target: 'node-reviewer', type: 'animated' },
      { id: 'e-rev-save', source: 'node-reviewer', target: 'node-mcp-saver', type: 'animated' },
    ],
  },
  {
    id: 'security-audit',
    name: 'Security Auditing Swarm',
    description:
      'Performs static analysis of files, checks for exposed secrets/API keys, and submits risk tickets automatically.',
    nodes: [
      {
        id: 'node-trigger-audit',
        type: 'input_trigger',
        position: { x: 50, y: 200 },
        data: { label: 'Audit directory: packages/database/src/schema', outputFormat: 'text' },
      },
      {
        id: 'node-static-analyzer',
        type: 'agent',
        position: { x: 300, y: 100 },
        data: {
          label: 'SQL Static Analyzer',
          model: 'qwen-plus',
          systemPrompt:
            'Audit code for SQL injection, raw queries without parameterization, or schema vulnerabilities.',
          outputFormat: 'markdown',
        },
      },
      {
        id: 'node-secret-scanner',
        type: 'agent',
        position: { x: 300, y: 300 },
        data: {
          label: 'Secret Scanner',
          model: 'qwen-plus',
          systemPrompt:
            'Scan files for hardcoded database credentials, API keys, JWT secrets, or tokens.',
          outputFormat: 'markdown',
        },
      },
      {
        id: 'node-sec-supervisor',
        type: 'supervisor',
        position: { x: 600, y: 200 },
        data: {
          label: 'Security Lead Auditor',
          model: 'qwen3-max',
          systemPrompt:
            'Consolidate warnings from sql static analyzer and secret scanner. Filter out duplicates, grade the severity.',
          enableThinking: true,
          thinkingBudget: 2048,
          outputFormat: 'json',
        },
      },
      {
        id: 'node-jira-reporter',
        type: 'mcp_tool',
        position: { x: 900, y: 200 },
        data: {
          label: 'AgentBerg MCP',
          mcpServerId: 'ai.agentberg/agentberg',
          mcpServerUrl: 'https://agentberg.ai/mcp',
          systemPrompt:
            'Publish security audit findings and query the agent network for known vulnerability patterns.',
          outputFormat: 'text',
        },
      },
    ],
    edges: [
      {
        id: 'e-ta-sa',
        source: 'node-trigger-audit',
        target: 'node-static-analyzer',
        type: 'animated',
      },
      {
        id: 'e-ta-ss',
        source: 'node-trigger-audit',
        target: 'node-secret-scanner',
        type: 'animated',
      },
      {
        id: 'e-sa-su',
        source: 'node-static-analyzer',
        target: 'node-sec-supervisor',
        type: 'animated',
      },
      {
        id: 'e-ss-su',
        source: 'node-secret-scanner',
        target: 'node-sec-supervisor',
        type: 'animated',
      },
      {
        id: 'e-su-jr',
        source: 'node-sec-supervisor',
        target: 'node-jira-reporter',
        type: 'animated',
      },
    ],
  },
  {
    id: 'customer-escalation',
    name: 'Customer Support Escalation Swarm',
    description:
      'Classifies customer issues, runs specialized diagnosis (billing & DevOps) concurrently, constructs a polished resolution message, and logs results to CRM & Slack.',
    nodes: [
      {
        id: 'node-trigger-support',
        type: 'input_trigger',
        position: { x: 50, y: 250 },
        data: {
          label:
            'Customer complaint: Received double charge on last invoice and API latency is above 2000ms.',
          outputFormat: 'text',
        },
      },
      {
        id: 'node-support-triage',
        type: 'supervisor',
        position: { x: 300, y: 250 },
        data: {
          label: 'Triage Supervisor',
          model: 'qwen3-max',
          systemPrompt:
            'Analyze client issues. Trigger Billing Specialist for charges or invoices. Trigger DevOps Specialist for timeouts or high latency. Trigger general Support Agent for other queries.',
          enableThinking: true,
          thinkingBudget: 1024,
          outputFormat: 'json',
        },
      },
      {
        id: 'node-billing-agent',
        type: 'agent',
        position: { x: 550, y: 100 },
        data: {
          label: 'Billing Specialist',
          model: 'qwen-plus',
          systemPrompt:
            'Search invoice history database, identify duplicate billing charges, and calculate refunds.',
          outputFormat: 'markdown',
        },
      },
      {
        id: 'node-devops-agent',
        type: 'agent',
        position: { x: 550, y: 250 },
        data: {
          label: 'DevOps Specialist',
          model: 'qwen-plus',
          systemPrompt:
            'Examine server health metrics, container logs, database query locks, and API gateway response times.',
          outputFormat: 'markdown',
        },
      },
      {
        id: 'node-feedback-agent',
        type: 'agent',
        position: { x: 550, y: 400 },
        data: {
          label: 'Support Agent',
          model: 'qwen-plus',
          systemPrompt: 'Draft polite holding statement apologizing for the delay in service.',
          outputFormat: 'markdown',
        },
      },
      {
        id: 'node-resolution-reviewer',
        type: 'supervisor',
        position: { x: 800, y: 250 },
        data: {
          label: 'Resolution Supervisor',
          model: 'qwen3-max',
          systemPrompt:
            'Review the billing diagnosis and devops status details. Formulate the final professional resolution message outlining actions taken (e.g. refund status, server fix updates).',
          enableThinking: true,
          thinkingBudget: 1024,
          outputFormat: 'markdown',
        },
      },
      {
        id: 'node-db-writer',
        type: 'mcp_tool',
        position: { x: 1050, y: 150 },
        data: {
          label: 'AlphaCreek MCP',
          mcpServerId: 'ai.alphacreek/alphacreek-mcp',
          mcpServerUrl: 'https://mcp.alphacreek.ai/mcp',
          iconUrl: 'https://www.alphacreek.ai/assets/images/logo/logo400x400.png',
          systemPrompt: 'Logs ticket resolution as a published finding in the agent network.',
          outputFormat: 'text',
        },
      },
      {
        id: 'node-slack-publisher',
        type: 'mcp_tool',
        position: { x: 1050, y: 350 },
        data: {
          label: 'AgentBerg',
          mcpServerId: 'ai.agentberg/agentberg',
          mcpServerUrl: 'https://agentberg.ai/mcp',
          systemPrompt:
            'Query the agent network for similar support ticket patterns and resolutions.',
          outputFormat: 'text',
        },
      },
    ],
    edges: [
      {
        id: 'e-t-st',
        source: 'node-trigger-support',
        target: 'node-support-triage',
        type: 'animated',
      },
      {
        id: 'e-st-ba',
        source: 'node-support-triage',
        target: 'node-billing-agent',
        type: 'animated',
      },
      {
        id: 'e-st-da',
        source: 'node-support-triage',
        target: 'node-devops-agent',
        type: 'animated',
      },
      {
        id: 'e-st-fa',
        source: 'node-support-triage',
        target: 'node-feedback-agent',
        type: 'animated',
      },
      {
        id: 'e-ba-rr',
        source: 'node-billing-agent',
        target: 'node-resolution-reviewer',
        type: 'animated',
      },
      {
        id: 'e-da-rr',
        source: 'node-devops-agent',
        target: 'node-resolution-reviewer',
        type: 'animated',
      },
      {
        id: 'e-fa-rr',
        source: 'node-feedback-agent',
        target: 'node-resolution-reviewer',
        type: 'animated',
      },
      {
        id: 'e-rr-db',
        source: 'node-resolution-reviewer',
        target: 'node-db-writer',
        type: 'animated',
      },
      {
        id: 'e-rr-sp',
        source: 'node-resolution-reviewer',
        target: 'node-slack-publisher',
        type: 'animated',
      },
    ],
  },
];
