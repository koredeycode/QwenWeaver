import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Download } from 'lucide-react';

interface OutputRendererProps {
  outputUrl?: string;
  streamingText?: string;
  thinkingText?: string;
  fileExtension?: string;
  status: string;
}

function isMediaExt(ext: string): boolean {
  return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'mp4', 'webm', 'mov', 'mp3', 'wav', 'ogg'].includes(
    ext,
  );
}

function getMediaElement(outputUrl: string, ext: string) {
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) {
    return (
      <img
        src={outputUrl}
        alt="Generated output"
        className="max-w-full h-auto rounded"
        loading="lazy"
      />
    );
  }
  if (['mp4', 'webm', 'mov'].includes(ext)) {
    return (
      <video controls className="max-w-full h-auto rounded" preload="metadata">
        <source src={outputUrl} />
      </video>
    );
  }
  if (['mp3', 'wav', 'ogg'].includes(ext)) {
    return (
      <audio controls className="w-full" preload="metadata">
        <source src={outputUrl} />
      </audio>
    );
  }
  return null;
}

export const OutputRenderer = React.memo(
  ({ outputUrl, streamingText, thinkingText, fileExtension, status }: OutputRendererProps) => {
    const [isThinkingCollapsed, setIsThinkingCollapsed] = useState(false);

    if (!outputUrl && !streamingText && !thinkingText) return null;

    const finalOutputUrl = outputUrl?.startsWith('/')
      ? `${import.meta.env.VITE_API_URL || ''}${outputUrl}`
      : outputUrl;

    const isRunning = status === 'running';
    const ext = finalOutputUrl ? finalOutputUrl.split('.').pop()?.toLowerCase() : undefined;

    const handleDownloadStream = () => {
      if (!streamingText) return;
      const blob = new Blob([streamingText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `agent-output.${fileExtension || 'txt'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };

    // Media outputs (image/video/audio) always render inline regardless of status
    if (finalOutputUrl && ext && isMediaExt(ext)) {
      return (
        <div className="mt-2 bg-slate-50 border border-slate-200 p-2 rounded flex justify-center">
          {getMediaElement(finalOutputUrl, ext)}
        </div>
      );
    }

    // Text output: show content inline with a download button
    if (streamingText || thinkingText || (finalOutputUrl && ext)) {
      const headerLabel = isRunning ? 'STREAMING' : 'OUTPUT';
      return (
        <div className="mt-2.5 bg-white border border-slate-200 p-4 font-sans text-sm text-slate-800 overflow-y-auto leading-relaxed shadow-sm">
          <div className="text-slate-400 border-b border-slate-100 pb-2 mb-3 flex items-center justify-between font-mono">
            <span className="text-[10px] font-bold tracking-wide">{headerLabel}</span>
            <div className="flex items-center gap-2">
              {finalOutputUrl && !isMediaExt(ext ?? '') ? (
                <a
                  href={finalOutputUrl}
                  download
                  className="flex items-center gap-1 text-primary hover:text-primary/80 text-[10px] font-bold uppercase"
                >
                  <Download className="w-3 h-3" />
                  Download File
                </a>
              ) : streamingText ? (
                <button
                  onClick={handleDownloadStream}
                  className="flex items-center gap-1 text-primary hover:text-primary/80 text-[10px] font-bold uppercase cursor-pointer"
                >
                  <Download className="w-3 h-3" />
                  Save as {(fileExtension || 'txt').toUpperCase()}
                </button>
              ) : null}
              {isRunning && <span className="animate-pulse text-amber-500">_</span>}
            </div>
          </div>

          {thinkingText && (
            <div className="mb-4 bg-slate-50 border border-slate-200 rounded-md overflow-hidden">
              <button
                onClick={() => setIsThinkingCollapsed(!isThinkingCollapsed)}
                className="w-full flex items-center justify-between p-2 text-xs font-mono font-bold text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  {isThinkingCollapsed ? (
                    <ChevronRight className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                  <span>Agent Thinking Process</span>
                </div>
              </button>
              {!isThinkingCollapsed && (
                <div className="p-3 border-t border-slate-200 text-slate-500 font-mono text-xs italic whitespace-pre-wrap">
                  {thinkingText}
                </div>
              )}
            </div>
          )}

          {streamingText && (
            <div className="whitespace-pre-wrap font-sans text-[13px] text-slate-800">
              {streamingText}
            </div>
          )}
        </div>
      );
    }

    return null;
  },
);

OutputRenderer.displayName = 'OutputRenderer';
