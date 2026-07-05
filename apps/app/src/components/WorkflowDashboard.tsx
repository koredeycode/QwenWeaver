import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  User,
  FolderOpen,
  Users,
  LogOut,
  ChevronDown,
  Loader2,
  Trash2,
  Image,
  Video,
  Music,
  FileText,
} from 'lucide-react';
import { useStore } from '../store/index.js';
import { client, withRefresh } from '../lib/api-client.js';
import { EXAMPLE_WORKFLOWS, ExampleWorkflow, ExampleNode } from '../lib/example-workflows.js';
import { CreateWorkflowDialog } from './CreateWorkflowDialog.js';
import { ConfirmDialog } from './ConfirmDialog.js';

interface UserWorkflow {
  id: string;
  name: string;
  description: string | null;
  createdAt: string | number;
  nodeCounts?: Record<string, number>;
}

function getMediaIcon(outputFormat?: string) {
  switch (outputFormat) {
    case 'image':
      return <Image className="w-3 h-3" />;
    case 'video':
      return <Video className="w-3 h-3" />;
    case 'audio':
      return <Music className="w-3 h-3" />;
    default:
      return <FileText className="w-3 h-3" />;
  }
}

function getMediaColor(outputFormat?: string) {
  switch (outputFormat) {
    case 'image':
      return 'text-pink-600 bg-pink-50 border-pink-200';
    case 'video':
      return 'text-indigo-600 bg-indigo-50 border-indigo-200';
    case 'audio':
      return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    default:
      return 'text-slate-500 bg-slate-50 border-slate-200';
  }
}

function getMediaLabel(outputFormat?: string) {
  switch (outputFormat) {
    case 'image':
      return 'IMG';
    case 'video':
      return 'VID';
    case 'audio':
      return 'AUD';
    default:
      return 'TXT';
  }
}

function getWorkflowMediaBadges(nodes: ExampleNode[]) {
  const seen = new Set<string>();
  return nodes
    .map((n) => {
      const fmt = n.data.outputFormat;
      if (!fmt || seen.has(fmt)) return null;
      seen.add(fmt);
      if (fmt === 'image' || fmt === 'video' || fmt === 'audio') {
        return (
          <span
            key={fmt}
            className={`flex items-center gap-0.5 text-[9px] font-mono border px-1 py-0.5 ${getMediaColor(fmt)}`}
            title={`${fmt.toUpperCase()} output`}
          >
            {getMediaIcon(fmt)}
            {getMediaLabel(fmt)}
          </span>
        );
      }
      return null;
    })
    .filter(Boolean);
}

