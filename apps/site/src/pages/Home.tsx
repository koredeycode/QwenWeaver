import { useEffect, useState, useRef, type ReactNode } from 'react';
import {
  Play,
  Bot,
  Brain,
  Wrench,
  Loader2,
  Square,
  CheckCircle2,
  Maximize2,
  RotateCcw,
} from 'lucide-react';

const integrations = [
  {
    name: 'Google Scholar',
    type: 'Search',
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
        <path d="M8 11h6" strokeLinecap="round" />
        <path d="M11 8v6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    name: 'Slack',
    type: 'Messaging',
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path d="M14.5 2a2.5 2.5 0 0 1 2.5 2.5v2.5h-2.5a2.5 2.5 0 0 1 0-5z" />
        <path d="M4.5 9.5A2.5 2.5 0 0 1 7 7h2.5v2.5A2.5 2.5 0 0 1 7 12H4.5z" />
        <path d="M9.5 22A2.5 2.5 0 0 1 7 19.5V17h2.5a2.5 2.5 0 0 1 0 5z" />
        <path d="M19.5 14.5A2.5 2.5 0 0 1 17 17h-2.5v-2.5A2.5 2.5 0 0 1 17 12h2.5z" />
        <path d="M12 7v2.5H9.5" />
        <path d="M7 12h2.5v2.5" />
        <path d="M17 12v2.5H14.5" />
        <path d="M12 17v-2.5h2.5" />
      </svg>
    ),
  },
  {
    name: 'GitHub',
    type: 'Code',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
      </svg>
    ),
  },
  {
    name: 'Discord',
    type: 'Community',
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path d="M9 12a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM15 12a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" />
        <path d="M8.5 17c0 0-1.5 0-2.5-1 0 0-4-8 0-13 2-1 4-1 5-1l.5 1C8 4 7 5 7 5c3-1 7-1 10 0 0 0-1-1-2.5-2L15 2c1 0 3 0 5 1 4 5 0 13 0 13-1 1-2.5 1-2.5 1" />
        <path d="M16 17l.5 2.5c-3 .5-6 0-9 0L8 17" />
      </svg>
    ),
  },
  {
    name: 'SEC Filings',
    type: 'Data',
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <rect x="4" y="2" width="16" height="20" rx="2" />
        <path d="M9 8h6" strokeLinecap="round" />
        <path d="M9 12h6" strokeLinecap="round" />
        <path d="M9 16h4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    name: 'Notion',
    type: 'Docs',
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M7 7h10" strokeLinecap="round" />
        <path d="M7 12h10" strokeLinecap="round" />
        <path d="M7 17h6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    name: 'Databases',
    type: 'Storage',
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <ellipse cx="12" cy="6" rx="8" ry="3" />
        <path d="M4 6v6c0 1.66 3.58 3 8 3s8-1.34 8-3V6" />
        <path d="M4 12v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" />
      </svg>
    ),
  },
  {
    name: 'Webhooks',
    type: 'API',
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path d="M13 2L3 14h6l-2 8 10-12h-6l2-8z" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export function Home() {
  return (
    <div className="relative">
      <Hero />
      <AiPromptSection />
      <VisualBuilderSection />
      <SupervisorSection />
      <StreamingSection />
      <IntegrationsSection />
      <CTA />
    </div>
  );
}

function FloatingOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      <div className="absolute -top-20 -left-20 h-72 w-72 rounded-full bg-orange-500/5 blur-3xl animate-float-slow" />
      <div className="absolute top-1/3 -right-20 h-96 w-96 rounded-full bg-blue-500/5 blur-3xl animate-float-slower" />
      <div className="absolute -bottom-10 left-1/2 h-64 w-64 rounded-full bg-orange-500/3 blur-3xl animate-float-slow" />
    </div>
  );
}

/* ── Interactive Canvas Demo (HTML nodes + SVG edges, draggable) ───────── */

type DemoNodeDef = {
  id: string;
  label: string;
  type: 'trigger' | 'agent' | 'supervisor' | 'tool';
};

const demoNodeDefs: DemoNodeDef[] = [
  { id: 'trigger', label: '', type: 'trigger' },
  { id: 'agent1', label: '', type: 'agent' },
  { id: 'agent2', label: '', type: 'agent' },
  { id: 'supervisor', label: '', type: 'supervisor' },
  { id: 'tool', label: '', type: 'tool' },
];

const demoEdges = [
  { source: 'trigger', target: 'agent1' },
  { source: 'trigger', target: 'agent2' },
  { source: 'agent1', target: 'supervisor' },
  { source: 'agent2', target: 'supervisor' },
  { source: 'supervisor', target: 'tool' },
];

const INITIAL_POSITIONS: Record<string, { x: number; y: number }> = {
  trigger: { x: 40, y: 70 },
  agent1: { x: 250, y: 15 },
  agent2: { x: 250, y: 125 },
  supervisor: { x: 480, y: 65 },
  tool: { x: 552, y: 195 },
};

const NODE_SIZES: Record<string, { w: number; h: number }> = {
  trigger: { w: 160, h: 72 },
  agent: { w: 160, h: 56 },
  supervisor: { w: 180, h: 56 },
  tool: { w: 56, h: 56 },
};

