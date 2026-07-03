import type { NodePayload, DebateArenaConfig, BusMessage } from '@qwenweaver/types';
import type { AgentResult, StreamEmitter } from './types.js';
import { getModelForNode, getProvider } from './model-router.js';
import { streamText } from 'ai';
import { createModuleLogger } from '../logger.js';
import type { CopilotDiag } from '../diagnostic-logger.js';
import { agent_duration_ms, llm_tokens_total } from '../metrics.js';
import { writeBinaryAsset } from './file-asset.js';

const log = createModuleLogger('engine/debate-runner');

interface DebateStatement {
  participantId: string;
  participantLabel: string;
  content: string;
  round: number;
}

export async function runDebate(
  arena: NodePayload,
  participantNodes: NodePayload[],
  busMessages: BusMessage[],
  emitter: StreamEmitter,
  executionId: string,
  userId?: string,
  signal?: AbortSignal,
  diag?: CopilotDiag,
): Promise<AgentResult> {
  const startTime = performance.now();
  const config = arena.data.debateArenaConfig;
  const mode = config?.mode ?? 'debate';
  const maxRounds = config?.maxRounds ?? 3;
  const hasArbitrator = config?.hasArbitrator ?? false;
  const outputFormat = config?.outputFormat ?? 'verdict';

  diag?.log(`=== DEBATE ARENA: ${arena.id} ===`);
  diag?.log(`Participants: [${participantNodes.map((n) => n.id).join(', ')}]`);
  diag?.log(`Mode=${mode}, maxRounds=${maxRounds}, hasArbitrator=${hasArbitrator}`);

  log.info(
    {
      arenaId: arena.id,
      mode,
      maxRounds,
      hasArbitrator,
      participantCount: participantNodes.length,
    },
    'Starting debate arena',
  );

  const allStatements: DebateStatement[] = [];
  let totalTokens = 0;

  // Round 1: Opening statements from participant bus messages (their published outputs)
  // Fall back to participant's label or systemPrompt if no upstream output
  const round1Statements: DebateStatement[] = [];
  for (const participant of participantNodes) {
    const participantMsgs = busMessages.filter((m) => m.sourceNodeId === participant.id);
    const lastMsg = participantMsgs[participantMsgs.length - 1];
    const content =
      extractBusPayloadText(lastMsg) ??
      participant.data.systemPrompt ??
      participant.data.label ??
      `${participant.data.label ?? participant.id} has no initial position.`;
    diag?.log(`  Round 1 — ${participant.id}: ${content.substring(0, 100)}...`);
    round1Statements.push({
      participantId: participant.id,
      participantLabel: participant.data.label ?? participant.id,
      content,
      round: 1,
    });
  }
  allStatements.push(...round1Statements);

  await emitter.emit('debate_round', {
    arenaId: arena.id,
    round: 1,
    statements: round1Statements.map((s) => ({
      participantId: s.participantId,
      content: s.content,
    })),
    timestamp: Date.now(),
  });

  log.info(
    { arenaId: arena.id, round: 1, statementCount: round1Statements.length },
    'Debate round 1 complete',
  );
  diag?.log(`Round 1 complete: ${round1Statements.length} statements`);

  // Rounds 2..N: Rebuttals — participants respond to the previous round in parallel
  for (let round = 2; round <= maxRounds; round++) {
    const roundStatements: DebateStatement[] = [];

    const statements = await Promise.all(
      participantNodes.map(async (participant) => {
        const prompt = buildDebatePrompt(participant, allStatements, mode, round, maxRounds);

        try {
          const { model, enableThinking, thinkingBudget } = getModelForNode(participant);
          const providerOptions = enableThinking
            ? {
                alibaba: { enableThinking: true, thinkingBudget: thinkingBudget ?? 4096 } as Record<
                  string,
                  unknown
                >,
              }
            : undefined;

          const result = streamText({
            model,
            system: participant.data.systemPrompt ?? '',
            prompt,
            providerOptions: providerOptions as Record<string, Record<string, any>> | undefined,
          });

          let text = '';
          for await (const chunk of result.textStream) {
            text += chunk;
          }

          const final = await result;
          const usage = await final.usage;
          totalTokens += usage?.totalTokens ?? 0;

          diag?.log(
            `  Round ${round} — ${participant.id}: ${text.substring(0, 100)}... (${usage?.totalTokens}tokens)`,
          );

          log.info(
            { arenaId: arena.id, participantId: participant.id, round, tokens: usage?.totalTokens },
            'Debate round statement generated',
          );

          return {
            participantId: participant.id,
            participantLabel: participant.data.label ?? participant.id,
            content: text,
            round,
          } as DebateStatement;
        } catch (err) {
          log.error(
            {
              arenaId: arena.id,
              participantId: participant.id,
              round,
              error: (err as Error).message,
            },
            'Failed to generate debate statement',
          );
          return {
            participantId: participant.id,
            participantLabel: participant.data.label ?? participant.id,
            content: `[Error generating response: ${(err as Error).message}]`,
            round,
          } as DebateStatement;
        }
      }),
    );

    roundStatements.push(...statements);

    allStatements.push(...roundStatements);

    await emitter.emit('debate_round', {
      arenaId: arena.id,
      round,
      statements: roundStatements.map((s) => ({
        participantId: s.participantId,
        content: s.content,
      })),
      timestamp: Date.now(),
    });

    log.info(
      { arenaId: arena.id, round, statementCount: roundStatements.length },
      'Debate round complete',
    );
    diag?.log(
      `Round ${round} complete: ${roundStatements.length} statements, totalTokens=${totalTokens}`,
    );
  }

  // Arbitration
  let verdict = '';
  let scores: Record<string, number> | undefined;

  if (hasArbitrator) {
    const arbitratorModelId = config?.arbitratorModel ?? 'qwen3.7-max';
    diag?.log(
      `ARBITRATOR: model=${arbitratorModelId}, scoring=${config?.scoringCriteria || 'none'}`,
    );
    const provider = getProvider();
    const model = provider(arbitratorModelId);
    const transcript = formatTranscript(allStatements);
    const scoringCriteriaVal = config?.scoringCriteria;
    const scoringPrompt = scoringCriteriaVal
      ? `\n\nScoring criteria: ${scoringCriteriaVal}\nEvaluate each participant against these criteria and provide a score for each.`
      : '';

    try {
      const result = streamText({
        model,
        system:
          'You are an impartial arbitrator. Analyze the debate transcript and provide a verdict.',
        prompt: `Debate transcript:\n\n${transcript}\n\nProvide your verdict.${scoringPrompt}`,
      });

      for await (const chunk of result.textStream) {
        verdict += chunk;
      }

      const final = await result;
      const usage = await final.usage;
      totalTokens += usage?.totalTokens ?? 0;
      diag?.log(
        `Arbitrator verdict: ${verdict.substring(0, 200)}... (${usage?.totalTokens}tokens)`,
      );

      scores = extractScores(verdict, participantNodes);
      if (scores) {
        diag?.logJson('Arbitrator scores', scores);
      }
    } catch (err) {
      const msg = (err as Error).message;
      log.error({ arenaId: arena.id, error: msg }, 'Arbitration failed');
      diag?.log(`ARBITRATOR ERROR: ${msg}`);
      verdict = `[Arbitration error: ${msg}]`;
    }
  }

  await emitter.emit('debate_verdict', {
    arenaId: arena.id,
    verdict: verdict || 'No arbitrator configured.',
    scores,
    timestamp: Date.now(),
  });

  // Build output
  const resultText = buildDebateOutput(allStatements, verdict, scores, outputFormat);
  const durationMs = Math.round(performance.now() - startTime);

  const ext = 'txt';
  const contentType = 'text/plain';
  const textBuffer = Buffer.from(resultText, 'utf-8');
  const fileUrl = await writeBinaryAsset(executionId, arena.id, ext, textBuffer);

  const modelIdString = config?.arbitratorModel ?? 'debate_arena';
  llm_tokens_total.labels(modelIdString, 'debate_arena').inc(totalTokens);
  agent_duration_ms.labels('debate_arena').observe(durationMs);

  return {
    nodeId: arena.id,
    outputs: [{ type: 'text', contentType, value: fileUrl }],
    text: resultText,
    tokensUsed: totalTokens,
    durationMs,
    status: 'completed',
  };
}

