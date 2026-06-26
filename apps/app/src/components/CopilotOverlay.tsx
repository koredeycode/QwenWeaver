import React, { useState, useRef, useEffect } from 'react';
import { MessageSquareCode, Send, Loader2, X, Sparkles } from 'lucide-react';
import { useStore } from '../store/index.js';

export const CopilotOverlay = ({
  className = 'fixed bottom-14 right-3 z-50 flex flex-col items-end gap-2 pointer-events-none',
}: {
  className?: string;
}) => {
  const messages = useStore((s) => s.copilotMessages);
  const isTyping = useStore((s) => s.isCopilotTyping);
  const sendMessage = useStore((s) => s.sendCopilotMessage);

  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');

  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (isOpen) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input);
    setInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={`pointer-events-none ${className}`}>
      {isOpen && (
        <div className="absolute bottom-full right-0 mb-2 pointer-events-auto bg-white border border-[#cbd5e1] shadow-2xl flex flex-col font-sans text-slate-800 select-none rounded-none overflow-hidden animate-in fade-in zoom-in-95 duration-150 w-[340px] h-[440px]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#cbd5e1] bg-[#f8fafc] px-4 py-2.5 flex-shrink-0">
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold tracking-wider text-slate-900">
              <MessageSquareCode className="w-3.5 h-3.5 text-[#ea580c]" />
              QwenWeaver Copilot Assistant
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-slate-200 text-slate-400 hover:text-slate-700 border border-slate-200 transition-colors"
              title="Close Copilot"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-400">
                <Sparkles className="w-8 h-8 text-slate-300 mb-2 animate-bounce" />
                <p className="text-xs font-bold text-slate-500">Ask Qwen Copilot anything!</p>
                <p className="text-[10px] mt-1 max-w-[200px]">
                  E.g. "Build a research workflow comparing patent scanners with worker agents."
                </p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`p-2.5 border text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-slate-50 border-slate-200 text-slate-800 ml-6'
                      : 'bg-blue-50/50 border-blue-100 text-slate-850 mr-6 shadow-[inset_2px_0_0_#2563eb]'
                  }`}
                >
                  <div className="font-mono text-[9px] text-slate-400 uppercase font-bold tracking-wider mb-1">
                    {msg.role === 'user' ? 'You' : 'Qwen Copilot'}
                  </div>
                  <div className="whitespace-pre-wrap">{msg.text}</div>
                </div>
              ))
            )}

            {isTyping && (
              <div className="bg-slate-50 border border-slate-200 p-2.5 text-xs text-slate-500 mr-6 flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#ea580c]" />
                <span className="font-mono text-[10px]">Copilot building workflow...</span>
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>

          {/* Chat Input */}
          <div className="p-3 border-t border-[#cbd5e1] bg-white flex items-center gap-1.5 flex-shrink-0">
            <textarea
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ask copilot to build a workflow..."
              className="flex-1 bg-transparent text-xs text-slate-800 outline-none resize-none px-2 py-1 max-h-20 border border-slate-200 focus:border-[#cbd5e1] rounded-none font-mono"
            />
            <button
              onClick={handleSend}
              disabled={isTyping || !input.trim()}
              className="p-2 bg-[#9a3412] hover:bg-[#a73a00] text-white disabled:opacity-30 flex-shrink-0"
              title="Send Message"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Copilot Button — fixed at bottom-left above shortcuts */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={`pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 shadow-lg border border-[#cbd5e1] font-mono text-xs font-bold transition-all rounded-none ${
          isOpen
            ? 'bg-[#ea580c] border-[#ea580c] text-white'
            : 'bg-white hover:bg-slate-50 text-slate-600'
        }`}
        data-tour="copilot"
      >
        <MessageSquareCode className={`w-4 h-4 ${isOpen ? 'text-white' : 'text-[#ea580c]'}`} />
        <span>Qwen Copilot</span>
        <Sparkles className="w-3 h-3 text-amber-500 animate-pulse" />
      </button>
    </div>
  );
};
