import { Background, MiniMap, Panel, ReactFlow, useReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toPng } from 'html-to-image';

import type { NodeType } from '@qwenweaver/types';
import { client, withRefresh } from '../lib/api-client.js';
import { isAgent, isTrigger, doesNotSupportTools } from '../utils/connection-validation.js';
import { useStore } from '../store/index.js';
import { clearDraft } from '../store/auto-save.js';
import { useCanvasShortcuts } from '../hooks/useCanvasShortcuts.js';
import { useAutoSave } from '../hooks/useAutoSave.js';
import { useWorkflowLoader } from '../hooks/useWorkflowLoader.js';
import { toast } from 'sonner';
import { edgeTypes } from './AnimatedEdge.js';
import { CopilotPanel } from './CopilotOverlay.js';
import { nodeTypes } from './CustomNodes.js';
import { GanttMetrics } from './GanttMetrics.js';
import { Inspector } from './Inspector.js';
import { Sidebar } from './Sidebar.js';
import { DockedPanel } from './DockedPanel.js';
import { pendingTouchDrag, clearPendingTouchDrag } from '../lib/touch-drag.js';

import {
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Download,
  Image,
  Info,
  Keyboard,
  LoaderCircle,
  Play,
  Redo2,
  RefreshCw,
  Save,
  Settings,
  Square,
  Trash2,
  Undo2,
  Upload,
  User,
  Wrench,
  X,
  LogOut,
  HelpCircle,
  MessageSquareCode,
  Cpu,
} from 'lucide-react';

import { CustomZoomControls } from './CustomZoomControls.js';
import { ExportWorkflowModal } from './ExportWorkflowModal.js';
import { ImportWorkflowModal } from './ImportWorkflowModal.js';
import { MaximizedNodeOverlay } from './MaximizedNodeOverlay.js';
import { SaveWorkflowDialog } from './SaveWorkflowDialog.js';
import { PublishTemplateDialog } from './PublishTemplateDialog.js';
import { ClearCanvasDialog } from './ClearCanvasDialog.js';

