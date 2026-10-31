'use client';

import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  ChevronLeft,
  ChevronRight,
  Zap,
} from 'lucide-react';

interface DAWScrubberProps {
  totalFrames: number;
  currentFrame?: number;
  divergenceFrameIndex?: number;
  /** @deprecated Single shared label removed. Show complexity on canonical oracle panel and ops on solution panel. */
  complexityNotation?: string;
}

export function DAWScrubber({
  totalFrames = 1,
  currentFrame: initialFrame = 0,
  divergenceFrameIndex,
}: DAWScrubberProps) {
  const [frame, setFrame] = useState<number>(initialFrame);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(1);

  const isInactive = totalFrames <= 0;
  const safeTotal = Math.max(totalFrames, 1);
  const effectiveFrame = isInactive ? 0 : frame;
  const effectiveIsPlaying = isInactive ? false : isPlaying;

  // Sync external frame updates via event
  useEffect(() => {
    const handleScrubUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ frame: number }>;
      if (customEvent.detail?.frame !== undefined) {
        setFrame(customEvent.detail.frame);
      }
    };
    const handlePlayUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ playing: boolean; speed: number }>;
      if (customEvent.detail?.playing !== undefined) {
        setIsPlaying(customEvent.detail.playing);
      }
    };
    window.addEventListener('algoarena:scrub', handleScrubUpdate);
    window.addEventListener('algoarena:play_toggle', handlePlayUpdate);
    return () => {
      window.removeEventListener('algoarena:scrub', handleScrubUpdate);
      window.removeEventListener('algoarena:play_toggle', handlePlayUpdate);
    };
  }, []);

  const dispatchScrub = (targetFrame: number) => {
    if (isInactive) return;
    const clamped = Math.min(Math.max(0, targetFrame), safeTotal - 1);
    setFrame(clamped);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('algoarena:scrub', { detail: { frame: clamped } })
      );
    }
  };

  const handleTogglePlay = () => {
    if (isInactive) return;
    const nextState = !effectiveIsPlaying;
    setIsPlaying(nextState);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('algoarena:play_toggle', {
          detail: { playing: nextState, speed },
        })
      );
    }
  };

  const handleSpeedToggle = () => {
    if (isInactive) return;
    const newSpeed = speed === 1 ? 2 : 1;
    setSpeed(newSpeed);
    if (effectiveIsPlaying && typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('algoarena:play_toggle', {
          detail: { playing: true, speed: newSpeed },
        })
      );
    }
  };

  const jumpToDivergence = () => {
    if (!isInactive && divergenceFrameIndex !== undefined) {
      dispatchScrub(divergenceFrameIndex);
    }
  };

  const progressPct = isInactive ? 0 : (effectiveFrame / Math.max(safeTotal - 1, 1)) * 100;

  return (
    <footer className="shrink-0 h-11 bg-[#11141C] border-t border-white/[0.07] px-3 flex items-center justify-between gap-2.5 select-none text-xs font-mono">
      {/* Left: Playback Controls */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => dispatchScrub(0)}
          disabled={isInactive}
          className="p-1 rounded text-[#9CA3AF] hover:text-white hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
          title="Jump to Start"
          aria-label="Jump to start"
        >
          <SkipBack className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => dispatchScrub(effectiveFrame - 1)}
          disabled={isInactive || effectiveFrame <= 0}
          className="p-1 rounded text-[#9CA3AF] hover:text-white hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
          title="Step Backward"
          aria-label="Step backward"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={handleTogglePlay}
          disabled={isInactive}
          className="h-7 px-2.5 rounded bg-sky-400 hover:bg-sky-300 text-[#0B0D12] font-semibold text-xs transition flex items-center gap-1 shadow-sm cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          title={effectiveIsPlaying ? 'Pause' : 'Play'}
          aria-label={effectiveIsPlaying ? 'Pause' : 'Play'}
        >
          {effectiveIsPlaying ? (
            <Pause className="w-3 h-3 fill-current" />
          ) : (
            <Play className="w-3 h-3 fill-current" />
          )}
          <span className="text-xs">{effectiveIsPlaying ? 'Pause' : 'Play'}</span>
        </button>

        <button
          onClick={() => dispatchScrub(effectiveFrame + 1)}
          disabled={isInactive || effectiveFrame >= safeTotal - 1}
          className="p-1 rounded text-[#9CA3AF] hover:text-white hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
          title="Step Forward"
          aria-label="Step forward"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={handleSpeedToggle}
          disabled={isInactive}
          className="ml-0.5 px-1.5 py-0.5 rounded text-xs text-[#9CA3AF] hover:text-white bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.15] disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer tabular-nums"
          title="Toggle playback speed"
          aria-label="Toggle playback speed"
        >
          {speed}x
        </button>
      </div>

      {/* Center: Frame Track Scrubber */}
      <div className="flex-1 flex items-center gap-2 min-w-0">
        <span className="text-xs text-[#9CA3AF] font-mono tabular-nums whitespace-nowrap shrink-0">
          {isInactive ? (
            '0 / 0'
          ) : (
            <>
              <strong className="text-white font-medium">{effectiveFrame + 1}</strong> / {safeTotal}
            </>
          )}
        </span>

        <div className="relative flex-1 flex items-center min-w-0">
          <input
            type="range"
            min={0}
            max={isInactive ? 0 : safeTotal - 1}
            value={effectiveFrame}
            disabled={isInactive}
            onChange={(e) => dispatchScrub(parseInt(e.target.value, 10))}
            className="w-full h-1 bg-white/[0.1] accent-sky-400 rounded-full cursor-pointer appearance-none transition-all focus:outline-none disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              background: isInactive
                ? 'rgba(255,255,255,0.08)'
                : `linear-gradient(to right, #38BDF8 ${progressPct}%, rgba(255,255,255,0.08) ${progressPct}%)`,
            }}
            aria-label="Execution frame scrubber"
          />
          {divergenceFrameIndex !== undefined && !isInactive && safeTotal > 1 && (
            <div
              className="absolute top-1/2 -translate-y-1/2 w-1.5 h-3 bg-[#FB7185] rounded-full pointer-events-none -translate-x-1/2 shadow-[0_0_6px_rgba(251,113,133,0.5)]"
              style={{
                left: `${(divergenceFrameIndex / (safeTotal - 1)) * 100}%`,
              }}
              title={`Divergence Frame ${divergenceFrameIndex + 1}`}
            />
          )}
        </div>

        {divergenceFrameIndex !== undefined && !isInactive && (
          <button
            onClick={jumpToDivergence}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs hover:bg-rose-500/20 transition cursor-pointer shrink-0"
            title="Jump to Divergence Frame"
          >
            <Zap className="w-3 h-3 fill-current text-rose-400" />
            <span className="hidden sm:inline">Divergence @ F{divergenceFrameIndex + 1}</span>
            <span className="sm:hidden">F{divergenceFrameIndex + 1}</span>
          </button>
        )}
      </div>
    </footer>
  );
}
