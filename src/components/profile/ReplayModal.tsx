'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Play, Trophy } from 'lucide-react';
import { DualTraceVisualizer } from '@/components/canvas/DualTraceVisualizer';
import { DAWScrubber } from '@/components/canvas/DAWScrubber';
import type { Match, TraceFrame } from '@/lib/types/arena';

interface ReplayModalProps {
  match: Match | null;
  onClose: () => void;
}

const CANONICAL_REPLAY_TRACES: TraceFrame[] = [
  { step: 1, type: 'POINTER_MOVE', description: 'Replay starting frame: initialized frontier at start node 0.', activeNodes: [0], visitedNodes: [0] },
  { step: 2, type: 'VISIT_NODE', description: 'Explored start node 0: inspecting adjacent outbound edge weights.', activeNodes: [0], visitedNodes: [0] },
  { step: 3, type: 'UPDATE_DIST', description: 'Relaxed edge (0 -> 1) with weight 1 and (0 -> 2) with weight 2.', activeNodes: [1, 2], visitedNodes: [0, 1, 2] },
  { step: 4, type: 'VISIT_NODE', description: 'Oracle relaxes node 2 with weight 2 and keeps searching optimal frontier.', activeNodes: [2], visitedNodes: [0, 1, 2] },
  { step: 5, type: 'UPDATE_DIST', description: 'Detour path explores node 3 (dist: 4) towards destination node 4.', activeNodes: [3], visitedNodes: [0, 1, 2, 3] },
  { step: 6, type: 'RETURN', description: 'Match concluded with optimal path 0 -> 2 -> 3 -> 4 (total weight 6).', activeNodes: [4], visitedNodes: [0, 2, 3, 4] },
];

export function ReplayModal({ match, onClose }: ReplayModalProps) {
  const [currentFrame, setCurrentFrame] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerReady, setContainerReady] = useState(false);

  // ResizeObserver to ensure container geometry is positive before drawing
  useEffect(() => {
    if (!match) {
      setContainerReady(false);
      return;
    }

    const checkSize = () => {
      if (containerRef.current && containerRef.current.clientWidth > 0) {
        setContainerReady(true);
      }
    };

    checkSize();
    const ro = new ResizeObserver(() => {
      checkSize();
    });

    if (containerRef.current) {
      ro.observe(containerRef.current);
    }

    const rafId = requestAnimationFrame(() => {
      checkSize();
    });

    return () => {
      ro.disconnect();
      cancelAnimationFrame(rafId);
    };
  }, [match]);

  const traces: TraceFrame[] = useMemo(() => {
    if (match?.replay_trace && Array.isArray(match.replay_trace) && match.replay_trace.length > 0) {
      // Validate that at least one trace step contains node or frame metadata
      const hasValidFrames = match.replay_trace.some(
        (t) => (t.activeNodes && t.activeNodes.length > 0) || (t.visitedNodes && t.visitedNodes.length > 0) || t.description
      );
      if (hasValidFrames) {
        return match.replay_trace;
      }
    }
    return CANONICAL_REPLAY_TRACES;
  }, [match?.replay_trace]);

  const sampleInput = match?.problem?.public_samples?.[0]?.input as { V?: number; edges?: number[][] } | undefined;
  const graphInput = useMemo(() => {
    if (sampleInput && typeof sampleInput === 'object') {
      return {
        V: typeof sampleInput.V === 'number' ? sampleInput.V : 5,
        edges: Array.isArray(sampleInput.edges) ? sampleInput.edges : undefined,
      };
    }
    return {
      V: 5,
      edges: [
        [0, 1, 1],
        [1, 4, 19],
        [0, 2, 2],
        [2, 3, 2],
        [3, 4, 2],
      ],
    };
  }, [sampleInput]);

  if (!match) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-[#0B0D12]/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
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
                <span className="px-1.5 py-0.5 rounded text-xs font-mono bg-emerald-500/10 text-[#34D399] border border-emerald-500/20 uppercase">
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

        {/* Canvas Visualizer Container */}
        <div ref={containerRef} className="flex-1 w-full min-h-[380px] p-3 bg-[#0B0D12] relative">
          {containerReady && (
            <DualTraceVisualizer
              userTraces={traces}
              oracleTraces={traces}
              category={match.problem?.category || 'graphs'}
              visualizerType={match.problem?.visualizer_type || 'graph'}
              oracleComplexity={
                match.problem?.complexity ||
                (match.problem?.metadata?.complexity as string) ||
                'O((V + E) log V)'
              }
              graphInput={graphInput}
              hasRun={true}
              userTitle="Match Trace Replay"
              onFrameChange={(frame) => setCurrentFrame(frame)}
            />
          )}
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
            Winner: @{match.winner_id === match.player1_id ? match.player1?.username : (match.player2?.username || 'Demo Winner')}
          </span>
          <span className="text-[#9CA3AF] text-xs">Hardware-accelerated replay ({traces.length} frames)</span>
        </div>
      </div>
    </div>
  );
}
