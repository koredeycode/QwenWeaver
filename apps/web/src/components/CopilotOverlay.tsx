import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  MessageSquareCode, 
  Send, 
  Loader2, 
  X,
  Sparkles
} from 'lucide-react';
import { useStore } from '../store/index.js';

export const CopilotOverlay = () => {
  const messages = useStore((s) => s.copilotMessages);
  const isTyping = useStore((s) => s.isCopilotTyping);
  const sendMessage = useStore((s) => s.sendCopilotMessage);

  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  
  // Track button position on the screen
  const [pos, setPos] = useState(() => {
    // Default position: near bottom right corner
    const saved = localStorage.getItem('qwenweaver_copilot_pos');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          // Verify it's within viewport bounds
          const x = Math.max(10, Math.min(window.innerWidth - 80, parsed.x));
          const y = Math.max(10, Math.min(window.innerHeight - 80, parsed.y));
          return { x, y };
        }
      } catch {
        // Fallback
      }
    }
    return { x: window.innerWidth - 180, y: window.innerHeight - 150 };
  });

  const dragRef = useRef<{ isDragging: boolean; startX: number; startY: number; posX: number; posY: number }>({
    isDragging: false,
    startX: 0,
    startY: 0,
    posX: 0,
    posY: 0
  });

  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (isOpen) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Keep position bounded when window resizes
  useEffect(() => {
    const handleResize = () => {
      setPos((prev) => {
        const x = Math.max(10, Math.min(window.innerWidth - 80, prev.x));
        const y = Math.max(10, Math.min(window.innerHeight - 80, prev.y));
        return { x, y };
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only drag on left click
    if (e.button !== 0) return;
    
    dragRef.current = {
      isDragging: false,
      startX: e.clientX,
      startY: e.clientY,
      posX: pos.x,
      posY: pos.y
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - dragRef.current.startX;
      const deltaY = moveEvent.clientY - dragRef.current.startY;
      
      if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
        dragRef.current.isDragging = true;
      }
      
      const newX = Math.max(10, Math.min(window.innerWidth - 80, dragRef.current.posX + deltaX));
      const newY = Math.max(10, Math.min(window.innerHeight - 80, dragRef.current.posY + deltaY));
      
      setPos({ x: newX, y: newY });
      localStorage.setItem('qwenweaver_copilot_pos', JSON.stringify({ x: newX, y: newY }));
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [pos]);

  const handleButtonClick = () => {
    if (dragRef.current.isDragging) return;
    setIsOpen((prev) => !prev);
  };

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

  // Calculate overlay position (anchored to the button, but clamped within viewport)
  const overlayWidth = 340;
  const overlayHeight = 440;
  
  // Place overlay right above or next to the button
  const overlayLeft = Math.max(20, Math.min(window.innerWidth - overlayWidth - 20, pos.x - 280));
  const overlayTop = Math.max(20, Math.min(window.innerHeight - overlayHeight - 80, pos.y - overlayHeight - 15));

  return (
    <>
      {/* Draggable Copilot Button */}
      <div 
        style={{ left: pos.x, top: pos.y }}
        className="fixed z-50 select-none cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
      >
        <button
          onClick={handleButtonClick}
          className={`flex items-center gap-2 px-4 py-2.5 shadow-lg border border-[#cbd5e1] font-mono text-xs font-bold transition-all rounded-none ${
            isOpen 
              ? 'bg-[#ea580c] border-[#ea580c] text-white' 
              : 'bg-white hover:bg-slate-50 text-slate-700'
          }`}
          title="Drag to reposition, Click to toggle Qwen Copilot chat"
        >
          <MessageSquareCode className={`w-4 h-4 ${isOpen ? 'text-white' : 'text-[#ea580c]'}`} />
          <span>Qwen Copilot</span>
          <Sparkles className="w-3 h-3 text-amber-500 animate-pulse" />
        </button>
      </div>

      {/* Floating Chat Overlay */}
      {isOpen && (
        <div 
          style={{ left: overlayLeft, top: overlayTop, width: overlayWidth, height: overlayHeight }}
          className="fixed z-50 bg-white border border-[#cbd5e1] shadow-2xl flex flex-col font-sans text-slate-800 select-none rounded-none overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#cbd5e1] bg-[#f8fafc] px-4 py-2.5">
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
                <p className="text-[10px] mt-1 max-w-[200px]">E.g. "Build a research swarm comparing patent scanners with worker agents."</p>
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
                <span className="font-mono text-[10px]">Copilot compiling swarm...</span>
              </div>
            )}
            
            <div ref={chatBottomRef} />
          </div>

          {/* Chat Input */}
          <div className="p-3 border-t border-[#cbd5e1] bg-white flex items-center gap-1.5">
            <textarea
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ask copilot to build a swarm..."
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
    </>
  );
};