export const WorkflowDashboard = () => {
  const navigate = useNavigate();
  const user = useStore((s) => s.user);
  const credits = useStore((s) => s.credits);
  const fetchCredits = useStore((s) => s.fetchCredits);
  const logout = useStore((s) => s.logout);
  const clearGraph = useStore((s) => s.clearGraph);
  const loadUnsavedWorkflow = useStore((s) => s.loadUnsavedWorkflow);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [userWorkflows, setUserWorkflows] = useState<UserWorkflow[]>([]);
  const [workflowsLoading, setWorkflowsLoading] = useState(true);
  const profileRef = useRef<HTMLDivElement>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserWorkflow | null>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (user) fetchCredits();
  }, [user]);

  const fetchWorkflows = () => {
    setWorkflowsLoading(true);
    (withRefresh(() => client.api.workflow.$get()) as Promise<any>)
      .then((r: any) => r.json())
      .then((data: any) => setUserWorkflows(data.workflows || []))
      .catch(() => {})
      .finally(() => setWorkflowsLoading(false));
  };

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const handleCreateNew = () => {
    setIsCreateOpen(true);
  };

  const handleCreateConfirm = async (name: string, description: string) => {
    try {
      clearGraph();

      // Create a proper workflow record in the database
      const payload = {
        name: name,
        description: description,
        nodes: [],
        edges: [],
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
      navigate(`/workflows/${result.workflowId}`);
      setIsCreateOpen(false);
    } catch (err) {
      console.error('Failed to create workflow', err);
      // Fallback to original behavior if API call fails
      clearGraph();
      const newId = `workflow-${Date.now().toString().slice(-4)}`;
      sessionStorage.setItem(`pending_wf_${newId}`, JSON.stringify({ name, description }));
      navigate(`/workflows/${newId}`);
      setIsCreateOpen(false);
    }
  };

  const handleDelete = async (wf: UserWorkflow) => {
    try {
      const res: any = await (withRefresh(() =>
        client.api.workflow.detail[':workflowId'].$delete({
          param: { workflowId: wf.id },
        }),
      ) as Promise<any>);
      if (res.ok) {
        setUserWorkflows((prev) => prev.filter((w) => w.id !== wf.id));
      }
    } catch {
      /* ignore */
    }
  };

  const handleOpenExample = async (wf: ExampleWorkflow) => {
    // Create a new workflow with the example data
    try {
      const payload = {
        name: wf.name,
        description: wf.description || '',
        nodes: wf.nodes as any,
        edges: wf.edges as any,
      };

      const res = (await withRefresh(() =>
        client.api.workflow.$post({ json: payload as any }),
      )) as any;

      if (!res.ok) {
        if (res.status === 403) {
          const errBody: Record<string, unknown> = await res.json().catch(() => ({}));
          throw new Error(String(errBody.error || 'Workflow limit reached'));
        }
        throw new Error('Failed to create workflow from example');
      }

      const result = await res.json();
      // Now load the example data into the store after creating the workflow record
      loadUnsavedWorkflow(wf.nodes as any, wf.edges as any, wf.name, wf.description);
      navigate(`/workflows/${result.workflowId}`);
    } catch (err) {
      console.error('Failed to create workflow from example', err);
      // Fallback to original behavior if API call fails
      loadUnsavedWorkflow(wf.nodes as any, wf.edges as any, wf.name, wf.description);
      navigate('/workflows/unsaved');
    }
  };

  const getNodeCount = (workflow: ExampleWorkflow, type: string) => {
    return workflow.nodes.filter((n) => {
      if (type === 'trigger')
        return n.type === 'trigger' || n.type === 'input_trigger' || n.type === 'file_trigger';
      return n.type === type;
    }).length;
  };

  const renderBadges = (counts: Record<string, number> | undefined) => {
    if (!counts) return null;
    const triggers = (counts['trigger'] ?? 0) + (counts['input_trigger'] ?? 0);
    const agents = counts['agent'] ?? 0;
    const supervisors = counts['supervisor'] ?? 0;
    const tools = counts['mcp_tool'] ?? 0;
    return (
      <div className="flex gap-1.5 flex-wrap">
        {triggers > 0 && (
          <span
            className="flex items-center gap-0.5 text-[9px] font-mono bg-emerald-50 border border-emerald-200 text-emerald-700 px-1 py-0.5"
            title="Triggers"
          >
            {triggers}T
          </span>
        )}
        {agents > 0 && (
          <span
            className="flex items-center gap-0.5 text-[9px] font-mono bg-orange-50 border border-orange-200 text-[#f97316] px-1 py-0.5"
            title="Agents"
          >
            {agents}A
          </span>
        )}
        {supervisors > 0 && (
          <span
            className="flex items-center gap-0.5 text-[9px] font-mono bg-blue-50 border border-blue-200 text-[#2563eb] px-1 py-0.5"
            title="Supervisors"
          >
            {supervisors}S
          </span>
        )}
        {tools > 0 && (
          <span
            className="flex items-center gap-0.5 text-[9px] font-mono bg-purple-50 border border-purple-200 text-purple-700 px-1 py-0.5"
            title="MCP Tools"
          >
            {tools}M
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[#f8fafc] text-slate-800 select-none overflow-hidden font-sans">
      {/* Top Header */}
      <header className="h-14 bg-white border-b border-[#cbd5e1] flex items-center justify-between px-6 z-20 flex-shrink-0">
        <div className="flex items-center gap-6 h-full">
          <Link
            to="/"
            className="text-sm font-bold h-full px-1 border-b-2 border-[#f97316] text-slate-900 flex items-center justify-center transition-all"
          >
            Workflows
          </Link>
          <Link
            to="/templates"
            className="text-sm font-semibold h-full px-1 border-b-2 border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300 flex items-center justify-center gap-1.5 transition-all"
          >
            <Users className="w-3.5 h-3.5" />
            Templates
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handleCreateNew}
            className="px-4 py-1.5 bg-[#ea580c] hover:bg-[#a73a00] text-white font-bold text-xs flex items-center gap-1.5 rounded-none transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            New Workflow
          </button>

          <div className="h-6 w-[1px] bg-slate-200" />

          {user ? (
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-1.5 p-1 hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                {user.image && (
                  <img src={user.image} alt="" className="w-5 h-5 rounded-full object-cover" />
                )}
                <span className="text-xs font-mono max-w-24 truncate hidden md:inline">
                  {user.email}
                </span>
                {credits && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-none ${credits.lowBalance ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}
                  >
                    {credits.balance}
                  </span>
                )}
                <ChevronDown className="w-3 h-3" />
              </button>
              {profileOpen && (
                <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-slate-200 shadow-lg z-[9999]">
                  <div className="px-3 py-2 text-xs text-slate-500 font-mono border-b border-slate-100 truncate">
                    {user.email}
                  </div>
                  {credits && (
                    <div className="px-3 py-2 text-xs border-b border-slate-100 space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Credits</span>
                        <span
                          className={`font-bold ${credits.lowBalance ? 'text-amber-600' : 'text-slate-700'}`}
                        >
                          {credits.balance}
                        </span>
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span>Earned</span>
                        <span>{credits.lifetimeEarned}</span>
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span>Spent</span>
                        <span>{credits.lifetimeSpent}</span>
                      </div>
                    </div>
                  )}
                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 font-semibold transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button className="p-1 hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer">
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
              QWENWEAVER WORKFLOWS
            </h1>
            <p className="text-xs text-slate-500 font-mono mt-1 uppercase tracking-wide">
              Select or deploy a visual multi-agent workflow pipeline.
            </p>
          </div>

          {/* Workflows Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Create Blank Card */}
            {/* <button
              onClick={handleCreateNew}
              className="border-2 border-dashed border-slate-300 hover:border-[#f97316] bg-white p-6 flex flex-col items-center justify-center text-center group transition-all rounded-none min-h-[220px] cursor-pointer"
            >
              <div className="w-12 h-12 bg-slate-50 group-hover:bg-orange-50 flex items-center justify-center text-slate-400 group-hover:text-[#f97316] border border-slate-200 group-hover:border-orange-200 transition-colors mb-4">
                <Plus className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 group-hover:text-[#f97316] transition-colors">
                Deploy Blank Workflow
              </h3>
              <p className="text-[11px] text-slate-400 mt-1 max-w-[200px] leading-relaxed">
                Initialize an empty canvas workspace and build a workflow DAG from scratch.
              </p>
            </button> */}

            {/* ── USER WORKFLOWS SECTION ── */}
            <div className="col-span-full">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono flex items-center gap-2">
                <FolderOpen className="w-3.5 h-3.5" />
                My Workflows
              </h2>
            </div>

            {workflowsLoading ? (
              <div className="col-span-full flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
              </div>
            ) : userWorkflows.length === 0 ? (
              /* Empty state */
              <div className="col-span-full border-2 border-dashed border-slate-200 bg-slate-50/50 p-10 flex flex-col items-center justify-center text-center">
                <FolderOpen className="w-10 h-10 text-slate-300 mb-3" />
                <h3 className="text-sm font-bold text-slate-500 mb-1">No workflows yet</h3>
                <p className="text-[11px] text-slate-400 max-w-xs leading-relaxed mb-4">
                  Create your first workflow from scratch or open one of the examples below to get
                  started.
                </p>
                <button
                  onClick={handleCreateNew}
                  className="px-4 py-2 bg-[#ea580c] hover:bg-[#a73a00] text-white text-xs font-bold font-mono transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Create Workflow
                </button>
              </div>
            ) : (
              userWorkflows.map((wf) => (
                <div
                  key={wf.id}
                  onClick={() => navigate(`/workflows/${wf.id}`)}
                  className="bg-white border-2 border-slate-200 hover:border-[#f97316] p-6 flex flex-col justify-between shadow-sm hover:shadow-md transition-all rounded-none min-h-[220px] group relative cursor-pointer"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <FolderOpen className="w-5 h-5 text-[#f97316] transition-colors" />
                      <div className="flex items-center gap-2">
                        {renderBadges(wf.nodeCounts)}
                        <span className="text-[9px] font-mono text-slate-400">saved</span>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#f97316] transition-colors">
                        {wf.name}
                      </h3>
                      {wf.description && (
                        <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed font-sans line-clamp-3">
                          {wf.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[9px] font-mono text-slate-400">
                      ID: {wf.id.slice(0, 8)}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(wf);
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Delete workflow"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-3 py-1 bg-[#ea580c] text-white text-[10px] font-mono font-bold">
                        OPEN EDITOR →
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}

            {/* ── EXAMPLE WORKFLOWS SECTION ── */}
            <div className="col-span-full mt-4">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono flex items-center gap-2">
                <FileText className="w-3.5 h-3.5" />
                Example Workflows
              </h2>
            </div>

            {EXAMPLE_WORKFLOWS.map((wf) => {
              const triggersCount = getNodeCount(wf, 'trigger');
              const agentsCount = getNodeCount(wf, 'agent');
              const supervisorsCount = getNodeCount(wf, 'supervisor');
              const toolsCount = getNodeCount(wf, 'mcp_tool');
              const mediaBadges = getWorkflowMediaBadges(wf.nodes);

              return (
                <button
                  key={wf.id}
                  onClick={() => handleOpenExample(wf)}
                  className="bg-white border-2 border-slate-200 hover:border-[#f97316] p-6 flex flex-col justify-between shadow-sm hover:shadow-md transition-all rounded-none min-h-[220px] group text-left w-full cursor-pointer"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <FolderOpen className="w-5 h-5 text-slate-400 group-hover:text-[#f97316] transition-colors" />
                      <div className="flex gap-1.5 flex-wrap">
                        {triggersCount > 0 && (
                          <span
                            className="flex items-center gap-0.5 text-[9px] font-mono bg-emerald-50 border border-emerald-200 text-emerald-700 px-1 py-0.5"
                            title="Triggers"
                          >
                            {triggersCount}T
                          </span>
                        )}
                        {agentsCount > 0 && (
                          <span
                            className="flex items-center gap-0.5 text-[9px] font-mono bg-orange-50 border border-orange-200 text-[#f97316] px-1 py-0.5"
                            title="Agents"
                          >
                            {agentsCount}A
                          </span>
                        )}
                        {supervisorsCount > 0 && (
                          <span
                            className="flex items-center gap-0.5 text-[9px] font-mono bg-blue-50 border border-blue-200 text-[#2563eb] px-1 py-0.5"
                            title="Supervisors"
                          >
                            {supervisorsCount}S
                          </span>
                        )}
                        {toolsCount > 0 && (
                          <span
                            className="flex items-center gap-0.5 text-[9px] font-mono bg-purple-50 border border-purple-200 text-purple-700 px-1 py-0.5"
                            title="MCP Tools"
                          >
                            {toolsCount}M
                          </span>
                        )}
                        {mediaBadges}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#f97316] transition-colors">
                        {wf.name}
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed font-sans line-clamp-3">
                        {wf.description}
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[9px] font-mono text-slate-400">ID: {wf.id}</span>
                    <span className="px-3 py-1 bg-slate-900 group-hover:bg-[#ea580c] text-white text-[10px] font-mono font-bold transition-all">
                      OPEN EDITOR →
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <CreateWorkflowDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onConfirm={handleCreateConfirm}
      />
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="DELETE WORKFLOW"
        message={`Permanently delete "${deleteTarget?.name}"? This cannot be undone.`}
        onConfirm={() => {
          if (deleteTarget) handleDelete(deleteTarget);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
