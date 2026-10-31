import React from 'react';
import Link from 'next/link';
import { Play, Trophy, Compass, ArrowRight, ShieldAlert } from 'lucide-react';
import { Container } from '@/components/layout/Container';

export default function NotFound() {
  return (
    <Container className="flex-1 flex flex-col items-center justify-center py-16 text-center">
      <div className="w-full max-w-xl flex flex-col items-center">
      {/* Sector Out of Bounds Badge */}
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300 font-mono text-xs font-semibold mb-6">
        <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
        <span>404 · SECTOR OUT OF BOUNDS</span>
      </div>

      <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-[-0.035em] text-[#F3F4F6] mb-3">
        Algorithmic Chamber Not Found
      </h1>

      <p className="text-sm text-[#9CA3AF] max-w-md mb-8 leading-relaxed">
        The duel match, player dossier, or private room code you navigated to does not
        exist, has concluded, or has been archived by the judge engine.
      </p>

      {/* Recovery Action Cards */}
      <div className="w-full p-4 rounded-xl bg-[#141824] shadow-sm flex flex-col gap-3">
        <div className="text-xs text-[#9CA3AF] uppercase tracking-wider text-left">
          Available Recovery Vectors
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2.5">
          {/* Primary Recovery CTA: Launch Instant Demo Duel */}
          <Link
            href="/lobby"
            className="w-full sm:w-auto flex-1 px-4 py-2.5 rounded-lg bg-[#F3F4F6] text-[#0B0D12] hover:bg-white font-medium text-xs font-mono transition flex items-center justify-center gap-2 shadow-sm"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Launch Instant Demo Duel</span>
            <ArrowRight className="w-3 h-3" />
          </Link>

          {/* Secondary CTA: Return to Leaderboard */}
          <Link
            href="/leaderboard"
            className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-[#E5E7EB] border border-white/[0.08] text-xs font-medium font-mono transition flex items-center justify-center gap-2"
          >
            <Trophy className="w-3.5 h-3.5 text-[#9CA3AF]" />
            <span>Leaderboard</span>
          </Link>

          {/* Ghost CTA: Home */}
          <Link
            href="/"
            className="w-full sm:w-auto px-3 py-2.5 rounded-lg text-xs font-medium text-[#9CA3AF] hover:text-white hover:bg-white/[0.04] transition flex items-center justify-center gap-1.5"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Home</span>
          </Link>
        </div>
      </div>
      </div>
    </Container>
  );
}

