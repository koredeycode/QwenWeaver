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
  sourceHandle?: string;
  targetHandle?: string;
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
    id: 'research-synthesis',
    name: 'Research & Synthesis',
    description:
      'Takes a research question, searches for information via two specialized agents, then a supervisor synthesizes a final answer with thinking-based reasoning.',
    nodes: [
      {
        id: 'node-trigger',
        type: 'input_trigger',
        position: { x: 50, y: 200 },
        data: {
          label: 'Research question: What are the latest advances in LLM agent orchestration?',
          outputFormat: 'text',
        },
      },
      {
        id: 'node-agent-1',
        type: 'agent',
        position: { x: 300, y: 100 },
        data: {
          label: 'Literature Searcher',
          model: 'qwen3.7-plus',
          systemPrompt:
            'Search for recent academic papers and blog posts on the given topic. Summarize key findings, methodologies, and results.',
          outputFormat: 'markdown',
        },
      },
      {
        id: 'node-agent-2',
        type: 'agent',
        position: { x: 300, y: 300 },
        data: {
          label: 'Industry Analyst',
          model: 'qwen3.7-plus',
          systemPrompt:
            'Analyze industry trends, real-world applications, and production deployments related to the topic. Focus on practical insights.',
          outputFormat: 'markdown',
        },
      },
      {
        id: 'node-supervisor',
        type: 'supervisor',
        position: { x: 600, y: 200 },
        data: {
          label: 'Synthesis Supervisor',
          model: 'qwen3.7-max',
          systemPrompt:
            'Combine the literature review and industry analysis into a coherent synthesis. Identify conflicts and resolve them. Output a structured report with sections: Summary, Key Findings, Conflicts, Recommendations.',
          enableThinking: true,
          thinkingBudget: 1024,
          outputFormat: 'markdown',
        },
      },
    ],
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
    ],
  },
  {
    id: 'translation-pipeline',
    name: 'Translation & Review Pipeline',
    description:
      'Translates text into a target language, then a supervisor reviews for accuracy, tone, and cultural appropriateness with thinking-based reasoning.',
    nodes: [
      {
        id: 'node-trigger-input',
        type: 'input_trigger',
        position: { x: 50, y: 200 },
        data: {
          label:
            'Translate the following to Spanish: "Our platform enables teams to build AI agents visually. No coding required."',
          outputFormat: 'text',
        },
      },
      {
        id: 'node-translator',
        type: 'agent',
        position: { x: 350, y: 200 },
        data: {
          label: 'Linguistic Translator',
          model: 'qwen3.7-plus',
          systemPrompt:
            'Translate the text into the target language. Preserve technical terms, brand names, and formatting. Produce natural-sounding output.',
          outputFormat: 'markdown',
        },
      },
      {
        id: 'node-reviewer',
        type: 'supervisor',
        position: { x: 650, y: 200 },
        data: {
          label: 'Translation Reviewer',
          model: 'qwen3.7-max',
          systemPrompt:
            'Review the translation for accuracy, tone, and cultural appropriateness. Check that technical terms are correctly translated. If the translation has errors, reject it with specific feedback for the translator to fix.',
          enableThinking: true,
          thinkingBudget: 1024,
          outputFormat: 'markdown',
        },
      },
    ],
    edges: [
      {
        id: 'e-ti-tr',
        source: 'node-trigger-input',
        target: 'node-translator',
        sourceHandle: 'source',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-tr-rev',
        source: 'node-translator',
        target: 'node-reviewer',
        sourceHandle: 'source-right',
        targetHandle: 'target-left',
        type: 'animated',
      },
    ],
  },
  {
    id: 'code-quality-audit',
    name: 'Code Quality Audit',
    description:
      'Analyzes code for style issues and security vulnerabilities using parallel agents, then a supervisor produces a consolidated review.',
    nodes: [
      {
        id: 'node-trigger-audit',
        type: 'input_trigger',
        position: { x: 50, y: 200 },
        data: {
          label:
            'Review the following code for quality and security issues...\n\nfunction getDbConnection() {\n  const conn = new Connection("postgres://admin:password123@localhost:5432/prod");\n  return conn.query("SELECT * FROM users WHERE id = " + userId);\n}',
          outputFormat: 'text',
        },
      },
      {
        id: 'node-static-analyzer',
        type: 'agent',
        position: { x: 300, y: 100 },
        data: {
          label: 'Code Style Analyzer',
          model: 'qwen3.7-plus',
          systemPrompt:
            'Analyze the provided code for style issues, anti-patterns, and best practice violations. Check naming conventions, error handling, code organization.',
          outputFormat: 'markdown',
        },
      },
      {
        id: 'node-secret-scanner',
        type: 'agent',
        position: { x: 300, y: 300 },
        data: {
          label: 'Security Vulnerability Scanner',
          model: 'qwen3.7-plus',
          systemPrompt:
            'Scan the code for security vulnerabilities: SQL injection, hardcoded credentials, XSS, CSRF, insecure deserialization, and dependency vulnerabilities.',
          outputFormat: 'markdown',
        },
      },
      {
        id: 'node-sec-supervisor',
        type: 'supervisor',
        position: { x: 600, y: 200 },
        data: {
          label: 'Audit Consolidator',
          model: 'qwen3.7-max',
          systemPrompt:
            'Combine the style analysis and security scan into a single report. Deduplicate findings, prioritize by severity, and provide actionable remediation steps.',
          enableThinking: true,
          thinkingBudget: 2048,
          outputFormat: 'markdown',
        },
      },
    ],
    edges: [
      {
        id: 'e-ta-sa',
        source: 'node-trigger-audit',
        target: 'node-static-analyzer',
        sourceHandle: 'source',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-ta-ss',
        source: 'node-trigger-audit',
        target: 'node-secret-scanner',
        sourceHandle: 'source',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-sa-su',
        source: 'node-static-analyzer',
        target: 'node-sec-supervisor',
        sourceHandle: 'source-right',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-ss-su',
        source: 'node-secret-scanner',
        target: 'node-sec-supervisor',
        sourceHandle: 'source-right',
        targetHandle: 'target-left',
        type: 'animated',
      },
    ],
  },
  {
    id: 'customer-escalation',
    name: 'Customer Support Escalation',
    description:
      'Triages a customer complaint, dispatches specialized billing and technical agents in parallel, and synthesizes a resolution via a supervisor.',
    nodes: [
      {
        id: 'node-trigger-support',
        type: 'input_trigger',
        position: { x: 50, y: 250 },
        data: {
          label:
            'Customer complaint: I was charged twice for my subscription this month and the dashboard shows error 503 when I try to view my invoices.',
          outputFormat: 'text',
        },
      },
      {
        id: 'node-support-triage',
        type: 'supervisor',
        position: { x: 300, y: 250 },
        data: {
          label: 'Triage Supervisor',
          model: 'qwen3.7-max',
          systemPrompt:
            'Analyze the customer issue. Identify whether it involves billing, technical problems, or both. Dispatch to the appropriate specialist agents: Billing Specialist for payment issues, DevOps Specialist for technical errors. Always also dispatch the Support Agent for a holding response.',
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
          model: 'qwen3.7-plus',
          systemPrompt:
            'Investigate the billing issue: check for duplicate charges, verify payment history, calculate any refunds due, and draft a resolution.',
          outputFormat: 'markdown',
        },
      },
      {
        id: 'node-devops-agent',
        type: 'agent',
        position: { x: 550, y: 250 },
        data: {
          label: 'DevOps Specialist',
          model: 'qwen3.7-plus',
          systemPrompt:
            'Investigate the technical issue: check server status, identify potential causes for error 503, suggest remediation steps.',
          outputFormat: 'markdown',
        },
      },
      {
        id: 'node-feedback-agent',
        type: 'agent',
        position: { x: 550, y: 400 },
        data: {
          label: 'Support Agent',
          model: 'qwen3.7-plus',
          systemPrompt:
            'Draft a polite, empathetic holding response acknowledging the customer issue and setting expectations for resolution timeline.',
          outputFormat: 'markdown',
        },
      },
      {
        id: 'node-resolution-reviewer',
        type: 'supervisor',
        position: { x: 800, y: 250 },
        data: {
          label: 'Resolution Supervisor',
          model: 'qwen3.7-max',
          systemPrompt:
            'Review the billing diagnosis, technical analysis, and holding response. Compose a comprehensive final resolution message that addresses all customer concerns professionally.',
          enableThinking: true,
          thinkingBudget: 1024,
          outputFormat: 'markdown',
        },
      },
    ],
    edges: [
      {
        id: 'e-t-st',
        source: 'node-trigger-support',
        target: 'node-support-triage',
        sourceHandle: 'source',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-st-ba',
        source: 'node-support-triage',
        target: 'node-billing-agent',
        sourceHandle: 'source-right',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-st-da',
        source: 'node-support-triage',
        target: 'node-devops-agent',
        sourceHandle: 'source-right',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-st-fa',
        source: 'node-support-triage',
        target: 'node-feedback-agent',
        sourceHandle: 'source-right',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-ba-rr',
        source: 'node-billing-agent',
        target: 'node-resolution-reviewer',
        sourceHandle: 'source-right',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-da-rr',
        source: 'node-devops-agent',
        target: 'node-resolution-reviewer',
        sourceHandle: 'source-right',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-fa-rr',
        source: 'node-feedback-agent',
        target: 'node-resolution-reviewer',
        sourceHandle: 'source-right',
        targetHandle: 'target-left',
        type: 'animated',
      },
    ],
  },
  {
    id: 'creative-content-studio',
    name: 'Creative Content Studio',
    description:
      'Takes a marketing brief, drafts a blog post via a copywriter agent, and concurrently generates a feature image via a designer agent. A supervisor then reviews both assets.',
    nodes: [
      {
        id: 'node-trigger-brief',
        type: 'input_trigger',
        position: { x: 50, y: 200 },
        data: {
          label:
            'Marketing Brief: A new futuristic smart coffee machine that brews using anti-gravity technology.',
          outputFormat: 'text',
        },
      },
      {
        id: 'node-copywriter',
        type: 'agent',
        position: { x: 300, y: 100 },
        data: {
          label: 'Copywriter Agent',
          model: 'qwen3.7-plus',
          systemPrompt:
            'Write an engaging, 3-paragraph blog post about the product described in the brief. Focus on the innovative features and futuristic appeal.',
          outputFormat: 'markdown',
        },
      },
      {
        id: 'node-designer',
        type: 'agent',
        position: { x: 300, y: 300 },
        data: {
          label: 'Design Agent',
          model: 'wan2.7-image-pro',
          systemPrompt:
            'Generate a photorealistic 3D render of a futuristic anti-gravity smart coffee machine brewing coffee mid-air.',
          outputFormat: 'image',
        },
      },
      {
        id: 'node-editor',
        type: 'supervisor',
        position: { x: 600, y: 200 },
        data: {
          label: 'Editorial Supervisor',
          model: 'qwen3.7-max',
          systemPrompt:
            'Review the drafted blog post and the generated feature image. Combine them into a final markdown document with the image embedded at the top.',
          enableThinking: true,
          thinkingBudget: 1024,
          outputFormat: 'markdown',
        },
      },
    ],
    edges: [
      {
        id: 'e-brief-copy',
        source: 'node-trigger-brief',
        target: 'node-copywriter',
        sourceHandle: 'source',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-brief-design',
        source: 'node-trigger-brief',
        target: 'node-designer',
        sourceHandle: 'source',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-copy-edit',
        source: 'node-copywriter',
        target: 'node-editor',
        sourceHandle: 'source-right',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-design-edit',
        source: 'node-designer',
        target: 'node-editor',
        sourceHandle: 'source-right',
        targetHandle: 'target-left',
        type: 'animated',
      },
    ],
  },
];
