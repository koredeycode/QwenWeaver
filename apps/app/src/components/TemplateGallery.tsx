import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, ArrowLeft, Loader2 } from 'lucide-react';
import { useStore } from '../store/index.js';
import { client, withRefresh } from '../lib/api-client.js';
import { toast } from 'sonner';
import { TemplateCard } from './TemplateCard.js';

const ALL_CATEGORIES = { id: '', name: 'All', slug: '', icon: undefined, sortOrder: -1 };

export const TemplateGallery = () => {
  const navigate = useNavigate();
  const templates = useStore((s) => s.templates);
  const templatesTotal = useStore((s) => s.templatesTotal);
  const templatesLoading = useStore((s) => s.templatesLoading);
  const categories = useStore((s) => s.categories);
  const fetchTemplates = useStore((s) => s.fetchTemplates);
  const fetchCategories = useStore((s) => s.fetchCategories);
  const forkTemplate = useStore((s) => s.forkTemplate);

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('');

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchTemplates({ categoryId: activeCategory || undefined, search: search || undefined });
  }, [activeCategory, fetchTemplates]);

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      fetchTemplates({ categoryId: activeCategory || undefined, search: search || undefined });
    },
    [activeCategory, search, fetchTemplates],
  );

  const handleSelect = useCallback(
    (id: string) => {
      navigate(`/templates/${id}`);
    },
    [navigate],
  );

  const handleFork = useCallback(
    async (id: string) => {
      const ok = await forkTemplate(id);
      if (ok) {
        // Create a new empty workflow to get a proper workflow ID
        const payload = {
          name: 'Forked Template',
          description: 'Workflow created from a template',
          nodes: [],
          edges: [],
        };

        try {
          const res = (await withRefresh(() =>
            client.api.workflow.$post({ json: payload as any }),
          )) as any;

          if (!res.ok) {
            if (res.status === 403) {
              const errBody: Record<string, unknown> = await res.json().catch(() => ({}));
              toast.error(String(errBody.error || 'Workflow limit reached'));
              return;
            }
            throw new Error('Failed to create workflow');
          }

          const result = await res.json();
          navigate(`/workflows/${result.workflowId}`);
        } catch (err) {
          console.error('Failed to create workflow from template', err);
          // Fallback to original behavior if API call fails
          navigate('/workflows/unsaved');
        }
      }
    },
    [forkTemplate, navigate],
  );

  const allCategories = [ALL_CATEGORIES, ...categories];

  return (
    <div className="h-screen w-screen flex flex-col bg-[#f8fafc] text-slate-800 select-none overflow-hidden font-sans">
      <header className="h-14 bg-white border-b border-[#cbd5e1] flex items-center justify-between px-6 z-20 flex-shrink-0">
        <div className="flex items-center gap-6 h-full">
          <button
            onClick={() => navigate('/')}
            className="text-sm font-bold h-full px-1 border-b-2 border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Workflows
          </button>
          <span className="text-sm font-bold h-full px-1 border-b-2 border-[#f97316] text-slate-900 flex items-center justify-center">
            Template Library
          </span>
        </div>
        <div className="flex items-center gap-3">
          <form onSubmit={handleSearch} className="flex items-center gap-1">
            <div className="flex items-center border border-slate-200 bg-slate-50 px-2 py-1 gap-1.5">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search templates..."
                className="bg-transparent border-none outline-none text-xs font-mono text-slate-700 placeholder:text-slate-400 w-40"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    fetchTemplates({ categoryId: activeCategory || undefined });
                  }}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </form>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto p-8 scrollbar">
        <div className="max-w-5xl mx-auto space-y-8">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              TEMPLATE LIBRARY
            </h1>
            <p className="text-xs text-slate-500 font-mono mt-1 uppercase tracking-wide">
              Browse community-built multi-agent workflows. Fork any template to your workspace.
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            {allCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1.5 text-[10px] font-mono font-bold border transition-all cursor-pointer ${
                  activeCategory === cat.id
                    ? 'bg-[#f97316] text-white border-[#f97316]'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {templatesLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 text-[#f97316] animate-spin" />
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-sm font-mono text-slate-400">No templates found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map((tpl) => (
                <TemplateCard
                  key={tpl.id}
                  template={tpl}
                  onSelect={handleSelect}
                  onFork={handleFork}
                />
              ))}
            </div>
          )}

          {templates.length > 0 && (
            <div className="text-center text-[10px] font-mono text-slate-400 pb-4">
              {templatesTotal} template{templatesTotal !== 1 ? 's' : ''} available
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
