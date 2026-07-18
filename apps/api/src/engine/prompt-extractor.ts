import { streamText } from 'ai';
import { getProvider } from './model-router.js';
import { createModuleLogger } from '../logger.js';

const log = createModuleLogger('engine/prompt-extractor');

const EXTRACTION_SYSTEM_PROMPTS: Record<string, string> = {
  audio:
    'Extract only the text that should be spoken aloud. Remove any instructions, labels, formatting, meta-commentary, structural elements (headings, lists), or analysis. Return ONLY the raw narration text — nothing else, no prefixes, no explanations.',
  image:
    'Extract only the visual scene description to use as an image generation prompt. Remove any analysis, instructions, opinions, structural elements, or meta-commentary. Return ONLY a concise visual description suitable for a text-to-image model — nothing else, no prefixes, no explanations.',
  video:
    'Extract only the scene and motion description to use as a video generation prompt. Remove any analysis, instructions, opinions, structural elements, or meta-commentary. Return ONLY a concise visual/motion description suitable for a text-to-video model — nothing else, no prefixes, no explanations.',
};

const SHORT_TEXT_THRESHOLD = 200;
const EXTRACTION_MODEL = 'qwen3.6-flash';
const EXTRACTION_TIMEOUT_MS = 3000;

export async function extractGenerationPrompt(
  text: string,
  type: 'audio' | 'image' | 'video',
  abortSignal?: AbortSignal,
): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  const threshold = type === 'audio' ? 3 : SHORT_TEXT_THRESHOLD;
  if (trimmed.length < threshold) return trimmed;

  const systemPrompt = EXTRACTION_SYSTEM_PROMPTS[type];
  if (!systemPrompt) return trimmed;

  // Build a race-capable abort controller with the global timeout
  const timeoutController = new AbortController();
  const timeout = setTimeout(
    () => timeoutController.abort(new DOMException('Extraction timed out', 'TimeoutError')),
    EXTRACTION_TIMEOUT_MS,
  );

  const combinedSignal = combineAbortSignals(abortSignal, timeoutController.signal);

  try {
    const provider = getProvider();
    const model = provider(EXTRACTION_MODEL);

    const result = streamText({
      model,
      system: systemPrompt,
      prompt: `Raw input:\n${trimmed}`,
      maxOutputTokens: 512,
      abortSignal: combinedSignal,
    });

    const extracted = await result.text;
    const cleaned = extracted.trim();
    if (!cleaned) return trimmed;

    log.debug(
      { type, originalLength: trimmed.length, extractedLength: cleaned.length },
      'Prompt extraction done',
    );

    return cleaned;
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.includes('timeout') || msg.includes('Timeout')) {
      log.warn({ type, length: trimmed.length }, 'Extraction timed out, using original text');
    } else {
      log.warn({ type, error: msg }, 'Extraction failed, using original text');
    }
    return trimmed;
  } finally {
    clearTimeout(timeout);
  }
}

function combineAbortSignals(...signals: (AbortSignal | undefined)[]): AbortSignal | undefined {
  const valid = signals.filter((s): s is AbortSignal => s !== undefined);
  if (valid.length === 0) return undefined;
  if (valid.length === 1) return valid[0];

  const controller = new AbortController();
  for (const signal of valid) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      return controller.signal;
    }
    signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true });
  }
  return controller.signal;
}
