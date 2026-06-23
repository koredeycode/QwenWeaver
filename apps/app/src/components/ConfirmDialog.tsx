import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog = ({
  isOpen,
  title,
  message,
  confirmLabel = 'DELETE',
  cancelLabel = 'CANCEL',
  destructive = true,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[999] flex items-center justify-center p-6 select-text pointer-events-auto"
      onClick={onCancel}
    >
      <div
        className="bg-white border-2 border-slate-900 shadow-2xl rounded-none w-full max-w-md flex flex-col relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-white text-slate-800 px-6 py-4 flex items-center justify-between border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            <h2 className="text-sm font-bold font-mono text-slate-800 tracking-tight">{title}</h2>
          </div>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-sm font-mono text-slate-600 leading-relaxed">{message}</p>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 flex items-center justify-between border-t border-slate-200">
          <button
            onClick={onCancel}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-mono font-bold transition-all rounded-none cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-1.5 text-white text-xs font-mono font-bold transition-all rounded-none cursor-pointer ${destructive ? 'bg-rose-600 hover:bg-rose-700' : 'bg-slate-900 hover:bg-[#9a3412]'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
