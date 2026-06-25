import { z } from 'zod';

export const TemplateListQuery = z.object({
  categoryId: z.string().optional(),
  featured: z.enum(['true', 'false']).optional(),
  search: z.string().optional(),
  limit: z.string().optional(),
  offset: z.string().optional(),
});

export const TemplateParams = z.object({
  id: z.string(),
});

export const CreateTemplateBody = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  workflowData: z.unknown(),
  categoryId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  thumbnail: z.string().optional(),
});

export const RateTemplateBody = z.object({
  rating: z.number().min(1).max(5),
  review: z.string().optional(),
});