function getHandlePos(
  id: string,
  pos: { x: number; y: number },
  handle: 'right' | 'left' | 'bottom' | 'top',
) {
  const def = demoNodeDefs.find((n) => n.id === id);
  const sz = NODE_SIZES[def?.type ?? 'agent'];
  switch (handle) {
    case 'right':
      return { x: pos.x + sz.w, y: pos.y + sz.h / 2 };
    case 'left':
      return { x: pos.x, y: pos.y + sz.h / 2 };
    case 'bottom':
      return { x: pos.x + sz.w / 2, y: pos.y + sz.h };
    case 'top':
      return { x: pos.x + sz.w / 2, y: pos.y };
  }
}

/* ── Orthogonal step path matching app's getSmoothStepPath ─────────────── */

function buildEdgePath(
  srcId: string,
  tgtId: string,
  srcPos: { x: number; y: number },
  tgtPos: { x: number; y: number },
) {
  const srcType = demoNodeDefs.find((n) => n.id === srcId)?.type;
  const tgtType = demoNodeDefs.find((n) => n.id === tgtId)?.type;

  let srcHandle: 'right' | 'left' | 'bottom' | 'top' = 'right';
  let tgtHandle: 'right' | 'left' | 'bottom' | 'top' = 'left';

  if (srcType === 'trigger') {
    srcHandle = 'right';
    tgtHandle = 'left';
  } else if (tgtType === 'supervisor') {
    srcHandle = 'right';
    tgtHandle = 'left';
  } else if (tgtType === 'tool') {
    srcHandle = 'bottom';
    tgtHandle = 'top';
  }

  const p1 = getHandlePos(srcId, srcPos, srcHandle);
  const p2 = getHandlePos(tgtId, tgtPos, tgtHandle);
  if (!p1 || !p2) return '';

  const r = 6;

  if (srcHandle === 'bottom') {
    const midY = (p1.y + p2.y) / 2;
    return [
      `M${p1.x},${p1.y}`,
      `L${p1.x},${midY - r}`,
      `Q${p1.x},${midY} ${p1.x + r},${midY}`,
      `L${p2.x - r},${midY}`,
      `Q${p2.x},${midY} ${p2.x},${midY + r}`,
      `L${p2.x},${p2.y}`,
    ].join(' ');
  }

  const midX = (p1.x + p2.x) / 2;
  return [
    `M${p1.x},${p1.y}`,
    `L${midX - r},${p1.y}`,
    `Q${midX},${p1.y} ${midX},${p1.y + r}`,
    `L${midX},${p2.y - r}`,
    `Q${midX},${p2.y} ${midX - r},${p2.y}`,
    `L${p2.x},${p2.y}`,
  ].join(' ');
}

function edgeColor(e: { source: string; target: string }) {
  const srcType = demoNodeDefs.find((n) => n.id === e.source)?.type;
  if (srcType === 'trigger') return '#10b981';
  if (srcType === 'supervisor') return '#2563eb';
  if (srcType === 'tool') return '#8b5cf6';
  if (demoNodeDefs.find((n) => n.id === e.target)?.type === 'tool') return '#8b5cf6';
  return '#f97316';
}

/* ── Status helpers ────────────────────────────────────────────────────── */

function DemoStatusBadge({ status }: { status: 'pending' | 'running' | 'completed' }) {
  switch (status) {
    case 'running':
      return (
        <span className="flex items-center gap-1 text-[10px] text-primary font-mono font-bold">
          <Loader2 className="w-3 h-3 animate-spin" /> RUNNING
        </span>
      );
    case 'completed':
      return (
        <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-mono font-bold">
          <CheckCircle2 className="w-3 h-3" /> COMPLETED
        </span>
      );
    default:
      return (
        <span className="flex items-center gap-1 text-[10px] text-zinc-400 font-mono font-semibold">
          <span className="text-zinc-400 text-[10px] leading-none">●</span> PENDING
        </span>
      );
  }
}