function buildDebatePrompt(
  participant: NodePayload,
  allStatements: DebateStatement[],
  mode: string,
  currentRound: number,
  maxRounds: number,
): string {
  const history = allStatements
    .map((s) => `[${s.participantLabel}] (round ${s.round}):\n${s.content}`)
    .join('\n\n---\n\n');

  const isFinal = currentRound >= maxRounds;

  const modeInstructions: Record<string, string> = {
    debate: 'Argue your position persuasively. Address counterpoints from other participants.',
    negotiation: 'Find common ground and propose compromises. Focus on areas of agreement.',
    consensus:
      'Work toward a unified conclusion. Identify where disagreements remain and suggest resolutions.',
  };

  return `You are participating in a ${mode} on a ${mode} arena (round ${currentRound}/${maxRounds}).

## Discussion history:
${history}

## Instructions:
- ${modeInstructions[mode] ?? modeInstructions.debate}
${isFinal ? '\n- This is the FINAL round. Provide your conclusive position.' : '\n- Continue the discussion constructively.'}
- Respond directly and concisely.`;
}

function formatTranscript(statements: DebateStatement[]): string {
  return statements
    .map((s) => `[Round ${s.round}] ${s.participantLabel}:\n${s.content}\n`)
    .join('\n');
}

function extractBusPayloadText(msg?: BusMessage): string | undefined {
  if (!msg) return undefined;
  if (typeof msg.payload === 'string') return msg.payload;
  if (msg.payload && typeof msg.payload === 'object') {
    const p = msg.payload as Record<string, unknown>;
    return (p.text as string) ?? (p.value as string) ?? JSON.stringify(msg.payload);
  }
  return String(msg.payload ?? '');
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractScores(
  verdict: string,
  participantNodes: NodePayload[],
): Record<string, number> | undefined {
  const scores: Record<string, number> = {};
  for (const node of participantNodes) {
    const label = escapeRegex(node.data.label ?? node.id);
    const regex = new RegExp(`${label}[\\s\\S]{0,50}?(\\d+(?:\\.\\d+)?)\\s*\\/?\\s*\\d*`, 'i');
    const match = verdict.match(regex);
    if (match) {
      scores[node.id] = parseFloat(match[1]);
    }
  }
  return Object.keys(scores).length > 0 ? scores : undefined;
}

function buildDebateOutput(
  statements: DebateStatement[],
  verdict: string,
  scores: Record<string, number> | undefined,
  outputFormat: string,
): string {
  const transcript = formatTranscript(statements);

  switch (outputFormat) {
    case 'transcript':
      return transcript;
    case 'score': {
      const scoreLines = scores
        ? Object.entries(scores)
            .map(([id, score]) => `${id}: ${score}`)
            .join('\n')
        : 'No scores available.';
      return scoreLines;
    }
    case 'verdict':
    default:
      return `## Debate Transcript\n\n${transcript}\n\n## Verdict\n\n${verdict}\n\n${
        scores
          ? `## Scores\n${Object.entries(scores)
              .map(([id, s]) => `- ${id}: ${s}/10`)
              .join('\n')}`
          : ''
      }`;
  }
}
