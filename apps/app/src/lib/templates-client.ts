export interface TemplateCategory {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  sortOrder?: number;
}

export interface TemplateSummary {
  id: string;
  name: string;
  description?: string;
  categoryId?: string;
  tags?: string[];
  authorName?: string;
  downloads: number;
  avgRating: number;
  ratingCount: number;
  featured: boolean;
  thumbnail?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateDetail extends TemplateSummary {
  workflowData: any;
  category?: TemplateCategory;
  authorId: string;
  thumbnail?: string;
}

export interface TemplateReview {
  id: string;
  templateId: string;
  userId: string;
  userName?: string;
  rating: number;
  review?: string;
  createdAt: string;
}

export interface ListTemplatesResponse {
  templates: TemplateSummary[];
  total: number;
  limit: number;
  offset: number;
}
