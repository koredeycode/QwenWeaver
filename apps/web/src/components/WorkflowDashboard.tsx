import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Play, 
  Plus, 
  Bot, 
  Brain, 
  Wrench, 
  User, 
  FolderOpen
} from 'lucide-react';
import { useStore } from '../store/index.js';
import { MOCK_WORKFLOWS, MockWorkflow } from '../lib/mock-workflows.js';
import { CreateWorkflowDialog } from './CreateWorkflowDialog.js';

export const WorkflowDashboard = () => {
  const navigate = useNavigate();
  const mockMode = useStore((s) => s.mockMode);
  const setMockMode = useStore((s) => s.setMockMode);
  const user = useStore((s) => s.user);
  const logout = useStore((s) => s.logout);
  const clearGraph = useStore((s) => s.clearGraph);

  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const handleCreateNew = () => {
    setIsCreateOpen(true);
  };

  const handleCreateConfirm = (name: string, description: string) => {
    clearGraph();
    const newId = `workflow-${Date.now().toString().slice(-4)}`;
    sessionStorage.setItem(`pending_wf_${newId}`, JSON.stringify({ name, description }));
    navigate(`/workflows/${newId}`);
    setIsCreateOpen(false);
  };

  const getNodeCount = (workflow: MockWorkflow, type: string) => {
    return workflow.nodes.filter(n => {
      if (type === 'trigger') return n.type === 'trigger' || n.type === 'input_trigger';
      return n.type === type;
    }).length;
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[#f8fafc] text-slate-800 select-none overflow-hidden font-sans">
      {/* Top Header */}
      <header className="h-14 bg-white border-b border-[#cbd5e1] flex items-center justify-between px-6 z-20 flex-shrink-0">
        {/* Left: Tab Selectors */}
        <div className="flex items-center gap-6 h-full">
          <Link
            to="/"
            className="text-sm font-bold h-full px-1 border-b-2 border-[#ea580c] text-slate-900 flex items-center justify-center transition-all"
          >
            Workflows
          </Link>
          <button
            className="text-sm font-semibold h-full px-1 border-b-2 border-transparent text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all cursor-not-allowed"
            title="History logs coming soon"
          >
            History
          </button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-4">
          {/* Engine Mode Toggle */}
          <div className="flex items-center gap-2 border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-mono rounded-none">
            <span className="text-slate-400">ENGINE:</span>
            <button 
              onClick={() => setMockMode(!mockMode)}
              className="flex items-center gap-1.5 font-bold hover:text-slate-800 transition-colors cursor-pointer"
              title="Toggle Mock Mode or Live Hono API"
            >
              {mockMode ? (
                <>
                  <span className="text-[#2563eb]">MOCK SIMULATOR</span>
                </>
              ) : (
                <>
                  <span className="text-[#ea580c]">LIVE HONO API</span>
                </>
              )}
            </button>
          </div>

          <button
            onClick={handleCreateNew}
            className="px-4 py-1.5 bg-[#9a3412] hover:bg-[#a73a00] text-white font-bold text-xs flex items-center gap-1.5 rounded-none transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            New Workflow
          </button>

          {/* Vertical Divider */}
          <div className="h-6 w-[1px] bg-slate-200" />

          {/* User profile / Logout */}
          {user ? (
            <button 
              onClick={logout}
              title="Logout Operator Session"
              className="p-1 hover:bg-slate-50 text-slate-500 hover:text-rose-600 flex items-center gap-1 cursor-pointer"
            >
              <User className="w-4 h-4" />
              <span className="text-xs font-mono max-w-24 truncate hidden md:inline">{user.email}</span>
            </button>
          ) : (
            <button className="p-1 hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-colors">
              <User className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Main Dashboard Panel */}
      <div className="flex-1 min-h-0 overflow-y-auto p-8 scrollbar">
        <div className="max-w-5xl mx-auto space-y-8">
          
          {/* Headline Title */}
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <span className="text-[#ea580c]">🔀</span> QWENWEAVER WORKFLOWS
            </h1>
            <p className="text-xs text-slate-500 font-mono mt-1 uppercase tracking-wide">
              Select or deploy a visual multi-agent swarm pipeline.
            </p>
          </div>

          {/* Workflows Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Create Blank Card */}
            <button
              onClick={handleCreateNew}
              className="border-2 border-dashed border-slate-300 hover:border-[#ea580c] bg-white p-6 flex flex-col items-center justify-center text-center group transition-all rounded-none min-h-[220px] cursor-pointer"
            >
              <div className="w-12 h-12 bg-slate-50 group-hover:bg-orange-50 flex items-center justify-center text-slate-400 group-hover:text-[#ea580c] border border-slate-200 group-hover:border-orange-200 transition-colors mb-4">
                <Plus className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 group-hover:text-[#ea580c] transition-colors">Deploy Blank Workflow</h3>
              <p className="text-[11px] text-slate-400 mt-1 max-w-[200px] leading-relaxed">
                Initialize an empty canvas workspace and build a swarm DAG from scratch.
              </p>
            </button>

            {/* List Mock Workflows */}
            {MOCK_WORKFLOWS.map((wf) => {
              const triggersCount = getNodeCount(wf, 'trigger');
              const agentsCount = getNodeCount(wf, 'agent');
              const supervisorsCount = getNodeCount(wf, 'supervisor');
              const toolsCount = getNodeCount(wf, 'mcp_tool');

              return (
                <div 
                  key={wf.id}
                  className="bg-white border-2 border-slate-200 hover:border-[#ea580c] p-6 flex flex-col justify-between shadow-sm hover:shadow-md transition-all rounded-none min-h-[220px] group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <FolderOpen className="w-5 h-5 text-slate-400 group-hover:text-[#ea580c] transition-colors" />
                      <div className="flex gap-1.5">
                        {triggersCount > 0 && (
                          <span className="flex items-center gap-0.5 text-[9px] font-mono bg-emerald-50 border border-emerald-200 text-emerald-700 px-1 py-0.5" title="Triggers">
                            {triggersCount}T
                          </span>
                        )}
                        {agentsCount > 0 && (
                          <span className="flex items-center gap-0.5 text-[9px] font-mono bg-orange-50 border border-orange-200 text-[#ea580c] px-1 py-0.5" title="Agents">
                            {agentsCount}A
                          </span>
                        )}
                        {supervisorsCount > 0 && (
                          <span className="flex items-center gap-0.5 text-[9px] font-mono bg-blue-50 border border-blue-200 text-[#2563eb] px-1 py-0.5" title="Supervisors">
                            {supervisorsCount}S
                          </span>
                        )}
                        {toolsCount > 0 && (
                          <span className="flex items-center gap-0.5 text-[9px] font-mono bg-purple-50 border border-purple-200 text-purple-700 px-1 py-0.5" title="MCP Tools">
                            {toolsCount}M
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#ea580c] transition-colors">
                        {wf.name}
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed font-sans line-clamp-3">
                        {wf.description}
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[9px] font-mono text-slate-400">ID: {wf.id}</span>
                    <Link
                      to={`/workflows/${wf.id}`}
                      className="px-3 py-1 bg-slate-900 hover:bg-[#9a3412] text-white text-[10px] font-mono font-bold transition-all"
                    >
                      OPEN EDITOR →
                    </Link>
                  </div>
                </div>
              );
            })}

          </div>
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
