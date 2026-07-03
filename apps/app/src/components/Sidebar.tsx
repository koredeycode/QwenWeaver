import React, { useState } from 'react';
import {
  LayoutDashboard,
  History,
  Play,
  Bot,
  ChevronRight,
  ChevronLeft,
  Wrench,
  Plus,
  BookOpen,
  HelpCircle,
  Users,
} from 'lucide-react';
import { useStore } from '../store/index.js';
import { client, withRefresh } from '../lib/api-client.js';
import { CreateWorkflowDialog } from './CreateWorkflowDialog.js';
import { ExecutionHistoryPanel } from './ExecutionHistoryPanel.js';

export const Sidebar = ({
  onOpenDockedPanel,
}: {
  onOpenDockedPanel: (mode: 'triggers' | 'agents' | 'mcp') => void;
}) => {
  const loadTemplate = useStore((s) => s.loadTemplate);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const handleCreateNewWorkflow = () => {
    setIsCreateOpen(true);
  };

  const handleCreateConfirm = async (name: string, description: string) => {
    try {
      // Create a proper workflow record in the database
      const payload = {
        name: name,
        description: description,
        nodes: [],
        edges: []
      };
      
      const res = (await withRefresh(() =>
        client.api.workflow.$post({ json: payload as any }),
      )) as any;
      
      if (!res.ok) {
        if (res.status === 403) {
          const errBody: Record<string, unknown> = await res.json().catch(() => ({}));
          throw new Error(String(errBody.error || 'Workflow limit reached'));
        }
        throw new Error('Failed to create workflow');
      }
      
      const result = await res.json();
      window.open(`/workflows/${result.workflowId}`, '_blank');
      setIsCreateOpen(false);
    } catch (err) {
      console.error('Failed to create workflow', err);
      // Fallback to original behavior if API call fails
      const newId = `workflow-${Date.now().toString().slice(-4)}`;
      sessionStorage.setItem(`pending_wf_${newId}`, JSON.stringify({ name, description }));
      window.open(`/workflows/${newId}`, '_blank');
      setIsCreateOpen(false);
    }
  };

  const [historyPanelOpen, setHistoryPanelOpen] = useState(false);

  if (collapsed) {
    return (
      <div className="w-14 h-full bg-[#f1f5f9] border-r border-[#cbd5e1] flex flex-col items-center py-2 gap-3 font-sans select-none text-slate-700 relative">
        <button
          onClick={() => setCollapsed(false)}
          className="absolute -right-3 top-3 w-6 h-6 bg-white border border-[#cbd5e1] flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-50 shadow-sm cursor-pointer z-10"
          title="Expand sidebar"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        <img src="/logo.png" alt="QwenWeaver Logo" className="w-8 h-8 object-contain select-none" />

        <button
          onClick={handleCreateNewWorkflow}
          className="w-9 h-9 bg-[#ea580c] hover:bg-[#a73a00] text-white flex items-center justify-center transition-colors shadow-sm cursor-pointer"
          title="New Workflow"
        >
          <Plus className="w-4 h-4" />
        </button>

        <div className="w-full border-t border-[#cbd5e1]" />

        <button
          onClick={() => window.open('/', '_blank')}
          className="w-9 h-9 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-all cursor-pointer"
          title="Dashboard"
        >
          <LayoutDashboard className="w-4 h-4" />
        </button>

        <div className="w-full border-t border-[#cbd5e1]" />

        <button
          onClick={() => onOpenDockedPanel('triggers')}
          className="w-9 h-9 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-all cursor-pointer"
          title="Triggers"
        >
          <Play className="w-4 h-4" />
        </button>

        <button
          onClick={() => onOpenDockedPanel('agents')}
          className="w-9 h-9 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-all cursor-pointer"
          title="Agents"
        >
          <Bot className="w-4 h-4" />
        </button>

        <button
          onClick={() => onOpenDockedPanel('mcp')}
          className="w-9 h-9 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-all cursor-pointer"
          title="MCP Tools"
        >
          <Wrench className="w-4 h-4" />
        </button>

        <div className="w-full border-t border-[#cbd5e1]" />

        <button
          onClick={() => setHistoryPanelOpen(true)}
          className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-all cursor-pointer"
          title="Past Execution History"
        >
          <History className="w-4 h-4" />
        </button>

        <div className="flex-1" />

        <a
          href="#"
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => {
            e.preventDefault();
            loadTemplate('research');
          }}
          className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-all cursor-pointer"
          title="Community Template"
        >
          <Users className="w-4 h-4" />
        </a>

        <a
          href="#"
          target="_blank"
          rel="noopener noreferrer"
          className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-all cursor-pointer"
          title="Documentation"
        >
          <BookOpen className="w-4 h-4" />
        </a>

        <a
          href="#"
          target="_blank"
          rel="noopener noreferrer"
          className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-all cursor-pointer"
          title="Support"
        >
          <HelpCircle className="w-4 h-4" />
        </a>

        <CreateWorkflowDialog
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onConfirm={handleCreateConfirm}
        />
      </div>
    );
  }

  return (
    <div className="w-64 h-full bg-[#f1f5f9] border-r border-[#cbd5e1] flex flex-col font-sans select-none text-slate-700 relative">
      <button
        onClick={() => setCollapsed(true)}
        className="absolute -right-3 top-3 w-6 h-6 bg-white border border-[#cbd5e1] flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-50 shadow-sm cursor-pointer z-10"
        title="Collapse sidebar"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
      </button>

      {/* Upper Section */}
      <div className="flex flex-col flex-1 min-h-0 overflow-y-auto">
        {/* Brand Block */}
        <div className="p-4 pb-2 flex items-center gap-3">
          <img
            src="/logo.png"
            alt="QwenWeaver Logo"
            className="w-8 h-8 object-contain select-none"
          />
          <div>
            <h1 className="text-sm font-bold text-slate-900 leading-tight">QwenWeaver</h1>
            <p className="text-[10px] text-slate-500 font-mono tracking-wide uppercase">
              Workflow Editor
            </p>
          </div>
        </div>

        {/* CTA: + New Workflow Button */}
        <div className="px-4 py-2">
          <button
            onClick={handleCreateNewWorkflow}
            className="w-full py-2 bg-[#ea580c] hover:bg-[#a73a00] text-white font-bold text-xs flex items-center justify-center gap-1.5 rounded-none transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New Workflow
          </button>
        </div>

        {/* Navigation Links */}
        <div className="px-2 space-y-0.5 mb-3">
          <button
            onClick={() => window.open('/', '_blank')}
            className="w-full flex items-center gap-3 px-3 py-2 text-xs font-mono font-bold text-slate-600 hover:bg-slate-200 transition-all rounded-none cursor-pointer"
            title="Dashboard"
          >
            <LayoutDashboard className="w-4 h-4 text-slate-500" />
            <span>Dashboard</span>
          </button>
        </div>

        {/* Divider */}
        <div className="mx-4 border-t border-[#cbd5e1] mb-2" />

        {/* Navigation Categories */}
        <div className="px-2 space-y-1" data-tour="palette">
          {/* Triggers */}
          <button
            onClick={() => onOpenDockedPanel('triggers')}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-mono font-bold text-slate-600 hover:bg-slate-200 transition-all rounded-none"
          >
            <div className="flex items-center gap-3">
              <Play className="w-4 h-4 text-slate-500" />
              <span>Triggers</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          {/* Agents */}
          <button
            onClick={() => onOpenDockedPanel('agents')}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-mono font-bold text-slate-600 hover:bg-slate-200 transition-all rounded-none"
          >
            <div className="flex items-center gap-3">
              <Bot className="w-4 h-4 text-slate-500" />
              <span>Agents</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          {/* MCP Tools */}
          <button
            onClick={() => onOpenDockedPanel('mcp')}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-mono font-bold text-slate-600 hover:bg-slate-200 transition-all rounded-none"
          >
            <div className="flex items-center gap-3">
              <Wrench className="w-4 h-4 text-slate-500" />
              <span>MCP Tools</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Divider */}
        <div className="mx-4 border-t border-[#cbd5e1] my-2" />

        {/* Past Execution History */}
        <div className="px-2">
          <button
            onClick={() => setHistoryPanelOpen(true)}
            className="w-full flex items-center gap-3 px-3 py-2 text-xs font-mono font-bold text-slate-600 hover:bg-slate-200 transition-all rounded-none cursor-pointer"
            title="Past Execution History"
          >
            <History className="w-4 h-4 text-slate-500" />
            <span>Past Execution History</span>
          </button>
          {historyPanelOpen && <ExecutionHistoryPanel onClose={() => setHistoryPanelOpen(false)} />}
        </div>
      </div>

      {/* Footer Section */}
      <div className="p-3 border-t border-[#cbd5e1] space-y-2 bg-[#edf2f7] flex-shrink-0 mt-auto">
        {/* Community templates */}
        <div className="flex flex-col gap-1">
          <a
            href={'/templates'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 px-2 py-1 text-xs text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <Users className="w-4 h-4" />
            <span>Community Templates</span>
          </a>
        </div>

        {/* Documentation / Support links */}
        <div className="pt-2 flex flex-col gap-1 border-t border-[#cbd5e1]/40">
          <a
            href="#"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 px-2 py-1 text-xs text-slate-500 hover:text-slate-900 transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            <span>Documentation</span>
          </a>
          <a
            href="#"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 px-2 py-1 text-xs text-slate-500 hover:text-slate-900 transition-colors"
          >
            <HelpCircle className="w-4 h-4" />
            <span>Support</span>
          </a>
        </div>
      </div>

      {/* New Workflow Dialog */}
      <CreateWorkflowDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onConfirm={handleCreateConfirm}
      />
    </div>
  );
};
