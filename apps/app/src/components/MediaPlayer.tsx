import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, Download } from 'lucide-react';

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export const AudioPlayer = ({ src, label }: { src: string; label?: string }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;
    if (playing) audioRef.current.pause();
    else audioRef.current.play();
    setPlaying(!playing);
  }, [playing]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setCurrentTime(a.currentTime);
    const onDur = () => setDuration(a.duration);
    const onEnd = () => setPlaying(false);
    a.addEventListener('timeupdate', onTime);
    a.addEventListener('loadedmetadata', onDur);
    a.addEventListener('ended', onEnd);
    return () => {
      a.removeEventListener('timeupdate', onTime);
      a.removeEventListener('loadedmetadata', onDur);
      a.removeEventListener('ended', onEnd);
    };
  }, []);

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current || !duration) return;
    audioRef.current.currentTime = Number(e.target.value);
    setCurrentTime(Number(e.target.value));
  };

  const changeVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    setVolume(v);
    setMuted(v === 0);
    if (audioRef.current) {
      audioRef.current.volume = v;
      audioRef.current.muted = v === 0;
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    if (muted) {
      audioRef.current.muted = false;
      audioRef.current.volume = volume || 1;
      setMuted(false);
      setVolume(volume || 1);
    } else {
      audioRef.current.muted = true;
      setMuted(true);
    }
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="bg-white border border-slate-200 rounded-none overflow-hidden">
      {label && (
        <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100">
          <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">
            {label}
          </span>
        </div>
      )}
      <audio ref={audioRef} src={src} preload="metadata" className="hidden" />
      <div className="flex items-center gap-3 px-3 py-2.5">
        <button
          onClick={togglePlay}
          className="w-8 h-8 bg-[#f97316] hover:bg-orange-600 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
        >
          {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className="text-[10px] font-mono text-slate-500 w-10 text-right shrink-0">
            {formatTime(currentTime)}
          </span>
          <div className="flex-1 relative h-1.5 bg-slate-200 cursor-pointer group">
            <div
              className="absolute inset-y-0 left-0 bg-[#f97316] transition-all"
              style={{ width: `${progress}%` }}
            />
            <input
              type="range"
              min="0"
              max={duration || 0}
              step="0.1"
              value={currentTime}
              onChange={seek}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
          <span className="text-[10px] font-mono text-slate-400 w-10 shrink-0">
            {formatTime(duration)}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={toggleMute}
            className="text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={muted ? 0 : volume}
            onChange={changeVolume}
            className="w-14 h-1 accent-[#f97316] cursor-pointer"
          />
        </div>
        <a
          href={src}
          download
          className="text-slate-400 hover:text-slate-600 cursor-pointer shrink-0"
          title="Download"
        >
          <Download className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
};

export const VideoPlayer = ({ src, label }: { src: string; label?: string }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (playing) videoRef.current.pause();
    else videoRef.current.play();
    setPlaying(!playing);
  }, [playing]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => setCurrentTime(v.currentTime);
    const onDur = () => setDuration(v.duration);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    v.addEventListener('timeupdate', onTime);
    v.addEventListener('loadedmetadata', onDur);
    v.addEventListener('play', onPlay);
    v.addEventListener('pause', onPause);
    return () => {
      v.removeEventListener('timeupdate', onTime);
      v.removeEventListener('loadedmetadata', onDur);
      v.removeEventListener('play', onPlay);
      v.removeEventListener('pause', onPause);
    };
  }, []);

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current || !duration) return;
    videoRef.current.currentTime = Number(e.target.value);
    setCurrentTime(Number(e.target.value));
  };

  const changeVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = Number(e.target.value);
    setVolume(vol);
    setMuted(vol === 0);
    if (videoRef.current) {
      videoRef.current.volume = vol;
      videoRef.current.muted = vol === 0;
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    if (muted) {
      videoRef.current.muted = false;
      videoRef.current.volume = volume || 1;
      setMuted(false);
      setVolume(volume || 1);
    } else {
      videoRef.current.muted = true;
      setMuted(true);
    }
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="bg-white border border-slate-200 rounded-none overflow-hidden">
      {label && (
        <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100">
          <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">
            {label}
          </span>
        </div>
      )}
      <div className="relative bg-black">
        <video
          ref={videoRef}
          src={src}
          preload="metadata"
          className="w-full h-auto max-h-[360px]"
        />
        <button
          onClick={togglePlay}
          className={`absolute inset-0 flex items-center justify-center transition-opacity ${
            playing ? 'opacity-0 hover:opacity-100' : 'opacity-100'
          }`}
        >
          <div className="w-12 h-12 bg-[#f97316]/90 hover:bg-[#f97316] text-white flex items-center justify-center shadow-lg transition-all cursor-pointer">
            {playing ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
          </div>
        </button>
      </div>
      <div className="flex items-center gap-3 px-3 py-2">
        <button
          onClick={togglePlay}
          className="text-slate-600 hover:text-[#f97316] cursor-pointer shrink-0"
        >
          {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>
        <span className="text-[10px] font-mono text-slate-500 w-10 text-right shrink-0">
          {formatTime(currentTime)}
        </span>
        <div className="flex-1 relative h-1.5 bg-slate-200 cursor-pointer group">
          <div
            className="absolute inset-y-0 left-0 bg-[#f97316] transition-all"
            style={{ width: `${progress}%` }}
          />
          <input
            type="range"
            min="0"
            max={duration || 0}
            step="0.1"
            value={currentTime}
            onChange={seek}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>
        <span className="text-[10px] font-mono text-slate-400 w-10 shrink-0">
          {formatTime(duration)}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={toggleMute}
            className="text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={muted ? 0 : volume}
            onChange={changeVolume}
            className="w-14 h-1 accent-[#f97316] cursor-pointer"
          />
        </div>
        <a
          href={src}
          download
          className="text-slate-400 hover:text-slate-600 cursor-pointer shrink-0"
          title="Download"
        >
          <Download className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
};
