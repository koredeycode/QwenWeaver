import { Bot, Brain, Image, Video, Volume2, Sparkles, Play, Upload } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface WorkerOption {
  id: string;
  name: string;
  description: string;
  group: string;
  model: string;
  enableThinking: boolean;
  outputFormat: 'text' | 'markdown' | 'image' | 'video' | 'audio';
  systemPrompt: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
}

export const WORKER_OPTIONS: WorkerOption[] = [
  {
    id: 'general',
    name: 'General Worker',
    description: 'General-purpose text analysis, synthesis, and tool-calling agent.',
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
    description: 'Expert agent with thinking/reasoning mode enabled for complex tasks.',
    group: 'text',
    model: 'qwen3.7-max',
    enableThinking: true,
    outputFormat: 'markdown',
    systemPrompt: 'You are a deep reasoning worker. Analyze step-by-step before answering.',
    icon: Brain,
    iconBg: 'bg-purple-50 border-purple-200',
    iconColor: 'text-purple-600',
  },
  {
    id: 'fast',
    name: 'Fast Text Worker',
    description: 'Ultra-fast, cost-efficient worker for simple parser/formatting tasks.',
    group: 'text',
    model: 'qwen3.6-flash',
    enableThinking: false,
    outputFormat: 'text',
    systemPrompt: 'You are a high-speed worker agent. Complete parsing tasks accurately.',
    icon: Sparkles,
    iconBg: 'bg-amber-50 border-amber-200',
    iconColor: 'text-amber-600',
  },
  {
    id: 'image',
    name: 'Image Generator',
    description: 'Generates static PNG images from text prompts using Wanx Image Pro API.',
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
    id: 'img-qwen',
    name: 'Qwen Image Generator',
    description: 'Generates images from text prompts using Qwen-Image 2.0 Pro.',
    group: 'media',
    model: 'qwen-image-2.0-pro',
    enableThinking: false,
    outputFormat: 'image',
    systemPrompt: 'Qwen-Image 2.0 Pro generator. Convert instructions to detailed visual prompts.',
    icon: Image,
    iconBg: 'bg-cyan-50 border-cyan-200',
    iconColor: 'text-cyan-600',
  },
  {
    id: 'video-happy',
    name: 'HappyVideo Generator',
    description: 'Generates videos from text prompts using HappyHorse 1.1 T2V API.',
    group: 'media',
    model: 'happyhorse-1.1-t2v',
    enableThinking: false,
    outputFormat: 'video',
    systemPrompt: 'HappyHorse Text-to-Video synthesis. Animate the text instructions.',
    icon: Video,
    iconBg: 'bg-violet-50 border-violet-200',
    iconColor: 'text-violet-600',
  },
  {
    id: 'video-i2v',
    name: 'Image-to-Video',
    description: 'Animates an image into a video using HappyHorse 1.1 I2V API.',
    group: 'media',
    model: 'happyhorse-1.1-i2v',
    enableThinking: false,
    outputFormat: 'video',
    systemPrompt: 'HappyHorse Image-to-Video synthesis. Animate the provided image according to instructions.',
    icon: Video,
    iconBg: 'bg-fuchsia-50 border-fuchsia-200',
    iconColor: 'text-fuchsia-600',
  },
  {
    id: 'audio',
    name: 'Speech Synthesizer (TTS)',
    description: 'Synthesizes text into high-fidelity speech using CosyVoice or Qwen-TTS API.',
    group: 'media',
    model: 'cosyvoice-v3-plus',
    enableThinking: false,
    outputFormat: 'audio',
    systemPrompt: 'CosyVoice speech synthesis. Render the given text to speech.',
    icon: Volume2,
    iconBg: 'bg-sky-50 border-sky-200',
    iconColor: 'text-sky-600',
  },
  {
    id: 'supervisor',
    name: 'Supervisor Agent',
    description: 'Coordinates multiple agents and resolves conflicting outputs.',
    group: 'supervisor',
    model: 'qwen3.7-max',
    enableThinking: true,
    outputFormat: 'text',
    systemPrompt: 'You are a supervisor agent. Coordinate workers and resolve conflicts.',
    icon: Brain,
    iconBg: 'bg-blue-50 border-blue-200',
    iconColor: 'text-blue-600',
  },
];

export interface TriggerOption {
  type: 'trigger' | 'input_trigger';
  label: string;
  description: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
}

export const TRIGGER_OPTIONS: TriggerOption[] = [
  {
    type: 'trigger',
    label: 'Manual Trigger',
    description: 'Trigger workflow manually or on a schedule.',
    icon: Play,
    iconBg: 'bg-emerald-50 border-emerald-200',
    iconColor: 'text-emerald-600',
  },
  {
    type: 'input_trigger',
    label: 'Input Trigger',
    description: 'Enter initial instruction text to feed to the workflow.',
    icon: Play,
    iconBg: 'bg-emerald-50 border-emerald-200',
    iconColor: 'text-emerald-600',
  },
  {
    type: 'file_trigger',
    label: 'File Trigger',
    description: 'Upload an image to pass as input to the workflow.',
    icon: Upload,
    iconBg: 'bg-cyan-50 border-cyan-200',
    iconColor: 'text-cyan-600',
  },
];

export const REGISTRY_URL = 'https://registry.modelcontextprotocol.io/v0/servers';

export const AUTH_LABELS: Record<string, string> = {
  bearer: 'Bearer',
  api_key: 'API Key',
  basic: 'Basic',
};

export const AUTH_COLORS: Record<string, string> = {
  bearer: 'text-amber-700 bg-amber-50 border-amber-200',
  api_key: 'text-blue-700 bg-blue-50 border-blue-200',
  basic: 'text-slate-700 bg-slate-50 border-slate-200',
};

export const AUTH_TIERS = ['all', 'none', 'required', 'unknown'] as const;
export type AuthTier = (typeof AUTH_TIERS)[number];

export const AUTH_TIER_LABELS: Record<AuthTier, string> = {
  all: 'All',
  none: 'No Auth',
  required: 'Auth Required',
  unknown: 'Unknown',
};

export const AUTH_TIER_COLORS: Record<AuthTier, string> = {
  all: '',
  none: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  required: 'text-amber-700 bg-amber-50 border-amber-200',
  unknown: 'text-slate-500 bg-slate-50 border-slate-200',
};
