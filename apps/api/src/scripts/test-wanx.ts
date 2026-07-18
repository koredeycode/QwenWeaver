import { generateWanxImage } from '../engine/generators/wanx-image.js';

const apiKey = process.env.DASHSCOPE_API_KEY;
if (!apiKey) {
  console.log('FAILED: DASHSCOPE_API_KEY not set');
  process.exit(1);
}

console.log('Calling Wanx image generator...');
const start = Date.now();
try {
  const buf = await generateWanxImage('a cute red cat driving a car, digital art', apiKey);
  console.log('SUCCESS:', buf.length, 'bytes in', Date.now() - start, 'ms');
} catch (e: any) {
  console.log('FAILED after', Date.now() - start, 'ms:', e.message);
}
