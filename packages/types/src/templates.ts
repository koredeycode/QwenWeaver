import { z } from 'zod';
import { WorkflowPayload } from './graph.js';

export const TemplateCategory = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  icon: z.string().optional(),
  sortOrder: z.number().optional(),
});
export type TemplateCategory = z.infer<typeof TemplateCategory>;

export const TemplateReview = z.object({
  id: z.string(),
  templateId: z.string(),
  userId: z.string(),
  userName: z.string().optional(),
  rating: z.number().min(1).max(5),
  review: z.string().optional(),
  createdAt: z.string(),
});
export type TemplateReview = z.infer<typeof TemplateReview>;

export const Template = z.object({
  id: z.string(),
  name: z.string().max(200),
  description: z.string().optional(),
  workflowData: WorkflowPayload,
  categoryId: z.string().optional(),
  category: TemplateCategory.optional(),
  tags: z.array(z.string()).optional(),
  authorId: z.string(),
  authorName: z.string().optional(),
  thumbnail: z.string().optional(),
  downloads: z.number().default(0),
  avgRating: z.number().default(0),
  ratingCount: z.number().default(0),
  featured: z.boolean().default(false),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Template = z.infer<typeof Template>;

export const CreateTemplateBody = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  workflowData: WorkflowPayload,
  categoryId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  thumbnail: z.string().optional(),
});
export type CreateTemplateBody = z.infer<typeof CreateTemplateBody>;

export const RateTemplateBody = z.object({
  rating: z.number().min(1).max(5),
  review: z.string().optional(),
});
export type RateTemplateBody = z.infer<typeof RateTemplateBody>;
