import {
  Background,
  MiniMap,
  Panel,
  ReactFlow,
  useReactFlow
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toPng } from 'html-to-image';

import type { NodeType } from '@qwenweaver/types';
import { EXAMPLE_WORKFLOWS } from '../lib/example-workflows.js';
import { apiFetch, isSelfHosted, getSaaSUrl } from '../lib/api-client.js';
import { useStore } from '../store/index.js';
import { toast } from 'sonner';
import { edgeTypes } from './AnimatedEdge.js';
import { CopilotOverlay } from './CopilotOverlay.js';
import { nodeTypes } from './CustomNodes.js';
import { GanttMetrics } from './GanttMetrics.js';
import { Inspector } from './Inspector.js';
import { Sidebar } from './Sidebar.js';

import {
  ChevronDown,
  ChevronLeft,
  Download,
  Image,
  Info,
  Keyboard,
  Play,
  RefreshCw,
  Save,
  Settings,
  Square,
  Trash2,
  Upload,
  User,
  Wrench,
  X,
  LogOut,
} from 'lucide-react';

import { CustomZoomControls } from './CustomZoomControls.js';
import { ExportWorkflowModal } from './ExportWorkflowModal.js';
import { ImportWorkflowModal } from './ImportWorkflowModal.js';
import { MaximizedNodeOverlay } from './MaximizedNodeOverlay.js';
import { SaveWorkflowDialog } from './SaveWorkflowDialog.js';
import { PublishTemplateDialog } from './PublishTemplateDialog.js';

