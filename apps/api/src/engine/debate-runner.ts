import type { NodePayload, DebateArenaConfig } from '@qwenweaver/types';
import type { AgentResult, StreamEmitter, UpstreamOutputs } from './types.js';
import { getModelForNode, getProvider } from './model-router.js';
import { streamText } from 'ai';
import { createModuleLogger } from '../logger.js';
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
  upstreamOutputs: UpstreamOutputs,
  emitter: StreamEmitter,
  executionId: string,
  userId?: string,
  signal?: AbortSignal,
): Promise<AgentResult> {
  const startTime = performance.now();
  const config = arena.data.debateArenaConfig;
  const mode = config?.mode ?? 'debate';
  const maxRounds = config?.maxRounds ?? 3;
  const hasArbitrator = config?.hasArbitrator ?? false;
  const outputFormat = config?.outputFormat ?? 'verdict';

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

  // Round 1: Opening statements from participant upstream outputs
  // Fall back to participant's label or systemPrompt if no upstream output
  const round1Statements: DebateStatement[] = [];
  for (const participant of participantNodes) {
    const output = upstreamOutputs.get(participant.id);
    const content =
      output?.text ??
      participant.data.systemPrompt ??
      participant.data.label ??
      `${participant.data.label ?? participant.id} has no initial position.`;
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

  // Rounds 2..N: Rebuttals — each participant responds to the previous round
  for (let round = 2; round <= maxRounds; round++) {
    const roundStatements: DebateStatement[] = [];

    for (const participant of participantNodes) {
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

        roundStatements.push({
          participantId: participant.id,
          participantLabel: participant.data.label ?? participant.id,
          content: text,
          round,
        });

        log.info(
          { arenaId: arena.id, participantId: participant.id, round, tokens: usage?.totalTokens },
          'Debate round statement generated',
        );
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
        roundStatements.push({
          participantId: participant.id,
          participantLabel: participant.data.label ?? participant.id,
          content: `[Error generating response: ${(err as Error).message}]`,
          round,
        });
      }
    }

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
  }

  // Arbitration
  let verdict = '';
  let scores: Record<string, number> | undefined;

  if (hasArbitrator) {
    const arbitratorModelId = config?.arbitratorModel ?? 'qwen3.7-max';
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

      scores = extractScores(verdict, participantNodes);
    } catch (err) {
      log.error({ arenaId: arena.id, error: (err as Error).message }, 'Arbitration failed');
      verdict = `[Arbitration error: ${(err as Error).message}]`;
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
