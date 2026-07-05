import React from 'react';
import { Download, Bot, Brain, Wrench, Play } from 'lucide-react';
import { StarRating } from './StarRating.js';
import { UserAvatar } from './UserAvatar.js';
import type { TemplateSummary } from '../lib/templates-client.js';

interface TemplateCardProps {
  template: TemplateSummary;
  onSelect: (id: string) => void;
  onFork: (id: string) => void;
}

function parseWorkflowData(wf: any): {
  agents: number;
  supervisors: number;
  tools: number;
  triggers: number;
} {
  if (!wf?.nodes) return { agents: 0, supervisors: 0, tools: 0, triggers: 0 };
  const nodes = wf.nodes as any[];
  return {
    agents: nodes.filter((n: any) => n.type === 'agent').length,
    supervisors: nodes.filter((n: any) => n.type === 'supervisor').length,
    tools: nodes.filter((n: any) => n.type === 'mcp_tool').length,
    triggers: nodes.filter(
      (n: any) => n.type === 'trigger' || n.type === 'input_trigger' || n.type === 'file_trigger',
    ).length,
  };
}

export const TemplateCard = React.memo(({ template, onSelect, onFork }: TemplateCardProps) => {
  const counts = parseWorkflowData(template as any);

  return (
    <div
      className="bg-white border-2 border-slate-200 hover:border-[#f97316] flex flex-col shadow-sm hover:shadow-md transition-all rounded-none group cursor-pointer relative"
      onClick={() => onSelect(template.id)}
    >
      <div
        className="w-full h-40 overflow-hidden border-b border-slate-200 relative"
        style={{
          background: 'url(/fallback-thumbnail.png) center / cover',
          backgroundColor: '#0f172a',
        }}
      >
        {template.thumbnail && (
          <img
            src={template.thumbnail}
            alt={template.name}
            className="w-full h-full object-cover transition-opacity duration-500 group-hover:scale-105"
            loading="lazy"
            onLoad={(e) => ((e.target as HTMLImageElement).style.opacity = '1')}
            style={{ opacity: 0 }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
      </div>
      {!!template.featured && (
        <div className="absolute top-3 right-3">
          <span className="text-[9px] font-mono bg-orange-50 border border-orange-200 text-[#f97316] px-1.5 py-0.5 font-bold">
            FEATURED
          </span>
        </div>
      )}
      <div className="p-4 flex flex-col gap-2.5 flex-1">
        <div className="flex-1 min-h-0">
          <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#f97316] transition-colors leading-tight">
            {template.name}
          </h3>
          {template.description && (
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed line-clamp-2">
              {template.description}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-1">
          {counts.triggers > 0 && (
            <span
              className="flex items-center gap-0.5 text-[9px] font-mono bg-emerald-50 border border-emerald-200 text-emerald-700 px-1 py-0.5"
              title="Triggers"
            >
              <Play className="w-2.5 h-2.5" /> {counts.triggers}
            </span>
          )}
          {counts.agents > 0 && (
            <span
              className="flex items-center gap-0.5 text-[9px] font-mono bg-orange-50 border border-orange-200 text-[#f97316] px-1 py-0.5"
              title="Agents"
            >
              <Bot className="w-2.5 h-2.5" /> {counts.agents}
            </span>
          )}
          {counts.supervisors > 0 && (
            <span
              className="flex items-center gap-0.5 text-[9px] font-mono bg-blue-50 border border-blue-200 text-[#2563eb] px-1 py-0.5"
              title="Supervisors"
            >
              <Brain className="w-2.5 h-2.5" /> {counts.supervisors}
            </span>
          )}
          {counts.tools > 0 && (
            <span
              className="flex items-center gap-0.5 text-[9px] font-mono bg-purple-50 border border-purple-200 text-purple-700 px-1 py-0.5"
              title="MCP Tools"
            >
              <Wrench className="w-2.5 h-2.5" /> {counts.tools}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
          <div className="flex items-center gap-1.5 min-w-0">
            <UserAvatar name={template.authorName} image={template.authorImage} size={20} />
            <span className="text-[10px] font-mono text-slate-500 truncate">
              {template.authorName || 'Anonymous'}
            </span>
          </div>
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <StarRating rating={template.avgRating} count={template.ratingCount} size={11} />
            <span className="flex items-center gap-0.5 text-[10px] font-mono text-slate-400">
              <Download className="w-3 h-3" /> {template.downloads}
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect(template.id);
            }}
            className="flex-1 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-mono font-bold transition-all cursor-pointer"
          >
            VIEW DETAILS
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onFork(template.id);
            }}
            className="py-1.5 px-3 bg-[#ea580c] hover:bg-[#a73a00] text-white text-[10px] font-mono font-bold transition-all cursor-pointer"
          >
            FORK →
          </button>
        </div>
      </div>
    </div>
  );
});

TemplateCard.displayName = 'TemplateCard';
