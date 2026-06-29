import { randomUUID } from 'node:crypto';
import { createConnection, getConnection, sqliteSchema } from './index.js';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';

// scrypt hash for "password123" (compatible with better-auth's credential provider)
const PASSWORD_HASH =
  '9f7a6b3f9e4023628ffff4f93a43bfc6:efe90c4707b2810181301913b73021191e53cae7e51a004fa4c2a3780b281673edc90f007053d60ee3f6dc5f9258787ab4874bb1470936e7ebb3f675cbdd8289';
const NOW = Date.now();

function id(prefix: string): string {
  return `${prefix}_${randomUUID().slice(0, 8)}`;
}

const SEED_WORKFLOWS = [
  {
    name: 'Research & Synthesis',
    description:
      'Takes a research question, searches for information via two specialized agents, then a supervisor synthesizes a final answer with thinking-based reasoning.',
    categorySlug: 'research',
    tags: ['research', 'academic', 'synthesis'],
    featured: true,
    downloads: 142,
    avgRating: 4,
    ratingCount: 18,
    workflowData: {
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
            model: 'qwen-plus',
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
            model: 'qwen-plus',
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
            model: 'qwen3-max',
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
  },
  {
    name: 'Translation & Review Pipeline',
    description:
      'Translates text into a target language, then a supervisor reviews for accuracy, tone, and cultural appropriateness with thinking-based reasoning.',
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
            model: 'qwen-plus',
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
            model: 'qwen3-max',
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
  },
  {
    name: 'Code Quality Audit',
    description:
      'Analyzes code for style issues and security vulnerabilities using parallel agents, then a supervisor produces a consolidated report.',
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
            model: 'qwen-plus',
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
            model: 'qwen-plus',
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
            model: 'qwen3-max',
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
  },
  {
    name: 'Customer Support Escalation',
    description:
      'Triages a customer complaint, dispatches specialized billing and technical agents in parallel, and synthesizes a resolution via a supervisor.',
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
            model: 'qwen3-max',
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
            model: 'qwen-plus',
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
            model: 'qwen-plus',
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
            model: 'qwen-plus',
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
            model: 'qwen3-max',
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
  },
  {
    name: 'Social Media Content Generator',
    description:
      'Generates on-brand social posts from a brief, then a supervisor reviews tone and brand alignment before approval.',
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
              'Draft 3 social media posts (LinkedIn, Twitter, Instagram) based on the brief provided. Each post should be platform-appropriate in length and style.',
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
              'Ensure all posts align with brand voice and guidelines. Flag anything off-tone, inappropriate, or inconsistent with brand messaging. Provide specific revision suggestions if needed.',
            enableThinking: true,
            thinkingBudget: 512,
            outputFormat: 'markdown',
          },
        },
      ],
      edges: [
        {
          id: 'e-ts-cw',
          source: 'node-trigger-soc',
          target: 'node-copywriter',
          sourceHandle: 'source',
          targetHandle: 'target-left',
          type: 'animated',
        },
        {
          id: 'e-cw-br',
          source: 'node-copywriter',
          target: 'node-brand-reviewer',
          sourceHandle: 'source-right',
          targetHandle: 'target-left',
          type: 'animated',
        },
      ],
    },
  },
  {
    name: 'PR Code Review Pipeline',
    description:
      'Reviews pull request code for style issues and security vulnerabilities, then a supervisor produces a consolidated review summary.',
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
          type: 'input_trigger',
          position: { x: 50, y: 200 },
          data: {
            label: 'Review the following pull request diff for quality and security issues...',
            outputFormat: 'text',
          },
        },
        {
          id: 'node-linter',
          type: 'agent',
          position: { x: 300, y: 100 },
          data: {
            label: 'Code Linter',
            model: 'qwen-plus',
            systemPrompt:
              'Review code for style guide violations, formatting issues, anti-patterns, and best practice violations. Be specific about file and line-level issues.',
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
            systemPrompt:
              'Scan code for security vulnerabilities: SQL injection, XSS, CSRF, hardcoded secrets, insecure deserialization, and dependency issues.',
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
              'Combine lint and vulnerability reports into a single PR review. Prioritize issues by severity, deduplicate, and provide actionable feedback. Indicate whether the PR should be approved or changes requested.',
            enableThinking: true,
            thinkingBudget: 1024,
            outputFormat: 'markdown',
          },
        },
      ],
      edges: [
        {
          id: 'e-tcr-la',
          source: 'node-trigger-cr',
          target: 'node-linter',
          sourceHandle: 'source',
          targetHandle: 'target-left',
          type: 'animated',
        },
        {
          id: 'e-tcr-vs',
          source: 'node-trigger-cr',
          target: 'node-vulnerability',
          sourceHandle: 'source',
          targetHandle: 'target-left',
          type: 'animated',
        },
        {
          id: 'e-la-cs',
          source: 'node-linter',
          target: 'node-cr-supervisor',
          sourceHandle: 'source-right',
          targetHandle: 'target-left',
          type: 'animated',
        },
        {
          id: 'e-vs-cs',
          source: 'node-vulnerability',
          target: 'node-cr-supervisor',
          sourceHandle: 'source-right',
          targetHandle: 'target-left',
          type: 'animated',
        },
      ],
    },
  },
  {
    name: 'Data Pipeline Orchestrator',
    description:
      'Extracts data from an API, transforms and normalizes it, then a quality gate supervisor validates before output.',
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
          type: 'input_trigger',
          position: { x: 50, y: 200 },
          data: {
            label:
              'Extract and transform user data from the sales API. Filter for active accounts in Q3.',
            outputFormat: 'text',
          },
        },
        {
          id: 'node-extractor',
          type: 'agent',
          position: { x: 300, y: 200 },
          data: {
            label: 'API Extractor',
            model: 'qwen-plus',
            systemPrompt:
              'Parse the input data request, identify the data source and parameters. Fetch and format the data as structured JSON with proper schema.',
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
              'Clean, normalize, and transform the extracted data. Handle missing values, type conversions, and field mappings. Output valid JSON matching the target schema.',
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
              'Validate the transformed data: check for nulls in required fields, outliers, type mismatches, and schema compliance. If quality fails, reject with specific reasons. If valid, approve the output.',
            enableThinking: true,
            thinkingBudget: 512,
            outputFormat: 'json',
          },
        },
      ],
      edges: [
        {
          id: 'e-tdp-ex',
          source: 'node-trigger-dp',
          target: 'node-extractor',
          sourceHandle: 'source',
          targetHandle: 'target-left',
          type: 'animated',
        },
        {
          id: 'e-ex-tr',
          source: 'node-extractor',
          target: 'node-transformer',
          sourceHandle: 'source-right',
          targetHandle: 'target-left',
          type: 'animated',
        },
        {
          id: 'e-tr-qg',
          source: 'node-transformer',
          target: 'node-quality-gate',
          sourceHandle: 'source-right',
          targetHandle: 'target-left',
          type: 'animated',
        },
      ],
    },
  },
  {
    name: 'Lead Scoring & Routing',
    description:
      'Scores inbound leads based on signals, enriches with company data, and a routing supervisor determines the next action.',
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
          type: 'input_trigger',
          position: { x: 50, y: 200 },
          data: {
            label:
              'New lead: Acme Corp, 500 employees, SaaS industry, visited pricing page 3x this week.',
            outputFormat: 'text',
          },
        },
        {
          id: 'node-scorer',
          type: 'agent',
          position: { x: 300, y: 200 },
          data: {
            label: 'Lead Scorer',
            model: 'qwen-plus',
            systemPrompt:
              'Score the lead based on company size, industry relevance, engagement signals, and fit score. Return a numeric score 0-100 with a brief justification.',
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
              'Enrich the lead with publicly available information: estimated headcount, funding history, technology stack, and recent news mentions.',
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
              'Review the lead score and enriched data. If score > 70 route to sales team with priority. If 40-70 route to nurture campaign. If < 40 archive with a note. Output the routing decision and rationale.',
            enableThinking: true,
            thinkingBudget: 512,
            outputFormat: 'json',
          },
        },
      ],
      edges: [
        {
          id: 'e-tls-sc',
          source: 'node-trigger-ls',
          target: 'node-scorer',
          sourceHandle: 'source',
          targetHandle: 'target-left',
          type: 'animated',
        },
        {
          id: 'e-sc-en',
          source: 'node-scorer',
          target: 'node-enricher',
          sourceHandle: 'source-right',
          targetHandle: 'target-left',
          type: 'animated',
        },
        {
          id: 'e-en-ra',
          source: 'node-enricher',
          target: 'node-routing-agent',
          sourceHandle: 'source-right',
          targetHandle: 'target-left',
          type: 'animated',
        },
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
      'Excellent research workflow. The synthesis supervisor produces great literature reviews.',
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
    review: 'Decent content generator but the brand voice detection could be better.',
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
  console.log('Seeding database...\n');

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
  sqliteDb.delete(s.sqliteCredentials).run();
  sqliteDb.delete(s.sqliteCreditTransactions).run();
  sqliteDb.delete(s.sqliteUserCredits).run();
  sqliteDb.delete(s.sqliteWorkflows).run();
  sqliteDb.delete(s.sqliteMcpServers).run();
  sqliteDb.delete(s.session).run();
  sqliteDb.delete(s.account).run();
  sqliteDb.delete(s.verification).run();
  sqliteDb.delete(s.user).run();

  // Create demo user
  const userId = id('user');
  console.log('  Creating demo user: demo@qwenweaver.dev / password123');
  sqliteDb
    .insert(s.user)
    .values({
      id: userId,
      email: 'demo@qwenweaver.dev',
      name: 'Demo User',
      emailVerified: true,
      createdAt: new Date(NOW),
      updatedAt: new Date(NOW),
    })
    .run();

  // Create email/password account for demo user
  sqliteDb
    .insert(s.account)
    .values({
      id: id('acct'),
      accountId: 'demo@qwenweaver.dev',
      providerId: 'credential',
      userId: userId,
      password: PASSWORD_HASH,
      createdAt: new Date(NOW),
      updatedAt: new Date(NOW),
    })
    .run();

  // Grant demo user 1000 credits
  console.log('  Granting 1000 credits to demo user');
  sqliteDb
    .insert(s.sqliteUserCredits)
    .values({
      userId,
      balance: 1000,
      lifetimeEarned: 1000,
      lifetimeSpent: 0,
      updatedAt: NOW,
    })
    .run();

  // Create categories
  console.log('  Creating ' + CATEGORIES.length + ' categories...');
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
  console.log('  Creating ' + SEED_WORKFLOWS.length + ' templates...');
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
  console.log('  Creating ' + REVIEWS_DATA.length + ' reviews...');
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

  console.log('\nSeed complete!');
  console.log('   User:       demo@qwenweaver.dev / password123');
  console.log('   Categories: ' + CATEGORIES.length);
  console.log('   Templates:  ' + SEED_WORKFLOWS.length);
  console.log('   Reviews:    ' + REVIEWS_DATA.length);
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
