import React, { useEffect, useRef, useState } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import { client, authHeaders } from '../lib/api-client.js';

interface PublishTemplateDialogProps {
  isOpen: boolean;
  initialName?: string;
  initialDescription?: string;
  onClose: () => void;
  onConfirm: (data: {
    name: string;
    description: string;
    categoryId?: string;
    tags?: string[];
  }) => Promise<void>;
}

interface Category {
  id: string;
  name: string;
}

export const PublishTemplateDialog = ({
  isOpen,
  initialName = '',
  initialDescription = '',
  onClose,
  onConfirm,
}: PublishTemplateDialogProps) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [tagsStr, setTagsStr] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName(initialName);
      setDescription(initialDescription);
      setCategoryId('');
      setTagsStr('');
      setLoading(true);
      client.api.templates.categories
        .$get({}, { headers: authHeaders() })
        .then((r) => r.json())
        .then((data) => setCategories((data as any).categories))
        .catch(() => {})
        .finally(() => setLoading(false));
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, initialName, initialDescription]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    try {
      const tags = tagsStr.trim()
        ? tagsStr
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
        : undefined;
      await onConfirm({
        name: name.trim(),
        description: description.trim(),
        categoryId: categoryId || undefined,
        tags,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[999] flex items-center justify-center p-6 select-text pointer-events-auto"
      onClick={onClose}
    >
      <div
        className="bg-white border-2 border-slate-900 shadow-2xl rounded-none w-full max-w-lg flex flex-col relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-white text-slate-800 px-6 py-4 flex items-center justify-between border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <Upload className="w-4 h-4 text-purple-600" />
            <h2 className="text-sm font-bold font-mono text-slate-800 tracking-tight">
              PUBLISH AS TEMPLATE
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
              Template Name <span className="text-rose-500">*</span>
            </label>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Academic Research Swarm"
              className="w-full border border-slate-200 bg-white p-3 font-mono text-sm outline-none focus:border-slate-400 text-slate-800 placeholder:text-slate-300"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
              Description <span className="text-slate-300">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this template does..."
              rows={3}
              className="w-full border border-slate-200 bg-white p-3 font-mono text-sm outline-none focus:border-slate-400 text-slate-800 placeholder:text-slate-300 resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
              Category <span className="text-slate-300">(optional)</span>
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full border border-slate-200 bg-white p-3 font-mono text-sm outline-none focus:border-slate-400 text-slate-800"
              disabled={loading}
            >
              <option value="">{loading ? 'Loading...' : '— Select category —'}</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
              Tags <span className="text-slate-300">(optional, comma-separated)</span>
            </label>
            <input
              type="text"
              value={tagsStr}
              onChange={(e) => setTagsStr(e.target.value)}
              placeholder="e.g. research, academic, ai"
              className="w-full border border-slate-200 bg-white p-3 font-mono text-sm outline-none focus:border-slate-400 text-slate-800 placeholder:text-slate-300"
            />
          </div>
        </form>

        <div className="bg-slate-50 px-6 py-3 flex items-center justify-between border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-mono font-bold transition-all rounded-none cursor-pointer"
          >
            CANCEL
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || submitting}
            className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-mono font-bold transition-all rounded-none cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {submitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Upload className="w-3.5 h-3.5" />
            )}
            {submitting ? 'PUBLISHING...' : 'PUBLISH TEMPLATE'}
          </button>
        </div>
      </div>
    </div>
  );
};
