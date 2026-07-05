/**
 * Script to generate AI fallback thumbnails for the template gallery.
 * Run: pnpm --filter @qwenweaver/api tsx src/scripts/generate-thumbnails.ts
 */
import { generateWanxImage } from '../engine/generators/wanx-image.js';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const API_KEY: string = process.env.DASHSCOPE_API_KEY ?? '';
if (!API_KEY) {
  console.error('DASHSCOPE_API_KEY is required');
  process.exit(1);
}

const OUT = '/tmp/opencode/thumbnails';
mkdirSync(OUT, { recursive: true });

const prompts = [
  {
    name: 'agent-network',
    prompt:
      'Abstract visualization of connected AI agents as glowing orange and blue nodes on a dark network graph, futuristic tech style, clean minimal design, no text, 1024x1024',
  },
  {
    name: 'workflow-flow',
    prompt:
      'Abstract flow diagram with connected orange nodes and lines representing an automated data pipeline, dark background with glowing connections, clean modern tech illustration, no text, 1024x1024',
  },
  {
    name: 'ai-brain',
    prompt:
      'Abstract geometric shape with neural network connections, glowing orange center on dark background, futuristic AI concept art, clean minimal design, no text, 1024x1024',
  },
  {
    name: 'orchestration',
    prompt:
      'Multiple interconnected glowing spheres representing AI agents collaborating, dark space-like background with orange and blue accent lights, clean abstract tech art, no text, 1024x1024',
  },
  {
    name: 'circuit',
    prompt:
      'Abstract circuit board pattern with glowing orange traces and blue nodes, dark background, clean tech illustration representing AI workflow automation, no text, 1024x1024',
  },
  {
    name: 'data-flow',
    prompt:
      'Abstract glowing data streams flowing between geometric nodes, dark blue background with orange energy lines, minimal futuristic tech art representing data pipeline, no text, 1024x1024',
  },
];

async function main() {
  for (const { name, prompt } of prompts) {
    console.log(`Generating "${name}"...`);
    try {
      const buffer = await generateWanxImage(prompt, API_KEY);
      const outPath = resolve(OUT, `${name}.png`);
      writeFileSync(outPath, buffer);
      console.log(`  ✓ Saved ${outPath} (${(buffer.length / 1024).toFixed(0)} KB)`);
    } catch (err) {
      console.error(`  ✗ Failed: ${err}`);
    }
  }
  console.log('\nDone!');
}

main().catch(console.error);
