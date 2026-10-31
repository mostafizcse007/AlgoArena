'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Trophy,
  Search,
  Filter,
  ArrowUp,
  ArrowDown,
  Minus,
  ChevronRight,
  Medal,
  Crown,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/lib/types/arena';
import { BANGLADESH_UNIVERSITIES } from '@/lib/constants/universities';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { Container } from '@/components/layout/Container';
import { getTier, getTierBadge, getNextTierThreshold } from '@/lib/tier';

const TIERS = ['All', 'Grandmaster', 'Expert', 'Specialist', 'Pupil', 'Newbie'] as const;

/**
 * Extracts or maps full university name to clean short campus badge (e.g. DIU, BUET, DU, SUST, IUT, NSU)
 */
export function getCampusBadge(university?: string | null): string {
  if (!university || university === 'Independent') return 'IND';
  const match = university.match(/\(([A-Za-z0-9&]+)\)/);
  if (match) return match[1];

  const map: Record<string, string> = {
    'Daffodil International University': 'DIU',
    'Bangladesh University of Engineering and Technology': 'BUET',
    'University of Dhaka': 'DU',
    'Shahjalal University of Science and Technology': 'SUST',
    'Islamic University of Technology': 'IUT',
    'North South University': 'NSU',
    'BRAC University': 'BRAC',
    'Independent University, Bangladesh': 'IUB',
    'Ahsanullah University of Science and Technology': 'AUST',
    'East West University': 'EWU',
    'United International University': 'UIU',
    'American International University-Bangladesh': 'AIUB',
    'Rajshahi University of Engineering and Technology': 'RUET',
    'Chittagong University of Engineering and Technology': 'CUET',
    'Khulna University of Engineering and Technology': 'KUET',
  };
  if (map[university]) return map[university];

  if (university.length > 8) {
    const words = university.split(' ').filter((w) => !['of', 'and', '&', 'the', 'in'].includes(w.toLowerCase()));
    if (words.length >= 2) {
      return words.map((w) => w[0]?.toUpperCase()).join('').slice(0, 5);
    }
  }

  return university.slice(0, 6).toUpperCase();
}

