import React, { useState } from 'react';
import { 
  Play, 
  Bot,
  Brain, 
  ChevronRight, 
  Wrench, 
  Plus,
  BookOpen,
  HelpCircle
} from 'lucide-react';
import { useStore } from '../store/index.js';
import type { NodeType } from '@qwenweaver/types';
import { NodeTypeDialog } from './NodeTypeDialog.js';

export const Sidebar = () => {
  const addNode = useStore((s) => s.addNode);
  const loadTemplate = useStore((s) => s.loadTemplate);

  const [activeCategory, setActiveCategory] = useState<string | null>('agents');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleDragStart = (event: React.DragEvent, nodeType: NodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleCategoryClick = (cat: string) => {
    setActiveCategory(activeCategory === cat ? null : cat);
  };

  const paletteItems = {
    triggers: [
      { type: 'trigger', label: 'Manual Trigger', icon: Play, detail: 'Trigger workflow manually or on a schedule.' },
      { type: 'input_trigger', label: 'Input Trigger', icon: Play, detail: 'Enter initial instruction text to feed to the workflow.' }
    ],
    agents: [
      { type: 'agent', label: 'Normal Agent', icon: Bot, detail: 'General worker for parsing subtasks.' },
      { type: 'supervisor', label: 'Supervisor Agent', icon: Brain, detail: 'Supervisor node to coordinate and negotiate conflicts.' }
    ],
    mcp: [
      { type: 'mcp_tool', label: 'Local Filesystem', icon: Wrench, detail: 'Access local workspaces, files, and commands.' },
      { type: 'mcp_tool', label: 'Web Scraper', icon: Wrench, detail: 'Execute HTTP scraper commands.' },
      { type: 'mcp_tool', label: 'GitHub Writer', icon: Wrench, detail: 'Write consensus reports to repositories.' }
    ]
  };

  return (
    <div className="w-64 h-full bg-[#f1f5f9] border-r border-[#cbd5e1] flex flex-col font-sans select-none justify-between text-slate-700">
      
      {/* Upper Section */}
      <div className="flex flex-col">
        {/* Brand Block */}
        <div className="p-4 pb-2 flex items-center gap-3">
          {/* Custom Orange square brand logo */}
          <div className="w-8 h-8 bg-[#ea580c] flex items-center justify-center text-white font-mono font-bold text-lg select-none">
            🔀
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 leading-tight">QwenWeaver</h1>
            <p className="text-[10px] text-slate-500 font-mono tracking-wide uppercase">Workflow Editor</p>
          </div>
        </div>

        {/* CTA: + New Node Button */}
        <div className="px-4 py-2">
          <button 
            onClick={() => setIsDialogOpen(true)}
            className="w-full py-2 bg-[#9a3412] hover:bg-[#a73a00] text-white font-bold text-xs flex items-center justify-center gap-1.5 rounded-none transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New Node
          </button>
        </div>

        {/* Navigation Categories */}
        <div className="mt-4 px-2 space-y-1">
          {/* Triggers */}
          <button
            onClick={() => handleCategoryClick('triggers')}
            className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-mono font-bold transition-all rounded-none ${
              activeCategory === 'triggers'
                ? 'bg-[#ea580c] text-white'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Play className={`w-4 h-4 ${activeCategory === 'triggers' ? 'text-white' : 'text-slate-500'}`} />
            <span>Triggers</span>
          </button>
          
          {activeCategory === 'triggers' && (
            <div className="py-1 px-1 bg-white border border-[#e2e8f0] shadow-sm space-y-1 mt-0.5">
              {paletteItems.triggers.map((item, idx) => (
                <div
                  key={idx}
                  draggable
                  onDragStart={(e) => handleDragStart(e, item.type as NodeType)}
                  onClick={() => addNode(item.type as NodeType)}
                  className="p-2 hover:bg-[#eff6ff] hover:text-[#2563eb] cursor-grab active:cursor-grabbing text-xs text-slate-700 font-semibold border-b border-slate-100 last:border-0 transition-colors"
                >
                  <span className="font-mono text-[9px] bg-slate-100 text-slate-500 px-1 mr-1.5 uppercase rounded-none">TRIGGER</span>
                  {item.label}
                </div>
              ))}
            </div>
          )}

          {/* Agents */}
          <button
            onClick={() => handleCategoryClick('agents')}
            className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-mono font-bold transition-all rounded-none ${
              activeCategory === 'agents'
                ? 'bg-[#ea580c] text-white'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Bot className={`w-4 h-4 ${activeCategory === 'agents' ? 'text-white' : 'text-slate-500'}`} />
            <span>Agents</span>
          </button>

          {activeCategory === 'agents' && (
            <div className="py-1 px-1 bg-white border border-[#e2e8f0] shadow-sm space-y-1 mt-0.5">
              {paletteItems.agents.map((item, idx) => (
                <div
                  key={idx}
                  draggable
                  onDragStart={(e) => handleDragStart(e, item.type as NodeType)}
                  onClick={() => addNode(item.type as NodeType)}
                  className="p-2 hover:bg-[#eff6ff] hover:text-[#2563eb] cursor-grab active:cursor-grabbing text-xs text-slate-700 font-semibold border-b border-slate-100 last:border-0 transition-colors"
                >
                  <span className="font-mono text-[9px] bg-slate-100 text-slate-500 px-1 mr-1.5 uppercase rounded-none">
                    {item.type === 'supervisor' ? 'SUPERVISOR' : 'AGENT'}
                  </span>
                  {item.label}
                </div>
              ))}
            </div>
          )}

          {/* MCP Tools */}
          <button
            onClick={() => handleCategoryClick('mcp')}
            className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-mono font-bold transition-all rounded-none ${
              activeCategory === 'mcp'
                ? 'bg-[#ea580c] text-white'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Wrench className={`w-4 h-4 ${activeCategory === 'mcp' ? 'text-white' : 'text-slate-500'}`} />
            <span>MCP Tools</span>
          </button>

          {activeCategory === 'mcp' && (
            <div className="py-1 px-1 bg-white border border-[#e2e8f0] shadow-sm space-y-1 mt-0.5">
              {paletteItems.mcp.map((item, idx) => (
                <div
                  key={idx}
                  draggable
                  onDragStart={(e) => handleDragStart(e, item.type as NodeType)}
                  onClick={() => addNode(item.type as NodeType)}
                  className="p-2 hover:bg-[#eff6ff] hover:text-[#2563eb] cursor-grab active:cursor-grabbing text-xs text-slate-700 font-semibold border-b border-slate-100 last:border-0 transition-colors"
                >
                  <span className="font-mono text-[9px] bg-slate-100 text-slate-500 px-1 mr-1.5 uppercase rounded-none">MCP</span>
                  {item.label}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer Section */}
      <div className="p-3 border-t border-[#cbd5e1] space-y-2 bg-[#edf2f7]">
        {/* Templates triggers */}
        <button 
          onClick={() => loadTemplate('research')}
          className="w-full text-left py-1.5 px-2 bg-white border border-[#cbd5e1] text-[11px] font-semibold text-slate-700 hover:text-[#2563eb] hover:bg-slate-50 flex items-center justify-between group rounded-none"
        >
          <span>Research Swarm Template</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-primary transition-colors" />
        </button>

        {/* Documentation / Support links */}
        <div className="pt-2 flex flex-col gap-1 border-t border-[#cbd5e1]/40">
          <a href="#" className="flex items-center gap-2.5 px-2 py-1 text-xs text-slate-500 hover:text-slate-900 transition-colors">
            <BookOpen className="w-4 h-4" />
            <span>Documentation</span>
          </a>
          <a href="#" className="flex items-center gap-2.5 px-2 py-1 text-xs text-slate-500 hover:text-slate-900 transition-colors">
            <HelpCircle className="w-4 h-4" />
            <span>Support</span>
          </a>
        </div>
      </div>
      
      <NodeTypeDialog 
        isOpen={isDialogOpen} 
        onClose={() => setIsDialogOpen(false)} 
        onSelect={(type) => addNode(type)} 
      />
    </div>
  );
};
