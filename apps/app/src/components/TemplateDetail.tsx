import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  Copy,
  Check,
  Star,
  Loader2,
  User,
  Tag,
  ExternalLink,
} from 'lucide-react';
import { useStore } from '../store/index.js';
import { client } from '../lib/api-client.js';
import { StarRating } from './StarRating.js';
import type { TemplateDetail, TemplateReview } from '../lib/templates-client.js';

export const TemplateDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const forkTemplate = useStore((s) => s.forkTemplate);

  const [template, setTemplate] = useState<TemplateDetail | null>(null);
  const [reviews, setReviews] = useState<TemplateReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [forking, setForking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      client.api.templates[':id']
        .$get({ param: { id } })
        .then(async (r) => (await r.json()) as any)
        .then((d) => d.template),
      client.api.templates[':id'].reviews
        .$get({ param: { id } })
        .then(async (r) => (await r.json()) as any)
        .then((d) => d.reviews),
    ])
      .then(([tpl, revs]) => {
        setTemplate(tpl);
        setReviews(revs);
      })
      .catch(() => setError('Template not found'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleFork = useCallback(async () => {
    if (!template || !id) return;
    setForking(true);
    const ok = await forkTemplate(id);
    setForking(false);
    if (ok) {
      navigate('/workflows/unsaved');
    }
  }, [id, template, forkTemplate, navigate]);

  const handleCopyJSON = useCallback(() => {
    if (!template) return;
    const json = JSON.stringify(template.workflowData, null, 2);
    navigator.clipboard.writeText(json).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [template]);

  const handleDownloadJSON = useCallback(() => {
    if (!template) return;
    const json = JSON.stringify(template.workflowData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${template.name.replace(/\s+/g, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [template]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#f8fafc]">
        <Loader2 className="w-6 h-6 text-[#f97316] animate-spin" />
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#f8fafc] gap-4">
        <p className="text-sm font-mono text-slate-400">{error || 'Template not found'}</p>
        <button
          onClick={() => navigate('/templates')}
          className="px-4 py-1.5 bg-slate-900 text-white text-[10px] font-mono font-bold cursor-pointer"
        >
          ← BACK TO LIBRARY
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-[#f8fafc] text-slate-800 select-none overflow-hidden font-sans">
      <header className="h-14 bg-white border-b border-[#cbd5e1] flex items-center justify-between px-6 z-20 flex-shrink-0">
        <div className="flex items-center gap-4 h-full">
          <button
            onClick={() => navigate('/templates')}
            className="text-sm font-bold h-full px-1 border-b-2 border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300 flex items-center gap-2 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Template Library
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyJSON}
            className="px-3 py-1.5 border border-slate-200 text-[10px] font-mono font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-green-600" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            {copied ? 'Copied!' : 'Copy JSON'}
          </button>
          <button
            onClick={handleDownloadJSON}
            className="px-3 py-1.5 border border-slate-200 text-[10px] font-mono font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Download JSON
          </button>
          <button
            onClick={handleFork}
            disabled={forking}
            className="px-4 py-1.5 bg-[#ea580c] hover:bg-[#a73a00] text-white text-[10px] font-mono font-bold flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
          >
            {forking ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <ExternalLink className="w-3.5 h-3.5" />
            )}
            FORK TO WORKSPACE
          </button>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto p-8 scrollbar">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="space-y-4">
            {template.thumbnail && (
              <div className="w-full max-h-64 overflow-hidden bg-slate-100 border border-slate-200">
                <img
                  src={template.thumbnail}
                  alt={template.name}
                  className="w-full h-full object-contain max-h-64"
                />
              </div>
            )}
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  {template.name}
                </h1>
                <div className="flex items-center gap-3 text-xs text-slate-500 font-mono">
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5" />
                    {template.authorName || 'Anonymous'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Download className="w-3.5 h-3.5" />
                    {template.downloads} downloads
                  </span>
                  <span className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-[#f97316]" />
                    {template.avgRating.toFixed(1)}
                  </span>
                  {template.category && (
                    <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-[9px] uppercase tracking-wider">
                      {template.category.name}
                    </span>
                  )}
                </div>
              </div>
              {template.featured && (
                <span className="px-2 py-1 bg-orange-50 border border-orange-200 text-[#f97316] text-[10px] font-mono font-bold">
                  ⭐ FEATURED
                </span>
              )}
            </div>

            {template.description && (
              <p className="text-sm text-slate-600 leading-relaxed max-w-2xl">
                {template.description}
              </p>
            )}

            {template.tags && template.tags.length > 0 && (
              <div className="flex items-center gap-2">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                <div className="flex gap-1.5 flex-wrap">
                  {template.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 bg-slate-50 border border-slate-200 text-[10px] font-mono text-slate-500"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <StarRating rating={template.avgRating} count={template.ratingCount} size={16} />
          </div>

          <div className="border-t border-slate-200 pt-6">
            <h2 className="text-sm font-bold text-slate-700 mb-4 font-mono uppercase tracking-wide">
              Workflow Nodes ({template.workflowData?.nodes?.length || 0})
            </h2>
            <div className="space-y-2">
              {(template.workflowData?.nodes || []).map((node: any) => (
                <div
                  key={node.id}
                  className="flex items-center gap-3 bg-white border border-slate-200 px-4 py-2.5"
                >
                  <span
                    className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 ${
                      node.type === 'trigger' || node.type === 'input_trigger'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : node.type === 'agent'
                          ? 'bg-orange-50 text-[#f97316] border border-orange-200'
                          : node.type === 'supervisor'
                            ? 'bg-blue-50 text-[#2563eb] border border-blue-200'
                            : 'bg-purple-50 text-purple-700 border border-purple-200'
                    }`}
                  >
                    {node.type === 'trigger'
                      ? 'trigger'
                      : node.type === 'input_trigger'
                        ? 'input'
                        : node.type === 'mcp_tool'
                          ? 'mcp'
                          : node.type}
                  </span>
                  <span className="text-xs font-semibold text-slate-700">
                    {node.data?.label || node.id}
                  </span>
                  {node.data?.model && (
                    <span className="text-[9px] font-mono text-slate-400 ml-auto">
                      {node.data.model}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-200 pt-6">
            <h2 className="text-sm font-bold text-slate-700 mb-4 font-mono uppercase tracking-wide">
              Action
            </h2>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleFork}
                disabled={forking}
                className="px-5 py-2 bg-[#ea580c] hover:bg-[#a73a00] text-white text-xs font-mono font-bold flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
              >
                {forking ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ExternalLink className="w-4 h-4" />
                )}
                Fork to Workspace
              </button>

              <button
                onClick={handleCopyJSON}
                className="px-5 py-2 border-2 border-slate-300 hover:border-slate-500 text-xs font-mono font-bold text-slate-700 flex items-center gap-2 transition-all cursor-pointer"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                {copied ? 'Copied!' : 'Copy Workflow JSON'}
              </button>

              <button
                onClick={handleDownloadJSON}
                className="px-5 py-2 border-2 border-slate-300 hover:border-slate-500 text-xs font-mono font-bold text-slate-700 flex items-center gap-2 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Download JSON File
              </button>
            </div>
          </div>

          {reviews.length > 0 && (
            <div className="border-t border-slate-200 pt-6">
              <h2 className="text-sm font-bold text-slate-700 mb-4 font-mono uppercase tracking-wide">
                Reviews ({reviews.length})
              </h2>
              <div className="space-y-3">
                {reviews.map((r) => (
                  <div key={r.id} className="bg-white border border-slate-200 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <StarRating rating={r.rating} size={12} />
                      {r.userName && (
                        <span className="text-[10px] font-mono text-slate-400">{r.userName}</span>
                      )}
                    </div>
                    {r.review && (
                      <p className="text-xs text-slate-600 leading-relaxed">{r.review}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
