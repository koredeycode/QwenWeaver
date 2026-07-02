import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Download } from 'lucide-react';
import type { OutputPart } from '@qwenweaver/types';
import { API_URL } from '../lib/api-client.js';

interface OutputRendererProps {
  outputUrl?: string;
  streamingText?: string;
  thinkingText?: string;
  fileExtension?: string;
  status: string;
  outputParts?: OutputPart[];
}

function getMediaUrl(val: string): string {
  if (!val) return '';
  if (val.startsWith('http://') || val.startsWith('https://')) return val;
  const base = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
  const path = val.startsWith('/') ? val : '/' + val;
  return `${base}${path}`;
}

function isMediaExt(ext: string): boolean {
  return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'mp4', 'webm', 'mov', 'mp3', 'wav', 'ogg'].includes(
    ext,
  );
}

function getMediaElement(url: string, ext: string) {
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) {
    return (
      <img src={url} alt="Generated output" className="max-w-full h-auto rounded" loading="lazy" />
    );
  }
  if (['mp4', 'webm', 'mov'].includes(ext)) {
    return (
      <video controls className="max-w-full h-auto rounded" preload="metadata">
        <source src={url} />
      </video>
    );
  }
  if (['mp3', 'wav', 'ogg'].includes(ext)) {
    return (
      <audio controls className="w-full" preload="metadata">
        <source src={url} />
      </audio>
    );
  }
  return null;
}

function renderOutputParts(parts: OutputPart[]) {
  return parts.map((part, idx) => {
    const url = getMediaUrl(part.value);
    if (part.type === 'image' || part.contentType?.startsWith('image/')) {
      return (
        <div key={idx} className="space-y-1 py-2">
          <div className="text-[8px] font-bold text-slate-400 uppercase">Generated Image</div>
          <div className="flex flex-col items-center">
            <img
              src={url}
              alt={`Output ${idx + 1}`}
              className="max-w-full max-h-[320px] object-contain border border-slate-200"
            />
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 text-[9px] font-bold text-blue-600 hover:underline"
            >
              Open in full tab ↗
            </a>
          </div>
        </div>
      );
    }
    if (part.type === 'video' || part.contentType?.startsWith('video/')) {
      return (
        <div key={idx} className="space-y-1 py-2">
          <div className="text-[8px] font-bold text-slate-400 uppercase">Generated Video</div>
          <div className="flex flex-col items-center">
            <video
              src={url}
              controls
              className="max-w-full max-h-[320px] object-contain border border-slate-200"
            />
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 text-[9px] font-bold text-blue-600 hover:underline"
            >
              Open in full tab ↗
            </a>
          </div>
        </div>
      );
    }
    if (part.type === 'audio' || part.contentType?.startsWith('audio/')) {
      return (
        <div key={idx} className="space-y-1 py-2">
          <div className="text-[8px] font-bold text-slate-400 uppercase">Generated Audio</div>
          <audio src={url} controls className="w-full" />
        </div>
      );
    }
    return (
      <div key={idx} className="whitespace-pre-wrap text-[13px] text-slate-800 py-1">
        {part.value}
      </div>
    );
  });
}

export const OutputRenderer = React.memo(
  ({
    outputUrl,
    streamingText,
    thinkingText,
    fileExtension,
    status,
    outputParts,
  }: OutputRendererProps) => {
    const [isThinkingCollapsed, setIsThinkingCollapsed] = useState(false);

    // If structured OutputPart[] is provided, render parts directly
    if (outputParts && outputParts.length > 0) {
      return (
        <div className="mt-2.5 bg-white border border-slate-200 p-4 font-sans text-sm text-slate-800 overflow-y-auto leading-relaxed shadow-sm">
          <div className="text-slate-400 border-b border-slate-100 pb-2 mb-3 flex items-center justify-between font-mono">
            <span className="text-[10px] font-bold tracking-wide">OUTPUT</span>
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
          <div className="space-y-2">{renderOutputParts(outputParts)}</div>
        </div>
      );
    }

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

    if (finalOutputUrl && ext && isMediaExt(ext)) {
      return (
        <div className="mt-2 bg-slate-50 border border-slate-200 p-2 rounded flex justify-center">
          {getMediaElement(finalOutputUrl, ext)}
        </div>
      );
    }

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
