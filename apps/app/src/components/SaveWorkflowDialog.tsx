import React, { useEffect, useRef, useState } from 'react';
import { Save, X } from 'lucide-react';

interface SaveWorkflowDialogProps {
  isOpen: boolean;
  initialName?: string;
  initialDescription?: string;
  onClose: () => void;
  onConfirm: (name: string, description: string) => void;
}

export const SaveWorkflowDialog = ({
  isOpen,
  initialName = '',
  initialDescription = '',
  onClose,
  onConfirm
}: SaveWorkflowDialogProps) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName(initialName);
      setDescription(initialDescription);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, initialName, initialDescription]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onConfirm(name.trim(), description.trim());
  };

  return (
    <div
      className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[999] flex items-center justify-center p-6 select-text pointer-events-auto"
      onClick={onClose}
    >
      <div
        className="bg-white border-2 border-slate-900 shadow-2xl rounded-none w-full max-w-lg flex flex-col relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-white text-slate-800 px-6 py-4 flex items-center justify-between border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <Save className="w-4 h-4 text-[#ea580c]" />
            <h2 className="text-sm font-bold font-mono text-slate-800 tracking-tight">SAVE WORKFLOW</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
              Workflow Name <span className="text-rose-500">*</span>
            </label>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Academic Research Swarm"
              className="w-full border border-slate-200 bg-white p-3 font-mono text-sm outline-none focus:border-slate-400 text-slate-800 placeholder:text-slate-300"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
              Description <span className="text-slate-300">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this workflow does..."
              rows={3}
              className="w-full border border-slate-200 bg-white p-3 font-mono text-sm outline-none focus:border-slate-400 text-slate-800 placeholder:text-slate-300 resize-none"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 flex items-center justify-between border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-mono font-bold transition-all rounded-none cursor-pointer"
          >
            CANCEL
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim()}
            className="px-4 py-1.5 bg-slate-900 hover:bg-[#9a3412] text-white text-xs font-mono font-bold transition-all rounded-none cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          >
            SAVE WORKFLOW
          </button>
        </div>
      </div>
    </div>
  );
};
