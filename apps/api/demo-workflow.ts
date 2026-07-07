import { runAgent } from './src/engine/agent-runner.js';
import type { NodePayload, BusMessage } from '@qwenweaver/types';

async function main() {
  const executionId = 'demo-exec-' + Date.now();

  // ── Simulate what the executor does for each node ──
  // These are the same node types that get created when users
  // drag nodes onto the canvas in the React Flow editor.

  const nodes: NodePayload[] = [
    {
      id: 'node-image',
      type: 'trigger',
      position: { x: 0, y: 0 },
      data: {
        label: '[Image Generation] A beautiful sunset over the ocean with dramatic clouds.',
        outputFormat: 'text',
      },
    },
    {
      id: 'node-audio',
      type: 'trigger',
      position: { x: 0, y: 0 },
      data: {
        label: '[Audio Generation] Welcome to QwenWeaver, the future of multi-agent orchestration.',
        outputFormat: 'text',
      },
    },
    {
      id: 'node-video',
      type: 'trigger',
      position: { x: 0, y: 0 },
      data: {
        label: '[Video Generation] QwenWeaver Agent Society platform overview and demo.',
        outputFormat: 'text',
      },
    },
  ];

  console.log('═══════════════════════════════════════════');
  console.log('  QwenWeaver Workflow Execution Demo');
  console.log('  Execution ID:', executionId);
  console.log('═══════════════════════════════════════════');
  console.log('');
  console.log('── Running 3 trigger nodes ──');
  console.log('  (trigger nodes pass their label text through writeBinaryAsset)');
  console.log('');

  const results: { label: string; proxyUrl: string; signedUrl: string }[] = [];

  for (const node of nodes) {
    const result = await runAgent(
      node,
      [] as BusMessage[],
      undefined, // emitter
      executionId,
      undefined, // userId
      undefined, // conversationContext
      undefined, // signal
      undefined, // diag
    );

    const proxyUrl = result.outputs[0].value;
    const label = node.id.replace('node-', '');

    // Get the signed URL to verify access
    const key = decodeURIComponent(proxyUrl.split('key=')[1]);
    const { getStorage } = await import('./src/storage/index.js');
    const signedUrl = await getStorage().getSignedUrl(key);

    results.push({ label, proxyUrl, signedUrl });

    console.log(`  ${label.padEnd(6)} → ${proxyUrl}`);
  }

  console.log('');
  console.log('── Verifying content via signed URLs ──');
  console.log('');

  for (const { label, proxyUrl, signedUrl } of results) {
    const res = await fetch(signedUrl);
    const text = await res.text();
    console.log(
      `  ${label.padEnd(6)} ✓ HTTP ${res.status}, ${text.length}B — "${text.substring(0, 60)}..."`,
    );
  }

  console.log('');
  console.log('── Presigned URLs (valid for 1 hour) ──');
  console.log('');
  for (const { label, signedUrl } of results) {
    console.log(`  ${label}:`);
    console.log(`  ${signedUrl}`);
    console.log('');
  }

  console.log('── Proxy URLs ──');
  console.log('');
  for (const { label, proxyUrl } of results) {
    console.log(`  http://localhost:3001${proxyUrl}`);
  }

  console.log('');
  console.log('Objects remain in OSS bucket (not cleaned up).');
  console.log('Run these commands to verify later:');
  console.log('');
  console.log(`  # List objects from this execution:`);
  console.log(`  curl "http://localhost:3001${results[0].proxyUrl}"`);
  console.log('');
}

main().catch((e) => {
  console.error('Workflow failed:', e.message);
  process.exit(1);
});
