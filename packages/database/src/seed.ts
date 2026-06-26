import { randomUUID } from 'node:crypto';
import { createConnection, getConnection, sqliteSchema } from './index.js';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';

const PASSWORD_HASH = '$2b$10$hCBF5cyRFv3jyo4bXoniJeEaN3SWUocwFchsBWbhFUrxeiucmWdO.';
const NOW = Date.now();

function id(prefix: string): string {
  return `${prefix}_${randomUUID().slice(0, 8)}`;
}

// Seed workflow definitions (subset of mock-workflows)
const SEED_WORKFLOWS = [
  {
    name: 'Academic Research Workflow',
    description:
      'Scrapes databases for latest research papers, scans patents, and synthesizes findings using a Consensus Supervisor.',
    categorySlug: 'research',
    tags: ['research', 'academic', 'consensus'],
    featured: true,
    downloads: 142,
    avgRating: 4,
    ratingCount: 18,
    workflowData: {
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
  },
  {
    name: 'Translation & Localization Pipeline',
    description:
      'Automates multi-language translation and context review before publishing localized files to the directory.',
    categorySlug: 'content',
    tags: ['translation', 'i18n', 'content'],
    featured: true,
    downloads: 89,
    avgRating: 5,
    ratingCount: 12,
    workflowData: {
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
        {
          id: 'e-ti-tr',
          source: 'node-trigger-input',
          target: 'node-translator',
          type: 'animated',
        },
        { id: 'e-tr-rev', source: 'node-translator', target: 'node-reviewer', type: 'animated' },
        { id: 'e-rev-save', source: 'node-reviewer', target: 'node-mcp-saver', type: 'animated' },
      ],
    },
  },
  {
    name: 'Security Auditing Workflow',
    description:
      'Performs static analysis of files, checks for exposed secrets/API keys, and submits risk tickets automatically.',
    categorySlug: 'devops',
    tags: ['security', 'audit', 'devops'],
    featured: false,
    downloads: 56,
    avgRating: 4,
    ratingCount: 7,
    workflowData: {
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
  },
  {
    name: 'Customer Support Escalation Workflow',
    description:
      'Classifies customer issues, runs specialized diagnosis (billing & DevOps) concurrently, constructs a polished resolution message, and logs results to CRM & Slack.',
    categorySlug: 'customer-support',
    tags: ['support', 'crm', 'automation'],
    featured: true,
    downloads: 203,
    avgRating: 4,
    ratingCount: 24,
    workflowData: {
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
  },
  {
    name: 'Social Media Content Scheduler',
    description:
      'Generates on-brand social posts from a brief, reviews tone, and schedules them across platforms via MCP tools.',
    categorySlug: 'content',
    tags: ['social-media', 'marketing', 'content'],
    featured: false,
    downloads: 34,
    avgRating: 3,
    ratingCount: 5,
    workflowData: {
      nodes: [
        {
          id: 'node-trigger-soc',
          type: 'input_trigger',
          position: { x: 50, y: 200 },
          data: {
            label: 'Topic: New product launch Q3. Tone: professional but exciting.',
            outputFormat: 'text',
          },
        },
        {
          id: 'node-copywriter',
          type: 'agent',
          position: { x: 300, y: 200 },
          data: {
            label: 'Copywriter',
            model: 'qwen-plus',
            systemPrompt:
              'Draft 3 social media posts (LinkedIn, Twitter, Instagram) based on the brief provided.',
            outputFormat: 'markdown',
          },
        },
        {
          id: 'node-brand-reviewer',
          type: 'supervisor',
          position: { x: 600, y: 200 },
          data: {
            label: 'Brand Supervisor',
            model: 'qwen3-max',
            systemPrompt:
              'Ensure all posts align with brand voice and guidelines. Flag anything off-tone.',
            enableThinking: true,
            thinkingBudget: 512,
            outputFormat: 'json',
          },
        },
        {
          id: 'node-mcp-scheduler',
          type: 'mcp_tool',
          position: { x: 900, y: 200 },
          data: {
            label: 'Tandem Docs MCP',
            mcpServerId: 'ac.tandem/docs-mcp',
            mcpServerUrl: 'https://tandem.ac/mcp',
            systemPrompt:
              'Search documentation for best practices on scheduling and publishing content.',
            outputFormat: 'text',
          },
        },
      ],
      edges: [
        { id: 'e-ts-cw', source: 'node-trigger-soc', target: 'node-copywriter', type: 'animated' },
        {
          id: 'e-cw-br',
          source: 'node-copywriter',
          target: 'node-brand-reviewer',
          type: 'animated',
        },
        {
          id: 'e-br-ms',
          source: 'node-brand-reviewer',
          target: 'node-mcp-scheduler',
          type: 'animated',
        },
      ],
    },
  },
  {
    name: 'Code Review Pipeline',
    description:
      'Reviews pull requests for code quality, security issues, and best practices before merging.',
    categorySlug: 'devops',
    tags: ['code-review', 'devops', 'quality'],
    featured: false,
    downloads: 78,
    avgRating: 4,
    ratingCount: 9,
    workflowData: {
      nodes: [
        {
          id: 'node-trigger-cr',
          type: 'trigger',
          position: { x: 50, y: 200 },
          data: { label: 'PR Merged Webhook', outputFormat: 'text' },
        },
        {
          id: 'node-linter',
          type: 'agent',
          position: { x: 300, y: 100 },
          data: {
            label: 'Code Linter',
            model: 'qwen-plus',
            systemPrompt:
              'Review code for style guide violations, formatting issues, and anti-patterns.',
            outputFormat: 'markdown',
          },
        },
        {
          id: 'node-vulnerability',
          type: 'agent',
          position: { x: 300, y: 300 },
          data: {
            label: 'Vulnerability Scanner',
            model: 'qwen-plus',
            systemPrompt: 'Scan dependencies and code for known CVEs and security vulnerabilities.',
            outputFormat: 'markdown',
          },
        },
        {
          id: 'node-cr-supervisor',
          type: 'supervisor',
          position: { x: 600, y: 200 },
          data: {
            label: 'Review Supervisor',
            model: 'qwen3-max',
            systemPrompt:
              'Combine lint and vulnerability reports. Approve or request changes on the PR.',
            enableThinking: true,
            thinkingBudget: 1024,
            outputFormat: 'json',
          },
        },
        {
          id: 'node-github-writer',
          type: 'mcp_tool',
          position: { x: 900, y: 200 },
          data: {
            label: 'AlphaCreek MCP',
            mcpServerId: 'ai.alphacreek/alphacreek-mcp',
            mcpServerUrl: 'https://mcp.alphacreek.ai/mcp',
            iconUrl: 'https://www.alphacreek.ai/assets/images/logo/logo400x400.png',
            systemPrompt:
              'Publish the code review summary as a finding in the agent network for peer validation.',
            outputFormat: 'text',
          },
        },
      ],
      edges: [
        { id: 'e-tcr-la', source: 'node-trigger-cr', target: 'node-linter', type: 'animated' },
        {
          id: 'e-tcr-vs',
          source: 'node-trigger-cr',
          target: 'node-vulnerability',
          type: 'animated',
        },
        { id: 'e-la-cs', source: 'node-linter', target: 'node-cr-supervisor', type: 'animated' },
        {
          id: 'e-vs-cs',
          source: 'node-vulnerability',
          target: 'node-cr-supervisor',
          type: 'animated',
        },
        {
          id: 'e-cs-gw',
          source: 'node-cr-supervisor',
          target: 'node-github-writer',
          type: 'animated',
        },
      ],
    },
  },
  {
    name: 'Data Pipeline Orchestrator',
    description:
      'Extracts data from APIs, transforms it, and loads it into a database with quality checks at each stage.',
    categorySlug: 'data',
    tags: ['data', 'etl', 'pipeline'],
    featured: false,
    downloads: 45,
    avgRating: 3,
    ratingCount: 6,
    workflowData: {
      nodes: [
        {
          id: 'node-trigger-dp',
          type: 'trigger',
          position: { x: 50, y: 200 },
          data: { label: 'Daily Cron (2 AM)', outputFormat: 'text' },
        },
        {
          id: 'node-extractor',
          type: 'agent',
          position: { x: 300, y: 200 },
          data: {
            label: 'API Extractor',
            model: 'qwen-plus',
            systemPrompt:
              'Fetch latest data from the external API endpoint and format as structured JSON.',
            outputFormat: 'json',
          },
        },
        {
          id: 'node-transformer',
          type: 'agent',
          position: { x: 550, y: 200 },
          data: {
            label: 'Data Transformer',
            model: 'qwen-plus',
            systemPrompt:
              'Clean, normalize, and transform the extracted data to match the target schema.',
            outputFormat: 'json',
          },
        },
        {
          id: 'node-quality-gate',
          type: 'supervisor',
          position: { x: 800, y: 200 },
          data: {
            label: 'Quality Gate',
            model: 'qwen3-max',
            systemPrompt:
              'Validate data quality: check for nulls, outliers, type mismatches. If quality fails, reject the batch.',
            enableThinking: true,
            thinkingBudget: 512,
            outputFormat: 'json',
          },
        },
        {
          id: 'node-loader',
          type: 'mcp_tool',
          position: { x: 1050, y: 200 },
          data: {
            label: 'AgentBerg MCP',
            mcpServerId: 'ai.agentberg/agentberg',
            mcpServerUrl: 'https://agentberg.ai/mcp',
            systemPrompt: 'Publish validated data records as findings in the agent network.',
            outputFormat: 'text',
          },
        },
      ],
      edges: [
        { id: 'e-tdp-ex', source: 'node-trigger-dp', target: 'node-extractor', type: 'animated' },
        { id: 'e-ex-tr', source: 'node-extractor', target: 'node-transformer', type: 'animated' },
        {
          id: 'e-tr-qg',
          source: 'node-transformer',
          target: 'node-quality-gate',
          type: 'animated',
        },
        { id: 'e-qg-lo', source: 'node-quality-gate', target: 'node-loader', type: 'animated' },
      ],
    },
  },
  {
    name: 'Lead Scoring & CRM Enrichment',
    description:
      'Scores inbound leads, enriches with public data, and pushes qualified leads to the CRM.',
    categorySlug: 'customer-support',
    tags: ['sales', 'crm', 'leads'],
    featured: false,
    downloads: 27,
    avgRating: 4,
    ratingCount: 4,
    workflowData: {
      nodes: [
        {
          id: 'node-trigger-ls',
          type: 'trigger',
          position: { x: 50, y: 200 },
          data: { label: 'Webhook: New Lead Form Submission', outputFormat: 'text' },
        },
        {
          id: 'node-scorer',
          type: 'agent',
          position: { x: 300, y: 200 },
          data: {
            label: 'Lead Scorer',
            model: 'qwen-plus',
            systemPrompt:
              'Score the lead based on company size, industry, and engagement signals. Return score 0-100.',
            outputFormat: 'json',
          },
        },
        {
          id: 'node-enricher',
          type: 'agent',
          position: { x: 550, y: 200 },
          data: {
            label: 'Data Enricher',
            model: 'qwen-plus',
            systemPrompt:
              'Look up company information: headcount, funding, tech stack from public sources.',
            outputFormat: 'json',
          },
        },
        {
          id: 'node-routing-agent',
          type: 'supervisor',
          position: { x: 800, y: 200 },
          data: {
            label: 'Routing Supervisor',
            model: 'qwen3-max',
            systemPrompt:
              'If lead score > 70 route to sales. If 40-70 route to nurture. If < 40 archive.',
            enableThinking: true,
            thinkingBudget: 512,
            outputFormat: 'json',
          },
        },
      ],
      edges: [
        { id: 'e-tls-sc', source: 'node-trigger-ls', target: 'node-scorer', type: 'animated' },
        { id: 'e-sc-en', source: 'node-scorer', target: 'node-enricher', type: 'animated' },
        { id: 'e-en-ra', source: 'node-enricher', target: 'node-routing-agent', type: 'animated' },
      ],
    },
  },
];

const CATEGORIES = [
  { id: id('cat'), name: 'Research & Analysis', slug: 'research', icon: 'Brain', sortOrder: 1 },
  { id: id('cat'), name: 'Content & Writing', slug: 'content', icon: 'FileText', sortOrder: 2 },
  { id: id('cat'), name: 'DevOps & Engineering', slug: 'devops', icon: 'Wrench', sortOrder: 3 },
  {
    id: id('cat'),
    name: 'Customer Support',
    slug: 'customer-support',
    icon: 'Users',
    sortOrder: 4,
  },
  { id: id('cat'), name: 'Data & Analytics', slug: 'data', icon: 'BarChart', sortOrder: 5 },
];

const REVIEWS_DATA: { templateIdx: number; rating: number; review: string }[] = [
  {
    templateIdx: 0,
    rating: 5,
    review:
      'Excellent research workflow. The consensus supervisor works great for literature reviews.',
  },
  {
    templateIdx: 0,
    rating: 4,
    review: 'Very useful for automating paper summaries. Would love more output format options.',
  },
  {
    templateIdx: 1,
    rating: 5,
    review: 'Perfect for our i18n pipeline. Saved us hours of manual translation work.',
  },
  {
    templateIdx: 1,
    rating: 5,
    review: 'The linguistic reviewer catches nuances that other tools miss. Highly recommend.',
  },
  {
    templateIdx: 2,
    rating: 4,
    review: 'Good security audit tool. Could use more vulnerability database integrations.',
  },
  {
    templateIdx: 3,
    rating: 5,
    review: 'Our support team loves this. Reduced ticket resolution time by 60%.',
  },
  {
    templateIdx: 3,
    rating: 4,
    review: 'Great escalation workflow. The triage supervisor is very accurate.',
  },
  {
    templateIdx: 3,
    rating: 3,
    review: 'Works well but needs more CRM integrations out of the box.',
  },
  {
    templateIdx: 4,
    rating: 3,
    review: 'Decent scheduler but the brand voice detection could be better.',
  },
  {
    templateIdx: 5,
    rating: 4,
    review: 'Excellent code review automation. Catches things our team misses.',
  },
  {
    templateIdx: 5,
    rating: 5,
    review: 'The vulnerability scanner found issues in our dependencies. Very thorough.',
  },
  { templateIdx: 6, rating: 3, review: 'Good ETL pipeline but needs more data source connectors.' },
  {
    templateIdx: 7,
    rating: 4,
    review: 'Our sales team qualified 3x more leads after implementing this workflow.',
  },
];

async function seed() {
  console.log('🌱 Seeding database...\n');

  createConnection();
  const { db } = getConnection();
  const s = sqliteSchema;
  const sqliteDb = db as BetterSQLite3Database<typeof sqliteSchema>;

  // Clear existing data (order matters for FK constraints)
  console.log('  Clearing existing data...');
  sqliteDb.delete(s.sqliteTemplateReviews).run();
  sqliteDb.delete(s.sqliteTemplates).run();
  sqliteDb.delete(s.sqliteTemplateCategories).run();
  sqliteDb.delete(s.sqliteAgentLogs).run();
  sqliteDb.delete(s.sqliteExecutions).run();
  sqliteDb.delete(s.sqliteEdges).run();
  sqliteDb.delete(s.sqliteNodes).run();
  sqliteDb.delete(s.sqliteWorkflows).run();
  sqliteDb.delete(s.sqliteMcpServers).run();
  sqliteDb.delete(s.sqliteUsers).run();

  // Create demo user
  const userId = id('user');
  console.log(`  Creating demo user: demo@qwenweaver.dev / password123`);
  sqliteDb
    .insert(s.sqliteUsers)
    .values({
      id: userId,
      email: 'demo@qwenweaver.dev',
      passwordHash: PASSWORD_HASH,
      createdAt: NOW,
    })
    .run();

  // Create categories
  console.log(`  Creating ${CATEGORIES.length} categories...`);
  for (const cat of CATEGORIES) {
    sqliteDb
      .insert(s.sqliteTemplateCategories)
      .values({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        icon: cat.icon,
        sortOrder: cat.sortOrder,
      })
      .run();
  }

  // Create templates
  console.log(`  Creating ${SEED_WORKFLOWS.length} templates...`);
  const templateIds: string[] = [];
  for (const wf of SEED_WORKFLOWS) {
    const tid = id('tpl');
    templateIds.push(tid);
    const cat = CATEGORIES.find((c) => c.slug === wf.categorySlug);
    sqliteDb
      .insert(s.sqliteTemplates)
      .values({
        id: tid,
        name: wf.name,
        description: wf.description,
        workflowData: wf.workflowData as any,
        categoryId: cat?.id ?? null,
        tags: wf.tags,
        authorId: userId,
        downloads: wf.downloads,
        avgRating: wf.avgRating,
        ratingCount: wf.ratingCount,
        featured: wf.featured ? 1 : 0,
        createdAt: NOW - Math.floor(Math.random() * 86400000 * 30),
        updatedAt: NOW,
      })
      .run();
  }

  // Create reviews
  console.log(`  Creating ${REVIEWS_DATA.length} reviews...`);
  for (const r of REVIEWS_DATA) {
    sqliteDb
      .insert(s.sqliteTemplateReviews)
      .values({
        id: id('rev'),
        templateId: templateIds[r.templateIdx],
        userId: userId,
        rating: r.rating,
        review: r.review,
        createdAt: NOW - Math.floor(Math.random() * 86400000 * 7),
      })
      .run();
  }

  console.log('\n✅ Seed complete!');
  console.log(`   User:       demo@qwenweaver.dev / password123`);
  console.log(`   Categories: ${CATEGORIES.length}`);
  console.log(`   Templates:  ${SEED_WORKFLOWS.length}`);
  console.log(`   Reviews:    ${REVIEWS_DATA.length}`);
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
