import React, { useState } from 'react';
import { Node, Edge } from '@xyflow/react';
import type { NodeData } from '@qwenweaver/types';
import { Download, Copy, Check, X } from 'lucide-react';
import { toast } from 'sonner';

interface ExportWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: Node<NodeData>[];
  edges: Edge[];
  workflowId?: string;
}

export const ExportWorkflowModal = ({
  isOpen,
  onClose,
  nodes,
  edges,
  workflowId
}: ExportWorkflowModalProps) => {
  const [hasCopied, setHasCopied] = useState(false);

  if (!isOpen) return null;

  const workflowName = workflowId || 'workflow';
  const exportData = {
    name: workflowName,
    nodes,
    edges
  };
  const jsonString = JSON.stringify(exportData, null, 2);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      setHasCopied(true);
      toast.success("Workflow config copied to clipboard!");
      setTimeout(() => setHasCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy workflow to clipboard.");
    }
  };

  const handleDownload = () => {
    try {
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `qwen-workflow-${workflowName}-${Date.now().toString().slice(-4)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Workflow file download started.");
    } catch (err) {
      toast.error("Failed to download workflow file.");
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[999] flex items-center justify-center p-6 select-text pointer-events-auto"
      onClick={onClose}
    >
      <div 
        className="bg-white border-2 border-slate-900 shadow-2xl rounded-none w-full max-w-xl flex flex-col relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-white text-slate-800 px-6 py-4 flex items-center justify-between border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <Download className="w-4 h-4 text-[#ea580c]" />
            <h2 className="text-sm font-bold font-mono text-slate-800 tracking-tight">EXPORT WORKFLOW</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div className="flex gap-4 text-xs font-mono text-slate-500 border-b border-slate-100 pb-3">
            <div>NODES: <span className="font-bold text-slate-800">{nodes.length}</span></div>
            <div>EDGES: <span className="font-bold text-slate-800">{edges.length}</span></div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Workflow JSON Preview</label>
            <div className="h-48 border border-slate-200 bg-slate-50 p-3 font-mono text-[10px] overflow-y-auto whitespace-pre-wrap select-all leading-normal text-slate-600">
              {jsonString}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={handleCopy}
              className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all cursor-pointer rounded-none"
            >
              {hasCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-600" />}
              {hasCopied ? "COPIED!" : "COPY TO CLIPBOARD"}
            </button>
            <button
              onClick={handleDownload}
              className="py-2.5 px-4 bg-slate-900 hover:bg-[#ea580c] hover:border-[#ea580c] border border-slate-900 text-white text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all cursor-pointer rounded-none"
            >
              <Download className="w-4 h-4" />
              DOWNLOAD JSON FILE
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 flex items-center justify-end border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-mono font-bold transition-all rounded-none cursor-pointer border border-slate-350"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
