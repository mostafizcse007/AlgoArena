'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Swords,
  Trophy,
  Volume2,
  VolumeX,
  Search,
  Play,
  ArrowRight,
  Settings,
} from 'lucide-react';
import { toggleMute, useIsMuted } from '@/lib/audio/sfx';
import { createClient } from '@/lib/supabase/client';

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState<boolean>(false);
  const [query, setQuery] = useState<string>('');
  const [loadingDemo, setLoadingDemo] = useState<boolean>(false);
  const muted = useIsMuted();
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      } else if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };

    const handleCustomOpen = () => setOpen(true);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('algoarena:open_palette', handleCustomOpen);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('algoarena:open_palette', handleCustomOpen);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const launchInstantDemoDuel = async () => {
    setLoadingDemo(true);
    const supabase = createClient();

    // Check if user is logged in
    const { data: { user } } = await supabase.auth.getUser();

    const playerId = user?.id;
    let playerElo = 1200;

    // If not logged in, redirect to signup
    if (!playerId) {
      router.push('/signup?redirect=/lobby');
      return;
    }

    if (playerId) {
      const { data: p } = await supabase.from('profiles').select('elo').eq('id', playerId).single();
      if (p) playerElo = p.elo;
    }

    // Pick a problem
    const { data: probs } = await supabase.from('problems').select('id').limit(1);
    const probId = probs && probs[0] ? probs[0].id : '081ae262-3437-4323-8913-34e5d7ebe217';

    // Insert demo match
    const { data: match, error } = await supabase
      .from('matches')
      .insert({
        problem_id: probId,
        player1_id: playerId,
        player2_id: null, // Single Player Demo
        mode: 'sabotage',
        status: 'in_progress',
        player1_elo_before: playerElo,
        player2_elo_before: null,
        ends_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      })
      .select('id')
      .single();

    setLoadingDemo(false);
    setOpen(false);

    if (match) {
      router.push(`/arena/${match.id}`);
    } else {
      console.error('Failed to launch demo duel', error);
      router.push('/arena/demo');
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-[#0B0D12]/75 backdrop-blur-md flex items-start justify-center pt-24 p-4"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-xl bg-[#1D2333] border border-white/[0.12] rounded-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_24px_48px_-12px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.07]">
          <Search className="w-4 h-4 text-[#6B7280]" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or jump to page..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-[#F3F4F6] placeholder-[#6B7280] focus:outline-none"
          />
          <kbd className="keycap text-xs">ESC</kbd>
        </div>

        {/* Command Options */}
        <div className="p-2 flex flex-col gap-1 text-xs">
          {/* 1-Click Launch Instant Demo Duel */}
          <button
            onClick={launchInstantDemoDuel}
            disabled={loadingDemo}
            className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] text-[#F3F4F6] transition text-left cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <Play className="w-4 h-4 text-[#9CA3AF] shrink-0" />
              <div>
                <div className="font-medium text-xs text-[#F3F4F6] flex items-center gap-2">
                  <span>Launch Instant Demo Duel</span>
                  <span className="px-1.5 py-0.5 rounded text-xs bg-white/[0.06] border border-white/[0.1] text-[#9CA3AF] font-mono">DEMO</span>
                </div>
                <div className="text-[#9CA3AF] text-xs">Instant battle loaded with interactive Sabotage trace</div>
              </div>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-[#9CA3AF] group-hover:text-white transition" />
          </button>

          {/* Quick Navigations */}
          <button
            onClick={() => { setOpen(false); router.push('/lobby'); }}
            className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/[0.04] text-[#9CA3AF] hover:text-[#F3F4F6] transition text-left cursor-pointer"
          >
            <Swords className="w-4 h-4 text-[#9CA3AF] shrink-0" />
            <div>
              <div className="font-medium text-xs text-[#F3F4F6]">Play</div>
              <div className="text-[#9CA3AF] text-xs">Ranked 1v1 queue and private room duels</div>
            </div>
          </button>

          <button
            onClick={() => { setOpen(false); router.push('/leaderboard'); }}
            className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/[0.04] text-[#9CA3AF] hover:text-[#F3F4F6] transition text-left cursor-pointer"
          >
            <Trophy className="w-4 h-4 text-[#9CA3AF] shrink-0" />
            <div>
              <div className="font-medium text-xs text-[#F3F4F6]">Leaderboard</div>
              <div className="text-[#9CA3AF] text-xs">University and division leaderboard</div>
            </div>
          </button>

          <button
            onClick={() => { setOpen(false); router.push('/settings'); }}
            className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/[0.04] text-[#9CA3AF] hover:text-[#F3F4F6] transition text-left cursor-pointer"
          >
            <Settings className="w-4 h-4 text-[#9CA3AF] shrink-0" />
            <div>
              <div className="font-medium text-xs text-[#F3F4F6]">Settings</div>
              <div className="text-[#9CA3AF] text-xs">Profile, Monaco editor preferences, audio, and security</div>
            </div>
          </button>

          <button
            onClick={() => {
              toggleMute();
              setOpen(false);
            }}
            className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/[0.04] text-[#9CA3AF] hover:text-[#F3F4F6] transition text-left cursor-pointer"
          >
            {muted ? (
              <VolumeX className="w-4 h-4 text-[#9CA3AF] shrink-0" />
            ) : (
              <Volume2 className="w-4 h-4 text-[#9CA3AF] shrink-0" />
            )}
            <div>
              <div className="font-medium text-xs text-[#F3F4F6]">
                Sound effects
              </div>
              <div className="text-[#9CA3AF] text-xs">Turn sounds on or off</div>
            </div>
          </button>
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 border-t border-white/[0.06] bg-black/20 flex items-center justify-between text-xs text-[#9CA3AF]">
          <span>AlgoArena Navigator</span>
          <div className="flex items-center gap-2">
            <span>ESC to close</span>
          </div>
        </div>
      </div>
    </div>
  );
}
