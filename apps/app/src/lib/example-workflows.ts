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
    workerType?: string;
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
  // ── TEXT / REASONING ───────────────────────────────────
  {
    id: 'research-synthesis',
    name: 'Research & Synthesis',
    description:
      'Takes a research question, dispatches two parallel research agents, then a supervisor synthesizes a final report with thinking-based reasoning.',
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
            'Combine the literature review and industry analysis into a coherent synthesis. Output with sections: Summary, Key Findings, Conflicts, Recommendations.',
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
      'Translates text into a target language, then a supervisor reviews for accuracy, tone, and cultural appropriateness.',
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
            'Translate the text into the target language. Preserve technical terms and brand names.',
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
            'Review the translation for accuracy, tone, and cultural fit. Reject with feedback if errors found.',
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
      'Analyzes code for style issues and security vulnerabilities using parallel agents, then a supervisor produces a consolidated review report.',
    nodes: [
      {
        id: 'node-trigger-audit',
        type: 'input_trigger',
        position: { x: 50, y: 200 },
        data: {
          label:
            'Review this code:\n\nfunction getDb() {\n  const conn = new Connection("postgres://admin:password123@localhost:5432/prod");\n  return conn.query("SELECT * FROM users WHERE id = " + userId);\n}',
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
          systemPrompt: 'Analyze for style issues, anti-patterns, and best practice violations.',
          outputFormat: 'markdown',
        },
      },
      {
        id: 'node-secret-scanner',
        type: 'agent',
        position: { x: 300, y: 300 },
        data: {
          label: 'Security Scanner',
          model: 'qwen3.7-plus',
          systemPrompt:
            'Scan for SQL injection, hardcoded credentials, XSS, and other vulnerabilities.',
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
            'Combine both analyses into a single prioritized report with remediation steps.',
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
            'Customer: I was charged twice and the dashboard shows error 503 when viewing invoices.',
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
            'Analyze the issue. Dispatch to Billing Specialist, DevOps Specialist, and Support Agent.',
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
          systemPrompt: 'Check for duplicate charges, verify payment history, calculate refunds.',
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
          systemPrompt: 'Investigate error 503, check server status, suggest remediation.',
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
          systemPrompt: 'Draft an empathetic holding response acknowledging the issue.',
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
          systemPrompt: 'Compose a comprehensive final resolution message addressing all concerns.',
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
    id: 'legal-document-analysis',
    name: 'Legal Document Analysis',
    description:
      'Analyzes a contract for risky clauses and regulatory compliance using parallel specialized agents, then a supervisor produces a redlined summary.',
    nodes: [
      {
        id: 'node-trigger-legal',
        type: 'input_trigger',
        position: { x: 50, y: 200 },
        data: {
          label:
            'Review this SaaS contract for risky clauses and GDPR compliance issues:\n\n"Provider shall not be liable for any data loss. Customer grants a perpetual, irrevocable license to all uploaded content. Governing law: Delaware."',
          outputFormat: 'text',
        },
      },
      {
        id: 'node-risk-agent',
        type: 'agent',
        position: { x: 300, y: 100 },
        data: {
          label: 'Risk Analyst',
          model: 'qwen3.7-plus',
          systemPrompt:
            'Identify risky contractual clauses: liability caps, automatic renewals, IP assignment, termination penalties.',
          outputFormat: 'markdown',
        },
      },
      {
        id: 'node-compliance-agent',
        type: 'agent',
        position: { x: 300, y: 300 },
        data: {
          label: 'Compliance Officer',
          model: 'qwen3.7-plus',
          systemPrompt:
            'Check for GDPR, CCPA, and SOC2 compliance issues. Flag missing data protection clauses.',
          outputFormat: 'markdown',
        },
      },
      {
        id: 'node-legal-supervisor',
        type: 'supervisor',
        position: { x: 600, y: 200 },
        data: {
          label: 'Legal Review Supervisor',
          model: 'qwen3.7-max',
          systemPrompt:
            'Combine risk and compliance findings into a structured legal memo with severity ratings and recommended changes.',
          enableThinking: true,
          thinkingBudget: 2048,
          outputFormat: 'markdown',
        },
      },
    ],
    edges: [
      {
        id: 'e-tl-ra',
        source: 'node-trigger-legal',
        target: 'node-risk-agent',
        sourceHandle: 'source',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-tl-ca',
        source: 'node-trigger-legal',
        target: 'node-compliance-agent',
        sourceHandle: 'source',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-ra-ls',
        source: 'node-risk-agent',
        target: 'node-legal-supervisor',
        sourceHandle: 'source-right',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-ca-ls',
        source: 'node-compliance-agent',
        target: 'node-legal-supervisor',
        sourceHandle: 'source-right',
        targetHandle: 'target-left',
        type: 'animated',
      },
    ],
  },

  // ── IMAGE GENERATION ───────────────────────────────────
  {
    id: 'creative-content-studio',
    name: 'Creative Content Studio',
    description:
      'Takes a marketing brief, drafts a blog post via a copywriter, and concurrently generates a feature image via an AI image model. A supervisor reviews both.',
    nodes: [
      {
        id: 'node-trigger-brief',
        type: 'input_trigger',
        position: { x: 50, y: 200 },
        data: {
          label:
            'Marketing Brief: A futuristic anti-gravity smart coffee machine that brews using zero-G technology.',
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
            'Write a 3-paragraph blog post about the product. Focus on innovative features.',
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
            'Generate a photorealistic 3D render of a futuristic anti-gravity coffee machine brewing mid-air.',
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
            'Combine the blog post and image into a final markdown document with the image embedded at top.',
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
  {
    id: 'product-photography-generator',
    name: 'Product Photography Generator',
    description:
      'Takes a product description and generates multiple product images in different styles and settings using AI image generation.',
    nodes: [
      {
        id: 'node-trigger-prod',
        type: 'input_trigger',
        position: { x: 50, y: 200 },
        data: {
          label:
            'Product: Ergonomic wireless mouse with a sculpted honeycomb shell, RGB lighting, and 16000 DPI sensor.',
          outputFormat: 'text',
        },
      },
      {
        id: 'node-studio-agent',
        type: 'agent',
        position: { x: 300, y: 100 },
        data: {
          label: 'Studio Photographer',
          model: 'wan2.7-image-pro',
          systemPrompt:
            'Generate a clean studio product shot on a white background with soft lighting.',
          outputFormat: 'image',
        },
      },
      {
        id: 'node-lifestyle-agent',
        type: 'agent',
        position: { x: 300, y: 300 },
        data: {
          label: 'Lifestyle Photographer',
          model: 'wan2.7-image-pro',
          systemPrompt:
            'Generate a lifestyle shot of the product being used in a modern gaming setup with RGB ambient lighting.',
          outputFormat: 'image',
        },
      },
      {
        id: 'node-prod-supervisor',
        type: 'supervisor',
        position: { x: 600, y: 200 },
        data: {
          label: 'Photo Editor',
          model: 'qwen3.7-max',
          systemPrompt:
            'Review both images. Provide quality feedback and select the best one for e-commerce use.',
          enableThinking: true,
          thinkingBudget: 1024,
          outputFormat: 'markdown',
        },
      },
    ],
    edges: [
      {
        id: 'e-tp-sa',
        source: 'node-trigger-prod',
        target: 'node-studio-agent',
        sourceHandle: 'source',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-tp-la',
        source: 'node-trigger-prod',
        target: 'node-lifestyle-agent',
        sourceHandle: 'source',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-sa-ps',
        source: 'node-studio-agent',
        target: 'node-prod-supervisor',
        sourceHandle: 'source-right',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-la-ps',
        source: 'node-lifestyle-agent',
        target: 'node-prod-supervisor',
        sourceHandle: 'source-right',
        targetHandle: 'target-left',
        type: 'animated',
      },
    ],
  },
  {
    id: 'social-media-campaign',
    name: 'Social Media Campaign Creator',
    description:
      'Generates a complete social media campaign: copy for multiple platforms plus a branded visual. Perfect for marketing teams.',
    nodes: [
      {
        id: 'node-trigger-soc',
        type: 'input_trigger',
        position: { x: 50, y: 200 },
        data: {
          label:
            'Campaign: Launching a plant-based protein bar. Tagline: "Fuel Nature, Fuel You". Target: fitness enthusiasts aged 22-40.',
          outputFormat: 'text',
        },
      },
      {
        id: 'node-copy-agent',
        type: 'agent',
        position: { x: 300, y: 100 },
        data: {
          label: 'Social Copywriter',
          model: 'qwen3.7-plus',
          systemPrompt:
            'Write 3 social media posts: one for Instagram (caption+hashtags), one for Twitter/X (280 chars), and one for LinkedIn (professional tone).',
          outputFormat: 'markdown',
        },
      },
      {
        id: 'node-visual-agent',
        type: 'agent',
        position: { x: 300, y: 300 },
        data: {
          label: 'Visual Creator',
          model: 'wan2.7-image-pro',
          systemPrompt:
            'Generate a vibrant social media square post graphic featuring the protein bar with natural ingredients shown around it.',
          outputFormat: 'image',
        },
      },
      {
        id: 'node-campaign-supervisor',
        type: 'supervisor',
        position: { x: 600, y: 200 },
        data: {
          label: 'Campaign Manager',
          model: 'qwen3.7-max',
          systemPrompt:
            'Review the copy and visual for brand consistency. Combine into a final campaign brief.',
          enableThinking: true,
          thinkingBudget: 1024,
          outputFormat: 'markdown',
        },
      },
    ],
    edges: [
      {
        id: 'e-ts-ca',
        source: 'node-trigger-soc',
        target: 'node-copy-agent',
        sourceHandle: 'source',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-ts-va',
        source: 'node-trigger-soc',
        target: 'node-visual-agent',
        sourceHandle: 'source',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-ca-cs',
        source: 'node-copy-agent',
        target: 'node-campaign-supervisor',
        sourceHandle: 'source-right',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-va-cs',
        source: 'node-visual-agent',
        target: 'node-campaign-supervisor',
        sourceHandle: 'source-right',
        targetHandle: 'target-left',
        type: 'animated',
      },
    ],
  },
  {
    id: 'logo-brand-identity',
    name: 'Logo & Brand Identity Designer',
    description:
      'Generates multiple logo concepts and brand color palette options, then a supervisor selects the best direction.',
    nodes: [
      {
        id: 'node-trigger-brand',
        type: 'input_trigger',
        position: { x: 50, y: 175 },
        data: {
          label:
            'Brand: "OceanVault" — a secure cloud storage startup. Values: security, simplicity, reliability. Preferred colors: deep blues and teals.',
          outputFormat: 'text',
        },
      },
      {
        id: 'node-minimal-logo',
        type: 'agent',
        position: { x: 300, y: 75 },
        data: {
          label: 'Minimal Logo Designer',
          model: 'wan2.7-image-pro',
          systemPrompt:
            'Design a minimal, modern logo for a cloud security brand called OceanVault. Use deep blue and teal. Clean geometric shapes.',
          outputFormat: 'image',
        },
      },
      {
        id: 'node-mascot-logo',
        type: 'agent',
        position: { x: 300, y: 275 },
        data: {
          label: 'Mascot Logo Designer',
          model: 'wan2.7-image-pro',
          systemPrompt:
            'Design a mascot-style logo for OceanVault featuring a stylized ocean creature combined with a shield. Vibrant blues.',
          outputFormat: 'image',
        },
      },
      {
        id: 'node-brand-supervisor',
        type: 'supervisor',
        position: { x: 600, y: 175 },
        data: {
          label: 'Brand Director',
          model: 'qwen3.7-max',
          systemPrompt:
            'Compare both logo concepts. Recommend the best direction and suggest a complementary color palette and typography.',
          enableThinking: true,
          thinkingBudget: 2048,
          outputFormat: 'markdown',
        },
      },
    ],
    edges: [
      {
        id: 'e-tb-ml',
        source: 'node-trigger-brand',
        target: 'node-minimal-logo',
        sourceHandle: 'source',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-tb-ml2',
        source: 'node-trigger-brand',
        target: 'node-mascot-logo',
        sourceHandle: 'source',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-ml-bs',
        source: 'node-minimal-logo',
        target: 'node-brand-supervisor',
        sourceHandle: 'source-right',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-ml2-bs',
        source: 'node-mascot-logo',
        target: 'node-brand-supervisor',
        sourceHandle: 'source-right',
        targetHandle: 'target-left',
        type: 'animated',
      },
    ],
  },
  {
    id: 'infographic-generator',
    name: 'Infographic Generator',
    description:
      'Takes raw data and generates both a written analysis and a visual infographic. Perfect for data storytelling.',
    nodes: [
      {
        id: 'node-trigger-info',
        type: 'input_trigger',
        position: { x: 50, y: 200 },
        data: {
          label:
            'Data: Q4 revenue grew 34% YoY to $12.4M. Customer count: 8,200 (up 47%). NPS score: 72 (industry avg: 45). Top region: APAC (41% of revenue).',
          outputFormat: 'text',
        },
      },
      {
        id: 'node-writer-agent',
        type: 'agent',
        position: { x: 300, y: 100 },
        data: {
          label: 'Data Writer',
          model: 'qwen3.7-plus',
          systemPrompt:
            'Write a concise data analysis summary highlighting key metrics, trends, and insights from the raw data.',
          outputFormat: 'markdown',
        },
      },
      {
        id: 'node-infographic-agent',
        type: 'agent',
        position: { x: 300, y: 300 },
        data: {
          label: 'Infographic Designer',
          model: 'wan2.7-image-pro',
          systemPrompt:
            'Generate a clean infographic-style image visualizing the key metrics: revenue growth bar chart, customer count trend, NPS comparison, and regional breakdown pie chart.',
          outputFormat: 'image',
        },
      },
      {
        id: 'node-info-supervisor',
        type: 'supervisor',
        position: { x: 600, y: 200 },
        data: {
          label: 'Content Reviewer',
          model: 'qwen3.7-max',
          systemPrompt:
            'Combine the analysis and infographic into a polished report. Ensure data consistency across both.',
          enableThinking: true,
          thinkingBudget: 1024,
          outputFormat: 'markdown',
        },
      },
    ],
    edges: [
      {
        id: 'e-ti-wa',
        source: 'node-trigger-info',
        target: 'node-writer-agent',
        sourceHandle: 'source',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-ti-ia',
        source: 'node-trigger-info',
        target: 'node-infographic-agent',
        sourceHandle: 'source',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-wa-is',
        source: 'node-writer-agent',
        target: 'node-info-supervisor',
        sourceHandle: 'source-right',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-ia-is',
        source: 'node-infographic-agent',
        target: 'node-info-supervisor',
        sourceHandle: 'source-right',
        targetHandle: 'target-left',
        type: 'animated',
      },
    ],
  },

  // ── VIDEO GENERATION ──────────────────────────────────
  {
    id: 'short-video-ad',
    name: 'Short Video Ad Creator',
    description:
      'Creates a short promotional video ad from a product brief using AI video generation. Includes script writing and video output.',
    nodes: [
      {
        id: 'node-trigger-vid',
        type: 'input_trigger',
        position: { x: 50, y: 200 },
        data: {
          label:
            'Product: Noise-cancelling earbuds with 48-hour battery life. USP: "Hear what matters, block the rest." Target: commuters and remote workers.',
          outputFormat: 'text',
        },
      },
      {
        id: 'node-script-agent',
        type: 'agent',
        position: { x: 300, y: 100 },
        data: {
          label: 'Script Writer',
          model: 'qwen3.7-plus',
          systemPrompt:
            'Write a 15-second video ad script. Include visual direction, voiceover lines, and text overlays.',
          outputFormat: 'markdown',
        },
      },
      {
        id: 'node-video-agent',
        type: 'agent',
        position: { x: 300, y: 300 },
        data: {
          label: 'Video Generator',
          model: 'wan2.7-t2v',
          systemPrompt:
            'Generate a short promotional video showing a person putting on premium earbuds in a busy subway, then the world fades to silence as they smile.',
          outputFormat: 'video',
        },
      },
      {
        id: 'node-vid-supervisor',
        type: 'supervisor',
        position: { x: 600, y: 200 },
        data: {
          label: 'Ad Reviewer',
          model: 'qwen3.7-max',
          systemPrompt:
            'Review the script and generated video for alignment. Suggest any edits or retakes needed.',
          enableThinking: true,
          thinkingBudget: 1024,
          outputFormat: 'markdown',
        },
      },
    ],
    edges: [
      {
        id: 'e-tv-sa',
        source: 'node-trigger-vid',
        target: 'node-script-agent',
        sourceHandle: 'source',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-tv-va',
        source: 'node-trigger-vid',
        target: 'node-video-agent',
        sourceHandle: 'source',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-sa-vs',
        source: 'node-script-agent',
        target: 'node-vid-supervisor',
        sourceHandle: 'source-right',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-va-vs',
        source: 'node-video-agent',
        target: 'node-vid-supervisor',
        sourceHandle: 'source-right',
        targetHandle: 'target-left',
        type: 'animated',
      },
    ],
  },
  {
    id: 'video-storyboard-generator',
    name: 'Video Storyboard Generator',
    description:
      'Turns a narrative concept into a full storyboard with scene-by-scene descriptions and AI-generated video clips.',
    nodes: [
      {
        id: 'node-trigger-story',
        type: 'input_trigger',
        position: { x: 50, y: 175 },
        data: {
          label:
            'Story: A 30-second brand film about a runner training before dawn, pushing through exhaustion, and finally watching the sunrise from a hilltop. Emotional arc: determination → struggle → triumph.',
          outputFormat: 'text',
        },
      },
      {
        id: 'node-storyboard-agent',
        type: 'agent',
        position: { x: 300, y: 100 },
        data: {
          label: 'Storyboard Artist',
          model: 'qwen3.7-plus',
          systemPrompt:
            'Break the story into 3 key scenes. Describe each scene in detail with visual direction, camera angles, and emotional tone.',
          outputFormat: 'markdown',
        },
      },
      {
        id: 'node-scene1-video',
        type: 'agent',
        position: { x: 550, y: 75 },
        data: {
          label: 'Scene 1 — Dawn Run',
          model: 'wan2.7-t2v',
          systemPrompt:
            'A runner tying shoes in dark pre-dawn, determined expression, cool blue lighting.',
          outputFormat: 'video',
        },
      },
      {
        id: 'node-scene2-video',
        type: 'agent',
        position: { x: 550, y: 275 },
        data: {
          label: 'Scene 2 — The Struggle',
          model: 'wan2.7-t2v',
          systemPrompt:
            'Runner climbing a steep hill, breathing hard, sweat visible, dramatic low-angle shot.',
          outputFormat: 'video',
        },
      },
      {
        id: 'node-story-supervisor',
        type: 'supervisor',
        position: { x: 800, y: 175 },
        data: {
          label: 'Director',
          model: 'qwen3.7-max',
          systemPrompt:
            'Review all scenes. Ensure narrative continuity and emotional arc. Produce a final storyboard document with embedded scene descriptions.',
          enableThinking: true,
          thinkingBudget: 2048,
          outputFormat: 'markdown',
        },
      },
    ],
    edges: [
      {
        id: 'e-ts-sba',
        source: 'node-trigger-story',
        target: 'node-storyboard-agent',
        sourceHandle: 'source',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-sba-s1',
        source: 'node-storyboard-agent',
        target: 'node-scene1-video',
        sourceHandle: 'source-right',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-sba-s2',
        source: 'node-storyboard-agent',
        target: 'node-scene2-video',
        sourceHandle: 'source-right',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-s1-ss',
        source: 'node-scene1-video',
        target: 'node-story-supervisor',
        sourceHandle: 'source-right',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-s2-ss',
        source: 'node-scene2-video',
        target: 'node-story-supervisor',
        sourceHandle: 'source-right',
        targetHandle: 'target-left',
        type: 'animated',
      },
    ],
  },
  {
    id: 'product-demo-video',
    name: 'Product Demo Video Producer',
    description:
      'Produces a product demo video with step-by-step feature highlights and voiceover script. Ideal for SaaS launches.',
    nodes: [
      {
        id: 'node-trigger-demo',
        type: 'input_trigger',
        position: { x: 50, y: 250 },
        data: {
          label:
            'SaaS Product: "TeamFlow" — project management with AI-powered task assignment, Gantt charts, and real-time collaboration. Demo focus: onboarding a new team.',
          outputFormat: 'text',
        },
      },
      {
        id: 'node-demo-script',
        type: 'agent',
        position: { x: 300, y: 250 },
        data: {
          label: 'Demo Script Writer',
          model: 'qwen3.7-plus',
          systemPrompt:
            'Write a 60-second product demo script. Step-by-step: login → create project → invite team → assign tasks → view Gantt.',
          outputFormat: 'markdown',
        },
      },
      {
        id: 'node-demo-video',
        type: 'agent',
        position: { x: 550, y: 150 },
        data: {
          label: 'Demo Video',
          model: 'wan2.7-t2v',
          systemPrompt:
            'Screen recording style: cursor navigating a clean project management interface, creating tasks, assigning to team members.',
          outputFormat: 'video',
        },
      },
      {
        id: 'node-demo-supervisor',
        type: 'supervisor',
        position: { x: 550, y: 350 },
        data: {
          label: 'Demo Reviewer',
          model: 'qwen3.7-max',
          systemPrompt:
            'Review the script and video. Ensure the demo clearly shows the core value proposition. Suggest improvements.',
          enableThinking: true,
          thinkingBudget: 1024,
          outputFormat: 'markdown',
        },
      },
    ],
    edges: [
      {
        id: 'e-td-ds',
        source: 'node-trigger-demo',
        target: 'node-demo-script',
        sourceHandle: 'source',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-ds-dv',
        source: 'node-demo-script',
        target: 'node-demo-video',
        sourceHandle: 'source-right',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-dv-dr',
        source: 'node-demo-video',
        target: 'node-demo-supervisor',
        sourceHandle: 'source-right',
        targetHandle: 'target-left',
        type: 'animated',
      },
    ],
  },
  {
    id: 'animated-explainer',
    name: 'Animated Explainer Pipeline',
    description:
      'Creates an animated explainer video from a technical concept, combining AI video generation with narrative scripting.',
    nodes: [
      {
        id: 'node-trigger-explain',
        type: 'input_trigger',
        position: { x: 50, y: 200 },
        data: {
          label:
            'Explain: "Blockchain" to a general audience. Focus on what it is, how it works (blocks, chain, consensus), and why it matters — in simple terms.',
          outputFormat: 'text',
        },
      },
      {
        id: 'node-explain-writer',
        type: 'agent',
        position: { x: 300, y: 200 },
        data: {
          label: 'Explainer Scriptwriter',
          model: 'qwen3.7-plus',
          systemPrompt:
            'Write a 45-second explainer script. Use analogies (digital ledger, chain of blocks). Simple language, no jargon.',
          outputFormat: 'markdown',
        },
      },
      {
        id: 'node-animation-agent',
        type: 'agent',
        position: { x: 550, y: 100 },
        data: {
          label: 'Animation — Concept',
          model: 'wan2.7-t2v',
          systemPrompt:
            'Animated visualization of digital blocks being chained together, with glowing connections and data flowing between them. Abstract, clean animation style.',
          outputFormat: 'video',
        },
      },
      {
        id: 'node-animation-agent2',
        type: 'agent',
        position: { x: 550, y: 300 },
        data: {
          label: 'Animation — Real World',
          model: 'wan2.7-t2v',
          systemPrompt:
            'Animation showing real-world blockchain use: supply chain tracking with packages moving through a transparent digital verification system.',
          outputFormat: 'video',
        },
      },
      {
        id: 'node-explain-supervisor',
        type: 'supervisor',
        position: { x: 800, y: 200 },
        data: {
          label: 'Explain Editor',
          model: 'qwen3.7-max',
          systemPrompt:
            'Combine script and both animations into a coherent explainer package. Provide a storyboard-style document.',
          enableThinking: true,
          thinkingBudget: 1024,
          outputFormat: 'markdown',
        },
      },
    ],
    edges: [
      {
        id: 'e-te-ew',
        source: 'node-trigger-explain',
        target: 'node-explain-writer',
        sourceHandle: 'source',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-ew-aa1',
        source: 'node-explain-writer',
        target: 'node-animation-agent',
        sourceHandle: 'source-right',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-ew-aa2',
        source: 'node-explain-writer',
        target: 'node-animation-agent2',
        sourceHandle: 'source-right',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-aa1-es',
        source: 'node-animation-agent',
        target: 'node-explain-supervisor',
        sourceHandle: 'source-right',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-aa2-es',
        source: 'node-animation-agent2',
        target: 'node-explain-supervisor',
        sourceHandle: 'source-right',
        targetHandle: 'target-left',
        type: 'animated',
      },
    ],
  },

  // ── AUDIO GENERATION ──────────────────────────────────
  {
    id: 'podcast-production',
    name: 'Podcast Script & Narration Studio',
    description:
      'Writes a podcast episode script and generates AI voice narration. Perfect for content creators launching a podcast.',
    nodes: [
      {
        id: 'node-trigger-pod',
        type: 'input_trigger',
        position: { x: 50, y: 200 },
        data: {
          label:
            'Podcast episode: "The Future of Remote Work" — 10-minute episode. Host: Alex. Format: intro → 3 key trends → guest highlight → outro. Audience: remote professionals.',
          outputFormat: 'text',
        },
      },
      {
        id: 'node-pod-script',
        type: 'agent',
        position: { x: 300, y: 100 },
        data: {
          label: 'Podcast Scriptwriter',
          model: 'qwen3.7-plus',
          systemPrompt:
            'Write a 10-minute podcast script with host monologue. Include: intro with hook, three segments, smooth transitions, and outro with call-to-action.',
          outputFormat: 'markdown',
        },
      },
      {
        id: 'node-pod-audio',
        type: 'agent',
        position: { x: 300, y: 300 },
        data: {
          label: 'Voice Narration',
          model: 'qwen3-tts-flash',
          systemPrompt:
            'Narrate the podcast script in a warm, conversational tone. Professional yet engaging delivery.',
          outputFormat: 'audio',
        },
      },
      {
        id: 'node-pod-supervisor',
        type: 'supervisor',
        position: { x: 600, y: 200 },
        data: {
          label: 'Podcast Producer',
          model: 'qwen3.7-max',
          systemPrompt:
            'Review script and audio. Check timing (target 10 min). Suggest edits for pacing and clarity.',
          enableThinking: true,
          thinkingBudget: 1024,
          outputFormat: 'markdown',
        },
      },
    ],
    edges: [
      {
        id: 'e-tp-ps',
        source: 'node-trigger-pod',
        target: 'node-pod-script',
        sourceHandle: 'source',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-tp-pa',
        source: 'node-trigger-pod',
        target: 'node-pod-audio',
        sourceHandle: 'source',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-ps-pp',
        source: 'node-pod-script',
        target: 'node-pod-supervisor',
        sourceHandle: 'source-right',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-pa-pp',
        source: 'node-pod-audio',
        target: 'node-pod-supervisor',
        sourceHandle: 'source-right',
        targetHandle: 'target-left',
        type: 'animated',
      },
    ],
  },
  {
    id: 'voiceover-subtitle-sync',
    name: 'Voiceover & Subtitle Sync',
    description:
      'Takes a video script, generates voiceover audio and synchronized subtitles for accessibility and localization.',
    nodes: [
      {
        id: 'node-trigger-vo',
        type: 'input_trigger',
        position: { x: 50, y: 200 },
        data: {
          label:
            'Script: "Welcome to our platform. Build AI agents visually in minutes. Drag, connect, deploy. No coding needed." Language: English (US). Tone: friendly professional.',
          outputFormat: 'text',
        },
      },
      {
        id: 'node-vo-writer',
        type: 'agent',
        position: { x: 300, y: 100 },
        data: {
          label: 'Subtitle Formatter',
          model: 'qwen3.7-plus',
          systemPrompt:
            'Break the script into subtitle chunks (max 42 chars each). Include timing estimates for each chunk.',
          outputFormat: 'markdown',
        },
      },
      {
        id: 'node-vo-audio',
        type: 'agent',
        position: { x: 300, y: 300 },
        data: {
          label: 'Voice Artist',
          model: 'cosyvoice-v3-plus',
          systemPrompt:
            'Generate professional voiceover narration in clear English. Friendly, warm tone suitable for a product intro.',
          outputFormat: 'audio',
        },
      },
      {
        id: 'node-vo-supervisor',
        type: 'supervisor',
        position: { x: 600, y: 200 },
        data: {
          label: 'Accessibility Reviewer',
          model: 'qwen3.7-max',
          systemPrompt:
            'Ensure subtitle timings align with the voiceover pace. Check readability and accessibility compliance.',
          enableThinking: true,
          thinkingBudget: 1024,
          outputFormat: 'markdown',
        },
      },
    ],
    edges: [
      {
        id: 'e-tv-vw',
        source: 'node-trigger-vo',
        target: 'node-vo-writer',
        sourceHandle: 'source',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-tv-va',
        source: 'node-trigger-vo',
        target: 'node-vo-audio',
        sourceHandle: 'source',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-vw-vs',
        source: 'node-vo-writer',
        target: 'node-vo-supervisor',
        sourceHandle: 'source-right',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-va-vs',
        source: 'node-vo-audio',
        target: 'node-vo-supervisor',
        sourceHandle: 'source-right',
        targetHandle: 'target-left',
        type: 'animated',
      },
    ],
  },
  {
    id: 'audiobook-chapter',
    name: 'Audiobook Chapter Producer',
    description:
      'Takes a chapter of text and converts it into a professionally narrated audiobook segment with proper pacing.',
    nodes: [
      {
        id: 'node-trigger-book',
        type: 'input_trigger',
        position: { x: 50, y: 175 },
        data: {
          label:
            'Chapter 1 excerpt: "The forest was silent except for the crunch of leaves underfoot. Elias had been walking for three days. The map in his pocket was worn thin at the folds, but the destination was close — the Lost Library of Aethon, where answers to the old world waited."',
          outputFormat: 'text',
        },
      },
      {
        id: 'node-book-prep',
        type: 'agent',
        position: { x: 300, y: 100 },
        data: {
          label: 'Narration Prep',
          model: 'qwen3.7-plus',
          systemPrompt:
            'Analyze the text for narration: identify character voices, emotional tones for each paragraph, and pacing cues (pauses, emphasis).',
          outputFormat: 'markdown',
        },
      },
      {
        id: 'node-book-audio',
        type: 'agent',
        position: { x: 300, y: 300 },
        data: {
          label: 'Audiobook Narrator',
          model: 'qwen3-tts-flash',
          systemPrompt:
            'Narrate this chapter excerpt with expressive storytelling. Vary pacing for tension and description.',
          outputFormat: 'audio',
        },
      },
      {
        id: 'node-book-supervisor',
        type: 'supervisor',
        position: { x: 600, y: 200 },
        data: {
          label: 'Audio Editor',
          model: 'qwen3.7-max',
          systemPrompt:
            'Review the narration for clarity, pacing, and emotional delivery. Suggest improvements.',
          enableThinking: true,
          thinkingBudget: 1024,
          outputFormat: 'markdown',
        },
      },
    ],
    edges: [
      {
        id: 'e-tb-bp',
        source: 'node-trigger-book',
        target: 'node-book-prep',
        sourceHandle: 'source',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-tb-ba',
        source: 'node-trigger-book',
        target: 'node-book-audio',
        sourceHandle: 'source',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-bp-bs',
        source: 'node-book-prep',
        target: 'node-book-supervisor',
        sourceHandle: 'source-right',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-ba-bs',
        source: 'node-book-audio',
        target: 'node-book-supervisor',
        sourceHandle: 'source-right',
        targetHandle: 'target-left',
        type: 'animated',
      },
    ],
  },
  {
    id: 'multilingual-dubbing',
    name: 'Multilingual Audio Dubbing',
    description:
      'Takes English narration and generates dubbed versions in multiple languages. Great for global content localization.',
    nodes: [
      {
        id: 'node-trigger-dub',
        type: 'input_trigger',
        position: { x: 50, y: 200 },
        data: {
          label:
            'English script: "Click the blue button to start your free trial. No credit card required. Cancel anytime." Dub into: Spanish, French, and Japanese.',
          outputFormat: 'text',
        },
      },
      {
        id: 'node-dub-spanish',
        type: 'agent',
        position: { x: 300, y: 50 },
        data: {
          label: 'Spanish Voice',
          model: 'qwen3-tts-flash',
          systemPrompt:
            'Narrate the Spanish translation: "Haga clic en el botón azul para iniciar su prueba gratuita. No se requiere tarjeta de crédito. Cancele cuando quiera."',
          outputFormat: 'audio',
        },
      },
      {
        id: 'node-dub-french',
        type: 'agent',
        position: { x: 300, y: 200 },
        data: {
          label: 'French Voice',
          model: 'qwen3-tts-flash',
          systemPrompt:
            'Narrate the French translation: "Cliquez sur le bouton bleu pour commencer votre essai gratuit. Aucune carte de crédit requise. Annulez à tout moment."',
          outputFormat: 'audio',
        },
      },
      {
        id: 'node-dub-japanese',
        type: 'agent',
        position: { x: 300, y: 350 },
        data: {
          label: 'Japanese Voice',
          model: 'qwen3-tts-flash',
          systemPrompt:
            'Narrate the Japanese translation: "青いボタンをクリックして無料トライアルを開始してください。クレジットカードは必要ありません。いつでもキャンセルできます。"',
          outputFormat: 'audio',
        },
      },
      {
        id: 'node-dub-supervisor',
        type: 'supervisor',
        position: { x: 600, y: 200 },
        data: {
          label: 'Localization Manager',
          model: 'qwen3.7-max',
          systemPrompt:
            'Review all three dubs for accuracy and natural delivery. Provide a quality assessment.',
          enableThinking: true,
          thinkingBudget: 1024,
          outputFormat: 'markdown',
        },
      },
    ],
    edges: [
      {
        id: 'e-td-ds',
        source: 'node-trigger-dub',
        target: 'node-dub-spanish',
        sourceHandle: 'source',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-td-df',
        source: 'node-trigger-dub',
        target: 'node-dub-french',
        sourceHandle: 'source',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-td-dj',
        source: 'node-trigger-dub',
        target: 'node-dub-japanese',
        sourceHandle: 'source',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-ds-dm',
        source: 'node-dub-spanish',
        target: 'node-dub-supervisor',
        sourceHandle: 'source-right',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-df-dm',
        source: 'node-dub-french',
        target: 'node-dub-supervisor',
        sourceHandle: 'source-right',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-dj-dm',
        source: 'node-dub-japanese',
        target: 'node-dub-supervisor',
        sourceHandle: 'source-right',
        targetHandle: 'target-left',
        type: 'animated',
      },
    ],
  },

  // ── MULTI-MODAL / MIXED ───────────────────────────────
  {
    id: 'full-marketing-suite',
    name: 'Full Marketing Campaign Suite',
    description:
      'End-to-end campaign: writes ad copy, generates a product image, creates a promo video, and produces a voiceover — all from a single brief.',
    nodes: [
      {
        id: 'node-trigger-mkt',
        type: 'input_trigger',
        position: { x: 50, y: 300 },
        data: {
          label:
            'Campaign: "EcoCharge" — portable solar power bank. Launching on Earth Day. Tagline: "Power Your Life, Protect the Planet." Generate: ad copy, product image, promo video, and voiceover.',
          outputFormat: 'text',
        },
      },
      {
        id: 'node-mkt-copy',
        type: 'agent',
        position: { x: 300, y: 75 },
        data: {
          label: 'Ad Copywriter',
          model: 'qwen3.7-plus',
          systemPrompt:
            'Write 3 ad copy variants: one for Instagram, one for email newsletter, one for a billboard. Highlight eco-friendly angle.',
          outputFormat: 'markdown',
        },
      },
      {
        id: 'node-mkt-image',
        type: 'agent',
        position: { x: 300, y: 225 },
        data: {
          label: 'Product Photographer',
          model: 'wan2.7-image-pro',
          systemPrompt:
            'Generate a stunning hero image: solar power bank on a mountain summit at golden hour, connected to a phone charging. Nature background.',
          outputFormat: 'image',
        },
      },
      {
        id: 'node-mkt-video',
        type: 'agent',
        position: { x: 300, y: 375 },
        data: {
          label: 'Video Producer',
          model: 'wan2.7-t2v',
          systemPrompt:
            'Generate a 5-second loop: solar panels unfolding on a backpack in sunlight, then a phone screen lighting up showing "Fully Charged".',
          outputFormat: 'video',
        },
      },
      {
        id: 'node-mkt-audio',
        type: 'agent',
        position: { x: 300, y: 525 },
        data: {
          label: 'Voiceover Artist',
          model: 'qwen3-tts-flash',
          systemPrompt:
            'Narrate: "EcoCharge. Harness the sun. Power your life. Available now." Warm, inspiring tone.',
          outputFormat: 'audio',
        },
      },
      {
        id: 'node-mkt-supervisor',
        type: 'supervisor',
        position: { x: 700, y: 300 },
        data: {
          label: 'Campaign Director',
          model: 'qwen3.7-max',
          systemPrompt:
            'Review all assets (copy, image, video, audio). Ensure brand consistency across all channels. Produce a final campaign summary.',
          enableThinking: true,
          thinkingBudget: 2048,
          outputFormat: 'markdown',
        },
      },
    ],
    edges: [
      {
        id: 'e-tm-mc',
        source: 'node-trigger-mkt',
        target: 'node-mkt-copy',
        sourceHandle: 'source',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-tm-mi',
        source: 'node-trigger-mkt',
        target: 'node-mkt-image',
        sourceHandle: 'source',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-tm-mv',
        source: 'node-trigger-mkt',
        target: 'node-mkt-video',
        sourceHandle: 'source',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-tm-ma',
        source: 'node-trigger-mkt',
        target: 'node-mkt-audio',
        sourceHandle: 'source',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-mc-ms',
        source: 'node-mkt-copy',
        target: 'node-mkt-supervisor',
        sourceHandle: 'source-right',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-mi-ms',
        source: 'node-mkt-image',
        target: 'node-mkt-supervisor',
        sourceHandle: 'source-right',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-mv-ms',
        source: 'node-mkt-video',
        target: 'node-mkt-supervisor',
        sourceHandle: 'source-right',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-ma-ms',
        source: 'node-mkt-audio',
        target: 'node-mkt-supervisor',
        sourceHandle: 'source-right',
        targetHandle: 'target-left',
        type: 'animated',
      },
    ],
  },
  {
    id: 'educational-content-factory',
    name: 'Educational Content Factory',
    description:
      'Creates a complete educational module: lesson text, infographic, explainer video, and audio narration. Perfect for online courses.',
    nodes: [
      {
        id: 'node-trigger-edu',
        type: 'input_trigger',
        position: { x: 50, y: 300 },
        data: {
          label:
            'Lesson: "Photosynthesis" for high school biology. Key concepts: light-dependent reactions, Calvin cycle, chloroplast structure. Output: lesson text, diagram, animation, narration.',
          outputFormat: 'text',
        },
      },
      {
        id: 'node-edu-text',
        type: 'agent',
        position: { x: 300, y: 75 },
        data: {
          label: 'Lesson Writer',
          model: 'qwen3.7-plus',
          systemPrompt:
            'Write a clear, engaging lesson on photosynthesis. Include key vocabulary, step-by-step explanations, and a summary quiz.',
          outputFormat: 'markdown',
        },
      },
      {
        id: 'node-edu-image',
        type: 'agent',
        position: { x: 300, y: 225 },
        data: {
          label: 'Diagram Illustrator',
          model: 'wan2.7-image-pro',
          systemPrompt:
            'Generate an educational diagram showing the photosynthesis process: chloroplast, sunlight, water, CO2 input, and glucose + oxygen output. Clean, labeled diagram style.',
          outputFormat: 'image',
        },
      },
      {
        id: 'node-edu-video',
        type: 'agent',
        position: { x: 300, y: 375 },
        data: {
          label: 'Animation Creator',
          model: 'wan2.7-t2v',
          systemPrompt:
            'Animated visualization of photosynthesis: sunlight hitting a leaf, chloroplasts glowing, molecules transforming through the Calvin cycle.',
          outputFormat: 'video',
        },
      },
      {
        id: 'node-edu-audio',
        type: 'agent',
        position: { x: 300, y: 525 },
        data: {
          label: 'Voice Instructor',
          model: 'cosyvoice-v3-plus',
          systemPrompt:
            'Read the lesson text in a clear, engaging teaching voice. Suitable for high school students.',
          outputFormat: 'audio',
        },
      },
      {
        id: 'node-edu-supervisor',
        type: 'supervisor',
        position: { x: 700, y: 300 },
        data: {
          label: 'Curriculum Reviewer',
          model: 'qwen3.7-max',
          systemPrompt:
            'Review all materials for educational accuracy, age-appropriateness, and consistency. Produce a final lesson plan.',
          enableThinking: true,
          thinkingBudget: 2048,
          outputFormat: 'markdown',
        },
      },
    ],
    edges: [
      {
        id: 'e-te-et',
        source: 'node-trigger-edu',
        target: 'node-edu-text',
        sourceHandle: 'source',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-te-ei',
        source: 'node-trigger-edu',
        target: 'node-edu-image',
        sourceHandle: 'source',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-te-ev',
        source: 'node-trigger-edu',
        target: 'node-edu-video',
        sourceHandle: 'source',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-te-ea',
        source: 'node-trigger-edu',
        target: 'node-edu-audio',
        sourceHandle: 'source',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-et-es',
        source: 'node-edu-text',
        target: 'node-edu-supervisor',
        sourceHandle: 'source-right',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-ei-es',
        source: 'node-edu-image',
        target: 'node-edu-supervisor',
        sourceHandle: 'source-right',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-ev-es',
        source: 'node-edu-video',
        target: 'node-edu-supervisor',
        sourceHandle: 'source-right',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-ea-es',
        source: 'node-edu-audio',
        target: 'node-edu-supervisor',
        sourceHandle: 'source-right',
        targetHandle: 'target-left',
        type: 'animated',
      },
    ],
  },
  {
    id: 'press-release-multimedia',
    name: 'Press Release & Multimedia Kit',
    description:
      'Drafts a press release, generates a hero image, a video snippet, and a spokesperson voiceover for a complete press kit.',
    nodes: [
      {
        id: 'node-trigger-pr',
        type: 'input_trigger',
        position: { x: 50, y: 250 },
        data: {
          label:
            'Press release: "NovaTech raises $50M Series B for AI-powered carbon capture technology." Key message: backing from top VCs, pilot with 3 Fortune 500 companies, hiring 200 new engineers.',
          outputFormat: 'text',
        },
      },
      {
        id: 'node-pr-writer',
        type: 'agent',
        position: { x: 300, y: 100 },
        data: {
          label: 'PR Writer',
          model: 'qwen3.7-plus',
          systemPrompt:
            'Draft a professional press release with headline, dateline, body, quotes from CEO and VC partner, and boilerplate.',
          outputFormat: 'markdown',
        },
      },
      {
        id: 'node-pr-image',
        type: 'agent',
        position: { x: 300, y: 250 },
        data: {
          label: 'Hero Image Designer',
          model: 'wan2.7-image-pro',
          systemPrompt:
            'Generate a futuristic image: sleek carbon capture facility surrounded by clean air, with holographic data displays showing environmental impact metrics.',
          outputFormat: 'image',
        },
      },
      {
        id: 'node-pr-video',
        type: 'agent',
        position: { x: 300, y: 400 },
        data: {
          label: 'Video Snippet',
          model: 'wan2.7-t2v',
          systemPrompt:
            'Cinematic drone shot flying over a modern clean-tech facility with solar panels and green surroundings. Bright, optimistic mood.',
          outputFormat: 'video',
        },
      },
      {
        id: 'node-pr-supervisor',
        type: 'supervisor',
        position: { x: 650, y: 250 },
        data: {
          label: 'Communications Director',
          model: 'qwen3.7-max',
          systemPrompt:
            'Review all assets for brand messaging consistency. Ensure the press release, image, and video tell a cohesive story.',
          enableThinking: true,
          thinkingBudget: 2048,
          outputFormat: 'markdown',
        },
      },
    ],
    edges: [
      {
        id: 'e-tp-pw',
        source: 'node-trigger-pr',
        target: 'node-pr-writer',
        sourceHandle: 'source',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-tp-pi',
        source: 'node-trigger-pr',
        target: 'node-pr-image',
        sourceHandle: 'source',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-tp-pv',
        source: 'node-trigger-pr',
        target: 'node-pr-video',
        sourceHandle: 'source',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-pw-ps',
        source: 'node-pr-writer',
        target: 'node-pr-supervisor',
        sourceHandle: 'source-right',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-pi-ps',
        source: 'node-pr-image',
        target: 'node-pr-supervisor',
        sourceHandle: 'source-right',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-pv-ps',
        source: 'node-pr-video',
        target: 'node-pr-supervisor',
        sourceHandle: 'source-right',
        targetHandle: 'target-left',
        type: 'animated',
      },
    ],
  },
  {
    id: 'travel-vlog-creator',
    name: 'Travel Vlog Content Creator',
    description:
      'Creates a complete travel vlog package: destination guide text, scenic photo, video montage, and narrated audio guide.',
    nodes: [
      {
        id: 'node-trigger-travel',
        type: 'input_trigger',
        position: { x: 50, y: 250 },
        data: {
          label:
            'Destination: "Kyoto, Japan — Cherry Blossom Season" Focus: Arashiyama Bamboo Grove, Kinkaku-ji Temple, traditional tea ceremony, local cuisine.',
          outputFormat: 'text',
        },
      },
      {
        id: 'node-travel-writer',
        type: 'agent',
        position: { x: 300, y: 100 },
        data: {
          label: 'Travel Writer',
          model: 'qwen3.7-plus',
          systemPrompt:
            'Write an immersive travel guide for Kyoto during cherry blossom season. Include must-visit spots, local tips, cultural etiquette, and food recommendations.',
          outputFormat: 'markdown',
        },
      },
      {
        id: 'node-travel-image',
        type: 'agent',
        position: { x: 300, y: 250 },
        data: {
          label: 'Travel Photographer',
          model: 'wan2.7-image-pro',
          systemPrompt:
            'Generate a breathtaking travel photo: Arashiyama Bamboo Grove with cherry blossoms framing the path, soft morning light filtering through.',
          outputFormat: 'image',
        },
      },
      {
        id: 'node-travel-video',
        type: 'agent',
        position: { x: 300, y: 400 },
        data: {
          label: 'Video Editor',
          model: 'wan2.7-t2v',
          systemPrompt:
            'Travel montage: slow pan through bamboo grove, cut to golden temple reflecting in pond, then tea ceremony close-ups. Warm cinematic grade.',
          outputFormat: 'video',
        },
      },
      {
        id: 'node-travel-supervisor',
        type: 'supervisor',
        position: { x: 650, y: 250 },
        data: {
          label: 'Content Director',
          model: 'qwen3.7-max',
          systemPrompt:
            'Review all content for consistency and quality. Ensure the guide, photo, and video present a cohesive destination story.',
          enableThinking: true,
          thinkingBudget: 1024,
          outputFormat: 'markdown',
        },
      },
    ],
    edges: [
      {
        id: 'e-tt-tw',
        source: 'node-trigger-travel',
        target: 'node-travel-writer',
        sourceHandle: 'source',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-tt-ti',
        source: 'node-trigger-travel',
        target: 'node-travel-image',
        sourceHandle: 'source',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-tt-tv',
        source: 'node-trigger-travel',
        target: 'node-travel-video',
        sourceHandle: 'source',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-tw-ts',
        source: 'node-travel-writer',
        target: 'node-travel-supervisor',
        sourceHandle: 'source-right',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-ti-ts',
        source: 'node-travel-image',
        target: 'node-travel-supervisor',
        sourceHandle: 'source-right',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-tv-ts',
        source: 'node-travel-video',
        target: 'node-travel-supervisor',
        sourceHandle: 'source-right',
        targetHandle: 'target-left',
        type: 'animated',
      },
    ],
  },
  {
    id: 'ecommerce-listing-optimizer',
    name: 'E-Commerce Listing Optimizer',
    description:
      'Generates a complete product listing: SEO-optimized description, multiple product images, and a demonstration video. Ideal for marketplace sellers.',
    nodes: [
      {
        id: 'node-trigger-eco',
        type: 'input_trigger',
        position: { x: 50, y: 250 },
        data: {
          label:
            'Product: "UltraGlide Pro" — premium mechanical keyboard. Features: hot-swappable switches, PBT keycaps, aluminum frame, per-key RGB, USB-C + Bluetooth. Price: $179. Target: gamers and developers.',
          outputFormat: 'text',
        },
      },
      {
        id: 'node-eco-description',
        type: 'agent',
        position: { x: 300, y: 100 },
        data: {
          label: 'Description Writer',
          model: 'qwen3.7-plus',
          systemPrompt:
            'Write an SEO-optimized product listing. Include: compelling title (≤80 chars), 5 bullet features, detailed description (200 words), and a comparison section.',
          outputFormat: 'markdown',
        },
      },
      {
        id: 'node-eco-image',
        type: 'agent',
        position: { x: 300, y: 250 },
        data: {
          label: 'Product Photographer',
          model: 'wan2.7-image-pro',
          systemPrompt:
            'Generate a hero product shot: UltraGlide Pro keyboard on a wooden desk at 45-degree angle, RGB lighting on, with a coffee cup and phone nearby for scale. Warm lighting.',
          outputFormat: 'image',
        },
      },
      {
        id: 'node-eco-video',
        type: 'agent',
        position: { x: 300, y: 400 },
        data: {
          label: 'Demo Video',
          model: 'wan2.7-t2v',
          systemPrompt:
            'Close-up of mechanical keyboard: fingers typing rapidly, RGB lighting cycling through colors, then a macro shot of a hot-swappable switch being inserted.',
          outputFormat: 'video',
        },
      },
      {
        id: 'node-eco-supervisor',
        type: 'supervisor',
        position: { x: 650, y: 250 },
        data: {
          label: 'Listing Reviewer',
          model: 'qwen3.7-max',
          systemPrompt:
            'Review the listing for completeness, accuracy, and sales appeal. Ensure all images and video match the product described.',
          enableThinking: true,
          thinkingBudget: 1024,
          outputFormat: 'markdown',
        },
      },
    ],
    edges: [
      {
        id: 'e-te-ed',
        source: 'node-trigger-eco',
        target: 'node-eco-description',
        sourceHandle: 'source',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-te-ei',
        source: 'node-trigger-eco',
        target: 'node-eco-image',
        sourceHandle: 'source',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-te-ev',
        source: 'node-trigger-eco',
        target: 'node-eco-video',
        sourceHandle: 'source',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-ed-es',
        source: 'node-eco-description',
        target: 'node-eco-supervisor',
        sourceHandle: 'source-right',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-ei-es',
        source: 'node-eco-image',
        target: 'node-eco-supervisor',
        sourceHandle: 'source-right',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-ev-es',
        source: 'node-eco-video',
        target: 'node-eco-supervisor',
        sourceHandle: 'source-right',
        targetHandle: 'target-left',
        type: 'animated',
      },
    ],
  },
];
