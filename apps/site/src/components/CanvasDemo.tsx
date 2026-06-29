import { useEffect, useState, useRef } from 'react';
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
import {
  demoNodeDefs,
  demoEdges,
  INITIAL_POSITIONS,
  NODE_SIZES,
  phases,
  nodeIds,
} from '../data/site-content.js';

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

  const r = 8;

  if (srcHandle === 'bottom' && tgtHandle === 'top') {
    const dy = Math.sign(p2.y - p1.y);
    const dx = Math.sign(p2.x - p1.x);
    const midY = (p1.y + p2.y) / 2;

    if (Math.abs(p2.x - p1.x) < 2 * r) {
      return `M${p1.x},${p1.y} L${p2.x},${p2.y}`;
    }

    return [
      `M${p1.x},${p1.y}`,
      `L${p1.x},${midY - dy * r}`,
      `Q${p1.x},${midY} ${p1.x + dx * r},${midY}`,
      `L${p2.x - dx * r},${midY}`,
      `Q${p2.x},${midY} ${p2.x},${midY + dy * r}`,
      `L${p2.x},${p2.y}`,
    ].join(' ');
  }

  const dx = Math.sign(p2.x - p1.x);
  const dy = Math.sign(p2.y - p1.y);
  const midX = (p1.x + p2.x) / 2;

  if (Math.abs(p2.y - p1.y) < 2 * r) {
    return `M${p1.x},${p1.y} L${p2.x},${p2.y}`;
  }

  return [
    `M${p1.x},${p1.y}`,
    `L${midX - dx * r},${p1.y}`,
    `Q${midX},${p1.y} ${midX},${p1.y + dy * r}`,
    `L${midX},${p2.y - dy * r}`,
    `Q${midX},${p2.y} ${midX + dx * r},${p2.y}`,
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
      <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-emerald-500 border-2 border-slate-700 rounded-full hover:scale-125 transition-transform shadow-sm" />
    </div>
  );
}

