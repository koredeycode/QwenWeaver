import { StateCreator } from 'zustand';
import { StoreState, TemplateSlice } from './types.js';
import { apiFetch } from '../lib/api-client.js';
import { toast } from 'sonner';

export const createTemplateSlice: StateCreator<StoreState, [], [], TemplateSlice> = (set, get) => ({
  templates: [],
  templatesTotal: 0,
  templatesLoading: false,
  selectedTemplate: null,
  selectedTemplateReviews: [],
  categories: [],
  categoriesLoading: false,

  fetchTemplates: async (params) => {
    set({ templatesLoading: true });
    try {
      const qs = new URLSearchParams();
      if (params?.categoryId) qs.set('categoryId', params.categoryId);
      if (params?.featured !== undefined) qs.set('featured', String(params.featured));
      if (params?.search) qs.set('search', params.search);
      if (params?.limit) qs.set('limit', String(params.limit));
      if (params?.offset) qs.set('offset', String(params.offset));
      const q = qs.toString();

      const res = await apiFetch(`/api/templates${q ? `?${q}` : ''}`);
      const data = await res.json();
      set({ templates: data.templates, templatesTotal: data.total, templatesLoading: false });
    } catch {
      set({ templatesLoading: false });
      toast.error('Failed to load templates');
    }
  },

  fetchTemplate: async (id) => {
    try {
      const res = await apiFetch(`/api/templates/${id}`);
      const data = await res.json();
      set({ selectedTemplate: data.template });
    } catch {
      toast.error('Failed to load template');
    }
  },

  fetchReviews: async (id) => {
    try {
      const res = await apiFetch(`/api/templates/${id}/reviews`);
      const data = await res.json();
      set({ selectedTemplateReviews: data.reviews });
    } catch {
      toast.error('Failed to load reviews');
    }
  },

  fetchCategories: async () => {
    set({ categoriesLoading: true });
    try {
      const res = await apiFetch('/api/templates/categories');
      const data = await res.json();
      set({ categories: data.categories, categoriesLoading: false });
    } catch {
      set({ categoriesLoading: false });
    }
  },

  forkTemplate: async (id) => {
    const token = get().token;
    if (!token) {
      toast.error('You must be logged in to fork templates');
      return false;
    }
    try {
      const res = await apiFetch(`/api/templates/${id}`);
      if (!res.ok) throw new Error('Failed to fetch template');
      const data = await res.json();
      const template = data.template;
      if (!template?.workflowData?.nodes) {
        toast.error('Template has no workflow data');
        return false;
      }
      const store = get();
      store.loadUnsavedWorkflow(
        template.workflowData.nodes,
        template.workflowData.edges || [],
        template.name,
        template.description || '',
      );
      toast.success('Template loaded — save it to keep your changes');
      return true;
    } catch {
      toast.error('Failed to load template');
      return false;
    }
  },
});
