import React, { useCallback, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { 
  ReactFlow, 
  ReactFlowProvider, 
  Background, 
  Controls, 
  MiniMap, 
  Panel,
  useReactFlow 
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useStore } from './store/index.js';
import { Sidebar } from './components/Sidebar.js';
import { Inspector } from './components/Inspector.js';
import { GanttMetrics } from './components/GanttMetrics.js';
import { AuthScreen } from './components/AuthScreen.js';
import { nodeTypes } from './components/CustomNodes.js';
import { edgeTypes } from './components/AnimatedEdge.js';
import type { NodeType } from '@qwenweaver/types';

import { 
  Play, 
  Square, 
  ToggleLeft, 
  ToggleRight,
  Settings,
  User,
  RefreshCw,
  Keyboard,
  X
} from 'lucide-react';

const CanvasWorkspace = () => {
  const nodes = useStore((s) => s.nodes);
  const edges = useStore((s) => s.edges);
  const onNodesChange = useStore((s) => s.onNodesChange);
  const onEdgesChange = useStore((s) => s.onEdgesChange);
  const onConnect = useStore((s) => s.onConnect);
  const selectNode = useStore((s) => s.selectNode);
  const addNode = useStore((s) => s.addNode);
  const rearrangeGraph = useStore((s) => s.rearrangeGraph);
  const clearGraph = useStore((s) => s.clearGraph);

  const status = useStore((s) => s.executionStatus);
  const runWorkflow = useStore((s) => s.runWorkflow);
  const stopWorkflow = useStore((s) => s.stopWorkflow);
  const mockMode = useStore((s) => s.mockMode);
  const setMockMode = useStore((s) => s.setMockMode);
  const user = useStore((s) => s.user);
  const logout = useStore((s) => s.logout);

  const reactFlowInstance = useReactFlow();
  const [activeTab, setActiveTab] = useState<'workflows' | 'projects' | 'history'>('workflows');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(() => {
    const saved = localStorage.getItem('qwenweaver_shortcuts_open');
    return saved !== 'false';
  });

  // Keyboard Shortcuts Bindings Listener
  React.useEffect(() => {
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

      // 2. Rearrange Layout: Ctrl + L or Cmd + L
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'l') {
        event.preventDefault();
        rearrangeGraph();
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

      // 6. Deselect Node: Escape
      if (event.key === 'Escape') {
        event.preventDefault();
        selectNode(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [status, nodes.length, runWorkflow, rearrangeGraph, clearGraph, selectNode, reactFlowInstance]);

  // Handle Drag-and-drop drop trigger
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const type = event.dataTransfer.getData('application/reactflow') as NodeType;
    if (!type) return;

    const position = reactFlowInstance.screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });

    addNode(type, position);
  }, [reactFlowInstance, addNode]);

  const handleNodeClick = useCallback((_: any, node: any) => {
    selectNode(node.id);
  }, [selectNode]);

  const handlePaneClick = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  return (
    <div className="h-full w-full flex flex-col bg-[#f8fafc] text-slate-800 select-none">
      
      {/* ─── Top Header (Matches screenshots exactly) ────────────────────────── */}
      <header className="h-14 bg-white border-b border-[#cbd5e1] flex items-center justify-between px-6 z-20">
        
        {/* Left: Tab Selectors */}
        <div className="flex items-center gap-6 h-full">
          <button
            onClick={() => setActiveTab('projects')}
            className={`text-sm font-semibold h-full px-1 border-b-2 flex items-center justify-center transition-all ${
              activeTab === 'projects' 
                ? 'border-[#ea580c] text-slate-900 font-bold' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Projects
          </button>
          <button
            onClick={() => setActiveTab('workflows')}
            className={`text-sm font-semibold h-full px-1 border-b-2 flex items-center justify-center transition-all ${
              activeTab === 'workflows' 
                ? 'border-[#ea580c] text-slate-900 font-bold' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Workflows
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`text-sm font-semibold h-full px-1 border-b-2 flex items-center justify-center transition-all ${
              activeTab === 'history' 
                ? 'border-[#ea580c] text-slate-900 font-bold' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
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
              className="flex items-center gap-1.5 font-bold hover:text-slate-800 transition-colors"
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
            className="px-3.5 py-1.5 bg-white border border-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1.5 rounded-none hover:bg-slate-50 transition-colors"
            title="Auto-arrange nodes in clean columns"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            Rearrange
          </button>



          {/* Run Workflow / Kill Button (Solid Rust-Orange) */}
          {status === 'running' ? (
            <button
              onClick={stopWorkflow}
              className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 rounded-none transition-colors"
            >
              <Square className="w-3.5 h-3.5 fill-white" />
              Kill Swarm
            </button>
          ) : (
            <button
              onClick={runWorkflow}
              disabled={nodes.length === 0}
              className="px-4 py-1.5 bg-[#9a3412] hover:bg-[#a73a00] text-white font-bold text-xs flex items-center gap-1.5 rounded-none transition-colors disabled:opacity-30"
            >
              <Play className="w-3.5 h-3.5 fill-white text-white" />
              Run Workflow
            </button>
          )}

          {/* Vertical Divider */}
          <div className="h-6 w-[1px] bg-slate-200" />

          {/* Settings cog */}
          <button className="p-1 hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-colors" title="Settings">
            <Settings className="w-4 h-4" />
          </button>

          {/* User profile / Logout */}
          {user ? (
            <div className="flex items-center gap-2">
              <button 
                onClick={logout}
                title="Logout Operator Session"
                className="p-1 hover:bg-slate-50 text-slate-500 hover:text-rose-655 flex items-center gap-1"
              >
                <User className="w-4 h-4" />
                <span className="text-xs font-mono max-w-24 truncate hidden md:inline">{user.email}</span>
              </button>
            </div>
          ) : (
            <button className="p-1 hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-colors">
              <User className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* ─── Workbench & Panels ────────────────────────────────────────────── */}
      <main className="flex-1 flex overflow-hidden relative">
        <Sidebar />
        
        {/* Central Workspace + Observability Stack */}
        <div className="flex-1 h-full flex flex-col min-w-0 bg-[#f8fafc] relative">
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
            >
              <Background 
                color="#cbd5e1" 
                gap={16} 
                size={1} 
                className="opacity-40"
              />
              <Controls className="!bg-white !border-[#cbd5e1] !rounded-none !shadow-none [&_button]:!border-[#cbd5e1] [&_button]:!bg-transparent [&_button]:hover:!bg-slate-50 [&_svg]:!fill-slate-600" />
              {isShortcutsOpen ? (
                <Panel position="bottom-left" className="ml-14 mb-0 bg-white border border-[#cbd5e1] p-2.5 font-mono text-[10px] text-slate-500 shadow-sm flex flex-col gap-1 select-none pointer-events-auto rounded-none w-56">
                  <div className="flex items-center justify-between font-bold text-slate-700 border-b border-slate-100 pb-1 mb-1">
                    <span>KEYBOARD SHORTCUTS</span>
                    <button 
                      onClick={() => {
                        setIsShortcutsOpen(false);
                        localStorage.setItem('qwenweaver_shortcuts_open', 'false');
                      }}
                      className="text-slate-400 hover:text-slate-700 transition-colors p-0.5"
                      title="Hide Legend"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="flex justify-between gap-6"><span>Run Swarm:</span><kbd className="bg-slate-50 px-1 border border-slate-200 font-semibold text-slate-600 rounded-none">Ctrl + Enter</kbd></div>
                  <div className="flex justify-between gap-6"><span>Rearrange:</span><kbd className="bg-slate-50 px-1 border border-slate-200 font-semibold text-slate-600 rounded-none">Ctrl + L</kbd></div>
                  <div className="flex justify-between gap-6"><span>Zoom In/Out:</span><kbd className="bg-slate-50 px-1 border border-slate-200 font-semibold text-slate-600 rounded-none">Ctrl + + / -</kbd></div>
                  <div className="flex justify-between gap-6"><span>Clear Canvas:</span><kbd className="bg-slate-50 px-1 border border-slate-200 font-semibold text-slate-600 rounded-none">Ctrl + Alt + C</kbd></div>
                  <div className="flex justify-between gap-6"><span>Delete Edge:</span><kbd className="bg-slate-50 px-1 border border-slate-200 font-semibold text-slate-600 rounded-none">Click Edge + Backspace</kbd></div>
                  <div className="flex justify-between gap-6"><span>Deselect:</span><kbd className="bg-slate-50 px-1 border border-slate-200 font-semibold text-slate-600 rounded-none">Esc</kbd></div>
                </Panel>
              ) : (
                <Panel position="bottom-left" className="ml-14 mb-0 pointer-events-auto">
                  <button
                    onClick={() => {
                      setIsShortcutsOpen(true);
                      localStorage.setItem('qwenweaver_shortcuts_open', 'true');
                    }}
                    className="bg-white border border-[#cbd5e1] p-1.5 hover:bg-slate-50 text-slate-500 hover:text-slate-700 shadow-sm rounded-none text-[10px] font-mono font-bold transition-colors flex items-center gap-1.5"
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
                className="absolute top-4 right-4 z-20 bg-white border border-[#cbd5e1] p-2 hover:bg-slate-50 text-slate-700 shadow-sm rounded-none transition-colors"
                title="Open Properties Panel"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Observability Board centered vertically next to Canvas */}
          <GanttMetrics />
        </div>

        {isSidebarOpen && <Inspector onClose={() => setIsSidebarOpen(false)} />}
      </main>
    </div>
  );
};

// Guard wrapper to direct unauthenticated traffic to full-screen Login routes
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = useStore((s) => s.token);
  const mockMode = useStore((s) => s.mockMode);
  
  if (!token && !mockMode) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

function App() {
  return (
    <ReactFlowProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<AuthScreen />} />
          <Route path="/register" element={<AuthScreen />} />
          <Route 
            path="/*" 
            element={
              <ProtectedRoute>
                <CanvasWorkspace />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </BrowserRouter>
    </ReactFlowProvider>
  );
}

export default App;
