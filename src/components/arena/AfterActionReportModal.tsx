'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  X,
  Swords,
  TrendingUp,
  Cpu,
  Timer,
  Zap,
} from 'lucide-react';
import { getNextTierThreshold } from '@/lib/tier';

export interface AfterActionReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason: 'tests_passed' | 'successful_hack' | 'spectator_demo';
  player1: {
    username: string;
    eloBefore: number;
  };
  player2?: {
    username: string;
    eloBefore?: number | null;
  } | null;
  eloDelta?: number;
  isUnrated?: boolean;
  runtimeMs?: number;
  operationsCount?: number;
  opponentOpsCount?: number;
  oracleComplexity?: string;
  userPresetTag?: string | null;
  onInspectDivergence: () => void;
  onLaunchNextDuel: () => void;
}

export function AfterActionReportModal({
  isOpen,
  onClose,
  reason,
  player1,
  player2,
  eloDelta = 18,
  isUnrated = false,
  runtimeMs = 4,
  operationsCount = 14,
  opponentOpsCount = 43,
  oracleComplexity = 'O((V + E) log V)',
  userPresetTag = null,
  onInspectDivergence,
  onLaunchNextDuel,
}: AfterActionReportModalProps) {
  const effectiveDelta = isUnrated ? 0 : eloDelta;
  const eloBefore = player1.eloBefore || 1844;
  const eloAfter = eloBefore + effectiveDelta;

  const [displayedElo, setDisplayedElo] = useState(eloBefore);
  const [progressWidth, setProgressWidth] = useState(0);

  // Calculate division tier and next threshold
  const { currentTier, nextTier, nextThreshold, tierMin, tierMax } = useMemo(() => {
    return getNextTierThreshold(eloAfter);
  }, [eloAfter]);

  const eloToNext = Math.max(0, nextThreshold - eloAfter);
  const targetPct = Math.min(
    100,
    Math.max(0, Math.round(((eloAfter - tierMin) / (tierMax - tierMin)) * 100))
  );

  // Smoothly roll up Elo on modal open over 600ms (Section 8: Motion)
  useEffect(() => {
    if (!isOpen) return;

    let animId: number;
    const durationMs = 600;
    const startTime = performance.now();

    const animateElo = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(eloBefore + (eloAfter - eloBefore) * eased);
      setDisplayedElo(current);

      if (progress < 1) {
        animId = requestAnimationFrame(animateElo);
      } else {
        setDisplayedElo(eloAfter);
      }
    };

    animId = requestAnimationFrame(animateElo);
    // Slight delay before filling progress bar for dramatic polish
    const timeout = setTimeout(() => {
      setProgressWidth(targetPct);
    }, 150);

    return () => {
      cancelAnimationFrame(animId);
      clearTimeout(timeout);
    };
  }, [isOpen, eloBefore, eloAfter, targetPct]);

  if (!isOpen) return null;

  const isSabotage = reason === 'successful_hack' || reason === 'spectator_demo';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="after-action-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative backdrop-blur-2xl bg-[#1D2333] border border-white/12 rounded-2xl shadow-2xl max-w-lg w-full p-6 text-left flex flex-col gap-5 overflow-hidden">
        {/* Subtle Top-Lit Specular Rim */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        {/* Modal Header & Result Title */}
        {(() => {
          const isVictory = reason === 'tests_passed' || reason === 'successful_hack' || (!isUnrated && eloDelta > 0);
          const isDraw = !isVictory && eloDelta === 0 && !isUnrated;
          const statusColor = isVictory ? 'text-[#34D399]' : isDraw ? 'text-[#FBBF24]' : 'text-rose-400';
          const outcomeTitle = isVictory ? 'Victory' : reason === 'spectator_demo' ? 'Completed' : isDraw ? 'Draw' : 'Defeat';

          return (
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className={`text-xs font-semibold tracking-wider uppercase font-mono ${statusColor}`}>
                  {reason === 'successful_hack'
                    ? 'Adversarial Counterexample'
                    : reason === 'spectator_demo'
                    ? 'Spectator Demonstration'
                    : 'Canonical Verification'}
                </span>
                <button
                  onClick={onClose}
                  className="p-1 rounded-lg text-[#9CA3AF] hover:text-white hover:bg-white/[0.05] transition cursor-pointer"
                  aria-label="Close report"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <h2
                id="after-action-title"
                className={`font-display text-4xl sm:text-5xl font-bold tracking-tight ${statusColor}`}
              >
                {outcomeTitle}
              </h2>
            </div>
          );
        })()}

        {/* Animated Tabular Elo Roll-Up Card */}
        <div className="p-4 rounded-xl bg-[#0B0D12] border border-white/[0.08] flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-sky-400" />
              <span className="text-xs font-medium text-[#E5E7EB]">Rating Update</span>
            </div>
            {isUnrated ? (
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded border tabular-nums bg-amber-500/10 text-amber-300 border-amber-500/20">
                Unrated (+0 Elo)
              </span>
            ) : (
              <span className={`text-xs font-mono font-semibold px-2 py-0.5 rounded border tabular-nums ${
                eloDelta >= 0
                  ? 'bg-emerald-500/10 text-[#34D399] border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-300 border-rose-500/20'
              }`}>
                {eloDelta >= 0 ? `+${eloDelta}` : `${eloDelta}`} Elo
              </span>
            )}
          </div>

          <div className="flex items-baseline justify-between font-mono">
            <div className="font-display text-3xl font-bold tracking-tight text-[#F3F4F6] tabular-nums">
              {isUnrated ? eloBefore : displayedElo}{' '}
              <span className="text-xs font-normal text-[#9CA3AF] ml-1">
                {isUnrated ? '(Unrated Match)' : `(was ${eloBefore})`}
              </span>
            </div>
            <div className="text-xs text-[#9CA3AF]">
              Tier: <strong className="text-white">{currentTier}</strong>
            </div>
          </div>

          {/* Progress bar to next rank tier */}
          <div className="flex flex-col gap-1.5 pt-1">
            <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden p-0.5 border border-white/[0.05]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-400 transition-all duration-700 ease-out"
                style={{ width: `${progressWidth}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs font-mono text-[#9CA3AF]">
              <span>{currentTier} ({tierMin})</span>
              <span className="text-sky-300 font-medium">
                {eloToNext} Elo to {nextTier}
              </span>
              <span>{nextThreshold}</span>
            </div>
          </div>
        </div>

        {/* Divergence Summary Box */}
        <div className="p-3.5 rounded-xl bg-[#0B0D12] border border-white/[0.08] flex flex-col gap-2 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-medium text-[#E5E7EB]">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />
              <span>Trace Divergence Summary</span>
            </div>
            {isSabotage && (
              <button
                type="button"
                onClick={onInspectDivergence}
                className="text-xs font-medium text-sky-400 hover:text-sky-300 underline underline-offset-2 transition cursor-pointer"
              >
                Inspect Divergence &rarr;
              </button>
            )}
          </div>
          <p className="text-[#9CA3AF] leading-relaxed font-sans">
            {isSabotage
              ? "Greedy choice at node 1 diverged from optimal shortest path (Greedy cost 20 vs Optimal 6 at step 5)."
              : "Your solution maintained algorithmic parity with the canonical oracle across all test cases with 0 divergence."}
          </p>
        </div>

        {/* Head-to-Head Telemetry Strip */}
        <div className="rounded-xl border border-white/[0.08] bg-[#0B0D12] overflow-hidden text-xs font-mono">
          <div className="grid grid-cols-3 px-3 py-2 bg-white/[0.02] border-b border-white/[0.06] text-xs text-[#9CA3AF] uppercase tracking-wider">
            <div>Metric</div>
            <div className="text-emerald-400 font-semibold truncate">@{player1.username} (You)</div>
            <div className="text-rose-400 font-semibold truncate text-right">
              @{player2?.username || 'Opponent'}
            </div>
          </div>

          <div className="divide-y divide-white/[0.04]">
            {/* Row 1: Execution Time */}
            <div className="grid grid-cols-3 px-3 py-2 items-center">
              <div className="text-[#9CA3AF] flex items-center gap-1.5">
                <Timer className="w-3.5 h-3.5 text-[#9CA3AF]" />
                <span>Runtime</span>
              </div>
              <div className="text-[#34D399] font-medium tabular-nums">{runtimeMs}ms</div>
              <div className="text-rose-300 tabular-nums text-right">
                {isSabotage ? 'Diverged' : '18ms'}
              </div>
            </div>

            {/* Row 2: Elementary Operations */}
            <div className="grid grid-cols-3 px-3 py-2 items-center">
              <div className="text-[#9CA3AF] flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-[#9CA3AF]" />
                <span>Operations</span>
              </div>
              <div className="text-[#34D399] font-medium tabular-nums">{operationsCount} ops</div>
              <div className="text-rose-300 tabular-nums text-right">{opponentOpsCount} ops</div>
            </div>

            {/* Row 3: Complexity / Classification */}
            <div className="grid grid-cols-3 px-3 py-2 items-center">
              <div className="text-[#9CA3AF] flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-[#9CA3AF]" />
                <span>Classification</span>
              </div>
              <div className="text-sky-300 font-medium">
                {userPresetTag ? userPresetTag : `${operationsCount} ops (Empirical)`}
              </div>
              <div className="text-[#34D399] text-right font-mono">
                {oracleComplexity}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions: Rematch and Back to Play */}
        <div className="flex items-center gap-3 pt-1">
          <Link
            href="/lobby"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-[#E5E7EB] border border-white/[0.08] font-medium text-xs text-center transition cursor-pointer"
          >
            Back to Play
          </Link>
          <button
            type="button"
            onClick={() => {
              onClose();
              onLaunchNextDuel();
            }}
            className="flex-1 py-2.5 px-4 rounded-lg bg-[#F3F4F6] text-[#0B0D12] hover:bg-white font-medium text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-sm"
          >
            <Swords className="w-3.5 h-3.5" />
            <span>Rematch</span>
          </button>
        </div>
      </div>
    </div>
  );
}
