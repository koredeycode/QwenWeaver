import React from 'react';
import { Download, FolderOpen, Bot, Brain, Wrench, Play } from 'lucide-react';
import { StarRating } from './StarRating.js';
import type { TemplateSummary } from '../lib/templates-client.js';

interface TemplateCardProps {
  template: TemplateSummary;
  onSelect: (id: string) => void;
  onFork: (id: string) => void;
}

function parseWorkflowData(wf: any): { agents: number; supervisors: number; tools: number; triggers: number } {
  if (!wf?.nodes) return { agents: 0, supervisors: 0, tools: 0, triggers: 0 };
  const nodes = wf.nodes as any[];
  return {
    agents: nodes.filter((n: any) => n.type === 'agent').length,
    supervisors: nodes.filter((n: any) => n.type === 'supervisor').length,
    tools: nodes.filter((n: any) => n.type === 'mcp_tool').length,
    triggers: nodes.filter((n: any) => n.type === 'trigger' || n.type === 'input_trigger').length,
  };
}

export const TemplateCard = React.memo(({ template, onSelect, onFork }: TemplateCardProps) => {
  const counts = parseWorkflowData(template as any);

  return (
    <div
      className="bg-white border-2 border-slate-200 hover:border-[#ea580c] flex flex-col shadow-sm hover:shadow-md transition-all rounded-none group cursor-pointer relative"
      onClick={() => onSelect(template.id)}
    >
      {template.thumbnail ? (
        <div className="w-full h-36 overflow-hidden bg-slate-50 border-b border-slate-200">
          <img
            src={template.thumbnail}
            alt={template.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      ) : (
        <div className="w-full h-24 flex items-center justify-center bg-slate-50 border-b border-slate-200">
          <FolderOpen className="w-8 h-8 text-slate-300 group-hover:text-[#ea580c] transition-colors" />
        </div>
      )}
      {template.featured && (
        <div className="absolute top-3 right-3">
          <span className="text-[9px] font-mono bg-orange-50 border border-orange-200 text-[#ea580c] px-1.5 py-0.5 font-bold">
            FEATURED
          </span>
        </div>
      )}
      <div className="p-6 flex flex-col justify-between flex-1 min-h-0">

        <div>
          <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#ea580c] transition-colors">
            {template.name}
          </h3>
          {template.description && (
            <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed font-sans line-clamp-3">
              {template.description}
            </p>
          )}
        </div>

        {(counts.triggers > 0 || counts.agents > 0 || counts.supervisors > 0 || counts.tools > 0) && (
          <div className="flex gap-1.5 flex-wrap">
            {counts.triggers > 0 && (
              <span className="flex items-center gap-0.5 text-[9px] font-mono bg-emerald-50 border border-emerald-200 text-emerald-700 px-1 py-0.5" title="Triggers">
                <Play className="w-2.5 h-2.5" /> {counts.triggers}
              </span>
            )}
            {counts.agents > 0 && (
              <span className="flex items-center gap-0.5 text-[9px] font-mono bg-orange-50 border border-orange-200 text-[#ea580c] px-1 py-0.5" title="Agents">
                <Bot className="w-2.5 h-2.5" /> {counts.agents}
              </span>
            )}
            {counts.supervisors > 0 && (
              <span className="flex items-center gap-0.5 text-[9px] font-mono bg-blue-50 border border-blue-200 text-[#2563eb] px-1 py-0.5" title="Supervisors">
                <Brain className="w-2.5 h-2.5" /> {counts.supervisors}
              </span>
            )}
            {counts.tools > 0 && (
              <span className="flex items-center gap-0.5 text-[9px] font-mono bg-purple-50 border border-purple-200 text-purple-700 px-1 py-0.5" title="MCP Tools">
                <Wrench className="w-2.5 h-2.5" /> {counts.tools}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-slate-100 space-y-2">
        <div className="flex items-center justify-between">
          <StarRating rating={template.avgRating} count={template.ratingCount} />
          <span className="flex items-center gap-1 text-[10px] font-mono text-slate-400">
            <Download className="w-3 h-3" /> {template.downloads}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onSelect(template.id); }}
            className="flex-1 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-mono font-bold transition-all"
          >
            VIEW DETAILS
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onFork(template.id); }}
            className="py-1.5 px-3 bg-[#9a3412] hover:bg-[#a73a00] text-white text-[10px] font-mono font-bold transition-all"
          >
            FORK →
          </button>
        </div>
      </div>
    </div>
  );
});

TemplateCard.displayName = 'TemplateCard';
