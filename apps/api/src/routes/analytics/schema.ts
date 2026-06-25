import { z } from 'zod';

export const AnalyticsSummarySchema = z.object({
  totalRuns: z.number(),
  completedRuns: z.number(),
  failedRuns: z.number(),
  avgSpeedup: z.number().nullable(),
  totalTokens: z.number(),
  avgLatencyMs: z.number().nullable(),
  runsByModel: z.record(z.string(), z.number()),
  recentRuns: z.array(z.object({
    id: z.string(),
    status: z.string(),
    startedAt: z.string(),
    totalTokens: z.number().optional(),
  })),
});

// Query params for pagination
export const AnalyticsQuerySchema = z.object({
  recentLimit: z.string().optional().default('10'),
});
