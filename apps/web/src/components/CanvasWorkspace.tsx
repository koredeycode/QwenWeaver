import React, { useCallback, useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ReactFlow, 
  Background, 
  MiniMap, 
  Panel,
  useReactFlow
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useStore } from '../store/index.js';
import { Sidebar } from './Sidebar.js';
import { Inspector } from './Inspector.js';
import { GanttMetrics } from './GanttMetrics.js';
import { CopilotOverlay } from './CopilotOverlay.js';
import { nodeTypes } from './CustomNodes.js';
import { edgeTypes } from './AnimatedEdge.js';
import type { NodeType } from '@qwenweaver/types';
import { MOCK_WORKFLOWS } from '../lib/mock-workflows.js';

import { 
  X,
  ToggleRight,
  ToggleLeft,
  RefreshCw,
  Square,
  Play,
  Settings,
  User,
  Keyboard,
  Upload,
  Download
} from 'lucide-react';

import { CustomZoomControls } from './CustomZoomControls.js';
import { ExportWorkflowModal } from './ExportWorkflowModal.js';
import { ImportWorkflowModal } from './ImportWorkflowModal.js';
import { MaximizedNodeOverlay } from './MaximizedNodeOverlay.js';

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
  const maximizedNodeId = useStore((s) => s.maximizedNodeId);
  const setMaximizedNodeId = useStore((s) => s.setMaximizedNodeId);

  const status = useStore((s) => s.executionStatus);
  const runWorkflow = useStore((s) => s.runWorkflow);
  const stopWorkflow = useStore((s) => s.stopWorkflow);
  const mockMode = useStore((s) => s.mockMode);
  const setMockMode = useStore((s) => s.setMockMode);
  const user = useStore((s) => s.user);
  const logout = useStore((s) => s.logout);

  const reactFlowInstance = useReactFlow();
  const { id } = useParams<{ id: string }>();

  // Load workflow template or clear canvas based on path parameter
  useEffect(() => {
    if (id) {
      const isMock = MOCK_WORKFLOWS.some((w) => w.id === id);
      if (isMock) {
        loadWorkflow(id);
      } else {
        // If it's a new or blank workflow (e.g. starts with workflow-), clear the graph
        clearGraph();
      }
    }
  }, [id, loadWorkflow, clearGraph]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(() => {
    const saved = localStorage.getItem('qwenweaver_shortcuts_open');
    return saved !== 'false';
  });

  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

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
        if (confirm('Are you sure you want to clear the canvas?')) {
          clearGraph();
        }
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

  const handlePaneClick = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  return (
    <div className="h-screen w-screen flex flex-row bg-[#f8fafc] text-slate-800 select-none overflow-hidden">
      
      {/* Left Sidebar extends to the top/bottom of viewport */}
      <Sidebar />

      {/* Center Column: Header Toolbar, Canvas Workspace, Metrics Panel */}
      <div className="flex-1 h-full flex flex-col min-w-0 bg-[#f8fafc] relative">
        
        {/* ─── Top Header (Matches screenshots exactly) ────────────────────────── */}
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

          {/* Right: Actions, Deploy, Run, Settings, Profile */}
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
                    <ToggleRight className="w-4 h-4 text-[#2563eb]" />
                  </>
                ) : (
                  <>
                    <span className="text-[#ea580c]">LIVE HONO API</span>
                    <ToggleLeft className="w-4 h-4 text-[#ea580c]" />
                  </>
                )}
              </button>
            </div>

            {/* Rearrange Layout Button */}
            <button
              onClick={rearrangeGraph}
              className="px-3.5 py-1.5 bg-white border border-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1.5 rounded-none hover:bg-slate-50 transition-colors cursor-pointer"
              title="Auto-arrange nodes in clean columns"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
              Rearrange
            </button>

            {/* Import Button */}
            <button
              onClick={() => setIsImportOpen(true)}
              className="px-3.5 py-1.5 bg-white border border-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1.5 rounded-none hover:bg-slate-50 transition-colors cursor-pointer"
              title="Import a workflow from JSON text or file"
            >
              <Upload className="w-3.5 h-3.5 text-slate-500" />
              Import
            </button>

            {/* Export Button */}
            <button
              onClick={() => setIsExportOpen(true)}
              className="px-3.5 py-1.5 bg-white border border-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1.5 rounded-none hover:bg-slate-50 transition-colors cursor-pointer"
              title="Export current workflow config"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              Export
            </button>

            {/* Run Workflow / Kill Button (Solid Rust-Orange) */}
            {status === 'running' ? (
              <button
                onClick={stopWorkflow}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 rounded-none transition-colors cursor-pointer"
              >
                <Square className="w-3.5 h-3.5 fill-white" />
                Kill Swarm
              </button>
            ) : (
              <button
                onClick={runWorkflow}
                disabled={nodes.length === 0}
                className="px-4 py-1.5 bg-[#9a3412] hover:bg-[#a73a00] text-white font-bold text-xs flex items-center gap-1.5 rounded-none transition-colors disabled:opacity-30 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-white text-white" />
                Run Workflow
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
              <div className="flex items-center gap-2">
                <button 
                  onClick={logout}
                  title="Logout Operator Session"
                  className="p-1 hover:bg-slate-50 text-slate-500 hover:text-rose-655 flex items-center gap-1 cursor-pointer"
                >
                  <User className="w-4 h-4" />
                  <span className="text-xs font-mono max-w-24 truncate hidden md:inline">{user.email}</span>
                </button>
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
            <div className="flex-1 w-full min-h-0 relative">
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
                <CustomZoomControls isLocked={isLocked} onToggleLock={() => setIsLocked(!isLocked)} />
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
                )}
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
              </ReactFlow>

              {/* Floating Sidebar Toggle Button (when collapsed) */}
              {!isSidebarOpen && (
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  className="absolute top-4 right-4 z-20 bg-white border border-[#cbd5e1] p-2 hover:bg-slate-50 text-slate-700 shadow-sm rounded-none transition-colors cursor-pointer"
                  title="Open Properties Panel"
                >
                  <Settings className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Observability Board centered vertically next to Canvas */}
            <GanttMetrics />
          </div>

          {/* Right Properties Panel Inspector sits under the top nav header */}
          {isSidebarOpen && <Inspector onClose={() => setIsSidebarOpen(false)} />}
        </div>
      </div>

      {/* Draggable Qwen Copilot Floating Chat Assistant */}
      <CopilotOverlay />

      {/* Maximized Node Terminal Dialog Overlay */}
      <MaximizedNodeOverlay />

      {/* Export Workflow Configuration Modal */}
      <ExportWorkflowModal 
        isOpen={isExportOpen} 
        onClose={() => setIsExportOpen(false)} 
        nodes={nodes} 
        edges={edges} 
        workflowId={id} 
      />

      {/* Import Workflow Configuration Modal */}
      <ImportWorkflowModal 
        isOpen={isImportOpen} 
        onClose={() => setIsImportOpen(false)} 
      />
    </div>
  );
};
