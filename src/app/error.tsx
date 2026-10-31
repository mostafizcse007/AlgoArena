'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Swords, Trophy } from 'lucide-react';
import { Container } from '@/components/layout/Container';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log fatal runtime client errors
    console.error('[AlgoArena Engine Fault]:', error);
  }, [error]);

  return (
    <Container className="flex-1 flex flex-col items-center justify-center py-16 text-center">
      <div className="w-full max-w-lg flex flex-col items-center">
      {/* Alert Pill */}
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300 font-mono text-xs font-semibold mb-6">
        <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
        <span>ENGINE FAULT · EXECUTION INTERRUPTED</span>
      </div>

      <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-[-0.03em] text-[#F3F4F6] mb-2">
        Runtime Interrupted
      </h1>

      <p className="text-xs sm:text-sm text-[#9CA3AF] max-w-md mb-6 leading-relaxed">
        An unexpected state divergence occurred in the client execution flow.
        The Web Worker sandbox and UI state have been safely quarantined.
      </p>

      {/* Diagnostics Code Box */}
      <div className="w-full p-3 rounded-lg bg-[#0B0D12] border border-white/[0.08] text-left font-mono text-xs mb-6 overflow-hidden">
        <div className="text-xs text-[#9CA3AF] uppercase tracking-wider mb-1">
          Fault Telemetry
        </div>
        <p className="text-rose-300 truncate">
          {error.message || 'Unknown runtime exception caught by boundary.'}
        </p>
        {error.digest && (
          <div className="text-xs text-[#9CA3AF] mt-1">
            Digest ID: <span className="text-[#9CA3AF]">{error.digest}</span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full">
        <button
          onClick={() => reset()}
          className="w-full sm:w-auto flex-1 px-4 py-2.5 rounded-lg bg-[#F3F4F6] text-[#0B0D12] hover:bg-white font-medium text-xs font-mono transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry Execution</span>
        </button>

        <Link
          href="/lobby"
          className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-[#E5E7EB] border border-white/[0.08] text-xs font-medium font-mono transition flex items-center justify-center gap-2"
        >
          <Swords className="w-3.5 h-3.5 text-[#9CA3AF]" />
          <span>Play</span>
        </Link>

        <Link
          href="/leaderboard"
          className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-[#E5E7EB] border border-white/[0.08] text-xs font-medium font-mono transition flex items-center justify-center gap-2"
        >
          <Trophy className="w-3.5 h-3.5 text-[#9CA3AF]" />
          <span>Leaderboard</span>
        </Link>
      </div>
    </div>
  </Container>
);
}