export const CanvasWorkspace = () => {
  const nodes = useStore((s) => s.nodes);
  const edges = useStore((s) => s.edges);
  const onNodesChange = useStore((s) => s.onNodesChange);
  const onEdgesChange = useStore((s) => s.onEdgesChange);
  const onConnect = useStore((s) => s.onConnect);
  const selectNode = useStore((s) => s.selectNode);
  const addNode = useStore((s) => s.addNode);
  const duplicateNode = useStore((s) => s.duplicateNode);
  const rearrangeGraph = useStore((s) => s.rearrangeGraph);
  const clearGraph = useStore((s) => s.clearGraph);

  const workflowName = useStore((s) => s.workflowName);
  const workflowDescription = useStore((s) => s.workflowDescription);
  const workflowId = useStore((s) => s.workflowId);
  const setWorkflowMeta = useStore((s) => s.setWorkflowMeta);
  const maximizedNodeId = useStore((s) => s.maximizedNodeId);
  const setMaximizedNodeId = useStore((s) => s.setMaximizedNodeId);

  const isDirty = useStore((s) => s.isDirty);
  const pushHistory = useStore((s) => s.pushHistory);
  const canUndo = useStore((s) => s.canUndo);
  const canRedo = useStore((s) => s.canRedo);
  const markClean = useStore((s) => s.markClean);

  const status = useStore((s) => s.executionStatus);
  const runWorkflow = useStore((s) => s.runWorkflow);
  const stopWorkflow = useStore((s) => s.stopWorkflow);
  const user = useStore((s) => s.user);
  const credits = useStore((s) => s.credits);
  const fetchCredits = useStore((s) => s.fetchCredits);
  const isTourActive = useStore((s) => s.isTourActive);
  const currentStepIndex = useStore((s) => s.currentStepIndex);
  const steps = useStore((s) => s.steps);
  const logout = useStore((s) => s.logout);

  const reactFlowInstance = useReactFlow();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  useWorkflowLoader(id);

  const [dockedPanelMode, setDockedPanelMode] = useState<'triggers' | 'agents' | 'mcp' | null>(
    null,
  );
  const [rightPanel, setRightPanel] = useState<'copilot' | 'inspector' | null>(null);
  const openRightPanel = useCallback((panel: 'copilot' | 'inspector') => {
    setDockedPanelMode(null);
    setRightPanel(panel);
  }, []);

  // Auto-fit view when side panels open/close
  useEffect(() => {
    const timer = setTimeout(() => {
      reactFlowInstance.fitView({ duration: 200 });
    }, 350);
    return () => clearTimeout(timer);
  }, [dockedPanelMode, rightPanel, reactFlowInstance]);

  // Automatically open docked panel when entering its tour step
  useEffect(() => {
    if (isTourActive && steps[currentStepIndex]?.id === 'worker-catalog') {
      setDockedPanelMode('agents');
    } else if (isTourActive && steps[currentStepIndex]?.id !== 'worker-catalog') {
      setDockedPanelMode(null);
    }
  }, [isTourActive, currentStepIndex, steps]);

  // Automatically open copilot when entering its tour step
  useEffect(() => {
    if (isTourActive && steps[currentStepIndex]?.id === 'copilot-toggle') {
      openRightPanel('copilot');
    } else if (isTourActive && steps[currentStepIndex]?.id !== 'copilot-toggle') {
      setRightPanel(null);
    }
  }, [isTourActive, currentStepIndex, steps]);

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

  // removed: useWorkflowLoader(id) handles this

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

  const [isLocked, setIsLocked] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(() => {
    const saved = localStorage.getItem('qwenweaver_shortcuts_open');
    return saved !== 'false';
  });

  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState('');
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [isMinimapVisible, setIsMinimapVisible] = useState(() => {
    const saved = localStorage.getItem('qwenweaver_minimap_visible');
    return saved !== 'false';
  });

  useCanvasShortcuts({
    status,
    nodesLength: nodes.length,
    runWorkflow,
    rearrangeGraph,
    selectNode,
    duplicateNode,
    maximizedNodeId,
    setMaximizedNodeId,
    setIsLocked,
    setIsClearConfirmOpen,
    reactFlowInstance,
  });

  const { isSaving } = useAutoSave(id, navigate);

  // Handle Drag-and-drop drop trigger
  const connectionStartRef = useRef<{ source: string; sourceHandle: string | null } | null>(null);

  const onConnectStart = useCallback((_: any, { nodeId, handleId }: any) => {
    connectionStartRef.current = { source: nodeId, sourceHandle: handleId ?? null };
  }, []);

  const onNodeDragStart = useCallback(() => {
    pushHistory();
  }, [pushHistory]);

  const onConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent) => {
      if (!connectionStartRef.current) return;

      // If released on a handle, React Flow's built-in onConnect already handled it
      const target = event.target as HTMLElement;
      if (target.closest('.react-flow__handle')) return;

      let nodeElement = target.closest('.react-flow__node');

      // Proximity snap: if not directly on a node, find nearest within snap distance
      if (!nodeElement) {
        const snapPx = 40;
        const clientX =
          'touches' in event
            ? (event as TouchEvent).changedTouches[0]!.clientX
            : (event as MouseEvent).clientX;
        const clientY =
          'touches' in event
            ? (event as TouchEvent).changedTouches[0]!.clientY
            : (event as MouseEvent).clientY;
        const sourceId = connectionStartRef.current.source;
        const flowEl = document.querySelector('.react-flow');
        if (flowEl) {
          let bestDist = Infinity;
          for (const node of nodes) {
            if (node.id === sourceId) continue;
            // Skip tools that already have an incoming edge (one tool per agent constraint)
            if (node.type === 'mcp_tool' && edges.some((e) => e.target === node.id)) continue;
            const el = flowEl.querySelector(`[data-id="${node.id}"]`) as HTMLElement | null;
            if (!el) continue;
            const r = el.getBoundingClientRect();
            const cx = Math.max(r.left, Math.min(clientX, r.right));
            const cy = Math.max(r.top, Math.min(clientY, r.bottom));
            const d = Math.hypot(clientX - cx, clientY - cy);
            if (d < bestDist) {
              bestDist = d;
              if (d < snapPx) nodeElement = el;
            }
          }
        }
      }

      if (!nodeElement || !connectionStartRef.current) return;

      const targetNodeId = nodeElement.getAttribute('data-id');
      if (!targetNodeId || targetNodeId === connectionStartRef.current.source) return;

      const targetNode = nodes.find((n) => n.id === targetNodeId);
      if (!targetNode) return;

      const sourceNode = nodes.find((n) => n.id === connectionStartRef.current!.source);
      if (!sourceNode) return;

      let sourceHandle = connectionStartRef.current.sourceHandle;

      const isAgent = (t?: string) => t === 'agent' || t === 'supervisor';
      const isTrigger = (t?: string) => t === 'trigger' || t === 'input_trigger';

      if (sourceNode.type === 'mcp_tool' && isAgent(targetNode.type)) {
        sourceHandle = 'source-bottom';
      }

      const targetHandle =
        sourceNode.type === 'mcp_tool' && isAgent(targetNode.type)
          ? 'target-bottom'
          : isAgent(targetNode.type)
            ? 'target-left'
            : targetNode.type === 'mcp_tool'
              ? 'target'
              : undefined;

      if (!targetHandle) return;

      if (isAgent(sourceNode.type) && isAgent(targetNode.type)) {
        sourceHandle = 'source-right';
      } else if (isAgent(sourceNode.type) && targetNode.type === 'mcp_tool') {
        sourceHandle = 'source-bottom';
      } else if (isTrigger(sourceNode.type) && isAgent(targetNode.type)) {
        sourceHandle = 'source';
      }

      onConnect({
        source: connectionStartRef.current.source,
        target: targetNodeId,
        sourceHandle,
        targetHandle,
      });

      connectionStartRef.current = null;
    },
    [nodes, edges, onConnect],
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      if (isLocked || status === 'running') return;
      const type = event.dataTransfer.getData('application/reactflow') as NodeType;
      if (!type) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      // Check for pre-configured node data (from docked panel drags)
      const nodeDataStr = event.dataTransfer.getData('application/qwenweaver-node-data');
      const nodeData = nodeDataStr ? JSON.parse(nodeDataStr) : undefined;

      if ((type === 'agent' || type === 'supervisor') && !nodeData) {
        setDockedPanelMode('agents');
      } else {
        addNode(type, position, nodeData);
      }
    },
    [reactFlowInstance, addNode, isLocked, status, setDockedPanelMode],
  );

  const onTouchEnd = useCallback(
    (event: React.TouchEvent) => {
      const drag = pendingTouchDrag;
      if (!drag) return;
      if (isLocked || status === 'running') {
        clearPendingTouchDrag();
        return;
      }

      const touch = event.changedTouches[0];
      if (!touch) {
        clearPendingTouchDrag();
        return;
      }

      const position = reactFlowInstance.screenToFlowPosition({
        x: touch.clientX,
        y: touch.clientY,
      });

      if ((drag.type === 'agent' || drag.type === 'supervisor') && !drag.data) {
        setDockedPanelMode('agents');
      } else {
        addNode(drag.type as NodeType, position, drag.data);
      }
      clearPendingTouchDrag();
    },
    [reactFlowInstance, addNode, isLocked, status, setDockedPanelMode],
  );

  const handleNodeClick = useCallback(
    (_: any, node: any) => {
      selectNode(node.id);
      openRightPanel('inspector');
    },
    [selectNode, openRightPanel],
  );

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
    <>
      {/* Mobile Block Element */}
      <div className="md:hidden flex flex-col items-center justify-center min-h-screen w-full bg-slate-950 text-white p-8 text-center select-none relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />
        <div className="relative z-10 space-y-6 max-w-sm">
          <div className="w-16 h-16 rounded-full bg-orange-500/10 border border-orange-500/30 flex items-center justify-center mx-auto animate-pulse">
            <Cpu className="w-8 h-8 text-orange-500" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-extrabold tracking-tight text-white font-sans">
              Desktop Screen Required
            </h2>
            <p className="text-xs leading-relaxed text-slate-400 font-mono">
              The multi-agent visual canvas is optimized for wider screens. Please log in on a
              desktop or tablet to build and orchestrate your agent networks.
            </p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 border border-slate-700 bg-slate-900 text-slate-300 font-mono text-[10px] font-bold tracking-wider hover:bg-slate-800 transition-colors uppercase cursor-pointer"
          >
            Go to Dashboard
          </button>
        </div>
      </div>

      {/* Desktop Canvas Layout */}
      <div className="hidden md:flex h-dvh w-screen flex-row bg-[#f8fafc] text-slate-800 select-none overflow-x-hidden overflow-y-auto">
        {/* Left Sidebar extends to the top/bottom of viewport */}
        <Sidebar
          onOpenDockedPanel={(mode) => {
            setDockedPanelMode(mode);
            setRightPanel(null);
          }}
        />

        {/* Center Column: Header Toolbar, Canvas Workspace, Metrics Panel */}
        <div className="flex-1 h-full flex flex-col min-w-0 bg-[#f8fafc] relative">
          {/* ─── Top Header (Matches screenshots exactly) ────────────────────────── */}
          <header className="h-14 bg-white border-b border-[#cbd5e1] flex items-center justify-between px-6 z-20 flex-shrink-0">
            {/* Left: Workflow name + info */}
            <div className="flex items-center gap-3 h-full">
              <div className="flex items-center gap-2">
                {editingTitle ? (
                  <input
                    ref={titleInputRef}
                    value={editTitleValue}
                    onChange={(e) => setEditTitleValue(e.target.value)}
                    onBlur={() => {
                      if (editTitleValue.trim() !== workflowName) {
                        setWorkflowMeta(
                          editTitleValue.trim() || 'Untitled Project',
                          workflowDescription,
                        );
                      }
                      setEditingTitle(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        (e.target as HTMLInputElement).blur();
                      }
                      if (e.key === 'Escape') {
                        setEditingTitle(false);
                      }
                    }}
                    className="text-sm font-bold text-slate-900 bg-transparent border-b border-slate-400 outline-none w-64 px-0 py-0"
                    autoFocus
                  />
                ) : (
                  <span
                    onClick={() => {
                      setEditTitleValue(workflowName);
                      setEditingTitle(true);
                      setTimeout(() => titleInputRef.current?.focus(), 0);
                    }}
                    className="text-sm font-bold text-slate-900 cursor-pointer hover:text-slate-600"
                  >
                    {workflowName || 'Untitled Project'}
                  </span>
                )}
                {isDirty && (
                  <span
                    className="w-2 h-2 rounded-full bg-orange-500 inline-block flex-shrink-0"
                    title="Unsaved changes"
                  />
                )}
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
                  data-tour="more-tools"
                >
                  <Wrench className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden md:inline">More</span>
                </button>

                {toolsOpen && (
                  <div
                    className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 shadow-lg z-50 flex flex-col"
                    data-tour="more-tools-menu"
                  >
                    <button
                      onClick={() => {
                        rearrangeGraph();
                        setTimeout(() => reactFlowInstance.fitView({ duration: 200 }), 50);
                        setToolsOpen(false);
                      }}
                      className="flex items-center gap-3 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer border-b border-slate-100"
                      title="Auto-arrange nodes in clean columns"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                      Smart Arrange
                    </button>
                    <button
                      onClick={async () => {
                        setToolsOpen(false);
                        if (!canvasRef.current) return;
                        reactFlowInstance.fitView({ duration: 0 });
                        const toHide =
                          canvasRef.current.querySelectorAll<HTMLElement>('[data-export-hide]');
                        toHide.forEach((el) => (el.style.display = 'none'));
                        await new Promise((r) =>
                          requestAnimationFrame(() => requestAnimationFrame(r)),
                        );
                        try {
                          const dataUrl = await toPng(canvasRef.current, {
                            backgroundColor: '#ffffff',
                            pixelRatio: 3,
                            cacheBust: true,
                          });
                          toHide.forEach((el) => (el.style.display = ''));
                          const link = document.createElement('a');
                          link.download = `qwen-workflow-${Date.now()}.png`;
                          link.href = dataUrl;
                          link.click();
                          toast.success('Canvas exported as PNG');
                        } catch {
                          toHide.forEach((el) => (el.style.display = ''));
                          toast.error('Failed to export image');
                        }
                      }}
                      disabled={nodes.length === 0}
                      className="flex items-center gap-3 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer border-b border-slate-100"
                      title="Download canvas as PNG image"
                    >
                      <Image className="w-3.5 h-3.5 text-slate-500" />
                      Export to PNG
                    </button>
                    <button
                      onClick={() => {
                        setIsImportOpen(true);
                        setToolsOpen(false);
                      }}
                      className="flex items-center gap-3 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer border-b border-slate-100"
                      title="Import a workflow from JSON text or file"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-500" />
                      Import
                    </button>
                    <button
                      onClick={() => {
                        setIsExportOpen(true);
                        setToolsOpen(false);
                      }}
                      className="flex items-center gap-3 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer border-b border-slate-100"
                      title="Export current workflow config"
                    >
                      <Upload className="w-3.5 h-3.5 text-slate-500" />
                      Export
                    </button>
                    {workflowId && nodes.length > 0 && (
                      <button
                        onClick={() => {
                          setPublishDialogOpen(true);
                          setToolsOpen(false);
                        }}
                        className="flex items-center gap-3 px-3 py-2 text-xs text-purple-700 hover:bg-purple-50 transition-colors cursor-pointer border-b border-slate-100"
                        title="Publish as template"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        Publish
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setIsClearConfirmOpen(true);
                        setToolsOpen(false);
                      }}
                      disabled={nodes.length === 0}
                      className="flex items-center gap-3 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Clear entire canvas"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Clear
                    </button>
                  </div>
                )}
              </div>

              {/* Save Workflow Button */}
              <button
                onClick={() => setSaveDialogOpen(true)}
                disabled={!isDirty || nodes.length === 0}
                className="px-3.5 py-1.5 bg-[#ea580c] hover:bg-[#a73a00] text-white font-bold text-xs flex items-center gap-1.5 rounded-none transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                title={!isDirty ? 'No unsaved changes' : 'Save this workflow'}
                data-tour="save-workflow"
              >
                <Save className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Save</span>
              </button>

              {/* Saving indicator */}
              {isSaving && (
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                  <LoaderCircle className="w-3 h-3 animate-spin" />
                  Saving...
                </div>
              )}

              {/* Undo / Redo buttons */}
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => useStore.getState().undo()}
                  disabled={!canUndo}
                  className="p-1.5 hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed"
                  title="Undo (Ctrl+Z)"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => useStore.getState().redo()}
                  disabled={!canRedo}
                  className="p-1.5 hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed"
                  title="Redo (Ctrl+Shift+Z)"
                >
                  <Redo2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Run Workflow / Kill Button (Solid Rust-Orange) */}
              {status === 'running' ? (
                <button
                  onClick={stopWorkflow}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 rounded-none transition-colors cursor-pointer"
                >
                  <Square className="w-3.5 h-3.5 fill-white" />
                  <span className="hidden md:inline">Kill Workflow</span>
                </button>
              ) : (
                <button
                  onClick={runWorkflow}
                  disabled={nodes.length === 0}
                  className="px-4 py-1.5 bg-[#ea580c] hover:bg-[#a73a00] text-white font-bold text-xs flex items-center gap-1.5 rounded-none transition-colors disabled:opacity-30 cursor-pointer"
                  data-tour="run-workflow"
                >
                  <Play className="w-3.5 h-3.5 fill-white text-white" />
                  <span className="hidden md:inline">Run Workflow</span>
                </button>
              )}

              {/* Vertical Divider */}
              <div className="h-6 w-[1px] bg-slate-200" />

              {/* Settings cog */}
              <button
                className="p-1 hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                title="Settings"
              >
                <Settings className="w-4 h-4" />
              </button>

              {/* User profile / Logout */}
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
                    <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-slate-200 shadow-lg z-50">
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

          {/* Workspace Layout: Split horizontally into Canvas/Metrics and Inspector */}
          <div className="flex-1 w-full min-h-0 flex flex-row relative bg-[#f8fafc]">
            {/* Main workspace container (Canvas + Gantt) */}
            <div className="flex-1 h-full flex flex-col min-w-0 relative">
              {/* Canvas + Inspector row */}
              <div className="flex-1 flex flex-row min-h-0 relative">
                {/* Canvas column: canvas + footer, width matches canvas (not behind inspector) */}
                <div className="flex-1 flex flex-col min-w-0">
                  {/* React Flow Workspace Canvas */}
                  <div
                    ref={canvasRef}
                    className="flex-1 min-h-0 relative"
                    onTouchMove={(e) => {
                      if (pendingTouchDrag) e.preventDefault();
                    }}
                    onTouchEnd={onTouchEnd}
                  >
                    <ReactFlow
                      nodes={nodes}
                      edges={edges}
                      onNodesChange={onNodesChange}
                      onEdgesChange={onEdgesChange}
                      onConnect={onConnect}
                      onConnectStart={onConnectStart}
                      onConnectEnd={onConnectEnd}
                      onNodeDragStart={onNodeDragStart}
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
                      deleteKeyCode={
                        isLocked || status === 'running' ? null : ['Backspace', 'Delete']
                      }
                      proOptions={{ hideAttribution: true }}
                      isValidConnection={(connection) => {
                        if (!connection.source || !connection.target) return false;
                        const sn = nodes.find((n) => n.id === connection.source);
                        const tn = nodes.find((n) => n.id === connection.target);
                        if (!sn || !tn) return false;

                        if (sn.type === 'mcp_tool' && tn.type === 'mcp_tool') return false;
                        if (sn.type === 'mcp_tool' && !isAgent(tn.type)) return false;
                        if (isTrigger(sn.type) && !isAgent(tn.type)) return false;

                        // Block MCP tools from connecting to media nodes that don't support tool calling
                        if (sn.type === 'mcp_tool' && isAgent(tn.type) && doesNotSupportTools(tn))
                          return false;
                        if (isAgent(sn.type) && doesNotSupportTools(sn) && tn.type === 'mcp_tool')
                          return false;

                        // Prevent connecting two MCP tools from the same server to the same agent (tool→agent)
                        if (sn.type === 'mcp_tool' && isAgent(tn.type)) {
                          const sameServerExists = edges.some((e) => {
                            if (e.target !== connection.target) return false;
                            if (e.source === connection.source) return false;
                            const src = nodes.find((n) => n.id === e.source);
                            return (
                              src?.type === 'mcp_tool' &&
                              src?.data?.mcpServerId != null &&
                              src?.data?.mcpServerId === sn.data?.mcpServerId
                            );
                          });
                          if (sameServerExists) return false;
                        }
                        // Prevent connecting two MCP tools from the same server to the same agent (agent→tool)
                        if (isAgent(sn.type) && tn.type === 'mcp_tool') {
                          const sameServerExists = edges.some((e) => {
                            if (e.source !== connection.source) return false;
                            const target = nodes.find((n) => n.id === e.target);
                            return (
                              target?.type === 'mcp_tool' &&
                              target?.data?.mcpServerId != null &&
                              target?.data?.mcpServerId === tn.data?.mcpServerId
                            );
                          });
                          if (sameServerExists) return false;
                        }
                        // Block reverse connections (prevents cycles: A→B blocks B→A)
                        if (
                          edges.some(
                            (e) => e.source === connection.target && e.target === connection.source,
                          )
                        )
                          return false;
                        return true;
                      }}
                    >
                      <Background color="#94a3b8" gap={16} size={2} className="opacity-80" />
                      {nodes.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="flex flex-col items-center text-center select-none">
                            <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                              <Wrench className="w-6 h-6 text-slate-300" />
                            </div>
                            <p className="text-sm font-bold text-slate-400 font-mono mb-1">
                              Empty Canvas
                            </p>
                            <p className="text-[10px] text-slate-300 font-mono max-w-[240px] leading-relaxed">
                              Drag nodes from the sidebar or open the MCP panel to add tools.
                            </p>
                          </div>
                        </div>
                      )}
                      <div data-export-hide="true">
                        <CustomZoomControls
                          isLocked={isLocked}
                          onToggleLock={() => setIsLocked(!isLocked)}
                        />
                      </div>
                      <div data-export-hide="true">
                        {isShortcutsOpen ? (
                          <Panel
                            position="bottom-left"
                            className="ml-0 mb-0 bg-white border border-[#cbd5e1] p-2.5 font-mono text-[10px] text-slate-500 shadow-sm flex flex-col gap-1 select-none pointer-events-auto rounded-none w-[270px]"
                          >
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
                            <div className="flex justify-between gap-6">
                              <span>Run Workflow:</span>
                              <kbd className="bg-slate-50 px-1 border border-slate-200 font-semibold text-slate-600 rounded-none">
                                Ctrl + Enter
                              </kbd>
                            </div>
                            <div className="flex justify-between gap-6">
                              <span>Rearrange:</span>
                              <kbd className="bg-slate-50 px-1 border border-slate-200 font-semibold text-slate-600 rounded-none">
                                Ctrl + L
                              </kbd>
                            </div>
                            <div className="flex justify-between gap-6">
                              <span>Toggle Lock:</span>
                              <kbd className="bg-slate-50 px-1 border border-slate-200 font-semibold text-slate-600 rounded-none">
                                Ctrl + Shift + L
                              </kbd>
                            </div>
                            <div className="flex justify-between gap-6">
                              <span>Zoom In/Out:</span>
                              <kbd className="bg-slate-50 px-1 border border-slate-200 font-semibold text-slate-600 rounded-none">
                                Ctrl + + / -
                              </kbd>
                            </div>
                            <div className="flex justify-between gap-6">
                              <span>Clear Canvas:</span>
                              <kbd className="bg-slate-50 px-1 border border-slate-200 font-semibold text-slate-600 rounded-none">
                                Ctrl + Alt + C
                              </kbd>
                            </div>
                            <div className="flex justify-between gap-6">
                              <span>Delete Edge:</span>
                              <kbd className="bg-slate-50 px-1 border border-slate-200 font-semibold text-slate-600 rounded-none">
                                Click Edge + Backspace
                              </kbd>
                            </div>
                            <div className="flex justify-between gap-6">
                              <span>Undo:</span>
                              <kbd className="bg-slate-50 px-1 border border-slate-200 font-semibold text-slate-600 rounded-none">
                                Ctrl + Z
                              </kbd>
                            </div>
                            <div className="flex justify-between gap-6">
                              <span>Redo:</span>
                              <kbd className="bg-slate-50 px-1 border border-slate-200 font-semibold text-slate-600 rounded-none">
                                Ctrl + Shift + Z
                              </kbd>
                            </div>
                            <div className="flex justify-between gap-6">
                              <span>Duplicate Node:</span>
                              <kbd className="bg-slate-50 px-1 border border-slate-200 font-semibold text-slate-600 rounded-none">
                                Ctrl + D
                              </kbd>
                            </div>
                            <div className="flex justify-between gap-6">
                              <span>Deselect:</span>
                              <kbd className="bg-slate-50 px-1 border border-slate-200 font-semibold text-slate-600 rounded-none">
                                Esc
                              </kbd>
                            </div>
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
                        <Panel position="bottom-right" className="pointer-events-auto">
                          {isMinimapVisible ? (
                            <div className="relative" style={{ height: 100, width: 140 }}>
                              <button
                                onClick={() => {
                                  setIsMinimapVisible(false);
                                  localStorage.setItem('qwenweaver_minimap_visible', 'false');
                                }}
                                className="absolute -top-2.5 right-0 z-10 bg-white border border-[#cbd5e1] p-0.5 hover:bg-slate-50 text-slate-400 hover:text-slate-700 shadow-sm transition-colors cursor-pointer"
                                title="Collapse minimap"
                              >
                                <ChevronDown className="w-3 h-3" />
                              </button>
                              <MiniMap
                                style={{
                                  height: 100,
                                  width: 140,
                                  background: '#ffffff',
                                  border: '1px solid #cbd5e1',
                                  borderRadius: 0,
                                }}
                                nodeColor={(node) => {
                                  switch (node.type) {
                                    case 'trigger':
                                      return '#10b981'; // Green
                                    case 'agent':
                                      return '#f97316'; // Orange
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
                          ) : (
                            <button
                              onClick={() => {
                                setIsMinimapVisible(true);
                                localStorage.setItem('qwenweaver_minimap_visible', 'true');
                              }}
                              className="bg-white border border-[#cbd5e1] p-1 hover:bg-slate-50 text-slate-400 hover:text-slate-700 shadow-sm transition-colors cursor-pointer"
                              title="Expand minimap"
                            >
                              <ChevronUp className="w-3 h-3" />
                            </button>
                          )}
                        </Panel>
                      </div>
                    </ReactFlow>

                    {/* Floating Inspector Toggle Button (when closed) */}
                    {rightPanel !== 'inspector' && (
                      <button
                        onClick={() => openRightPanel('inspector')}
                        className="absolute top-4 right-4 z-20 bg-white border border-[#cbd5e1] p-2 hover:bg-slate-50 text-slate-700 shadow-sm rounded-none transition-colors cursor-pointer"
                        title="Open Inspector"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Footer: Observability + Copilot + Help (width matches canvas, not behind inspector) */}
                  <div className="flex-shrink-0 flex flex-row items-stretch">
                    <div className="flex-1 min-w-0">
                      <GanttMetrics />
                    </div>
                    <div className="flex flex-row items-center gap-2 p-2 bg-white border-t border-l border-[#cbd5e1]">
                      <button
                        onClick={() => {
                          if (rightPanel === 'copilot') {
                            setRightPanel(null);
                          } else {
                            openRightPanel('copilot');
                          }
                        }}
                        data-tour="copilot"
                        className={`pointer-events-auto h-11 w-11 flex items-center justify-center shadow-lg transition-all select-none cursor-pointer border rounded-none ${
                          rightPanel === 'copilot'
                            ? 'bg-orange-500 border-orange-400 text-white'
                            : 'bg-orange-600 border-orange-500 text-white hover:bg-orange-500'
                        }`}
                        title="Toggle Copilot"
                      >
                        <MessageSquareCode className="h-5 w-5" />
                      </button>
                      {!isTourActive && (
                        <button
                          onClick={() => useStore.getState().startTour()}
                          className="pointer-events-auto h-11 w-11 border border-[#cbd5e1] bg-white text-slate-600 flex items-center justify-center shadow-lg hover:bg-slate-50 rounded-none cursor-pointer"
                          title="Start Help Tour"
                        >
                          <HelpCircle className="h-5 w-5 text-[#f97316]" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right panels: only one at a time */}
                {dockedPanelMode && (
                  <DockedPanel mode={dockedPanelMode} onClose={() => setDockedPanelMode(null)} />
                )}
                {!dockedPanelMode && rightPanel === 'inspector' && (
                  <Inspector onClose={() => setRightPanel(null)} />
                )}
                {!dockedPanelMode && rightPanel === 'copilot' && (
                  <CopilotPanel onClose={() => setRightPanel(null)} />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Maximized Node Terminal Dialog Overlay */}
        <MaximizedNodeOverlay />

        {/* Import Workflow Configuration Modal */}
        <ImportWorkflowModal isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} />

        {/* Export Workflow Configuration Modal */}
        <ExportWorkflowModal
          isOpen={isExportOpen}
          onClose={() => setIsExportOpen(false)}
          nodes={nodes}
          edges={edges}
          workflowId={id}
        />

        <ClearCanvasDialog
          isOpen={isClearConfirmOpen}
          onClose={() => setIsClearConfirmOpen(false)}
        />

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
              const res = (await withRefresh(() =>
                client.api.workflow.$post({ json: payload as any }),
              )) as any;
              if (res.status === 403) {
                const errBody: Record<string, unknown> = await res.json().catch(() => ({}));
                toast.error(
                  String(
                    errBody.error || 'Workflow limit reached. Delete an existing workflow first.',
                  ),
                );
                return;
              }
              if (!res.ok) throw new Error('Save failed');
              const data = await res.json();
              useStore.setState({
                workflowId: data.workflowId,
                workflowName: name,
                workflowDescription: description,
              });
              markClean();
              clearDraft();
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
              const res = await withRefresh(() =>
                client.api.templates.$post({ json: payload as any }),
              );
              if (!res.ok) {
                const err: Record<string, unknown> = await res.json().catch(() => ({}));
                throw new Error(String(err.error || 'Publish failed'));
              }
              setPublishDialogOpen(false);
              toast.success('Template published!');
            } catch (e) {
              toast.error(e instanceof Error ? e.message : 'Failed to publish template');
            }
          }}
        />
      </div>
    </>
  );
};
