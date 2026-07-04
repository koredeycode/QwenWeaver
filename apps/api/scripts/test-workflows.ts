/**
 * End-to-end test script for QwenWeaver complex workflows.
 *
 * Usage: NODE_TLS_REJECT_UNAUTHORIZED=0 tsx scripts/test-workflows.ts
 *
 * Makes real API calls to the running dev server on port 3001.
 * Requires a valid session cookie in /tmp/cookies.txt (run signin first).
 */

const API = 'http://localhost:3001';

interface ExecResponse {
  executionId: string;
  workflowId: string;
  status: string;
}

interface ExecStatus {
  status: string;
  error?: string;
  metrics?: Record<string, unknown>;
}

async function signin(): Promise<string> {
  console.log('\n=== Signing in ===');
  const res = await fetch(`${API}/api/auth/sign-in/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:5173' },
    body: JSON.stringify({ email: 'test-workflow@qwenweaver.dev', password: 'TestPass123!' }),
    redirect: 'manual',
  });
  const setCookie = res.headers.get('set-cookie');
  if (!setCookie) throw new Error('No set-cookie header in signin response');
  // Extract just the name=value part before the first semicolon
  const cookieValue = setCookie.split(';')[0];
  console.log(`  Cookie acquired: ${cookieValue.slice(0, 40)}...`);
  return cookieValue;
}

async function apiPost(path: string, body: unknown, cookie: string) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'http://localhost:5173',
      Cookie: cookie,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  try {
    return { status: res.status, data: JSON.parse(text) as Record<string, unknown> };
  } catch {
    return { status: res.status, data: text };
  }
}

async function apiGet(path: string, cookie: string) {
  const res = await fetch(`${API}${path}`, {
    headers: { Cookie: cookie, Origin: 'http://localhost:5173' },
  });
  const text = await res.text();
  try {
    return { status: res.status, data: JSON.parse(text) as Record<string, unknown> };
  } catch {
    return { status: res.status, data: text };
  }
}

async function pollExecution(
  executionId: string,
  cookie: string,
  maxWaitMs = 600000,
): Promise<ExecStatus> {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const { data } = await apiGet(`/api/execution/${executionId}`, cookie);
    const d = data as ExecStatus;
    if (d.status === 'completed' || d.status === 'failed') return d;
    const elapsed = Math.round((Date.now() - start) / 1000);
    process.stdout.write(`  \r  Waiting... ${elapsed}s (status: ${d.status || 'unknown'})`);
    await new Promise((r) => setTimeout(r, 5000));
  }
  process.stdout.write('\n');
  return { status: 'timeout', error: 'Timed out waiting for execution' };
}

async function checkDb(executionId: string) {
  console.log(`\n  [DB] Checking persistence for execution ${executionId.slice(0, 8)}...`);
  const { execSync } = await import('child_process');
  const db = '/home/yusufakoredey/QwenWeaver/apps/api/data/dev.db';

  try {
    const exec = execSync(
      `sqlite3 "${db}" "SELECT id, status, started_at, completed_at FROM executions WHERE id='${executionId}'"`,
      { encoding: 'utf-8' },
    );
    console.log(`  [DB] executions: ${exec.trim() || '(not found)'}`);
  } catch {
    /* ignore */
  }

  try {
    const logs = execSync(
      `sqlite3 "${db}" "SELECT node_id, status, tokens_used FROM agent_logs WHERE execution_id='${executionId}'"`,
      { encoding: 'utf-8' },
    );
    console.log(`  [DB] agent_logs: ${logs.trim() || '(none)'}`);
  } catch {
    /* ignore */
  }

  try {
    const msgs = execSync(
      `sqlite3 "${db}" "SELECT COUNT(*) as cnt FROM execution_messages WHERE execution_id='${executionId}'"`,
      { encoding: 'utf-8' },
    );
    console.log(`  [DB] execution_messages: ${msgs.trim()}`);
  } catch {
    /* ignore */
  }
}

function summarize(name: string, result: ExecStatus, durationMs: number) {
  const status =
    result.status === 'completed' ? '✓ PASS' : result.status === 'failed' ? '✗ FAIL' : '⚠ TIMEOUT';
  const duration = (durationMs / 1000).toFixed(1);
  const metrics = result.metrics ? `, tokens: ${JSON.stringify(result.metrics)}` : '';
  return `  ${status} | ${name.padEnd(30)} | ${duration}s${metrics}`;
}

// ─── Workflow Definitions ──────────────────────────────────────

interface WorkflowDef {
  id: string;
  name: string;
  description: string;
  nodes: Array<{
    id: string;
    type: string;
    position: { x: number; y: number };
    data: Record<string, unknown>;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    sourceHandle?: string;
    targetHandle?: string;
    type?: string;
  }>;
}

const WORKFLOWS: WorkflowDef[] = [
  // 1. SIMPLE SMOKE TEST
  {
    id: 'smoke-test',
    name: 'Smoke Test - Single Agent',
    description: 'Minimal workflow to verify engine, message bus, and prompt builder work.',
    nodes: [
      {
        id: 'node-smoke-trigger',
        type: 'input_trigger',
        position: { x: 50, y: 200 },
        data: {
          label: 'Say "Hello from QwenWeaver smoke test" and nothing else.',
          outputFormat: 'text',
        },
      },
      {
        id: 'node-smoke-agent',
        type: 'agent',
        position: { x: 350, y: 200 },
        data: {
          label: 'Smoke Agent',
          model: 'qwen3.7-plus',
          systemPrompt: 'You are a helpful assistant. Respond concisely.',
          outputFormat: 'text',
        },
      },
    ],
    edges: [
      {
        id: 'e-smoke',
        source: 'node-smoke-trigger',
        target: 'node-smoke-agent',
        sourceHandle: 'source',
        targetHandle: 'target-left',
        type: 'animated',
      },
    ],
  },

  // 2. DEBATE ARENA
  {
    id: 'multi-agent-debate',
    name: 'Multi-Agent Debate Arena',
    description: 'Pits two AI agents in a structured debate with an impartial arbitrator.',
    nodes: [
      {
        id: 'node-trigger-debate',
        type: 'input_trigger',
        position: { x: 50, y: 250 },
        data: {
          label:
            'Debate topic: "Should artificial intelligence development be paused until comprehensive safety frameworks are established?" Limit each side to 1 paragraph.',
          outputFormat: 'text',
        },
      },
      {
        id: 'node-debate-affirmative',
        type: 'agent',
        position: { x: 350, y: 100 },
        data: {
          label: 'Affirmative — Safety First',
          model: 'qwen3.7-plus',
          systemPrompt:
            'You argue FOR the proposition. Present 1-2 strong arguments about AI safety risks and the need for regulatory frameworks.',
          outputFormat: 'markdown',
        },
      },
      {
        id: 'node-debate-negative',
        type: 'agent',
        position: { x: 350, y: 400 },
        data: {
          label: 'Negative — Progress Must Continue',
          model: 'qwen3.7-plus',
          systemPrompt:
            'You argue AGAINST the proposition. Present 1-2 compelling arguments about lost opportunities and why existing safeguards are sufficient.',
          outputFormat: 'markdown',
        },
      },
      {
        id: 'node-debate-arena',
        type: 'debate_arena',
        position: { x: 700, y: 250 },
        data: {
          label: 'Debate Arena',
          outputFormat: 'verdict',
          debateArenaConfig: {
            mode: 'debate',
            maxRounds: 2,
            hasArbitrator: true,
            arbitratorModel: 'qwen-max',
            scoringCriteria: 'argument_strength, clarity',
            outputFormat: 'verdict',
          },
        },
      },
    ],
    edges: [
      {
        id: 'e-td-da',
        source: 'node-trigger-debate',
        target: 'node-debate-affirmative',
        sourceHandle: 'source',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-td-dn',
        source: 'node-trigger-debate',
        target: 'node-debate-negative',
        sourceHandle: 'source',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-da-arena',
        source: 'node-debate-affirmative',
        target: 'node-debate-arena',
        sourceHandle: 'source-right',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-dn-arena',
        source: 'node-debate-negative',
        target: 'node-debate-arena',
        sourceHandle: 'source-right',
        targetHandle: 'target-left',
        type: 'animated',
      },
    ],
  },

  // 3. SUPERVISOR FEEDBACK LOOP
  {
    id: 'supervisor-feedback-loop',
    name: 'Supervisor Feedback Loop',
    description:
      'Supervisor assigns tasks to sub-agents, reviews, and requests revisions via [REJECT].',
    nodes: [
      {
        id: 'node-trigger-loop',
        type: 'input_trigger',
        position: { x: 50, y: 250 },
        data: {
          label:
            'Task: Write a 1-paragraph product description for "QuantumShield" — enterprise quantum-safe encryption. Keep it short.',
          outputFormat: 'text',
        },
      },
      {
        id: 'node-agent-tech',
        type: 'agent',
        position: { x: 350, y: 100 },
        data: {
          label: 'Technical Writer',
          model: 'qwen3.7-plus',
          systemPrompt:
            'Write a technically accurate 1-paragraph product description focusing on cryptographic algorithms and compliance.',
          outputFormat: 'markdown',
        },
      },
      {
        id: 'node-agent-benefits',
        type: 'agent',
        position: { x: 350, y: 400 },
        data: {
          label: 'Benefits Writer',
          model: 'qwen3.7-plus',
          systemPrompt:
            'Write a 1-paragraph business benefits description focusing on risk reduction and ROI.',
          outputFormat: 'markdown',
        },
      },
      {
        id: 'node-supervisor-refiner',
        type: 'supervisor',
        position: { x: 700, y: 250 },
        data: {
          label: 'Quality Supervisor',
          model: 'qwen-max',
          systemPrompt:
            'Review the combined product description. If it needs improvement, respond with [REJECT] followed by feedback. Only respond with [APPROVE] when it is production-ready.',
          enableThinking: true,
          thinkingBudget: 512,
          outputFormat: 'markdown',
        },
      },
    ],
    edges: [
      {
        id: 'e-tl-ta',
        source: 'node-trigger-loop',
        target: 'node-agent-tech',
        sourceHandle: 'source',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-tl-tb',
        source: 'node-trigger-loop',
        target: 'node-agent-benefits',
        sourceHandle: 'source',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-ta-sr',
        source: 'node-agent-tech',
        target: 'node-supervisor-refiner',
        sourceHandle: 'source-right',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-tb-sr',
        source: 'node-agent-benefits',
        target: 'node-supervisor-refiner',
        sourceHandle: 'source-right',
        targetHandle: 'target-left',
        type: 'animated',
      },
    ],
  },

  // 4. DYNAMIC MEDIA PIPELINE
  {
    id: 'dynamic-media-pipeline',
    name: 'Dynamic Media Pipeline',
    description:
      'Copywriter generates description → image + TTS generation from that text. Tests busMessages as dynamic prompts.',
    nodes: [
      {
        id: 'node-trigger-media',
        type: 'input_trigger',
        position: { x: 50, y: 200 },
        data: {
          label:
            'Describe "AIrHome" — a futuristic smart home hub with holographic display. 1 sentence only.',
          outputFormat: 'text',
        },
      },
      {
        id: 'node-media-copywriter',
        type: 'agent',
        position: { x: 350, y: 100 },
        data: {
          label: 'Creative Copywriter',
          model: 'qwen3.7-plus',
          systemPrompt:
            'Write ONE vivid sentence describing a futuristic smart home product called AIrHome. Use visual details.',
          outputFormat: 'markdown',
        },
      },
      {
        id: 'node-media-image',
        type: 'agent',
        position: { x: 700, y: 50 },
        data: {
          label: 'Image Generator',
          model: 'qwen-image-2.0-pro',
          systemPrompt:
            'Use the upstream product description as your prompt to generate the product image.',
          outputFormat: 'image',
        },
      },
      {
        id: 'node-media-tts',
        type: 'agent',
        position: { x: 700, y: 200 },
        data: {
          label: 'Voice Narration',
          model: 'qwen3-tts-flash',
          systemPrompt: 'Read the product description aloud in a warm, inviting tone.',
          outputFormat: 'audio',
        },
      },
    ],
    edges: [
      {
        id: 'e-tm-mc',
        source: 'node-trigger-media',
        target: 'node-media-copywriter',
        sourceHandle: 'source',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-mc-mi',
        source: 'node-media-copywriter',
        target: 'node-media-image',
        sourceHandle: 'source-right',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-mc-mt',
        source: 'node-media-copywriter',
        target: 'node-media-tts',
        sourceHandle: 'source-right',
        targetHandle: 'target-left',
        type: 'animated',
      },
    ],
  },

  // 5. WORKSPACE COLLABORATION
  {
    id: 'workspace-collaboration',
    name: 'Workspace Blackboard Collaboration',
    description:
      'Research agent writes findings → data analyst reads & augments → report writer compiles via workspace tools.',
    nodes: [
      {
        id: 'node-trigger-ws',
        type: 'input_trigger',
        position: { x: 50, y: 200 },
        data: {
          label:
            'Research topic: "The economic impact of remote work on urban real estate." Keep it brief — 1 paragraph each.',
          outputFormat: 'text',
        },
      },
      {
        id: 'node-ws-researcher',
        type: 'agent',
        position: { x: 350, y: 100 },
        data: {
          label: 'Research Analyst',
          model: 'qwen3.7-plus',
          systemPrompt:
            'Research the topic briefly. Include key trends and statistics. Your findings will be automatically passed to downstream agents.',
          outputFormat: 'markdown',
        },
      },
      {
        id: 'node-ws-analyst',
        type: 'agent',
        position: { x: 350, y: 300 },
        data: {
          label: 'Data Analyst',
          model: 'qwen3.7-plus',
          systemPrompt:
            'Read the upstream research findings provided in the context. Analyze them and write your analysis with specific insights. Your analysis will be automatically passed to the downstream report writer.',
          outputFormat: 'markdown',
        },
      },
      {
        id: 'node-ws-writer',
        type: 'supervisor',
        position: { x: 700, y: 200 },
        data: {
          label: 'Report Compiler',
          model: 'qwen-max',
          systemPrompt:
            'Read both upstream outputs (research findings and data analysis) from the context. Compile a brief final report with executive summary and recommendations.',
          enableThinking: true,
          thinkingBudget: 512,
          outputFormat: 'markdown',
        },
      },
    ],
    edges: [
      {
        id: 'e-tw-tr',
        source: 'node-trigger-ws',
        target: 'node-ws-researcher',
        sourceHandle: 'source',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-tw-ta',
        source: 'node-trigger-ws',
        target: 'node-ws-analyst',
        sourceHandle: 'source',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-tr-tw',
        source: 'node-ws-researcher',
        target: 'node-ws-writer',
        sourceHandle: 'source',
        targetHandle: 'target-left',
        type: 'animated',
      },
      {
        id: 'e-ta-tw',
        source: 'node-ws-analyst',
        target: 'node-ws-writer',
        sourceHandle: 'source',
        targetHandle: 'target-left',
        type: 'animated',
      },
    ],
  },
];

// ─── Main ──────────────────────────────────────────────────────

async function main() {
  console.log('QwenWeaver Workflow Test Suite');
  console.log('='.repeat(60));

  const cookie = await signin();
  console.log('  Cookie acquired');

  // Verify auth
  const creditsCheck = await apiGet('/api/credits', cookie);
  console.log(`  Credits: ${JSON.stringify(creditsCheck.data)}\n`);

  const results: Array<{ name: string; status: string; duration: number; executionId: string }> =
    [];

  for (const wf of WORKFLOWS) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`[${wf.id}] ${wf.name}`);
    console.log(`${'─'.repeat(60)}`);
    console.log(`  Nodes: ${wf.nodes.length}, Edges: ${wf.edges.length}`);

    const startTime = Date.now();

    // Execute
    const execRes = await apiPost(
      '/api/workflow/execute',
      {
        name: wf.name,
        description: wf.description,
        nodes: wf.nodes,
        edges: wf.edges,
      },
      cookie,
    );

    if (execRes.status !== 201) {
      console.error(`  ✗ Execute failed (${execRes.status}): ${JSON.stringify(execRes.data)}`);
      results.push({
        name: wf.name,
        status: 'execute_failed',
        duration: Date.now() - startTime,
        executionId: '',
      });
      continue;
    }

    const { executionId } = execRes.data as ExecResponse;
    console.log(`  ✓ Execution ID: ${executionId}`);

    // Poll
    console.log(`  Polling...`);
    const result = await pollExecution(executionId, cookie);
    process.stdout.write('\n');

    const durationMs = Date.now() - startTime;
    console.log(summarize(wf.name, result, durationMs));

    // Check DB
    await checkDb(executionId);

    results.push({
      name: wf.name,
      status: result.status,
      duration: durationMs,
      executionId,
    });
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('RESULTS SUMMARY');
  console.log('='.repeat(60));
  for (const r of results) {
    const icon = r.status === 'completed' ? '✓' : r.status === 'execute_failed' ? '✗' : '⚠';
    console.log(
      `  ${icon} ${r.name.padEnd(35)} ${(r.duration / 1000).toFixed(1)}s  [${r.executionId.slice(0, 8)}]`,
    );
  }
  console.log('='.repeat(60));
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
