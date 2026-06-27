import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  History,
  Play,
  Bot,
  Brain,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  Wrench,
  Plus,
  BookOpen,
  HelpCircle,
  Users,
  Store,
  Loader2,
} from 'lucide-react';
import { useStore } from '../store/index.js';
import type { NodeType } from '@qwenweaver/types';
import { CreateWorkflowDialog } from './CreateWorkflowDialog.js';
import { client, authHeaders } from '../lib/api-client.js';
import { MCPMarketplace } from './MCPMarketplace.js';
import { ExecutionHistoryPanel } from './ExecutionHistoryPanel.js';

export const Sidebar = ({
  onOpenWorkerCatalog,
}: {
  onOpenWorkerCatalog: (pos: { x: number; y: number } | null) => void;
}) => {
  const addNode = useStore((s) => s.addNode);
  const loadTemplate = useStore((s) => s.loadTemplate);

  const [activeCategory, setActiveCategory] = useState<string | null>('agents');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const handleCreateNewWorkflow = () => {
    setIsCreateOpen(true);
  };

  const handleCreateConfirm = (name: string, description: string) => {
    const newId = `workflow-${Date.now().toString().slice(-4)}`;
    sessionStorage.setItem(`pending_wf_${newId}`, JSON.stringify({ name, description }));
    window.open(`/workflows/${newId}`, '_blank');
    setIsCreateOpen(false);
  };

  const handleCategoryClick = (cat: string) => {
    setActiveCategory(activeCategory === cat ? null : cat);
  };

  const handleDragStart = (event: React.DragEvent, nodeType: NodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const fetchMcpServers = useCallback(() => {
    if (activeCategory !== 'mcp') return;
    setMcpLoading(true);
    client.api.mcp.servers
      .$get({}, { headers: authHeaders() })
      .then((r) => r.json() as any)
      .then((data) => setSavedMcpServers(data.servers || []))
      .catch(() => {})
      .finally(() => setMcpLoading(false));
  }, [activeCategory]);

  useEffect(() => {
    fetchMcpServers();
  }, [fetchMcpServers]);

  const [marketplaceOpen, setMarketplaceOpen] = useState(false);
  const [marketplaceTab, setMarketplaceTab] = useState<'registry' | 'myservers'>('registry');
  const [savedMcpServers, setSavedMcpServers] = useState<any[]>([]);
  const [mcpLoading, setMcpLoading] = useState(false);
  const [historyPanelOpen, setHistoryPanelOpen] = useState(false);

  const paletteItems = {
    triggers: [
      {
        type: 'trigger',
        label: 'Manual Trigger',
        icon: Play,
        detail: 'Trigger workflow manually or on a schedule.',
      },
      {
        type: 'input_trigger',
        label: 'Input Trigger',
        icon: Play,
        detail: 'Enter initial instruction text to feed to the workflow.',
      },
    ],
    agents: [
      {
        type: 'agent',
        label: 'Worker Agent',
        icon: Bot,
        detail: 'Preconfigured workers grouped by capability.',
      },
      {
        type: 'supervisor',
        label: 'Supervisor Agent',
        icon: Brain,
        detail: 'Supervisor node to coordinate and negotiate conflicts.',
      },
    ],
  };

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

        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="w-9 h-9 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-all"
          title="Workflows"
        >
          <LayoutDashboard className="w-4 h-4" />
        </a>
        <button
          onClick={() => setHistoryPanelOpen(true)}
          className="w-9 h-9 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-all cursor-pointer"
          title="Execution History"
        >
          <History className="w-4 h-4" />
        </button>

        <div className="w-full border-t border-[#cbd5e1]" />

        <button
          onClick={() => {
            setCollapsed(false);
            setActiveCategory('triggers');
          }}
          className={`w-9 h-9 flex items-center justify-center transition-all cursor-pointer ${
            activeCategory === 'triggers'
              ? 'text-white bg-[#f97316]'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200'
          }`}
          title="Triggers"
        >
          <Play className="w-4 h-4" />
        </button>

        <button
          onClick={() => {
            setCollapsed(false);
            setActiveCategory('agents');
          }}
          className={`w-9 h-9 flex items-center justify-center transition-all cursor-pointer ${
            activeCategory === 'agents'
              ? 'text-white bg-[#f97316]'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200'
          }`}
          title="Agents"
        >
          <Bot className="w-4 h-4" />
        </button>

        <button
          onClick={() => {
            setCollapsed(false);
            setActiveCategory('mcp');
          }}
          className={`w-9 h-9 flex items-center justify-center transition-all cursor-pointer ${
            activeCategory === 'mcp'
              ? 'text-white bg-[#f97316]'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200'
          }`}
          title="MCP Tools"
        >
          <Wrench className="w-4 h-4" />
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
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2 text-xs font-mono font-bold text-slate-600 hover:bg-slate-200 transition-all rounded-none"
          >
            <LayoutDashboard className="w-4 h-4 text-slate-500" />
            <span>Workflows</span>
          </a>
          <button
            onClick={() => setHistoryPanelOpen(true)}
            className="w-full flex items-center gap-3 px-3 py-2 text-xs font-mono font-bold text-slate-600 hover:bg-slate-200 transition-all rounded-none cursor-pointer"
            title="Execution History"
          >
            <History className="w-4 h-4 text-slate-500" />
            <span>History</span>
          </button>
        </div>

        {/* Divider */}
        <div className="mx-4 border-t border-[#cbd5e1] mb-2" />

        {/* Navigation Categories */}
        <div className="px-2 space-y-1" data-tour="palette">
          {/* Triggers */}
          <button
            onClick={() => handleCategoryClick('triggers')}
            className={`w-full flex items-center justify-between px-3 py-2 text-xs font-mono font-bold transition-all rounded-none ${
              activeCategory === 'triggers'
                ? 'bg-[#f97316] text-white'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <Play
                className={`w-4 h-4 ${activeCategory === 'triggers' ? 'text-white' : 'text-slate-500'}`}
              />
              <span>Triggers</span>
            </div>
            {activeCategory === 'triggers' ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </button>

          {activeCategory === 'triggers' && (
            <div
              className="py-1 px-1 bg-white border border-[#e2e8f0] shadow-sm space-y-1 mt-0.5"
              data-tour="palette-triggers"
            >
              {paletteItems.triggers.map((item, idx) => (
                <div
                  key={idx}
                  draggable
                  onDragStart={(e) => handleDragStart(e, item.type as NodeType)}
                  onClick={() => addNode(item.type as NodeType)}
                  className="p-2 hover:bg-[#eff6ff] hover:text-[#2563eb] cursor-grab active:cursor-grabbing text-xs text-slate-700 font-semibold border-b border-slate-100 last:border-0 transition-colors"
                >
                  <span className="font-mono text-[9px] bg-slate-100 text-slate-500 px-1 mr-1.5 uppercase rounded-none">
                    TRIGGER
                  </span>
                  {item.label}
                </div>
              ))}
            </div>
          )}

          {/* Agents */}
          <button
            onClick={() => handleCategoryClick('agents')}
            className={`w-full flex items-center justify-between px-3 py-2 text-xs font-mono font-bold transition-all rounded-none ${
              activeCategory === 'agents'
                ? 'bg-[#f97316] text-white'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <Bot
                className={`w-4 h-4 ${activeCategory === 'agents' ? 'text-white' : 'text-slate-500'}`}
              />
              <span>Agents</span>
            </div>
            {activeCategory === 'agents' ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </button>

          {activeCategory === 'agents' && (
            <div
              className="py-1 px-1 bg-white border border-[#e2e8f0] shadow-sm space-y-1 mt-0.5"
              data-tour="palette-agents"
            >
              {paletteItems.agents.map((item, idx) => (
                <div
                  key={idx}
                  draggable
                  onDragStart={(e) => handleDragStart(e, item.type as NodeType)}
                  onClick={() => {
                    if (item.type === 'agent') {
                      onOpenWorkerCatalog(null);
                    } else {
                      addNode(item.type as NodeType);
                    }
                  }}
                  className="p-2 hover:bg-[#eff6ff] hover:text-[#2563eb] cursor-grab active:cursor-grabbing text-xs text-slate-700 font-semibold border-b border-slate-100 last:border-0 transition-colors"
                >
                  <span className="font-mono text-[9px] bg-slate-100 text-slate-500 px-1 mr-1.5 uppercase rounded-none">
                    {item.type === 'supervisor' ? 'SUPERVISOR' : 'WORKER'}
                  </span>
                  {item.label}
                </div>
              ))}
            </div>
          )}

          {/* MCP Tools */}
          <button
            onClick={() => handleCategoryClick('mcp')}
            className={`w-full flex items-center justify-between px-3 py-2 text-xs font-mono font-bold transition-all rounded-none ${
              activeCategory === 'mcp'
                ? 'bg-[#f97316] text-white'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <Wrench
                className={`w-4 h-4 ${activeCategory === 'mcp' ? 'text-white' : 'text-slate-500'}`}
              />
              <span>MCP Tools</span>
            </div>
            {activeCategory === 'mcp' ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </button>

          {activeCategory === 'mcp' && (
            <div
              className="py-1 px-1 bg-white border border-[#e2e8f0] shadow-sm space-y-1 mt-0.5"
              data-tour="palette-mcp"
            >
              {/* Saved MCP Servers (top 5) */}
              {mcpLoading ? (
                <div className="flex items-center justify-center py-2 text-slate-400">
                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                  <span className="text-[10px] font-mono">Loading...</span>
                </div>
              ) : savedMcpServers.length > 0 ? (
                <div>
                  <span className="block text-[8px] font-mono font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                    Saved MCPs
                  </span>
                  {savedMcpServers.slice(0, 5).map((svr: any) => (
                    <div
                      key={svr.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, 'mcp_tool' as NodeType)}
                      onClick={() =>
                        addNode('mcp_tool' as NodeType, undefined, {
                          label: svr.name,
                          mcpServerUrl: svr.url,
                          mcpServerId: svr.id,
                          iconUrl: svr.iconUrl,
                        })
                      }
                      className="p-2 hover:bg-[#eff6ff] hover:text-[#2563eb] cursor-grab active:cursor-grabbing text-xs text-slate-700 font-semibold border-b border-slate-100 last:border-0 transition-colors flex items-center gap-1.5"
                    >
                      {svr.iconUrl ? (
                        <img
                          src={svr.iconUrl}
                          alt=""
                          className="w-3.5 h-3.5 rounded object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <Wrench className="w-3 h-3 text-purple-500 flex-shrink-0" />
                      )}
                      <span className="truncate">{svr.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[10px] text-slate-400 font-mono px-2 py-2 text-center">
                  No saved MCPs yet.
                </div>
              )}

              {/* Check more of your servers */}
              <button
                onClick={() => {
                  setMarketplaceTab('myservers');
                  setMarketplaceOpen(true);
                }}
                className="w-full p-2 text-xs font-mono font-bold text-slate-600 border border-dashed border-slate-300 hover:border-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Your MCPs
              </button>

              {/* Explore other servers (opens registry) */}
              <button
                onClick={() => {
                  setMarketplaceTab('registry');
                  setMarketplaceOpen(true);
                }}
                className="w-full p-2 flex items-center justify-center gap-2 text-xs font-mono font-bold text-purple-700 bg-purple-50 border border-purple-200 hover:bg-purple-100 transition-colors cursor-pointer"
              >
                <Store className="w-3.5 h-3.5" />
                Explore MCPs
              </button>

              {/* Manual Add */}
              <button
                onClick={() => {
                  addNode('mcp_tool' as NodeType, undefined, {
                    label: 'Custom MCP',
                    mcpServerUrl: '',
                  });
                }}
                className="w-full p-2 flex items-center justify-center gap-2 text-xs font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Custom MCPs
              </button>
            </div>
          )}

          {marketplaceOpen && (
            <MCPMarketplace
              onClose={() => {
                setMarketplaceOpen(false);
                fetchMcpServers();
              }}
              initialTab={marketplaceTab}
            />
          )}

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
