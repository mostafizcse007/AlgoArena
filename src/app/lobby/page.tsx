'use client';

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import {
  Swords,
  Radio,
  Users,
  Copy,
  Check,
  Loader2,
  Share2,
  AlertCircle,
  Play,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { Container } from '@/components/layout/Container';
import type { Profile } from '@/lib/types/arena';
import { getTier } from '@/lib/tier';
import { useToast } from '@/components/ui/Toast';
import { useProfile } from '@/lib/stores/useProfileStore';

// Preload Monaco Editor bundle asynchronously (Rule 3: zero loading spinner on /arena)
const MonacoPreloader = dynamic(
  () => import('@monaco-editor/react').then(() => () => null),
  { ssr: false }
);

const CATEGORY_OPTIONS = [
  { value: 'graphs', label: 'Graphs (Dijkstra Shortest Path)' },
  { value: 'dp', label: 'Dynamic Programming (Knapsack)' },
  { value: 'greedy', label: 'Greedy Intervals (Scheduling)' },
  { value: 'two_pointers', label: 'Two Pointers (Sliding Window)' },
  { value: 'data_structures', label: 'Data Structures (Segment Tree)' },
];

const MODE_OPTIONS = [
  { value: 'sabotage', label: 'Hack & Defend Sabotage' },
  { value: 'custom_duel', label: 'Standard 1v1 Race' },
];

export default function PlayLobbyPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { profile } = useProfile();

  // Queue state
  const [inQueue, setInQueue] = useState(false);
  const [queueTime, setQueueTime] = useState(0);
  const [searchBand, setSearchBand] = useState(50);
  const [queueError, setQueueError] = useState<string | null>(null);

  // Custom room state
  const [customCategory, setCustomCategory] = useState<string>('graphs');
  const [customMode, setCustomMode] = useState<string>('sabotage');
  const [createdRoomCode, setCreatedRoomCode] = useState<string | null>(null);
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Join Room by Code input
  const [inputRoomCode, setInputRoomCode] = useState('');
  const [joiningRoom, setJoiningRoom] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);
  const queueIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
      if (queueIntervalRef.current) clearInterval(queueIntervalRef.current);
    };
  }, []);

  // Ranked Queue Join
  const handleJoinQueue = async () => {
    if (!profile) {
      router.push('/signup?redirect=/lobby');
      return;
    }
    setInQueue(true);
    setQueueTime(0);
    setSearchBand(50);
    setQueueError(null);

    const supabase = createClient();

    // 1. Join or Pair immediately
    const { data: res, error } = await supabase.rpc('matchmaking_join_or_pair', {
      p_player_id: profile.id,
      p_elo: profile.elo,
      p_mode: 'ranked_1v1',
    });

    if (error) {
      setQueueError(error.message);
      showToast(error.message, 'error');
      setInQueue(false);
      return;
    }

    if (res?.matched && res?.match_id) {
      router.push(`/arena/${res.match_id}`);
      return;
    }

    // 2. Start timer & heartbeat
    queueIntervalRef.current = setInterval(() => {
      setQueueTime((prev) => prev + 1);
    }, 1000);

    // Heartbeat every 3 seconds, widens search band every 5 seconds
    heartbeatTimerRef.current = setInterval(async () => {
      const { data: hbRes } = await supabase.rpc('matchmaking_heartbeat', {
        p_player_id: profile.id,
        p_band_increment: 25,
      });

      if (hbRes?.matched && hbRes?.match_id) {
        if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
        if (queueIntervalRef.current) clearInterval(queueIntervalRef.current);
        router.push(`/arena/${hbRes.match_id}`);
      } else if (hbRes?.search_band) {
        setSearchBand(hbRes.search_band);
      }
    }, 3000);
  };

  const handleLeaveQueue = async () => {
    if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
    if (queueIntervalRef.current) clearInterval(queueIntervalRef.current);
    setInQueue(false);

    if (profile) {
      const supabase = createClient();
      await supabase.rpc('matchmaking_leave', { p_player_id: profile.id });
    }
  };

  // 1-Click Launch Instant Demo Duel (Pitch Mode)
  const handleLaunchInstantDemo = async () => {
    if (!profile) {
      router.push('/signup?redirect=/lobby');
      return;
    }
    const supabase = createClient();
    const { data: res } = await supabase.rpc('create_demo_duel', {
      p_problem_id: '081ae262-3437-4323-8913-34e5d7ebe217',
      p_player_id: profile.id,
    });

    if (res?.match_id) {
      router.push(`/arena/${res.match_id}`);
    }
  };

  // Create Custom Duel Private Room
  const handleCreateCustomRoom = async () => {
    if (!profile) {
      router.push('/signup?redirect=/lobby');
      return;
    }
    setCreatingRoom(true);
    const supabase = createClient();

    // Select problem by category
    const { data: probs } = await supabase
      .from('problems')
      .select('id')
      .eq('category', customCategory)
      .limit(1);

    const probId = probs && probs[0] ? probs[0].id : '081ae262-3437-4323-8913-34e5d7ebe217';

    const { data, error } = await supabase.rpc('create_custom_room', {
      p_player_id: profile.id,
      p_problem_id: probId,
      p_mode: customMode,
    });

    setCreatingRoom(false);

    if (!error && data?.room_code) {
      setCreatedRoomCode(data.room_code);
    }
  };

  // Join Room by Code
  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputRoomCode.trim() || !profile) return;
    setJoiningRoom(true);
    setJoinError(null);

    const supabase = createClient();
    const { data, error } = await supabase.rpc('join_custom_room', {
      p_player_id: profile.id,
      p_room_code: inputRoomCode.trim().toUpperCase(),
    });

    setJoiningRoom(false);

    if (error || !data?.success) {
      setJoinError(data?.error || 'Failed to connect to room.');
    } else if (data?.match_id) {
      router.push(`/arena/${data.match_id}`);
    }
  };

  const copyRoomInvite = () => {
    if (!createdRoomCode) return;
    const url = `${window.location.origin}/lobby/join/${createdRoomCode}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <Container className="flex-1 flex flex-col gap-6 py-8">
      {/* Monaco Preloader component to warm up editor bundle */}
      <MonacoPreloader />

      {/* Top Banner: Player Telemetry & Prominent 1-Click Demo Duel Action */}
      <div className="w-full bg-[#141824] rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="font-display text-xl sm:text-2xl font-semibold tracking-[-0.025em] text-[#F3F4F6]">
              Play
            </h1>
          </div>
          <p className="text-xs text-[#9CA3AF]">
            Player: <strong className="text-[#E5E7EB]">@{profile?.username || 'connecting...'}</strong> • Elo:{' '}
            <span className="text-[#34D399] font-medium tabular-nums">{profile?.elo || 1200}</span> ({getTier(profile?.elo)})
          </p>
        </div>

        {/* 1-Click Instant Demo Duel Action (Secondary Button) */}
        <button
          onClick={handleLaunchInstantDemo}
          className="px-3.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[#E5E7EB] hover:text-white font-medium text-xs flex items-center gap-2 transition cursor-pointer shadow-sm shrink-0"
        >
          <Play className="w-3.5 h-3.5 text-[#38BDF8]" />
          <span>Launch Instant Demo Duel</span>
        </button>
      </div>

      {queueError && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{queueError}</span>
        </div>
      )}

      {/* 2-Column Asymmetric Layout: Left hero Ranked Match (7 cols) + Right Custom Rooms (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ===================================================================
           COLUMN 1: HERO RANKED 1V1 MATCH (lg:col-span-7)
           =================================================================== */}
        <div className="lg:col-span-7 bg-[#141824] rounded-xl p-6 flex flex-col gap-6 shadow-sm">
          <div className="flex items-center gap-2 border-b border-white/[0.07] pb-3">
            <Radio className="w-4 h-4 text-[#38BDF8] shrink-0" />
            <div>
              <h2 className="font-display font-semibold text-sm text-[#E5E7EB]">Ranked Match</h2>
              <span className="text-xs text-[#9CA3AF]">Standard Elo ladder</span>
            </div>
          </div>

          {/* Queue Body: Active Searching or Standby Row of 4 Plain Stats (No nested bordered card) */}
          {inQueue ? (
            /* Active Searching State */
            <div className="flex flex-col items-center justify-center py-6 min-h-[160px]">
              <div className="relative w-16 h-16 flex items-center justify-center mb-3">
                <div className="absolute inset-0 rounded-full border border-sky-400/20 animate-ping opacity-60" />
                <div className="absolute inset-2 rounded-full border border-sky-400/30 animate-pulse" />
                <div className="w-9 h-9 rounded-xl bg-white/[0.05] border border-white/[0.1] flex items-center justify-center text-[#38BDF8] shadow-sm relative z-10">
                  <Radio className="w-4 h-4 animate-spin" />
                </div>
              </div>

              <div className="text-center">
                <div className="text-sm font-medium text-white flex items-center justify-center gap-2">
                  <span>Searching for opponent...</span>
                  <span className="text-[#38BDF8] tabular-nums font-sans">{queueTime}s</span>
                </div>
                <div className="text-xs text-[#9CA3AF] mt-1">
                  Rating band: <span className="text-[#34D399] font-medium tabular-nums font-sans">±{searchBand} Elo</span>
                </div>
              </div>
            </div>
          ) : (
            /* Informative Pre-Queue: Simple Row of 4 Plain Stats (Label above, value below, no borders, separated by dividers) */
            <div className="flex flex-col gap-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-white/[0.06]">
                <div className="flex flex-col gap-1 sm:px-2">
                  <span className="text-xs text-[#9CA3AF]">Current Rating</span>
                  <span className="font-display text-2xl font-semibold text-white tabular-nums">
                    {profile?.elo || 1200}
                  </span>
                </div>

                <div className="flex flex-col gap-1 pt-3 sm:pt-0 sm:px-4">
                  <span className="text-xs text-[#9CA3AF]">Rank Tier</span>
                  <span className="font-display text-lg font-semibold text-[#34D399] truncate pt-0.5">
                    {getTier(profile?.elo)}
                  </span>
                </div>

                <div className="flex flex-col gap-1 pt-3 sm:pt-0 sm:px-4">
                  <span className="text-xs text-[#9CA3AF]">Search Range</span>
                  <span className="font-display text-lg font-semibold text-[#F3F4F6] tabular-nums pt-0.5">
                    ±50 Elo
                  </span>
                </div>

                <div className="flex flex-col gap-1 pt-3 sm:pt-0 sm:px-4">
                  <span className="text-xs text-[#9CA3AF]">Est. Wait</span>
                  <span className="font-display text-lg font-semibold text-[#38BDF8] pt-0.5">
                    &lt; 10s
                  </span>
                </div>
              </div>

              <div className="text-xs text-[#9CA3AF] leading-relaxed pt-3 border-t border-white/[0.06]">
                Matched with players close to your rating.
              </div>
            </div>
          )}

          {/* Primary Action Button */}
          {inQueue ? (
            <button
              onClick={handleLeaveQueue}
              className="w-full py-2.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/25 text-rose-300 font-medium text-xs transition cursor-pointer"
            >
              Cancel
            </button>
          ) : (
            <button
              onClick={handleJoinQueue}
              className="w-full py-3 rounded-lg bg-[#F3F4F6] text-[#0B0D12] hover:bg-white font-medium text-xs transition shadow-sm cursor-pointer flex items-center justify-center gap-2"
            >
              <Swords className="w-3.5 h-3.5" />
              <span>Find a ranked match</span>
            </button>
          )}
        </div>

        {/* ===================================================================
           COLUMN 2: CUSTOM ROOMS & CODE JOINER (lg:col-span-5)
           =================================================================== */}
        <div className="lg:col-span-5 bg-[#141824] rounded-xl p-6 flex flex-col gap-5 shadow-sm">
          <div className="flex items-center gap-2 border-b border-white/[0.07] pb-3">
            <Users className="w-4 h-4 text-[#38BDF8] shrink-0" />
            <div>
              <h2 className="font-display font-semibold text-sm text-[#E5E7EB]">Private Rooms</h2>
              <span className="text-xs text-[#9CA3AF]">Custom rules & direct invite codes</span>
            </div>
          </div>

          {/* Join by Code Input */}
          <form onSubmit={handleJoinByCode} className="flex flex-col gap-1.5">
            <label className="text-xs text-[#9CA3AF] font-medium">
              Join via 6-Digit Room Code:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. ALGO-7X"
                value={inputRoomCode}
                onChange={(e) => setInputRoomCode(e.target.value.toUpperCase())}
                className="flex-1 px-3 py-2 rounded-lg bg-[#0B0D12] border border-white/[0.08] font-mono text-xs text-white uppercase focus:outline-none focus:border-sky-400/50 shadow-inner font-sans-placeholder"
              />
              <button
                type="submit"
                disabled={joiningRoom || !inputRoomCode.trim()}
                className="px-3.5 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-[#E5E7EB] border border-white/[0.08] disabled:opacity-50 font-medium text-xs transition cursor-pointer"
              >
                {joiningRoom ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Join'}
              </button>
            </div>
            {joinError && (
              <span className="text-xs text-rose-400 font-mono">{joinError}</span>
            )}
          </form>

          {/* Create New Private Duel with Custom Select Components */}
          <div className="border-t border-white/[0.07] pt-4 flex flex-col gap-3">
            <span className="text-xs text-[#9CA3AF] font-medium">Create New Private Duel:</span>

            <div className="flex flex-col gap-3">
              <CustomSelect
                label="Problem Category"
                value={customCategory}
                onChange={(val) => setCustomCategory(val)}
                options={CATEGORY_OPTIONS}
              />

              <CustomSelect
                label="Battle Mode"
                value={customMode}
                onChange={(val) => setCustomMode(val)}
                options={MODE_OPTIONS}
              />
            </div>

            {createdRoomCode ? (
              <div className="p-3.5 rounded-lg bg-[#0B0D12] border border-sky-500/30 flex flex-col gap-2 mt-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#9CA3AF]">Shareable Room Code:</span>
                  <span className="text-sm font-mono font-bold text-sky-300">{createdRoomCode}</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <button
                    onClick={copyRoomInvite}
                    className="flex-1 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-mono text-white flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-[#34D399]" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Copied' : 'Copy URL'}</span>
                  </button>
                  <button
                    onClick={() => router.push(`/lobby/join/${createdRoomCode}`)}
                    className="px-3.5 py-1.5 rounded-lg bg-[#F3F4F6] text-[#0B0D12] hover:bg-white text-xs font-medium transition cursor-pointer shadow-sm"
                  >
                    Enter Room
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={handleCreateCustomRoom}
                disabled={creatingRoom}
                className="w-full py-2.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[#E5E7EB] text-xs font-medium transition cursor-pointer flex items-center justify-center gap-2 mt-1"
              >
                {creatingRoom ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#38BDF8]" />
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5 text-[#38BDF8]" />
                    <span>Create private room</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </Container>
  );
}