function DemoCompactStatus({ status }: { status: 'pending' | 'running' | 'completed' }) {
  switch (status) {
    case 'running':
      return (
        <span
          className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse border border-white"
          title="RUNNING"
        />
      );
    case 'completed':
      return (
        <span
          className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white shadow-[0_0_6px_#10b981]"
          title="COMPLETED"
        />
      );
    default:
      return (
        <span
          className="w-2.5 h-2.5 rounded-full bg-slate-400 border border-white"
          title="PENDING"
        />
      );
  }
}

/* ── Demo node HTML components ─────────────────────────────────────────── */

function DemoTriggerNode({ status }: { status: 'pending' | 'running' | 'completed' }) {
  return (
    <div
      className={`w-full h-full bg-white border-2 ${status === 'running' ? 'border-primary-container animate-[nodePulse_2s_ease-in-out_infinite]' : status === 'completed' ? 'border-emerald-500 shadow-[0_2px_8px_rgba(16,185,129,0.15)]' : 'border-emerald-500'} text-slate-800 font-sans shadow-sm flex flex-col rounded-none relative`}
    >
      <div className="flex items-center justify-between border-b border-outline-variant px-1.5 py-1">
        <div className="flex items-center gap-1.5">
          <Play className="w-3 h-3 text-emerald-600 fill-emerald-600/10" />
          <span className="text-[8px] font-mono font-bold tracking-wider text-emerald-600">
            TRIGGER
          </span>
        </div>
        <div className="flex items-center gap-1">
          <DemoStatusBadge status={status} />
          <Maximize2 className="w-2.5 h-2.5 text-slate-300" />
        </div>
      </div>
      <div className="px-2 py-1 flex-1 flex flex-col justify-center">
        <div className="text-[10px] font-bold tracking-tight text-slate-900 leading-none">
          Web Trigger
        </div>
        <div className="text-[8px] text-slate-500 font-mono mt-0.5">TEXT output</div>
      </div>
      <div className="flex items-center justify-between border-t border-slate-100 px-1.5 py-0.5 bg-slate-50">
        <div className="flex items-center gap-1 text-[8px] font-mono font-bold text-emerald-700">
          <Play className="w-2 h-2 fill-emerald-700" /> RUN
        </div>
        <span className="text-[7px] text-slate-400 font-mono">Click to execute</span>
      </div>
      <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-emerald-500 border-[1.5px] border-slate-700 rounded-full" />
    </div>
  );
}

function DemoAgentNode({ status }: { status: 'pending' | 'running' | 'completed' }) {
  return (
    <div
      className={`w-full h-full bg-white border-2 ${status === 'completed' ? 'border-emerald-500 shadow-[0_2px_8px_rgba(16,185,129,0.15)]' : status === 'running' ? 'border-primary-container animate-[nodePulse_2s_ease-in-out_infinite]' : 'border-outline'} text-slate-800 font-sans shadow-sm flex flex-col rounded-none relative`}
    >
      <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-[#f97316] border-[1.5px] border-slate-700 rounded-full" />
      <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-purple-500 border-[1.5px] border-slate-700 rounded-full" />

      <div className="flex items-center justify-between border-b border-outline-variant px-1.5 py-1">
        <div className="flex items-center gap-1.5">
          <Bot className="w-3 h-3 text-[#f97316]" />
          <span className="text-[8px] font-mono font-bold tracking-wider text-primary">AGENT</span>
        </div>
        <div className="flex items-center gap-1">
          <DemoStatusBadge status={status} />
          <Maximize2 className="w-2.5 h-2.5 text-slate-300" />
        </div>
      </div>
      <div className="px-1.5 py-1 flex-1 flex flex-col justify-center">
        <div className="text-[10px] font-bold tracking-tight text-slate-900 leading-none">
          Qwen Worker
        </div>
      </div>

      <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-[#f97316] border-[1.5px] border-slate-700 rounded-full" />
    </div>
  );
}

function DemoSupervisorNode({ status }: { status: 'pending' | 'running' | 'completed' }) {
  return (
    <div
      className={`w-full h-full bg-white border-2 ${status === 'completed' ? 'border-emerald-500 shadow-[0_2px_8px_rgba(16,185,129,0.15)]' : status === 'running' ? 'border-secondary-container animate-[supervisorPulse_2s_ease-in-out_infinite]' : 'border-outline'} text-slate-800 font-sans shadow-md flex flex-col rounded-none relative`}
    >
      <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-[#2563eb] border-[1.5px] border-slate-700 rounded-full" />
      <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-purple-500 border-[1.5px] border-slate-700 rounded-full" />

      <div className="flex items-center justify-between border-b border-outline px-1.5 py-1">
        <div className="flex items-center gap-1.5">
          <Brain className="w-3 h-3 text-[#2563eb]" />
          <span className="text-[8px] font-mono font-bold tracking-wider text-secondary">
            SUPERVISOR
          </span>
        </div>
        <div className="flex items-center gap-1">
          <DemoStatusBadge status={status} />
          <Maximize2 className="w-2.5 h-2.5 text-slate-300" />
        </div>
      </div>
      <div className="px-1.5 py-1 flex-1 flex flex-col justify-center">
        <div className="text-[10px] font-bold tracking-tight text-secondary-container leading-none">
          Reviewer
        </div>
      </div>

      <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-[#2563eb] border-[1.5px] border-slate-700 rounded-full" />
    </div>
  );
}

function DemoToolNode({ status }: { status: 'pending' | 'running' | 'completed' }) {
  return (
    <div
      className={`w-full h-full bg-white border-2 ${status === 'completed' ? 'border-emerald-500 shadow-[0_2px_6px_rgba(16,185,129,0.12)]' : status === 'running' ? 'border-purple-500 shadow-[0_2px_8px_rgba(168,85,247,0.15)]' : 'border-purple-200'} text-slate-800 font-sans shadow-sm flex flex-col rounded-none relative`}
    >
      <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-purple-500 border border-white rounded-full" />
      <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-purple-500 border border-white rounded-full" />

      <div className="flex items-center justify-between px-1 py-0.5 border-b border-outline-variant">
        <div className="flex items-center gap-0.5">
          <Wrench className="w-2 h-2 text-purple-600" />
          <span className="text-[5px] font-mono font-bold tracking-wider text-purple-600">MCP</span>
        </div>
        <div className="flex items-center gap-0.5">
          <DemoCompactStatus status={status} />
          <Maximize2 className="w-1.5 h-1.5 text-purple-300" />
        </div>
      </div>
      <div className="flex items-center justify-center flex-1 min-h-0">
        <div className="w-6 h-6 rounded bg-purple-100 flex items-center justify-center">
          <Wrench className="w-3 h-3 text-purple-600" />
        </div>
      </div>
    </div>
  );
}

/* ── Step-by-step execution schedule ───────────────────────────────────── */

type Phase = { at: number; statuses: Record<string, 'pending' | 'running' | 'completed'> };
const phases: Phase[] = [
  { at: 0, statuses: { trigger: 'running' } },
  { at: 1200, statuses: { trigger: 'completed', agent1: 'running', agent2: 'running' } },
  { at: 3000, statuses: { agent1: 'completed', agent2: 'completed', supervisor: 'running' } },
  { at: 4500, statuses: { supervisor: 'completed', tool: 'running' } },
  { at: 5500, statuses: { tool: 'completed' } },
];

const nodeIds = ['trigger', 'agent1', 'agent2', 'supervisor', 'tool'];

/* ── Canvas Demo ───────────────────────────────────────────────────────── */

function CanvasDemo() {
  const [mounted, setMounted] = useState(false);
  const [execution, setExecution] = useState<'idle' | 'running' | 'completed'>('idle');
  const [nodeStatuses, setNodeStatuses] = useState<
    Record<string, 'pending' | 'running' | 'completed'>
  >(Object.fromEntries(nodeIds.map((id) => [id, 'pending' as const])));
  const [positions, setPositions] =
    useState<Record<string, { x: number; y: number }>>(INITIAL_POSITIONS);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      setPositions((prev) => ({
        ...prev,
        [dragging]: { x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y },
      }));
    };
    const onUp = () => setDragging(null);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragging, dragOffset]);

  const onNodeMouseDown = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    const p = positions[id];
    setDragging(id);
    setDragOffset({ x: e.clientX - p.x, y: e.clientY - p.y });
  };

  const startExecution = () => {
    // Reset all to pending
    setNodeStatuses(Object.fromEntries(nodeIds.map((id) => [id, 'pending' as const])));
    setExecution('running');

    timersRef.current = phases.map((phase) =>
      setTimeout(() => {
        setNodeStatuses((prev) => ({ ...prev, ...phase.statuses }));
        // If this is the last phase, mark execution completed
        if (phase === phases[phases.length - 1]) {
          setTimeout(() => setExecution('completed'), 100);
        }
      }, phase.at),
    );
  };

  const stopExecution = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setNodeStatuses(Object.fromEntries(nodeIds.map((id) => [id, 'pending' as const])));
    setExecution('idle');
  };

  // Clean up timers on unmount
  useEffect(() => {
    return () => timersRef.current.forEach(clearTimeout);
  }, []);

  const canvasW = 850;
  const canvasH = 240;

  return (
    <div className="relative mx-auto mt-12 w-full max-w-4xl rounded-xl border border-outline/40 bg-surface/70 backdrop-blur-sm p-3 shadow-lg">
      <div className="flex items-center justify-between border-b border-outline/20 pb-2 mb-2 px-1">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
          </div>
          <span className="ml-2 text-[10px] font-mono text-slate-400">Workflow</span>
        </div>
        <button
          onClick={execution === 'running' ? stopExecution : startExecution}
          className={`flex items-center gap-1.5 px-3 py-1 text-[10px] font-mono font-bold border transition-colors cursor-pointer ${
            execution === 'running'
              ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
              : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
          }`}
        >
          {execution === 'running' ? (
            <>
              <Square className="w-2.5 h-2.5 fill-rose-700 text-rose-700" /> Stop
            </>
          ) : (
            <>
              <Play className="w-2.5 h-2.5 fill-emerald-700 text-emerald-700" /> Run All
            </>
          )}
        </button>
      </div>

      <div
        className="relative w-full overflow-hidden rounded border border-outline/20 bg-surface-dim/30"
        style={{ height: canvasH }}
      >
        <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden>
          <defs>
            <pattern id="demo-grid" width="16" height="16" patternUnits="userSpaceOnUse">
              <circle cx="8" cy="8" r="0.7" fill="#94a3b8" opacity="0.25" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#demo-grid)" />
        </svg>

        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox={`0 0 ${canvasW} ${canvasH}`}
          preserveAspectRatio="xMidYMid slice"
          aria-hidden
        >
          {demoEdges.map((e, i) => {
            const d = buildEdgePath(e.source, e.target, positions[e.source], positions[e.target]);
            const color = edgeColor(e);
            const srcRunning = nodeStatuses[e.source] === 'running';
            const srcDone = nodeStatuses[e.source] === 'completed';
            const active = srcRunning || srcDone;
            const animDelay = `${i * 0.2}s`;
            return (
              <g key={i}>
                <path d={d} fill="none" stroke={color} strokeWidth="3" strokeOpacity="0.3" />
                {active && (
                  <path
                    d={d}
                    fill="none"
                    stroke={color}
                    strokeWidth="3"
                    strokeOpacity={0.9}
                    strokeDasharray="6 4"
                    className={srcRunning ? 'animate-edge-flow' : ''}
                    style={{ animationDelay: animDelay }}
                  />
                )}
                {srcRunning && (
                  <circle r="3" fill={color} opacity="0.9">
                    <animateMotion dur={`${1.2 + i * 0.2}s`} repeatCount="indefinite" path={d} />
                  </circle>
                )}
              </g>
            );
          })}
        </svg>

        {demoNodeDefs.map((n, i) => {
          const pos = positions[n.id];
          const sz = NODE_SIZES[n.type];
          const isDragging = dragging === n.id;
          const status = nodeStatuses[n.id] || 'pending';
          return (
            <div
              key={n.id}
              onMouseDown={(e) => onNodeMouseDown(n.id, e)}
              className="absolute cursor-grab active:cursor-grabbing select-none"
              style={{
                left: pos.x,
                top: pos.y,
                width: sz.w,
                height: sz.h,
                opacity: mounted ? 1 : 0,
                transition: isDragging ? 'none' : `opacity 0.4s ease ${i * 0.1}s`,
                zIndex: isDragging ? 20 : 10,
              }}
            >
              {n.type === 'trigger' && <DemoTriggerNode status={status} />}
              {n.type === 'agent' && <DemoAgentNode status={status} />}
              {n.type === 'supervisor' && <DemoSupervisorNode status={status} />}
              {n.type === 'tool' && <DemoToolNode status={status} />}
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex items-center justify-between border-t border-outline/20 pt-2 px-1">
        <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400">
          <span
            className={`flex items-center gap-1 ${execution === 'completed' ? 'text-emerald-600' : execution === 'running' ? 'text-primary' : ''}`}
          >
            {execution === 'completed' ? (
              <>
                <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Completed
              </>
            ) : execution === 'running' ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin text-primary" /> Executing...
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-slate-400" /> Ready
              </>
            )}
          </span>
          <span>4 agents</span>
          <span>1 MCP tool</span>
        </div>
        <div className="flex gap-2 text-[10px] font-mono text-slate-400 items-center">
          <button
            onClick={() => setPositions(INITIAL_POSITIONS)}
            className="flex items-center gap-1 px-2 py-0.5 hover:bg-slate-100 rounded transition-colors text-slate-500 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
          <span>Drag nodes · Run to execute</span>
        </div>
      </div>
    </div>
  );
}
/* ── Section wrapper ────────────────────────────────────────────────────── */

function Section({
  id,
  children,
  className = '',
}: {
  id?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`relative z-10 py-24 ${className}`} id={id}>
      <FloatingOrbs />
      <div className="mx-auto max-w-7xl px-6">{children}</div>
    </section>
  );
}

/* ── Hero ───────────────────────────────────────────────────────────────── */

function Hero() {
  return (
    <section className="relative z-10 overflow-hidden border-b border-outline/40">
      <FloatingOrbs />
      <div className="mx-auto max-w-7xl px-6 pt-24 pb-16 sm:pt-32 sm:pb-20 lg:pt-40 lg:pb-24">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-outline/60 bg-surface-dim/80 px-3 py-1 text-xs font-medium text-on-surface-variant backdrop-blur-sm animate-fade-in">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-500" />
            </span>
            Built for Qwen Cloud Hackathon 2026
          </span>

          <h1 className="mt-6 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl animate-slide-up">
            Orchestrate Multi-Agent
            <br />
            <span className="text-primary">Workflows Visually</span>
          </h1>

          <p
            className="mt-6 text-lg leading-relaxed text-on-surface-variant sm:text-xl animate-fade-in"
            style={{ animationDelay: '0.15s' }}
          >
            Design, execute, and monitor complex AI agent pipelines with a drag-and-drop canvas.
            Powered by Qwen, MCP, and parallel DAG execution.
          </p>

          <div
            className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center animate-slide-up"
            style={{ animationDelay: '0.25s' }}
          >
            <a
              href="/app"
              className="group relative inline-flex items-center gap-2 rounded-lg bg-primary px-8 py-3 text-base font-semibold text-on-primary shadow-sm transition-all hover:shadow-lg hover:shadow-orange-500/20"
            >
              <span className="absolute -inset-0.5 rounded-lg bg-gradient-to-r from-orange-500 to-blue-500 opacity-0 blur transition-opacity group-hover:opacity-30" />
              <span className="relative">Start Free</span>
              <span className="relative inline-block transition-transform group-hover:translate-x-0.5">
                →
              </span>
            </a>
            <a
              href="/self-hosted"
              className="inline-flex items-center gap-2 rounded-lg border border-outline/60 bg-surface-bright/80 px-6 py-3 text-base font-semibold text-on-surface backdrop-blur-sm transition-all hover:border-outline hover:bg-surface-dim hover:shadow-sm"
            >
              Self-Host
            </a>
          </div>

          <p
            className="mt-4 text-sm text-on-surface-variant animate-fade-in"
            style={{ animationDelay: '0.35s' }}
          >
            1000 free credits on signup <span className="mx-1.5 text-outline">·</span> No credit
            card required
          </p>
        </div>

        <CanvasDemo />
      </div>
    </section>
  );
}

/* ── Feature: AI Prompt ─────────────────────────────────────────────────── */

function AiPromptSection() {
  return (
    <Section className="border-b border-outline/40">
      <div className="flex flex-col items-center gap-12 lg:flex-row lg:gap-16">
        <div className="flex-1 animate-slide-up">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-outline/60 bg-surface-dim/80 px-3 py-1 text-xs font-medium text-on-surface-variant backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
            Natural Language
          </span>
          <h2 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl">
            Describe. <span className="text-primary">Watch it build.</span>
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-on-surface-variant">
            Just type what you want in plain English. QwenWeaver's AI interprets your intent and
            generates a complete multi-agent workflow — no dragging required.
          </p>
          <div className="mt-6 rounded-lg border border-outline/40 bg-surface-dim/60 p-4 font-mono text-sm">
            <div className="flex items-center gap-2 text-orange-500 mb-2">
              <span className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
              <span className="text-[10px] uppercase tracking-wider text-slate-400">Prompt</span>
            </div>
            <p className="text-slate-600 italic">
              &ldquo;Search Google Scholar for the latest papers on multi-agent consensus, scan
              global patent databases, then synthesize findings with a supervisor review.&rdquo;
            </p>
            <div className="mt-3 flex items-center gap-2 text-green-600">
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-xs font-medium">Workflow generated — 5 nodes, 5 edges</span>
            </div>
          </div>
        </div>
        <div className="flex-1 animate-slide-up" style={{ animationDelay: '0.15s' }}>
          <div className="relative rounded-xl border border-outline/40 bg-surface-bright p-4 shadow-md">
            <div className="flex items-center gap-2 border-b border-outline/20 pb-2 mb-3">
              <div className="flex gap-1">
                <span className="h-2 w-2 rounded-full bg-red-400" />
                <span className="h-2 w-2 rounded-full bg-yellow-400" />
                <span className="h-2 w-2 rounded-full bg-green-400" />
              </div>
              <span className="ml-2 text-[10px] font-mono text-slate-400">Generated Workflow</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2 flex items-center gap-2 rounded border border-emerald-200 bg-emerald-50/50 px-3 py-2 text-xs font-mono text-emerald-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Trigger: Web Search
              </div>
              <div className="flex items-center gap-2 rounded border border-orange-200 bg-orange-50/50 px-3 py-2 text-xs font-mono text-orange-700">
                <span className="h-2 w-2 rounded-full bg-orange-500" />
                Agent: Academic Searcher
              </div>
              <div className="flex items-center gap-2 rounded border border-orange-200 bg-orange-50/50 px-3 py-2 text-xs font-mono text-orange-700">
                <span className="h-2 w-2 rounded-full bg-orange-500" />
                Agent: Patent Scanner
              </div>
              <div className="flex items-center gap-2 rounded border border-blue-200 bg-blue-50/50 px-3 py-2 text-xs font-mono text-blue-700">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                Supervisor: Consensus
              </div>
              <div className="flex items-center gap-2 rounded border border-purple-200 bg-purple-50/50 px-3 py-2 text-xs font-mono text-purple-700">
                <span className="h-2 w-2 rounded-full bg-purple-500" />
                MCP: SEC Filings
              </div>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ── Feature: Visual Builder ────────────────────────────────────────────── */

const paletteTypes = [
  { label: 'Trigger', color: 'emerald' },
  { label: 'Agent', color: 'orange' },
  { label: 'Supervisor', color: 'blue' },
  { label: 'MCP Tool', color: 'purple' },
];

function VisualBuilderSection() {
  return (
    <Section className="border-b border-outline/40">
      <div className="flex flex-col items-center gap-12 lg:flex-row-reverse lg:gap-16">
        <div className="flex-1 animate-slide-up">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-outline/60 bg-surface-dim/80 px-3 py-1 text-xs font-medium text-on-surface-variant backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
            Visual Canvas
          </span>
          <h2 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl">
            Drag, drop, <span className="text-secondary">connect.</span>
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-on-surface-variant">
            Build complex agent pipelines on an interactive graph. Add trigger nodes, AI agents,
            supervisors, and MCP tools — then wire them together in seconds.
          </p>
          <ul className="mt-6 space-y-3">
            {[
              'Trigger nodes — webhook, cron, or manual input',
              'Agent nodes — assign models, prompts, and tools',
              'Supervisor nodes — review, reject, and delegate',
              'MCP Tool nodes — connect databases, APIs, files',
            ].map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-on-surface-variant">
                <svg
                  className="mt-0.5 h-4 w-4 shrink-0 text-secondary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex-1 animate-slide-up" style={{ animationDelay: '0.15s' }}>
          <div className="relative rounded-xl border border-outline/40 bg-surface-bright p-3 shadow-md">
            {/* Toolbar */}
            <div className="flex items-center gap-2 border-b border-outline/20 pb-2 mb-2">
              <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">
                Nodes
              </span>
              <div className="flex gap-1 ml-2">
                {paletteTypes.map((t) => (
                  <span
                    key={t.label}
                    className={`rounded border border-${t.color}-200 bg-${t.color}-50/50 px-2 py-0.5 text-[8px] font-mono text-${t.color}-700 cursor-grab active:cursor-grabbing`}
                  >
                    + {t.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Canvas area */}
            <div className="relative h-52 rounded-lg border border-dashed border-outline/30 bg-surface-dim/20 overflow-hidden">
              {/* Dotted grid */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden>
                <defs>
                  <pattern id="builder-grid" width="16" height="16" patternUnits="userSpaceOnUse">
                    <circle cx="8" cy="8" r="0.6" fill="#94a3b8" opacity="0.25" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#builder-grid)" />
              </svg>

              {/* Node palette sidebar */}
              <div className="absolute left-0 top-0 bottom-0 w-24 border-r border-outline/20 bg-surface-dim/40 p-2 space-y-1.5">
                {paletteTypes.map((t) => (
                  <div
                    key={t.label}
                    className={`flex items-center gap-1.5 rounded px-2 py-1.5 text-[9px] font-mono border border-${t.color}-200 bg-white cursor-grab active:cursor-grabbing shadow-sm hover:shadow transition-shadow`}
                  >
                    <span className={`h-2 w-2 rounded-full bg-${t.color}-500`} />
                    {t.label}
                  </div>
                ))}
              </div>

              {/* Canvas with sample nodes */}
              <div className="absolute left-28 top-4 right-4 bottom-4">
                <div className="absolute top-0 left-0 w-24 h-9 rounded border-2 border-emerald-300 bg-white shadow-sm flex items-center justify-center">
                  <span className="text-[8px] font-mono text-emerald-600 font-bold">TRIGGER</span>
                </div>
                <svg
                  className="absolute top-4 left-24 w-12 h-4 text-slate-300"
                  viewBox="0 0 40 8"
                  fill="none"
                >
                  <path d="M2 4h36" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
                  <circle cx="38" cy="4" r="3" fill="#10b981" />
                </svg>

                <div className="absolute top-0 right-0 w-28 h-9 rounded border-2 border-blue-300 bg-white shadow-sm flex items-center justify-center">
                  <span className="text-[8px] font-mono text-blue-600 font-bold">SUPERVISOR</span>
                </div>

                <svg
                  className="absolute top-4 right-28 w-12 h-4 text-slate-300 rotate-180"
                  viewBox="0 0 40 8"
                  fill="none"
                >
                  <path d="M2 4h36" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
                  <circle cx="38" cy="4" r="3" fill="#2563eb" />
                </svg>

                <div className="absolute bottom-0 left-0 w-24 h-9 rounded border-2 border-orange-300 bg-white shadow-sm flex items-center justify-center">
                  <span className="text-[8px] font-mono text-orange-600 font-bold">AGENT</span>
                </div>

                <svg
                  className="absolute bottom-4 left-24 w-16 h-4 text-slate-300"
                  viewBox="0 0 60 8"
                  fill="none"
                >
                  <path
                    d="M2 4h52c3 0 4 2 4 2"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                  />
                  <circle cx="2" cy="4" r="3" fill="#f97316" />
                </svg>

                <div className="absolute bottom-0 right-8 w-16 h-7 rounded border-2 border-purple-200 bg-white shadow-sm flex items-center justify-center">
                  <span className="text-[7px] font-mono text-purple-600 font-bold">MCP</span>
                </div>
              </div>
            </div>

            <div className="mt-2 text-center text-[10px] font-mono text-slate-400">
              Drag nodes from the palette onto the canvas
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ── Feature: Supervisor & Conditions ───────────────────────────────────── */

function SupervisorSection() {
  return (
    <Section className="border-b border-outline/40">
      <div className="flex flex-col items-center gap-12 lg:flex-row lg:gap-16">
        <div className="flex-1 animate-slide-up">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-outline/60 bg-surface-dim/80 px-3 py-1 text-xs font-medium text-on-surface-variant backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
            Quality Control
          </span>
          <h2 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl">
            Supervisor <span className="text-primary">negotiation</span>
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-on-surface-variant">
            Supervisor agents review outputs from worker agents, request revisions when quality
            drops, and resolve conflicting results — all automatically.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50/50 px-4 py-3">
              <svg
                className="h-5 w-5 shrink-0 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm text-slate-700">
                Output meets quality threshold → approve
              </span>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-orange-200 bg-orange-50/50 px-4 py-3">
              <svg
                className="h-5 w-5 shrink-0 text-orange-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span className="text-sm text-slate-700">
                Conflicting outputs detected → request revision
              </span>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50/50 px-4 py-3">
              <svg
                className="h-5 w-5 shrink-0 text-blue-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="text-sm text-slate-700">
                Supervisor uses Qwen3-Max with thinking budget
              </span>
            </div>
          </div>
        </div>
        <div className="flex-1 animate-slide-up" style={{ animationDelay: '0.15s' }}>
          <div className="relative rounded-xl border border-outline/40 bg-surface-bright p-4 shadow-md">
            <div className="flex items-center gap-2 border-b border-outline/20 pb-3 mb-3">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              <span className="text-xs font-mono font-semibold text-slate-700">
                Consensus Supervisor
              </span>
            </div>
            <div className="space-y-2 text-xs font-mono">
              <div className="rounded bg-green-50 p-2 text-green-700">
                <span className="font-semibold">Academic Searcher</span>: Found 12 papers on
                multi-agent consensus
              </div>
              <div className="rounded bg-green-50 p-2 text-green-700">
                <span className="font-semibold">Patent Scanner</span>: Found 3 relevant patent
                families
              </div>
              <div className="rounded bg-orange-50 p-2 text-orange-700">
                <span className="font-semibold">⚠ Conflict</span>: Paper dates contradict patent
                priority claims
              </div>
              <div className="rounded bg-blue-50 p-2 text-blue-700">
                <span className="font-semibold">Supervisor</span>: Re-verify with cross-referenced
                sources
              </div>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ── Feature: Streaming ─────────────────────────────────────────────────── */

function StreamingSection() {
  return (
    <Section className="border-b border-outline/40">
      <div className="flex flex-col items-center gap-12 lg:flex-row-reverse lg:gap-16">
        <div className="flex-1 animate-slide-up">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-outline/60 bg-surface-dim/80 px-3 py-1 text-xs font-medium text-on-surface-variant backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
            Real-Time
          </span>
          <h2 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl">
            Watch it <span className="text-secondary">execute live</span>
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-on-surface-variant">
            See every step of your workflow as it happens. SSE streaming delivers token-by-token
            output, status updates, and animated edge highlights — in real time.
          </p>
          <ul className="mt-6 space-y-3">
            {[
              'Live token streaming from every agent',
              'Edge animations show active data flow',
              'Supervisor decisions displayed in real time',
              'Pause, resume, and inspect any node',
            ].map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-on-surface-variant">
                <svg
                  className="mt-0.5 h-4 w-4 shrink-0 text-secondary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex-1 animate-slide-up" style={{ animationDelay: '0.15s' }}>
          <div className="relative rounded-xl border border-outline/40 bg-surface-bright p-4 shadow-md">
            <div className="flex items-center gap-2 border-b border-outline/20 pb-3 mb-3">
              <span className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                EXECUTING
              </span>
              <span className="text-[10px] font-mono text-slate-400 ml-auto">00:04:23</span>
            </div>
            <div className="space-y-2 text-xs font-mono">
              <div className="flex items-center gap-2 text-slate-500">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                Web Trigger → completed
              </div>
              <div className="flex items-center gap-2 text-slate-500">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                Academic Searcher → completed (12 results)
              </div>
              <div className="flex items-center gap-2 text-blue-600">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                Patent Scanner → searching...
              </div>
              <div className="flex items-center gap-2 text-purple-500">
                <span className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-pulse" />
                SEC Filings MCP → awaiting request
              </div>
              <div className="mt-2 rounded bg-slate-50 p-2 text-slate-400 italic">
                &ldquo;Searching USPTO database for visual node orchestration systems...&rdquo;
              </div>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ── Integrations ───────────────────────────────────────────────────────── */

function IntegrationsSection() {
  return (
    <Section>
      <div className="mx-auto max-w-2xl text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-outline/60 bg-surface-dim/80 px-3 py-1 text-xs font-medium text-on-surface-variant backdrop-blur-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-pulse" />
          Integrations
        </span>
        <h2 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl animate-fade-in">
          Connect anything with <span className="text-primary">MCP</span>
        </h2>
        <p
          className="mt-4 text-lg text-on-surface-variant animate-fade-in"
          style={{ animationDelay: '0.1s' }}
        >
          The Model Context Protocol lets your agents connect to any tool, database, or API.
        </p>
      </div>

      <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4 animate-slide-up">
        {integrations.map((int, i) => (
          <div
            key={int.name}
            className="group rounded-xl border border-outline/30 bg-surface-bright px-4 py-5 text-center transition-all hover:border-outline hover:shadow-md hover:-translate-y-0.5"
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 text-slate-500 group-hover:text-primary transition-colors shadow-sm border border-outline/20">
              {int.icon}
            </div>
            <p className="mt-3 text-sm font-semibold text-on-surface">{int.name}</p>
            <p className="mt-0.5 text-[10px] font-mono text-on-surface-variant">{int.type}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ── CTA ────────────────────────────────────────────────────────────────── */

function CTA() {
  return (
    <section className="relative z-10 border-t border-outline/40 bg-surface py-24 overflow-hidden">
      <FloatingOrbs />
      <div className="mx-auto max-w-7xl px-6 text-center relative">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl animate-fade-in">
          Ready to build your first agent workflow?
        </h2>
        <p
          className="mx-auto mt-4 max-w-xl text-lg text-on-surface-variant animate-fade-in"
          style={{ animationDelay: '0.1s' }}
        >
          Start free and get 1000 credits to begin orchestrating. No credit card.
        </p>
        <div
          className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center animate-slide-up"
          style={{ animationDelay: '0.2s' }}
        >
          <div className="relative">
            <span className="absolute inset-0 rounded-lg bg-gradient-to-r from-orange-500 to-blue-500 opacity-20 blur-xl animate-pulse-slow" />
            <a
              href="/app"
              className="relative inline-flex items-center gap-2 rounded-lg bg-primary px-8 py-3 text-base font-semibold text-on-primary shadow-sm transition-all hover:shadow-lg hover:shadow-orange-500/20"
            >
              Get Started Free
              <span className="inline-block transition-transform group-hover:translate-x-0.5">
                →
              </span>
            </a>
          </div>
          <a
            href="https://github.com/koredeycode/QwenWeaver"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-outline/60 bg-surface-bright/80 px-6 py-3 text-base font-semibold text-on-surface backdrop-blur-sm transition-all hover:border-outline hover:bg-surface-dim"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            View on GitHub
          </a>
        </div>
      </div>
    </section>
  );
}