function DemoAgentNode({ status }: { status: 'pending' | 'running' | 'completed' }) {
  return (
    <div
      className={`w-full h-full bg-white border-2 ${status === 'completed' ? 'border-emerald-500 shadow-[0_2px_8px_rgba(16,185,129,0.15)]' : status === 'running' ? 'border-primary-container animate-[nodePulse_2s_ease-in-out_infinite]' : 'border-outline'} text-slate-800 font-sans shadow-sm flex flex-col rounded-none relative`}
    >
      <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-[#f97316] border-2 border-slate-700 rounded-full hover:scale-125 transition-transform shadow-sm" />
      <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-purple-500 border-2 border-slate-700 rounded-full hover:scale-125 transition-transform shadow-sm" />

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

      <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-[#f97316] border-2 border-slate-700 rounded-full hover:scale-125 transition-transform shadow-sm" />
    </div>
  );
}

function DemoSupervisorNode({ status }: { status: 'pending' | 'running' | 'completed' }) {
  return (
    <div
      className={`w-full h-full bg-white border-2 ${status === 'completed' ? 'border-emerald-500 shadow-[0_2px_8px_rgba(16,185,129,0.15)]' : status === 'running' ? 'border-secondary-container animate-[supervisorPulse_2s_ease-in-out_infinite]' : 'border-outline'} text-slate-800 font-sans shadow-md flex flex-col rounded-none relative`}
    >
      <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-[#2563eb] border-2 border-slate-700 rounded-full hover:scale-125 transition-transform shadow-sm" />
      <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-purple-500 border-2 border-slate-700 rounded-full hover:scale-125 transition-transform shadow-sm" />

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

      <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-[#2563eb] border-2 border-slate-700 rounded-full hover:scale-125 transition-transform shadow-sm" />
    </div>
  );
}

function DemoToolNode({ status }: { status: 'pending' | 'running' | 'completed' }) {
  return (
    <div
      className={`w-full h-full bg-white border-2 ${status === 'completed' ? 'border-emerald-500 shadow-[0_2px_6px_rgba(16,185,129,0.12)]' : status === 'running' ? 'border-purple-500 shadow-[0_2px_8px_rgba(168,85,247,0.15)]' : 'border-purple-200'} text-slate-800 font-sans shadow-sm flex flex-col rounded-none relative`}
    >
      <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-purple-500 border-2 border-slate-700 rounded-full hover:scale-125 transition-transform shadow-sm" />
      <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-purple-500 border-2 border-slate-700 rounded-full hover:scale-125 transition-transform shadow-sm" />

      <div className="flex items-center justify-between px-1 py-0.5 border-b border-outline-variant">
        <div className="flex items-center gap-0.5">
          <Wrench className="w-2.5 h-2.5 text-purple-600" />
          <span className="text-[5px] font-mono font-bold tracking-wider text-purple-600">MCP</span>
        </div>
        <div className="flex items-center gap-0.5">
          <DemoCompactStatus status={status} />
          <Maximize2 className="w-1.5 h-1.5 text-purple-300" />
        </div>
      </div>
      <div className="flex items-center justify-center flex-1 min-h-0">
        <div className="w-6 h-6 rounded bg-purple-100 flex items-center justify-center">
          <Wrench className="w-3.5 h-3.5 text-purple-600" />
        </div>
      </div>
    </div>
  );
}

export function CanvasDemo() {
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

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      e.preventDefault();
      const touch = e.touches[0];
      setPositions((prev) => ({
        ...prev,
        [dragging]: { x: touch.clientX - dragOffset.x, y: touch.clientY - dragOffset.y },
      }));
    };
    const onTouchEnd = () => setDragging(null);

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [dragging, dragOffset]);

  const onNodeMouseDown = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    const p = positions[id];
    setDragging(id);
    setDragOffset({ x: e.clientX - p.x, y: e.clientY - p.y });
  };

  const onNodeTouchStart = (id: string, e: React.TouchEvent) => {
    if (e.touches.length === 0) return;
    const touch = e.touches[0];
    const p = positions[id];
    setDragging(id);
    setDragOffset({ x: touch.clientX - p.x, y: touch.clientY - p.y });
  };

  const startExecution = () => {
    setNodeStatuses(Object.fromEntries(nodeIds.map((id) => [id, 'pending' as const])));
    setExecution('running');

    timersRef.current = phases.map((phase) =>
      setTimeout(() => {
        setNodeStatuses((prev) => ({ ...prev, ...phase.statuses }));
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
            <marker
              id="arrow-inactive"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#cbd5e1" />
            </marker>
            <marker
              id="arrow-trigger"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#10b981" />
            </marker>
            <marker
              id="arrow-agent"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#f97316" />
            </marker>
            <marker
              id="arrow-supervisor"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#2563eb" />
            </marker>
            <marker
              id="arrow-tool"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#8b5cf6" />
            </marker>
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
            const colorVal = edgeColor(e);
            const srcRunning = nodeStatuses[e.source] === 'running';
            const srcDone = nodeStatuses[e.source] === 'completed';
            const active = srcRunning || srcDone;
            const animDelay = `${i * 0.2}s`;

            const edgeStrokeColor = active ? colorVal : '#cbd5e1';
            const markerId = !active
              ? 'arrow-inactive'
              : demoNodeDefs.find((n) => n.id === e.source)?.type === 'trigger'
                ? 'arrow-trigger'
                : demoNodeDefs.find((n) => n.id === e.source)?.type === 'supervisor'
                  ? 'arrow-supervisor'
                  : demoNodeDefs.find((n) => n.id === e.source)?.type === 'tool'
                    ? 'arrow-tool'
                    : 'arrow-agent';

            return (
              <g key={i}>
                <path
                  d={d}
                  fill="none"
                  stroke={edgeStrokeColor}
                  strokeWidth={active ? '2.5' : '1.5'}
                  markerEnd={`url(#${markerId})`}
                />
                {active && (
                  <path
                    d={d}
                    fill="none"
                    stroke={edgeStrokeColor}
                    strokeWidth="2"
                    strokeOpacity={0.9}
                    strokeDasharray="5 5"
                    className={srcRunning ? 'animate-edge-flow' : ''}
                    style={{ animationDelay: animDelay }}
                  />
                )}
                {srcRunning && (
                  <circle r="3.5" fill={edgeStrokeColor} opacity="0.9">
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
              onTouchStart={(e) => onNodeTouchStart(n.id, e)}
              className="absolute cursor-grab active:cursor-grabbing select-none"
              style={{
                left: pos.x,
                top: pos.y,
                width: sz.w,
                height: sz.h,
                opacity: mounted ? 1 : 0,
                transition: isDragging ? 'none' : `opacity 0.4s ease ${i * 0.1}s`,
                zIndex: isDragging ? 20 : 10,
                touchAction: 'none',
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
