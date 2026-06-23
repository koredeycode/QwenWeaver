import React from 'react';
import { useReactFlow, useViewport, Panel } from '@xyflow/react';
import { Maximize, Lock, Unlock } from 'lucide-react';

interface CustomZoomControlsProps {
  isLocked: boolean;
  onToggleLock: () => void;
}

export const CustomZoomControls = ({ 
  isLocked, 
  onToggleLock 
}: CustomZoomControlsProps) => {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const { zoom } = useViewport();
  const zoomPercent = Math.round(zoom * 100);

  return (
    <Panel position="bottom-center" className="mb-4 bg-white border border-[#cbd5e1] p-0.5 shadow-sm flex flex-row items-center select-none pointer-events-auto rounded-none h-8">
      <button
        onClick={() => zoomOut()}
        className="w-7 h-7 flex items-center justify-center hover:bg-slate-50 text-slate-600 font-bold transition-colors cursor-pointer"
        title="Zoom Out"
      >
        <span className="text-xs">—</span>
      </button>
      <div className="px-2.5 font-mono text-[10px] font-bold text-slate-500 min-w-[46px] text-center border-l border-r border-slate-100">
        {zoomPercent}%
      </div>
      <button
        onClick={() => zoomIn()}
        className="w-7 h-7 flex items-center justify-center hover:bg-slate-50 text-slate-600 font-bold transition-colors cursor-pointer"
        title="Zoom In"
      >
        <span className="text-xs">＋</span>
      </button>
      <button
        onClick={() => fitView()}
        className="w-7 h-7 flex items-center justify-center hover:bg-slate-50 text-slate-500 hover:text-slate-700 transition-colors border-l border-slate-100 cursor-pointer"
        title="Fit View"
      >
        <Maximize className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={onToggleLock}
        className="w-7 h-7 flex items-center justify-center hover:bg-slate-50 text-slate-500 hover:text-slate-700 transition-colors border-l border-slate-100 cursor-pointer"
        title={isLocked ? "Unlock Workspace Interactions" : "Lock Workspace Interactions"}
      >
        {isLocked ? (
          <Lock className="w-3.5 h-3.5 text-rose-600 fill-rose-50/50" />
        ) : (
          <Unlock className="w-3.5 h-3.5 text-slate-400" />
        )}
      </button>
    </Panel>
  );
};
