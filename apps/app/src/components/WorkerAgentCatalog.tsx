import React from 'react';
import { Bot, Brain, Image, Video, Volume2, Sparkles, X } from 'lucide-react';
import { useStore } from '../store/index.js';

interface WorkerOption {
  id: string;
  name: string;
  description: string;
  group: 'text' | 'media';
  model: string;
  enableThinking: boolean;
  outputFormat: 'text' | 'markdown' | 'json' | 'image' | 'audio' | 'video';
  systemPrompt: string;
  icon: React.ComponentType<any>;
  iconBg: string;
  iconColor: string;
}

const WORKER_OPTIONS: WorkerOption[] = [
  {
    id: 'general',
    name: 'General Worker',
    description:
      'General-purpose text analysis, synthesis, and tool-calling agent. Balanced and versatile.',
    group: 'text',
    model: 'qwen3.7-plus',
    enableThinking: false,
    outputFormat: 'text',
    systemPrompt: 'You are a general worker agent. Complete your task accurately and concisely.',
    icon: Bot,
    iconBg: 'bg-blue-50 border-blue-200',
    iconColor: 'text-blue-600',
  },
  {
    id: 'reasoning',
    name: 'Deep Reasoning Worker',
    description:
      'Expert agent with thinking/reasoning mode enabled. Solves complex tasks and logic checks.',
    group: 'text',
    model: 'qwen3.7-max',
    enableThinking: true,
    outputFormat: 'markdown',
    systemPrompt:
      'You are a deep reasoning worker. Analyze the problem step-by-step before producing your final answer.',
    icon: Brain,
    iconBg: 'bg-purple-50 border-purple-200',
    iconColor: 'text-purple-600',
  },
  {
    id: 'fast',
    name: 'Fast Text Worker',
    description: 'Ultra-fast, cost-efficient worker optimized for simple parser/formatting tasks.',
    group: 'text',
    model: 'qwen3.6-flash',
    enableThinking: false,
    outputFormat: 'text',
    systemPrompt: 'You are a high-speed worker agent. Complete your parsing task accurately.',
    icon: Sparkles,
    iconBg: 'bg-amber-50 border-amber-200',
    iconColor: 'text-amber-600',
  },
  {
    id: 'image',
    name: 'Image Generator',
    description:
      'Generates beautiful static PNG images from text prompts using Wanx Image Pro API.',
    group: 'media',
    model: 'wan2.7-image-pro',
    enableThinking: false,
    outputFormat: 'image',
    systemPrompt: 'Wan2.7 Image Pro generator. Convert instructions to detailed visual prompts.',
    icon: Image,
    iconBg: 'bg-emerald-50 border-emerald-200',
    iconColor: 'text-emerald-600',
  },
  {
    id: 'video',
    name: 'Video Generator',
    description: 'Generates 1080P/720P videos from text prompts using Wanx Video Synthesis API.',
    group: 'media',
    model: 'wan2.7-t2v',
    enableThinking: false,
    outputFormat: 'video',
    systemPrompt: 'Wan2.7 Text-to-Video synthesis. Animate the text instructions.',
    icon: Video,
    iconBg: 'bg-rose-50 border-rose-200',
    iconColor: 'text-rose-600',
  },
  {
    id: 'audio',
    name: 'Speech Synthesizer (TTS)',
    description:
      'Synthesizes text into high-fidelity speech (MP3) using CosyVoice or Qwen-TTS API.',
    group: 'media',
    model: 'cosyvoice-v3-plus',
    enableThinking: false,
    outputFormat: 'audio',
    systemPrompt: 'CosyVoice speech synthesis. Render the given text to speech.',
    icon: Volume2,
    iconBg: 'bg-sky-50 border-sky-200',
    iconColor: 'text-sky-600',
  },
];

export const WorkerAgentCatalog = ({
  onClose,
  dropPosition,
}: {
  onClose: () => void;
  dropPosition: { x: number; y: number } | null;
}) => {
  const addNode = useStore((s) => s.addNode);

  const handleSelectWorker = (worker: WorkerOption) => {
    const coords = dropPosition || { x: 250, y: 200 };
    addNode('agent', coords, {
      label: worker.name,
      model: worker.model,
      enableThinking: worker.enableThinking,
      outputFormat: worker.outputFormat,
      systemPrompt: worker.systemPrompt,
      workerType: worker.id,
    });
    onClose();
  };

  const textWorkers = WORKER_OPTIONS.filter((w) => w.group === 'text');
  const mediaWorkers = WORKER_OPTIONS.filter((w) => w.group === 'media');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        data-tour="worker-catalog"
        className="bg-white w-[680px] max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50/75 shrink-0">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-orange-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-900 font-sans">Worker Agent Catalog</h2>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                Select a preconfigured worker profile
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors border border-transparent hover:border-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar">
          {/* Text Workers Group */}
          <div>
            <h3 className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <span>Text & Reasoning Workers</span>
              <span className="h-px bg-slate-200 flex-1" />
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {textWorkers.map((worker) => {
                const IconComponent = worker.icon;
                return (
                  <div
                    key={worker.id}
                    onClick={() => handleSelectWorker(worker)}
                    className="border border-slate-200 p-4 hover:border-orange-400 hover:bg-orange-50/5 hover:shadow-sm transition-all group cursor-pointer flex gap-4 items-start"
                  >
                    <div
                      className={`w-10 h-10 border ${worker.iconBg} flex items-center justify-center shrink-0`}
                    >
                      <IconComponent className={`w-5 h-5 ${worker.iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-bold text-slate-900 font-sans group-hover:text-orange-700 transition-colors">
                          {worker.name}
                        </h4>
                        <span className="text-[9px] font-mono text-slate-400">{worker.model}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 font-mono leading-relaxed">
                        {worker.description}
                      </p>
                      <div className="flex gap-2 mt-2">
                        {worker.enableThinking && (
                          <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 bg-purple-50 text-purple-600 border border-purple-100 uppercase">
                            Thinking mode
                          </span>
                        )}
                        <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 bg-slate-100 text-slate-500 border border-slate-200 uppercase">
                          Tools supported
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Media Workers Group */}
          <div>
            <h3 className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <span>Media Generation Workers</span>
              <span className="h-px bg-slate-200 flex-1" />
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {mediaWorkers.map((worker) => {
                const IconComponent = worker.icon;
                return (
                  <div
                    key={worker.id}
                    onClick={() => handleSelectWorker(worker)}
                    className="border border-slate-200 p-4 hover:border-orange-400 hover:bg-orange-50/5 hover:shadow-sm transition-all group cursor-pointer flex gap-4 items-start"
                  >
                    <div
                      className={`w-10 h-10 border ${worker.iconBg} flex items-center justify-center shrink-0`}
                    >
                      <IconComponent className={`w-5 h-5 ${worker.iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-bold text-slate-900 font-sans group-hover:text-orange-700 transition-colors">
                          {worker.name}
                        </h4>
                        <span className="text-[9px] font-mono text-slate-400">{worker.model}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 font-mono leading-relaxed">
                        {worker.description}
                      </p>
                      <div className="flex gap-2 mt-2">
                        <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100 uppercase">
                          {worker.outputFormat} output
                        </span>
                        <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 bg-slate-50 text-slate-400 border border-slate-200 uppercase">
                          No Tool Calling
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