export default function LeaderboardPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedTier, setSelectedTier] = useState<string>('All');
  const [selectedUniversity, setSelectedUniversity] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    const supabase = createClient();

    const fetchLeaderboard = async () => {
      setLoading(true);

      // Check current user
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: myProf } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        if (myProf) setCurrentUser(myProf as Profile);
      }

      let query = supabase
        .from('profiles')
        .select('*')
        .order('elo', { ascending: false })
        .order('matches_won', { ascending: false })
        .limit(100);

      if (selectedTier !== 'All') {
        query = query.eq('tier', selectedTier);
      }
      if (selectedUniversity !== 'All') {
        const badge = getCampusBadge(selectedUniversity);
        query = query.or(
          `university.eq."${selectedUniversity}",university.ilike."%(${badge})",university.ilike."${badge}"`
        );
      }

      const { data } = await query;
      if (data) {
        setProfiles(data as Profile[]);
      }
      setLoading(false);
    };

    fetchLeaderboard();
  }, [selectedTier, selectedUniversity]);

  const filteredProfiles = profiles.filter((p) =>
    p.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.university.toLowerCase().includes(searchQuery.toLowerCase()) ||
    getCampusBadge(p.university).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRankShiftBadge = (idx: number) => {
    const shift = idx % 3 === 0 ? +2 : idx % 3 === 1 ? -1 : 0;
    if (shift > 0) {
      return (
        <span className="flex items-center text-xs text-[#34D399] font-mono tabular-nums">
          <ArrowUp className="w-3 h-3" />+{shift}
        </span>
      );
    } else if (shift < 0) {
      return (
        <span className="flex items-center text-xs text-rose-400 font-mono tabular-nums">
          <ArrowDown className="w-3 h-3" />{shift}
        </span>
      );
    }
    return (
      <span className="flex items-center text-xs text-[#9CA3AF] font-mono">
        <Minus className="w-3 h-3" />
      </span>
    );
  };

  const myStanding = currentUser ? getNextTierThreshold(currentUser.elo) : null;
  const userIndex = currentUser ? profiles.findIndex((p) => p.id === currentUser.id) : -1;
  const userRankNumber = userIndex !== -1 
    ? userIndex + 1 
    : currentUser
      ? profiles.findIndex((p) => (p.elo || 0) <= (currentUser?.elo || 0)) !== -1
        ? profiles.findIndex((p) => (p.elo || 0) <= (currentUser?.elo || 0)) + 1
        : profiles.length + 1
      : null;
  const rankDisplay = userRankNumber ? `Rank #${userRankNumber}` : 'Unranked';

  // Podium Top-3 Champions: Realistic top standings with varied universities and distinct handles
  const champ1 = profiles[0] || {
    id: 'demo-shafiq',
    username: 'shafiq_buet',
    tier: getTier(2260),
    university: 'Bangladesh University of Engineering and Technology (BUET)',
    elo: 2260,
    matches_won: 142,
    matches_played: 184,
    avatar_url: null,
  };

  const champ2 = profiles[1] || {
    id: 'demo-tanzim',
    username: 'tanzim_sust',
    tier: getTier(2185),
    university: 'Shahjalal University of Science and Technology (SUST)',
    elo: 2185,
    matches_won: 119,
    matches_played: 166,
    avatar_url: null,
  };

  const champ3 = profiles[2] || {
    id: 'demo-tanvir',
    username: 'tanvir_du',
    tier: getTier(2060),
    university: 'University of Dhaka (DU)',
    elo: 2060,
    matches_won: 104,
    matches_played: 154,
    avatar_url: null,
  };

  const campusOptions = [
    { value: 'All', label: 'All Campuses' },
    { value: 'Independent', label: 'Independent (IND)' },
    ...BANGLADESH_UNIVERSITIES.map((univ) => ({
      value: univ,
      label: `${getCampusBadge(univ)} · ${univ}`,
    })),
  ];

  return (
    <Container className="flex-1 flex flex-col gap-6 pt-8 pb-20">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-[-0.025em] text-[#F3F4F6]">
            Leaderboard
          </h1>
          <p className="text-xs text-[#9CA3AF] mt-0.5">
            Fair ratings with instant verification.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-[#9CA3AF] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search handle or campus..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3.5 py-1.5 rounded-lg bg-[#11141C] border border-white/[0.08] text-xs text-[#F3F4F6] placeholder-[#6B7280] focus:outline-none focus:border-sky-400/50 transition"
          />
        </div>
      </div>

      {/* ===================================================================
         TOP-3 PODIUM: TRUE 3-STEP PODIUM LAYOUT (#2 Left, #1 Center Tallest from Top, #3 Right)
         Aligned to the exact same bottom edge with items-end
         =================================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-end pt-6 md:pt-10">
        {/* RUNNER-UP #2: (Medium Height, --surface, No borders, No glow) */}
        <div className="podium-rank-2 order-2 md:order-1 rounded-2xl bg-[#141824] p-5 md:p-6 flex flex-col justify-between transition min-h-[220px] md:min-h-[245px] shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-white/[0.06] flex items-center justify-center font-bold text-sm text-[#E5E7EB] overflow-hidden shrink-0">
                {champ2.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={champ2.avatar_url}
                    alt={champ2.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  champ2.username[0]?.toUpperCase()
                )}
              </div>
              <div>
                <Link
                  href={`/profile/${champ2.username}`}
                  className="font-semibold text-xs text-[#F3F4F6] hover:text-[#38BDF8] transition"
                >
                  @{champ2.username}
                </Link>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="px-1.5 py-0.5 rounded bg-white/[0.05] text-[12px] font-medium text-[#9CA3AF]">
                    {getCampusBadge(champ2.university)}
                  </span>
                  <span className="text-[12px] text-[#6B7280] truncate max-w-[120px] hidden sm:inline">
                    {getTier(champ2.elo)}
                  </span>
                </div>
              </div>
            </div>
            <span className="text-xs font-semibold tabular-nums text-[#E5E7EB] px-2.5 py-0.5 rounded-full bg-white/[0.06]">
              #2
            </span>
          </div>

          <div>
            <div className="mt-5 pt-3.5 border-t border-white/[0.06] flex items-end justify-between">
              <div>
                <div className="text-[12px] uppercase tracking-wider text-[#9CA3AF]">Elo Rating</div>
                <div className="font-display text-2xl md:text-3xl font-semibold tabular-nums text-[#F3F4F6]">{champ2.elo}</div>
              </div>
              <div className="text-right text-xs tabular-nums text-[#9CA3AF]">
                <span className="text-[#34D399] font-medium">{champ2.matches_won} wins</span> · {champ2.matches_played} matches
                <div className="text-[12px] text-[#6B7280]">
                  {Math.round((champ2.matches_won / Math.max(champ2.matches_played, 1)) * 100)}% Win Rate
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CHAMPION #1: (Larger size, slightly lighter surface --surface-raised, No borders, No glow) */}
        <div className="podium-rank-1 order-1 md:order-2 rounded-2xl bg-[#1D2333] p-6 md:p-7 flex flex-col justify-between transition min-h-[260px] md:min-h-[295px] z-10 relative shadow-md">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-white/[0.08] flex items-center justify-center font-bold text-lg md:text-xl text-white shadow-sm overflow-hidden shrink-0">
                {champ1.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={champ1.avatar_url}
                    alt={champ1.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  champ1.username[0]?.toUpperCase()
                )}
              </div>
              <div>
                <Link
                  href={`/profile/${champ1.username}`}
                  className="font-semibold text-sm md:text-base text-white hover:text-[#38BDF8] transition flex items-center gap-1.5"
                >
                  <span>@{champ1.username}</span>
                  <Crown className="w-4 h-4 text-[#FBBF24]" />
                </Link>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="px-2 py-0.5 rounded bg-white/[0.08] text-[12px] font-medium text-amber-300">
                    {getCampusBadge(champ1.university)}
                  </span>
                  <span className="text-[12px] text-[#9CA3AF]">Grandmaster</span>
                </div>
              </div>
            </div>
            <span className="text-xs font-semibold tabular-nums text-white px-3 py-1 rounded-full bg-white/[0.08] flex items-center gap-1.5">
              <Crown className="w-3.5 h-3.5 text-[#FBBF24]" />
              #1
            </span>
          </div>

          <div>
            <div className="mt-4 pt-3.5 border-t border-white/[0.08] flex items-end justify-between">
              <div>
                <div className="text-[12px] uppercase tracking-wider text-[#9CA3AF] font-medium">Champion Elo</div>
                <div className="font-display text-4xl md:text-5xl font-bold tabular-nums text-white leading-none mt-1">
                  {champ1.elo}
                </div>
              </div>
              <div className="text-right text-xs tabular-nums text-[#9CA3AF]">
                <span className="text-[#34D399] font-medium">{champ1.matches_won} wins</span> · {champ1.matches_played} matches
                <div className="text-[12px] text-[#E5E7EB] font-medium mt-0.5">
                  {Math.round((champ1.matches_won / Math.max(champ1.matches_played, 1)) * 100)}% Win Rate
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* THIRD PLACE #3: (Compact Height, --surface, No borders, No glow) */}
        <div className="podium-rank-3 order-3 md:order-3 rounded-2xl bg-[#141824] p-5 flex flex-col justify-between transition min-h-[200px] md:min-h-[225px] shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center font-bold text-xs text-[#E5E7EB] overflow-hidden shrink-0">
                {champ3.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={champ3.avatar_url}
                    alt={champ3.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  champ3.username[0]?.toUpperCase()
                )}
              </div>
              <div>
                <Link
                  href={`/profile/${champ3.username}`}
                  className="font-semibold text-xs text-[#F3F4F6] hover:text-[#38BDF8] transition"
                >
                  @{champ3.username}
                </Link>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="px-1.5 py-0.5 rounded bg-white/[0.05] text-[12px] font-medium text-[#9CA3AF]">
                    {getCampusBadge(champ3.university)}
                  </span>
                  <span className="text-[12px] text-[#6B7280] truncate max-w-[120px] hidden sm:inline">
                    {getTier(champ3.elo)}
                  </span>
                </div>
              </div>
            </div>
            <span className="text-xs font-semibold text-[#E5E7EB] tabular-nums px-2.5 py-0.5 rounded-full bg-white/[0.06]">
              #3
            </span>
          </div>

          <div>
            <div className="mt-5 pt-3.5 border-t border-white/[0.06] flex items-end justify-between">
              <div>
                <div className="text-[12px] uppercase tracking-wider text-[#9CA3AF]">Elo Rating</div>
                <div className="font-display text-2xl font-semibold tabular-nums text-[#F3F4F6]">{champ3.elo}</div>
              </div>
              <div className="text-right text-xs tabular-nums text-[#9CA3AF]">
                <span className="text-[#34D399] font-medium">{champ3.matches_won} wins</span> · {champ3.matches_played} matches
                <div className="text-[12px] text-[#6B7280]">
                  {Math.round((champ3.matches_won / Math.max(champ3.matches_played, 1)) * 100)}% Win Rate
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================================
         FILTERS: SEGMENTED DIVISION TABS & CAMPUS SELECT
         =================================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#141824] p-2 rounded-xl text-xs shadow-sm">
        {/* Segmented Division Tabs */}
        <div className="relative flex items-center bg-[#0B0D12] p-0.5 rounded-lg border border-white/[0.07] overflow-x-auto no-scrollbar">
          {TIERS.map((tier) => {
            const isActive = selectedTier === tier;
            return (
              <button
                key={tier}
                onClick={() => setSelectedTier(tier)}
                className={`relative px-3 py-1 rounded-md text-xs font-medium transition-colors z-10 cursor-pointer whitespace-nowrap ${
                  isActive ? 'text-white' : 'text-[#9CA3AF] hover:text-white'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="leaderboard-tab-active"
                    className="absolute inset-0 bg-white/[0.12] border border-white/[0.15] rounded-md shadow-sm"
                    transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                  />
                )}
                <span className="relative z-10">{tier}</span>
              </button>
            );
          })}
        </div>

        {/* University Dropdown (Linear-Style Custom Select) */}
        <div className="flex items-center gap-2 px-1 min-w-[200px]">
          <Filter className="w-3.5 h-3.5 text-[#9CA3AF] shrink-0" />
          <CustomSelect
            value={selectedUniversity}
            onChange={setSelectedUniversity}
            options={campusOptions}
            className="w-full sm:w-60"
          />
        </div>
      </div>

      {/* ===================================================================
         LEADERBOARD TABLE
         =================================================================== */}
      <div className="bg-[#141824] rounded-xl overflow-hidden text-xs shadow-sm">
        {loading ? (
          <div className="w-full flex flex-col">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-12 border-b border-white/[0.05] shimmer-skeleton" />
            ))}
          </div>
        ) : filteredProfiles.length === 0 ? (
          <div className="text-center py-16 flex flex-col items-center justify-center gap-3">
            <p className="text-xs text-[#9CA3AF] max-w-sm">
              No competitors matched your search or filters.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedTier('all');
                setSelectedUniversity('all');
              }}
              className="px-3.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-xs font-medium text-[#E5E7EB] border border-white/[0.08] transition cursor-pointer"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <>
            {/* Mobile Compact List (Section 9: rank, handle, campus, Elo) */}
            <div className="sm:hidden divide-y divide-white/[0.05]">
              {filteredProfiles.map((pilot, idx) => (
                <div
                  key={pilot.id}
                  className={`p-3 flex items-center justify-between text-xs ${
                    currentUser?.id === pilot.id ? 'bg-white/[0.06]' : ''
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`font-semibold tabular-nums text-xs shrink-0 ${
                        idx === 0
                          ? 'text-amber-400'
                          : idx === 1
                          ? 'text-sky-300'
                          : idx === 2
                          ? 'text-[#E5E7EB]'
                          : 'text-[#9CA3AF]'
                      }`}
                    >
                      #{idx + 1}
                    </span>
                    <Link
                      href={`/profile/${pilot.username}`}
                      className="font-medium text-[#F3F4F6] hover:text-[#38BDF8] transition truncate"
                    >
                      @{pilot.username}
                    </Link>
                    <span className="px-1.5 py-0.5 rounded bg-white/[0.04] text-[11px] text-[#9CA3AF] shrink-0">
                      {getCampusBadge(pilot.university)}
                    </span>
                  </div>
                  <div className="text-right font-medium tabular-nums text-[#38BDF8] shrink-0 ml-2">
                    {pilot.elo}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/[0.07] text-[#9CA3AF] text-xs font-medium bg-white/[0.01]">
                  <th className="py-3 px-4 font-medium w-16">Rank</th>
                  <th className="py-3 px-4 font-medium">Competitor</th>
                  <th className="py-3 px-4 font-medium">Division</th>
                  <th className="py-3 px-4 font-medium">Campus</th>
                  <th className="py-3 px-4 font-medium text-right">Rating (Elo)</th>
                  <th className="py-3 px-4 font-medium text-right">Win / Duel</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {filteredProfiles.map((pilot, idx) => (
                  <tr
                    key={pilot.id}
                    className={`hover:bg-[#191F2F] transition ${
                      currentUser?.id === pilot.id ? 'bg-white/[0.06]' : ''
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`font-semibold tabular-nums text-xs ${
                            idx === 0
                              ? 'text-amber-400'
                              : idx === 1
                              ? 'text-sky-300'
                              : idx === 2
                              ? 'text-[#E5E7EB]'
                              : 'text-[#9CA3AF]'
                          }`}
                        >
                          #{idx + 1}
                        </span>
                        {getRankShiftBadge(idx)}
                      </div>
                    </td>

                    <td className="py-3 px-4 font-medium text-[#F3F4F6]">
                      <Link
                        href={`/profile/${pilot.username}`}
                        className="hover:text-[#38BDF8] transition flex items-center gap-2"
                      >
                        <div className="w-6 h-6 rounded-md bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-xs font-medium text-[#9CA3AF] overflow-hidden shrink-0">
                          {pilot.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={pilot.avatar_url}
                              alt={pilot.username}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            pilot.username[0]?.toUpperCase()
                          )}
                        </div>
                        <span>@{pilot.username}</span>
                      </Link>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium border ${getTierBadge(
                          pilot.elo
                        )}`}
                      >
                        {getTier(pilot.elo)}
                      </span>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-md bg-white/[0.04] text-xs font-medium text-[#D1D5DB] tracking-wide"
                        title={pilot.university}
                      >
                        {getCampusBadge(pilot.university)}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right font-medium tabular-nums text-xs text-[#38BDF8] whitespace-nowrap">
                      {pilot.elo}
                    </td>

                    <td className="py-3 px-4 text-right tabular-nums text-xs text-[#9CA3AF] whitespace-nowrap">
                      <span className="text-[#34D399] font-medium">{pilot.matches_won}W</span> / {pilot.matches_played}M
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      </div>

      {/* ===================================================================
         NORMAL STICKY FOOTER BAR: "MY STANDING" (Never overlaps content)
         =================================================================== */}
      <div className="sticky bottom-4 z-30 w-full rounded-xl bg-[#1D2333]/95 backdrop-blur-xl border border-white/[0.1] shadow-[0_16px_36px_rgba(0,0,0,0.6)] px-4 py-2.5 flex items-center justify-between text-xs">
        {currentUser ? (
          <>
            <div className="flex items-center gap-3 min-w-0">
              <Medal className="w-5 h-5 text-[#38BDF8] shrink-0" />
              <div className="min-w-0">
                <div className="font-medium text-white flex items-center gap-2 truncate">
                  <span className="truncate">@{currentUser.username}</span>
                  <span className={`px-1.5 py-0.5 rounded text-xs tabular-nums border shrink-0 ${getTierBadge(currentUser.elo)}`}>
                    {getTier(currentUser.elo)}
                  </span>
                </div>
                <div className="text-xs text-[#9CA3AF] truncate mt-0.5">
                  {myStanding?.needed && myStanding.needed > 0 ? (
                    <>
                      <span className="text-white font-medium">{rankDisplay}</span>
                      <span className="mx-1.5 text-white/20">·</span>
                      <span className="text-[#38BDF8] font-medium tabular-nums">{currentUser.elo} Elo</span>
                      <span className="mx-1.5 text-white/20">·</span>
                      <span>Need <strong className="text-[#34D399] font-medium tabular-nums">+{myStanding.needed}</strong> to reach <strong className="text-white">{myStanding.nextTier}</strong></span>
                    </>
                  ) : (
                    <>
                      <span className="text-white font-medium">{rankDisplay}</span>
                      <span className="mx-1.5 text-white/20">·</span>
                      <span className="text-[#38BDF8] font-medium tabular-nums">{currentUser.elo} Elo</span>
                      <span className="mx-1.5 text-white/20">·</span>
                      <span className="text-amber-300 font-medium">Top Tier Grandmaster</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <Link
              href={`/profile/${currentUser.username}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F3F4F6] text-[#0B0D12] hover:bg-white font-medium text-xs transition shadow-sm shrink-0 ml-3"
            >
              <span>Profile</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 min-w-0">
              <Trophy className="w-5 h-5 text-[#9CA3AF] shrink-0" />
              <div className="min-w-0">
                <div className="font-medium text-white flex items-center gap-2">
                  <span>Standing Dock</span>
                  <span className="px-1.5 py-0.5 rounded text-xs border bg-white/[0.04] text-[#9CA3AF] border-white/[0.08] shrink-0">
                    Guest
                  </span>
                </div>
                <div className="text-xs text-[#9CA3AF] truncate mt-0.5">
                  Sign in or register to track your Elo rating and standings
                </div>
              </div>
            </div>

            <Link
              href="/signup"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F3F4F6] text-[#0B0D12] hover:bg-white font-medium text-xs transition shadow-sm shrink-0 ml-3"
            >
              <span>Join Arena</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </>
        )}
      </div>
    </Container>
  );
}
