import { X } from 'lucide-react';
import { useStore } from '../store/index.js';

export function ClearCanvasDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const clearGraph = useStore((s) => s.clearGraph);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[999] flex items-center justify-center p-6 select-text pointer-events-auto"
      onClick={onClose}
    >
      <div
        className="bg-white border-2 border-slate-900 shadow-2xl rounded-none w-full max-w-md flex flex-col relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-white text-slate-800 px-6 py-4 flex items-center justify-between border-b border-slate-200">
          <h2 className="text-sm font-bold font-mono text-slate-800 tracking-tight">
            CLEAR CANVAS
          </h2>
          <button
            onClick={onClose}
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
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-mono font-bold transition-all rounded-none cursor-pointer"
          >
            CANCEL
          </button>
          <button
            onClick={() => {
              clearGraph();
              onClose();
            }}
            className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-mono font-bold transition-all rounded-none cursor-pointer"
          >
            CLEAR CANVAS
          </button>
        </div>
      </div>
    </div>
  );
}