export const CanvasWorkspace = () => {
  const nodes = useStore((s) => s.nodes);
  const edges = useStore((s) => s.edges);
  const onNodesChange = useStore((s) => s.onNodesChange);
  const onEdgesChange = useStore((s) => s.onEdgesChange);
  const onConnect = useStore((s) => s.onConnect);
  const selectNode = useStore((s) => s.selectNode);
  const addNode = useStore((s) => s.addNode);
  const rearrangeGraph = useStore((s) => s.rearrangeGraph);
  const clearGraph = useStore((s) => s.clearGraph);
  const loadWorkflow = useStore((s) => s.loadWorkflow);

  const workflowName = useStore((s) => s.workflowName);
  const workflowDescription = useStore((s) => s.workflowDescription);
  const workflowId = useStore((s) => s.workflowId);
  const setWorkflowMeta = useStore((s) => s.setWorkflowMeta);
  const maximizedNodeId = useStore((s) => s.maximizedNodeId);
  const setMaximizedNodeId = useStore((s) => s.setMaximizedNodeId);

  const status = useStore((s) => s.executionStatus);
  const runWorkflow = useStore((s) => s.runWorkflow);
  const stopWorkflow = useStore((s) => s.stopWorkflow);
  const user = useStore((s) => s.user);
  const credits = useStore((s) => s.credits);
  const fetchCredits = useStore((s) => s.fetchCredits);
  const logout = useStore((s) => s.logout);

  const reactFlowInstance = useReactFlow();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const [toolsOpen, setToolsOpen] = useState(false);
  const toolsRef = useRef<HTMLDivElement>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
      if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) {
        setToolsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (user) fetchCredits();
  }, [user]);

  useEffect(() => {
    if (id) {
      if (id === 'unsaved') return;

      const isMock = EXAMPLE_WORKFLOWS.some((w) => w.id === id);
      if (isMock) {
        loadWorkflow(id);
      } else {
        // Check for forked workflow data in localStorage
        const forkedRaw = localStorage.getItem(`forked_wf_${id}`);
        if (forkedRaw) {
          try {
            const { workflowData, name } = JSON.parse(forkedRaw);
            if (workflowData?.nodes && workflowData?.edges) {
              const store = useStore.getState();
              store.clearGraph();
              store.setWorkflowMeta(name || '', '');
              // Directly set nodes/edges like loadWorkflow does, bypassing importWorkflow validation
              useStore.setState({
                nodes: workflowData.nodes as any,
                edges: workflowData.edges as any,
                selectedNodeId: null,
                maximizedNodeId: null,
              });
              store.rearrangeGraph();
              localStorage.removeItem(`forked_wf_${id}`);
              return;
            }
          } catch { /* ignore invalid JSON */ }
        }

        // Try to load from API (saved workflow from the server)
        apiFetch(`/api/workflow/detail/${id}`)
          .then(r => r.ok ? r.json() : null)
          .then(wf => {
            if (!wf || !wf.nodes || !wf.edges) {
              clearGraph();
              const pendingRaw = sessionStorage.getItem(`pending_wf_${id}`);
              if (pendingRaw) {
                try {
                  const { name, description } = JSON.parse(pendingRaw);
                  setWorkflowMeta(name, description || '');
                } catch { /* ignore invalid JSON */ }
              }
              return;
            }
            useStore.setState({
              nodes: wf.nodes.map((n: any) => ({
                id: n.id,
                type: n.type,
                position: { x: n.positionX, y: n.positionY },
                data: n.data,
              })),
              edges: wf.edges.map((e: any) => ({
                id: e.id,
                source: e.sourceNode,
                target: e.targetNode,
                sourceHandle: e.sourceHandle ?? undefined,
                targetHandle: e.targetHandle ?? undefined,
                type: 'animated',
              })),
              selectedNodeId: null,
              maximizedNodeId: null,
              workflowId: wf.id,
              workflowName: wf.name,
              workflowDescription: wf.description ?? '',
            });
          })
          .catch(() => {
            clearGraph();
            const pendingRaw = sessionStorage.getItem(`pending_wf_${id}`);
            if (pendingRaw) {
              try {
                const { name, description } = JSON.parse(pendingRaw);
                setWorkflowMeta(name, description || '');
              } catch { /* ignore invalid JSON */ }
            }
          });
      }
    }
  }, [id, loadWorkflow, clearGraph, setWorkflowMeta, rearrangeGraph]);

  const initialFitDone = useRef(false);

  useEffect(() => {
    if (nodes.length > 0 && !initialFitDone.current) {
      initialFitDone.current = true;
      const timer = setTimeout(() => {
        reactFlowInstance.fitView({ duration: 200 });
      }, 50);
      return () => clearTimeout(timer);
    }
    if (nodes.length === 0) {
      initialFitDone.current = false;
    }
  }, [nodes.length, reactFlowInstance]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(() => {
    const saved = localStorage.getItem('qwenweaver_shortcuts_open');
    return saved !== 'false';
  });

  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);

  // Keyboard Shortcuts Bindings Listener
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      if (isInput) return;

      // 1. Run Swarm: Ctrl + Enter or Cmd + Enter
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        if (status !== 'running' && nodes.length > 0) {
          runWorkflow();
        }
      }

      // 2. Rearrange Layout or Toggle Lock: Ctrl + L (without shift) or Ctrl + Shift + L
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'l') {
        event.preventDefault();
        if (event.shiftKey) {
          setIsLocked((prev) => !prev);
        } else {
          rearrangeGraph();
        }
      }

      // 3. Zoom In: Ctrl + = or Ctrl + +
      if ((event.ctrlKey || event.metaKey) && (event.key === '=' || event.key === '+')) {
        event.preventDefault();
        reactFlowInstance.zoomIn();
      }

      // 4. Zoom Out: Ctrl + -
      if ((event.ctrlKey || event.metaKey) && event.key === '-') {
        event.preventDefault();
        reactFlowInstance.zoomOut();
      }

      // 5. Clear Canvas: Ctrl + Alt + C
      if ((event.ctrlKey || event.metaKey) && event.altKey && event.key.toLowerCase() === 'c') {
        event.preventDefault();
        setIsClearConfirmOpen(true);
      }

      // 6. Close Maximized Node or Deselect Node: Escape
      if (event.key === 'Escape') {
        event.preventDefault();
        if (maximizedNodeId) {
          setMaximizedNodeId(null);
        } else {
          selectNode(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [status, nodes.length, runWorkflow, rearrangeGraph, clearGraph, selectNode, reactFlowInstance, maximizedNodeId, setMaximizedNodeId]);

  // Handle Drag-and-drop drop trigger
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    if (isLocked || status === 'running') return;
    const type = event.dataTransfer.getData('application/reactflow') as NodeType;
    if (!type) return;

    const position = reactFlowInstance.screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });

    addNode(type, position);
  }, [reactFlowInstance, addNode, isLocked, status]);

  const handleNodeClick = useCallback((_: any, node: any) => {
    selectNode(node.id);
    setIsSidebarOpen(true);
  }, [selectNode]);

  const [isDescOpen, setIsDescOpen] = useState(false);
  const descRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (descRef.current && !descRef.current.contains(e.target as Node)) {
        setIsDescOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePaneClick = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  return (
    <div className="h-dvh w-screen flex flex-row bg-[#f8fafc] text-slate-800 select-none overflow-x-hidden overflow-y-auto">
      
      {/* Left Sidebar extends to the top/bottom of viewport */}
      <Sidebar />

      {/* Center Column: Header Toolbar, Canvas Workspace, Metrics Panel */}
      <div className="flex-1 h-full flex flex-col min-w-0 bg-[#f8fafc] relative">
        
        {/* ─── Top Header (Matches screenshots exactly) ────────────────────────── */}
        <header className="h-14 bg-white border-b border-[#cbd5e1] flex items-center justify-between px-6 z-20 flex-shrink-0">
          
          {/* Left: Workflow name + info */}
          <div className="flex items-center gap-3 h-full">
            {workflowName && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900">{workflowName}</span>
                {workflowDescription && (
                  <div className="relative" ref={descRef}>
                    <button
                      onClick={() => setIsDescOpen(!isDescOpen)}
                      className="p-0.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                      title="Workflow description"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                    {isDescOpen && (
                      <div className="absolute top-full left-0 mt-1 w-72 bg-white border border-slate-200 shadow-lg z-50 p-3 text-xs text-slate-600 font-sans leading-relaxed">
                        {workflowDescription}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: Actions, Deploy, Run, Settings, Profile */}
          <div className="flex items-center gap-4">

            {/* Tools Dropdown (secondary actions) */}
            <div className="relative" ref={toolsRef}>
              <button
                onClick={() => setToolsOpen(!toolsOpen)}
                disabled={nodes.length === 0}
                className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1.5 rounded-none hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                title="More tools"
              >
                <Wrench className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden md:inline">More</span>
              </button>

              {toolsOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 shadow-lg z-50 flex flex-col">
                  <button onClick={() => { rearrangeGraph(); setToolsOpen(false); }} className="flex items-center gap-3 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer border-b border-slate-100" title="Auto-arrange nodes in clean columns">
                    <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                    Smart Arrange
                  </button>
                  <button onClick={async () => { setToolsOpen(false); if (!canvasRef.current) return; const toHide = canvasRef.current.querySelectorAll<HTMLElement>('[data-export-hide]'); toHide.forEach(el => el.style.display = 'none'); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); try { const dataUrl = await toPng(canvasRef.current, { backgroundColor: '#ffffff', pixelRatio: 3, cacheBust: true }); toHide.forEach(el => el.style.display = ''); const link = document.createElement('a'); link.download = `qwen-workflow-${Date.now()}.png`; link.href = dataUrl; link.click(); toast.success('Canvas exported as PNG'); } catch { toHide.forEach(el => el.style.display = ''); toast.error('Failed to export image'); } }} disabled={nodes.length === 0} className="flex items-center gap-3 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer border-b border-slate-100" title="Download canvas as PNG image">
                    <Image className="w-3.5 h-3.5 text-slate-500" />
                    Export to PNG
                  </button>
                  <button onClick={() => { setIsImportOpen(true); setToolsOpen(false); }} className="flex items-center gap-3 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer border-b border-slate-100" title="Import a workflow from JSON text or file">
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    Import
                  </button>
                  <button onClick={() => { setIsExportOpen(true); setToolsOpen(false); }} className="flex items-center gap-3 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer border-b border-slate-100" title="Export current workflow config">
                    <Upload className="w-3.5 h-3.5 text-slate-500" />
                    Export
                  </button>
                  {workflowId && nodes.length > 0 && (
                    <button onClick={() => { if (isSelfHosted()) { window.location.href = getSaaSUrl() + '/login?redirect=/templates/new'; } else { setPublishDialogOpen(true); } setToolsOpen(false); }} className="flex items-center gap-3 px-3 py-2 text-xs text-purple-700 hover:bg-purple-50 transition-colors cursor-pointer border-b border-slate-100" title="Publish as template">
                      <Upload className="w-3.5 h-3.5" />
                      Publish
                    </button>
                  )}
                  <button onClick={() => { setIsClearConfirmOpen(true); setToolsOpen(false); }} disabled={nodes.length === 0} className="flex items-center gap-3 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer" title="Clear entire canvas">
                    <Trash2 className="w-3.5 h-3.5" />
                    Clear
                  </button>
                </div>
              )}
            </div>

            {/* Save Workflow Button (only shown for unsaved workflows) */}
            {!workflowId && (
              <button
                onClick={() => setSaveDialogOpen(true)}
                disabled={nodes.length === 0}
                className="px-3.5 py-1.5 bg-[#9a3412] hover:bg-[#a73a00] text-white font-bold text-xs flex items-center gap-1.5 rounded-none transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                title="Save this workflow"
              >
                <Save className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Save</span>
              </button>
            )}

            {/* Run Workflow / Kill Button (Solid Rust-Orange) */}
            {status === 'running' ? (
              <button
                onClick={stopWorkflow}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 rounded-none transition-colors cursor-pointer"
              >
                <Square className="w-3.5 h-3.5 fill-white" />
                <span className="hidden md:inline">Kill Swarm</span>
              </button>
            ) : (
              <button
                onClick={runWorkflow}
                disabled={nodes.length === 0}
                className="px-4 py-1.5 bg-[#9a3412] hover:bg-[#a73a00] text-white font-bold text-xs flex items-center gap-1.5 rounded-none transition-colors disabled:opacity-30 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-white text-white" />
                <span className="hidden md:inline">Run Workflow</span>
              </button>
            )}

            {/* Vertical Divider */}
            <div className="h-6 w-[1px] bg-slate-200" />

            {/* Settings cog */}
            <button className="p-1 hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer" title="Settings">
              <Settings className="w-4 h-4" />
            </button>

            {/* User profile / Logout */}
            {user ? (
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-1.5 p-1 hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  <User className="w-4 h-4" />
                  <span className="text-xs font-mono max-w-24 truncate hidden md:inline">{user.email}</span>
                  {credits && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-none ${credits.lowBalance ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                      {credits.balance}
                    </span>
                  )}
                  <ChevronDown className="w-3 h-3" />
                </button>
                {profileOpen && (
                  <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-slate-200 shadow-lg z-50">
                    <div className="px-3 py-2 text-xs text-slate-500 font-mono border-b border-slate-100 truncate">
                      {user.email}
                    </div>
                    {credits && (
                      <div className="px-3 py-2 text-xs border-b border-slate-100 space-y-1">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Credits</span>
                          <span className={`font-bold ${credits.lowBalance ? 'text-amber-600' : 'text-slate-700'}`}>{credits.balance}</span>
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

        {/* Workspace Layout: Split horizontally into Canvas/Metrics and Inspector */}
        <div className="flex-1 w-full min-h-0 flex flex-row relative bg-[#f8fafc]">
          
          {/* Main workspace container (Canvas + Gantt) */}
          <div className="flex-1 h-full flex flex-col min-w-0 relative">
            {/* React Flow Workspace Canvas */}
            <div ref={canvasRef} className="flex-1 w-full min-h-0 relative">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onDragOver={onDragOver}
                onDrop={onDrop}
                nodeTypes={nodeTypes as any}
                edgeTypes={edgeTypes as any}
                onNodeClick={handleNodeClick}
                onPaneClick={handlePaneClick}
                fitView
                minZoom={0.2}
                maxZoom={1.5}
                nodesDraggable={!isLocked && status !== 'running'}
                nodesConnectable={!isLocked && status !== 'running'}
                elementsSelectable={!isLocked && status !== 'running'}
                deleteKeyCode={isLocked || status === 'running' ? null : ['Backspace', 'Delete']}
              >
                <Background 
                  color="#cbd5e1" 
                  gap={16} 
                  size={1} 
                  className="opacity-40"
                />
                <div data-export-hide="true">
                  <CustomZoomControls isLocked={isLocked} onToggleLock={() => setIsLocked(!isLocked)} />
                </div>
                <div data-export-hide="true">
                {isShortcutsOpen ? (
                  <Panel position="bottom-left" className="ml-0 mb-0 bg-white border border-[#cbd5e1] p-2.5 font-mono text-[10px] text-slate-500 shadow-sm flex flex-col gap-1 select-none pointer-events-auto rounded-none w-[270px]">
                    <div className="flex items-center justify-between font-bold text-slate-700 border-b border-slate-100 pb-1 mb-1">
                      <span>KEYBOARD SHORTCUTS</span>
                      <button 
                        onClick={() => {
                          setIsShortcutsOpen(false);
                          localStorage.setItem('qwenweaver_shortcuts_open', 'false');
                        }}
                        className="text-slate-400 hover:text-slate-700 transition-colors p-0.5 cursor-pointer"
                        title="Hide Legend"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="flex justify-between gap-6"><span>Run Swarm:</span><kbd className="bg-slate-50 px-1 border border-slate-200 font-semibold text-slate-600 rounded-none">Ctrl + Enter</kbd></div>
                    <div className="flex justify-between gap-6"><span>Rearrange:</span><kbd className="bg-slate-50 px-1 border border-slate-200 font-semibold text-slate-600 rounded-none">Ctrl + L</kbd></div>
                    <div className="flex justify-between gap-6"><span>Toggle Lock:</span><kbd className="bg-slate-50 px-1 border border-slate-200 font-semibold text-slate-600 rounded-none">Ctrl + Shift + L</kbd></div>
                    <div className="flex justify-between gap-6"><span>Zoom In/Out:</span><kbd className="bg-slate-50 px-1 border border-slate-200 font-semibold text-slate-600 rounded-none">Ctrl + + / -</kbd></div>
                    <div className="flex justify-between gap-6"><span>Clear Canvas:</span><kbd className="bg-slate-50 px-1 border border-slate-200 font-semibold text-slate-600 rounded-none">Ctrl + Alt + C</kbd></div>
                    <div className="flex justify-between gap-6"><span>Delete Edge:</span><kbd className="bg-slate-50 px-1 border border-slate-200 font-semibold text-slate-600 rounded-none">Click Edge + Backspace</kbd></div>
                    <div className="flex justify-between gap-6"><span>Deselect:</span><kbd className="bg-slate-50 px-1 border border-slate-200 font-semibold text-slate-600 rounded-none">Esc</kbd></div>
                  </Panel>
                ) : (
                  <div data-export-hide="true">
                  <Panel position="bottom-left" className="ml-0 mb-0 pointer-events-auto">
                    <button
                      onClick={() => {
                        setIsShortcutsOpen(true);
                        localStorage.setItem('qwenweaver_shortcuts_open', 'true');
                      }}
                      className="bg-white border border-[#cbd5e1] p-1.5 hover:bg-slate-50 text-slate-500 hover:text-slate-700 shadow-sm rounded-none text-[10px] font-mono font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                      title="Show Keyboard Shortcuts"
                    >
                      <Keyboard className="w-3.5 h-3.5 text-slate-400" />
                      Shortcuts (?)
                    </button>
                  </Panel>
                  </div>
                )}
                </div>
                <div data-export-hide="true">
                <MiniMap 
                  style={{ height: 100, width: 140, background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 0 }}
                  nodeColor={(node) => {
                    switch (node.type) {
                      case 'trigger':
                        return '#10b981'; // Green
                      case 'agent':
                        return '#ea580c'; // Orange
                      case 'supervisor':
                        return '#2563eb'; // Blue
                      case 'mcp_tool':
                        return '#8b5cf6'; // Purple
                      default:
                        return '#cbd5e1'; // Slate
                    }
                  }}
                  maskColor="rgba(241, 245, 249, 0.4)"
                />
                </div>
              </ReactFlow>

              {/* Floating Sidebar Toggle Button (when collapsed) */}
              {!isSidebarOpen && (
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  className="absolute top-4 right-4 z-20 bg-white border border-[#cbd5e1] p-2 hover:bg-slate-50 text-slate-700 shadow-sm rounded-none transition-colors cursor-pointer"
                  title="Open Properties Panel"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Observability Board centered vertically next to Canvas */}
            <div className="flex-shrink-0">
              <GanttMetrics />
            </div>
          </div>

          {/* Right Properties Panel Inspector sits under the top nav header */}
          {isSidebarOpen && <Inspector onClose={() => setIsSidebarOpen(false)} />}
        </div>
      </div>

      {/* Draggable Qwen Copilot Floating Chat Assistant */}
      <CopilotOverlay />

      {/* Maximized Node Terminal Dialog Overlay */}
      <MaximizedNodeOverlay />

      {/* Import Workflow Configuration Modal */}
      <ImportWorkflowModal 
        isOpen={isImportOpen} 
        onClose={() => setIsImportOpen(false)} 
      />

      {/* Export Workflow Configuration Modal */}
      <ExportWorkflowModal 
        isOpen={isExportOpen} 
        onClose={() => setIsExportOpen(false)} 
        nodes={nodes} 
        edges={edges} 
        workflowId={id} 
      />

      {/* Clear Canvas Confirmation Dialog */}
      {isClearConfirmOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[999] flex items-center justify-center p-6 select-text pointer-events-auto"
          onClick={() => setIsClearConfirmOpen(false)}
        >
          <div
            className="bg-white border-2 border-slate-900 shadow-2xl rounded-none w-full max-w-md flex flex-col relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white text-slate-800 px-6 py-4 flex items-center justify-between border-b border-slate-200">
              <h2 className="text-sm font-bold font-mono text-slate-800 tracking-tight">CLEAR CANVAS</h2>
              <button
                onClick={() => setIsClearConfirmOpen(false)}
                className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-600 font-sans">
                Are you sure you want to clear the canvas? This will remove all nodes and edges.
              </p>
            </div>
            <div className="bg-slate-50 px-6 py-3 flex items-center justify-between border-t border-slate-200">
              <button
                onClick={() => setIsClearConfirmOpen(false)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-mono font-bold transition-all rounded-none cursor-pointer"
              >
                CANCEL
              </button>
              <button
                onClick={() => {
                  clearGraph();
                  setIsClearConfirmOpen(false);
                }}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-mono font-bold transition-all rounded-none cursor-pointer"
              >
                CLEAR CANVAS
              </button>
            </div>
          </div>
        </div>
      )}

      <SaveWorkflowDialog
        isOpen={saveDialogOpen}
        initialName={workflowName}
        initialDescription={workflowDescription}
        onClose={() => setSaveDialogOpen(false)}
        onConfirm={async (name, description) => {
          try {
            const payload = {
              id: crypto.randomUUID(),
              name,
              description,
              nodes: nodes.map((n) => ({
                id: n.id,
                type: n.type,
                position: n.position,
                data: n.data,
              })),
              edges: edges.map((e) => ({
                id: e.id,
                source: e.source,
                target: e.target,
                sourceHandle: e.sourceHandle,
                targetHandle: e.targetHandle,
                type: e.type,
              })),
            };
            const res = await apiFetch('/api/workflow', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });
            if (res.status === 403) {
              const errBody = await res.json().catch(() => ({}));
              toast.error(errBody.error || 'Workflow limit reached. Delete an existing workflow first.');
              return;
            }
            if (!res.ok) throw new Error('Save failed');
            const data = await res.json();
            useStore.setState({ workflowId: data.workflowId, workflowName: name, workflowDescription: description });
            setSaveDialogOpen(false);
            navigate(`/workflows/${data.workflowId}`, { replace: true });
            toast.success('Workflow saved!');
          } catch {
            toast.error('Failed to save workflow');
          }
        }}
      />

      <PublishTemplateDialog
        isOpen={publishDialogOpen}
        initialName={workflowName}
        initialDescription={workflowDescription}
        onClose={() => setPublishDialogOpen(false)}
        onConfirm={async ({ name, description, categoryId, tags }) => {
          try {
            let thumbnail: string | undefined;
            try {
              if (canvasRef.current) {
                thumbnail = await toPng(canvasRef.current, { quality: 0.7, pixelRatio: 2 });
              }
            } catch {
              // non-blocking — thumbnail is optional
            }
            const payload = {
              name,
              description,
              categoryId,
              tags,
              thumbnail,
              workflowData: {
                nodes: nodes.map((n) => ({
                  id: n.id,
                  type: n.type,
                  position: n.position,
                  data: n.data,
                })),
                edges: edges.map((e) => ({
                  id: e.id,
                  source: e.source,
                  target: e.target,
                  sourceHandle: e.sourceHandle,
                  targetHandle: e.targetHandle,
                  type: e.type,
                })),
              },
            };
            const res = await apiFetch('/api/templates', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });
            if (!res.ok) {
              const err = await res.json().catch(() => ({}));
              throw new Error(err.error || 'Publish failed');
            }
            const data = await res.json();
            setPublishDialogOpen(false);
            toast.success('Template published!');
          } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Failed to publish template');
          }
        }}
      />
    </div>
  );
};
