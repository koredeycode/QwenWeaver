import React, { useState } from 'react';
import { useStore } from '../store/index.js';
import { Download, X } from 'lucide-react';
import { toast } from 'sonner';

interface ImportWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ImportWorkflowModal = ({ isOpen, onClose }: ImportWorkflowModalProps) => {
  const importWorkflow = useStore((s) => s.importWorkflow);
  const [importMerge, setImportMerge] = useState(false);
  const [importText, setImportText] = useState('');

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setImportText(content);
      toast.success(`Loaded file: ${file.name}`);
    };
    reader.onerror = () => {
      toast.error('Failed to read file.');
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    if (!importText.trim()) {
      toast.error('Please paste JSON or upload a file first.');
      return;
    }

    try {
      const parsed = JSON.parse(importText);
      const success = importWorkflow(parsed, importMerge);
      if (success) {
        onClose();
        setImportText('');
      }
    } catch (err: any) {
      toast.error(`Invalid JSON syntax: ${err.message || err}`);
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
            <Download className="w-4 h-4 text-[#f97316]" />
            <h2 className="text-sm font-bold font-mono text-slate-800 tracking-tight">
              IMPORT WORKFLOW
            </h2>
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
          {/* Mode selection */}
          <div>
            <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Import Strategy
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setImportMerge(false)}
                className={`py-2 px-3 border text-xs font-mono font-bold transition-all cursor-pointer rounded-none text-center ${
                  !importMerge
                    ? 'bg-slate-100 border-slate-900 text-slate-900'
                    : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'
                }`}
              >
                REPLACE CANVAS
              </button>
              <button
                onClick={() => setImportMerge(true)}
                className={`py-2 px-3 border text-xs font-mono font-bold transition-all cursor-pointer rounded-none text-center ${
                  importMerge
                    ? 'bg-slate-100 border-slate-900 text-slate-900'
                    : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'
                }`}
              >
                MERGE WITH CANVAS
              </button>
            </div>
            <span className="text-[9px] font-mono text-slate-400 mt-1 block">
              {!importMerge
                ? 'Clears the active canvas and imports nodes/edges exactly as configured in the file.'
                : 'Keeps existing nodes. Appends new ones with updated unique IDs and offset layout.'}
            </span>
          </div>

          {/* File picker */}
          <div>
            <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Method 1: Upload JSON File
            </label>
            <label className="border-2 border-dashed border-slate-200 hover:border-slate-350 bg-slate-50 py-4 px-3 flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-slate-100/50">
              <Download className="w-5 h-5 text-slate-400 mb-1" />
              <span className="text-xs font-mono font-bold text-slate-600">
                CHOOSE OR DROP JSON FILE
              </span>
              <input type="file" accept=".json" onChange={handleFileChange} className="hidden" />
            </label>
          </div>

          {/* Text area paste */}
          <div className="space-y-1">
            <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
              Method 2: Paste Raw JSON
            </label>
            <textarea
              className="w-full h-32 border border-slate-200 bg-white p-3 font-mono text-[10px] leading-normal outline-none focus:border-slate-400 text-slate-800 resize-none"
              placeholder='{"nodes": [...], "edges": [...]}'
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 flex items-center justify-between border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-mono font-bold transition-all rounded-none cursor-pointer border border-slate-350"
          >
            CANCEL
          </button>
          <button
            onClick={handleImport}
            className="px-4 py-1.5 bg-slate-900 hover:bg-[#ea580c] text-white text-xs font-mono font-bold transition-all rounded-none cursor-pointer"
          >
            RUN IMPORT
          </button>
        </div>
      </div>
    </div>
  );
};
