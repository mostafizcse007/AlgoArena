'use client';

import React, { useState } from 'react';
import { X, Play, Trophy } from 'lucide-react';
import { DualTraceVisualizer } from '@/components/canvas/DualTraceVisualizer';
import { DAWScrubber } from '@/components/canvas/DAWScrubber';
import type { Match, TraceFrame } from '@/lib/types/arena';

interface ReplayModalProps {
  match: Match | null;
  onClose: () => void;
}

export function ReplayModal({ match, onClose }: ReplayModalProps) {
  const [currentFrame, setCurrentFrame] = useState(0);

  if (!match) return null;

  const traces: TraceFrame[] = (match.replay_trace && match.replay_trace.length > 0)
    ? match.replay_trace
    : [
        { step: 0, type: 'POINTER_MOVE', description: 'Replay starting frame initialized.' },
        { step: 1, type: 'VISIT_NODE', description: 'Explored start node 0' },
        { step: 2, type: 'UPDATE_DIST', description: 'Updated distance to target node' },
        { step: 3, type: 'RETURN', description: 'Match concluded with optimal path' },
      ];

  return (
    <div
      className="fixed inset-0 z-50 bg-[#0B0D12]/80 backdrop-blur-md flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-[#11141C] border border-white/[0.12] rounded-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_24px_48px_-12px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.07] bg-[#161A24]">
          <div className="flex items-center gap-3">
            <Play className="w-4 h-4 text-sky-400 fill-current shrink-0" />
            <div>
              <div className="font-semibold text-xs text-[#F3F4F6] flex items-center gap-2">
                <span>Canvas Replay: {match.problem?.title || 'Algorithmic Duel'}</span>
                <span className="px-1.5 py-0.5 rounded text-xs font-mono bg-emerald-500/10 text-[#34D399] border border-emerald-500/20">
                  {match.mode}
                </span>
              </div>
              <div className="text-xs font-mono text-[#9CA3AF]" suppressHydrationWarning>
                Match ID: {match.id.slice(0, 8)} • Concluded: {new Date(match.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-md text-[#9CA3AF] hover:text-white hover:bg-white/[0.06] transition cursor-pointer"
            aria-label="Close replay modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Canvas Visualizer */}
        <div className="flex-1 w-full min-h-[360px] p-3 bg-[#0B0D12]">
          <DualTraceVisualizer
            userTraces={traces}
            oracleTraces={traces}
            category={match.problem?.category || 'graphs'}
            visualizerType={match.problem?.visualizer_type || 'graph'}
            oracleComplexity={match.problem?.complexity || (match.problem?.metadata?.complexity as string) || 'O((V + E) log V)'}
            onFrameChange={(frame) => setCurrentFrame(frame)}
          />
        </div>

        {/* Timeline Scrubber */}
        <DAWScrubber
          totalFrames={traces.length}
          currentFrame={currentFrame}
        />

        {/* Footer info */}
        <div className="px-5 py-2.5 border-t border-white/[0.06] bg-[#0B0D12]/90 flex items-center justify-between text-xs font-mono text-[#9CA3AF]">
          <span className="flex items-center gap-1.5 text-[#F3F4F6]">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            Winner: @{match.winner_id === match.player1_id ? match.player1?.username : match.player2?.username || 'Demo Winner'}
          </span>
          <span className="text-[#9CA3AF] text-xs">Hardware-accelerated replay</span>
        </div>
      </div>
    </div>
  );
}
