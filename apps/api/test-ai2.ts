import { streamText } from 'ai';
async function test() {
  const result = streamText({} as any);
  for await (const part of result.fullStream) {
    if (part.type === 'reasoning-delta') {
      console.log(part.textDelta);
    }
  }
}
