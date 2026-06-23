import type { WorkflowPayload } from '@qwenweaver/types';

export interface TemplateRow {
  id: string;
  name: string;
  description: string | null;
  workflowData: WorkflowPayload;
  categoryId: string | null;
  tags: string[] | null;
  authorId: string;
  thumbnail: string | null;
  downloads: number;
  avgRating: number;
  ratingCount: number;
  featured: number;
  createdAt: number | Date | string;
  updatedAt: number | Date | string;
}

export interface TemplateReviewRow {
  id: string;
  templateId: string;
  userId: string;
  rating: number;
  review: string | null;
  createdAt: number | Date | string;
}

export interface TemplateCategoryRow {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  sortOrder: number | null;
}
