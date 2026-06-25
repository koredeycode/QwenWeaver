import { z } from 'zod';

export const authSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const userResponseSchema = z.object({
  token: z.string(),
  user: z.object({ id: z.string(), email: z.string() }),
});

export const errorResponseSchema = z.object({
  error: z.string(),
  details: z.record(z.string(), z.unknown()).optional(),
});
