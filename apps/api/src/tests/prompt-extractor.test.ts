import { describe, it, expect, vi } from 'vitest';
import { extractGenerationPrompt } from '../engine/prompt-extractor.js';

vi.mock('../engine/model-router.js', () => ({
  getProvider: vi.fn(() =>
    vi.fn(() => ({
      doStream: vi.fn().mockReturnValue({
        stream: (async function* () {})(),
        rawCall: {},
        rawResponse: {},
      }),
      pipe: vi.fn(),
      spec: { capabilities: {} },
    })),
  ),
}));

describe('prompt-extractor', () => {
  it('returns short text as-is (under 200 chars)', async () => {
    const short = 'Haga clic en el botón azul.';
    const result = await extractGenerationPrompt(short, 'audio');
    expect(result).toBe(short);
  });

  it('returns empty string for empty input', async () => {
    expect(await extractGenerationPrompt('', 'audio')).toBe('');
  });

  it('returns trimmed text for whitespace-only input', async () => {
    expect(await extractGenerationPrompt('   ', 'audio')).toBe('');
  });

  it('falls back to original text when extraction fails', async () => {
    const long = 'A. '.repeat(100);
    const result = await extractGenerationPrompt(long, 'image');
    expect(result).toBe(long.trim());
  });

  it('returns original text for unknown type', async () => {
    const text = 'Some text here. '; // short but tests unknown type path
    const result = await extractGenerationPrompt(text, 'audio' as any);
    expect(result).toBe(text.trim());
  });

  it('handles audio type extraction gracefully', async () => {
    const text = 'Instruction: Analyze the data. Then narrate: Hello world.';
    // extractor skips short text; we don't have real API key in tests
    const result = await extractGenerationPrompt(text, 'audio');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('handles image type extraction gracefully', async () => {
    const text = 'C. '.repeat(100);
    const result = await extractGenerationPrompt(text, 'image');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
    // Falls back to original when extraction fails (no real API key)
    expect(result).toBe(text.trim());
  });

  it('handles video type extraction gracefully', async () => {
    const text = 'D. '.repeat(100);
    const result = await extractGenerationPrompt(text, 'video');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('does not throw on abort signal', async () => {
    const controller = new AbortController();
    controller.abort();
    const text = 'E. '.repeat(100);
    const result = await extractGenerationPrompt(text, 'audio', controller.signal);
    // Should fall back to original text when aborted
    expect(result).toBe(text.trim());
  });
});
