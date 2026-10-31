'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Swords,
  ShieldAlert,
  ShieldCheck,
  Settings,
  Camera,
  Loader2,
  Play,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { EloTrajectoryChart } from '@/components/profile/EloTrajectoryChart';
import { SkillRadarChart } from '@/components/profile/SkillRadarChart';
import { DuelHeatmap } from '@/components/profile/DuelHeatmap';
import { ReplayModal } from '@/components/profile/ReplayModal';
import { Container } from '@/components/layout/Container';
import type { Profile, Match } from '@/lib/types/arena';
import { getTier, getTierBadge } from '@/lib/tier';

interface ProfileClientProps {
  initialProfile: Profile;
  matches: Match[];
  isOwner: boolean;
  activityData?: { date: string; count: number }[];
}

export function ProfileClient({
  initialProfile,
  matches,
  isOwner,
  activityData = [],
}: ProfileClientProps) {
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [selectedReplayMatch, setSelectedReplayMatch] = useState<Match | null>(null);



  // Avatar Upload with upsert: true into storage.avatars bucket
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    const supabase = createClient();

    const fileExt = file.name.split('.').pop();
    const filePath = `${profile.id}/avatar.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (!uploadError) {
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const newAvatarUrl = `${publicUrl}?t=${Date.now()}`;
      setProfile((prev) => ({ ...prev, avatar_url: newAvatarUrl }));

      await supabase
        .from('profiles')
        .update({ avatar_url: newAvatarUrl })
        .eq('id', profile.id);
      window.dispatchEvent(new CustomEvent('algoarena:profile_updated'));
    }
    setUploadingAvatar(false);
  };

  return (
    <Container className="flex-1 flex flex-col gap-6 py-8">
      {/* Editorial Analytical Dossier Header */}
      <div className="w-full p-6 rounded-xl bg-[#141824] shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          {/* Avatar with Upload */}
          <div className="relative group/avatar shrink-0">
            <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-xl bg-[#0B0D12] border border-white/[0.1] flex items-center justify-center text-2xl sm:text-3xl font-semibold text-white overflow-hidden shadow-inner">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt={profile.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                profile.username[0]?.toUpperCase()
              )}
            </div>

            {isOwner && (
              <label className="absolute inset-0 bg-[#0B0D12]/75 rounded-xl opacity-0 group-hover/avatar:opacity-100 flex flex-col items-center justify-center cursor-pointer transition text-xs text-white">
                {uploadingAvatar ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#38BDF8]" />
                ) : (
                  <>
                    <Camera className="w-4 h-4 mb-0.5 text-[#38BDF8]" />
                    <span className="text-xs">Upload</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  disabled={uploadingAvatar}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Profile Identity & Bio */}
          <div className="flex flex-col gap-1 min-w-0">
            {(() => {
              const hasCustomDisplayName = Boolean(
                profile.display_name &&
                profile.display_name.trim() !== '' &&
                profile.display_name.trim().toLowerCase() !== profile.username.trim().toLowerCase()
              );

              return (
                <>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h1 className="font-display text-2xl font-semibold tracking-[-0.025em] text-[#F3F4F6]">
                      {hasCustomDisplayName ? profile.display_name : `@${profile.username}`}
                    </h1>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getTierBadge(profile.elo)}`}>
                      {getTier(profile.elo)}
                    </span>
                    {isOwner && (
                      <Link
                        href="/settings"
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-[#9CA3AF] hover:text-white hover:bg-white/[0.05] border border-white/[0.08] transition"
                        title="Edit profile & workbench settings"
                      >
                        <Settings className="w-3.5 h-3.5 text-[#9CA3AF]" />
                        <span>Settings</span>
                      </Link>
                    )}
                  </div>

                  {hasCustomDisplayName && (
                    <div className="text-xs text-[#9CA3AF]">
                      @{profile.username}
                    </div>
                  )}
                </>
              );
            })()}

            <div className="text-xs text-[#38BDF8]">
              {profile.university}
            </div>
            <p className="text-xs text-[#9CA3AF] italic mt-0.5 max-w-lg">
              &quot;{profile.bio || 'Competitive programming contender.'}&quot;
            </p>
          </div>
        </div>

        {/* Right-aligned large tabular-nums metric columns: Plain Row (Flattened, no inner card box) */}
        <div className="flex items-center gap-4 sm:gap-6 text-center shrink-0">
          <div>
            <div className="text-xs text-[#9CA3AF] uppercase tracking-wider">Current Elo</div>
            <div className="font-display text-xl sm:text-2xl font-semibold tabular-nums text-[#F3F4F6]">{profile.elo}</div>
          </div>
          <div className="w-px h-8 bg-white/[0.07]" />
          <div>
            <div className="text-xs text-[#9CA3AF] uppercase tracking-wider">Peak Elo</div>
            <div className="font-display text-xl sm:text-2xl font-semibold tabular-nums text-[#9CA3AF]">{profile.peak_elo}</div>
          </div>
          <div className="w-px h-8 bg-white/[0.07]" />
          <div>
            <div className="text-xs text-[#9CA3AF] uppercase tracking-wider">Win Rate</div>
            <div className="font-display text-xl sm:text-2xl font-semibold tabular-nums text-[#34D399]">
              {profile.matches_played > 0
                ? `${Math.round((profile.matches_won / profile.matches_played) * 100)}%`
                : '0%'}
            </div>
          </div>
          <div className="w-px h-8 bg-white/[0.07]" />
          <div>
            <div className="text-xs text-[#9CA3AF] uppercase tracking-wider">Hacks</div>
            <div className="font-display text-xl sm:text-2xl font-semibold tabular-nums text-[#F3F4F6]">{profile.hacks_landed}</div>
          </div>
        </div>
      </div>

      {/* Grid: Codeforces-Style SVG Elo Chart & 5-Axis Radar */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 w-full flex flex-col gap-6">
          <EloTrajectoryChart
            currentElo={profile.elo}
            peakElo={profile.peak_elo}
            matches={matches.map((m) => {
              const isP1 = m.player1_id === profile.id;
              const rawBefore = isP1 ? m.player1_elo_before : m.player2_elo_before;
              const delta = (isP1 ? m.player1_elo_delta : m.player2_elo_delta) || 0;
              const eloBefore = rawBefore != null && rawBefore > 0 ? rawBefore : profile.elo - delta;
              const elo = eloBefore + delta;
              return {
                id: m.id,
                date: m.created_at,
                elo,
                delta,
                opponent: isP1 ? (m.player2?.username || 'Demo Duel') : (m.player1?.username || 'Demo Duel'),
                result: (m.winner_id === profile.id ? 'win' : (m.winner_id ? 'loss' : 'draw')) as 'win' | 'loss' | 'draw',
              };
            })}
          />

          {/* 365-Day Duel Heatmap */}
          <DuelHeatmap activityData={activityData} />
        </div>

        {/* Right Column: 5-Axis Radar & Sabotage Telemetry */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <SkillRadarChart skills={profile.skills} />

          {/* Sabotage Telemetry (Hacks Landed vs Defended) */}
          <div className="w-full bg-[#141824] rounded-xl p-5 flex flex-col gap-3 shadow-sm">
            <div className="flex items-center justify-between text-xs border-b border-white/[0.07] pb-3 select-none">
              <span className="font-display text-sm font-semibold text-[#E5E7EB]">Sabotage Ratio</span>
              <span className="text-xs text-[#9CA3AF]">Adversarial Strikes</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/20 flex flex-col">
                <span className="text-xs text-rose-300 flex items-center gap-1 font-medium uppercase tracking-wider">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400" /> Landed
                </span>
                <span className="font-display text-2xl font-semibold tabular-nums text-white mt-1">
                  {profile.hacks_landed}
                </span>
              </div>

              <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex flex-col">
                <span className="text-xs text-emerald-300 flex items-center gap-1 font-medium uppercase tracking-wider">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#34D399]" /> Defended
                </span>
                <span className="font-display text-2xl font-semibold tabular-nums text-white mt-1">
                  {profile.hacks_defended}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Match History Table with 1-Click "Watch Replay" Modal */}
      <div className="w-full bg-[#141824] rounded-xl p-5 flex flex-col gap-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-white/[0.07] pb-3 select-none">
          <div className="flex items-center gap-2">
            <Swords className="w-4 h-4 text-[#38BDF8]" />
            <h2 className="font-display font-semibold text-sm text-[#E5E7EB]">Match History</h2>
          </div>
          <span className="text-xs text-[#9CA3AF]">{matches.length} Total Duels</span>
        </div>

        {matches.length === 0 ? (
          <div className="text-center py-12 flex flex-col items-center justify-center gap-3">
            <p className="text-xs text-[#9CA3AF] max-w-sm">
              No ranked matches played yet. Enter the ladder to begin your rating climb.
            </p>
            <Link
              href="/lobby"
              className="px-4 py-2 rounded-lg bg-[#F3F4F6] text-[#0B0D12] hover:bg-white text-xs font-medium transition shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Swords className="w-3.5 h-3.5" />
              <span>Find a ranked match</span>
            </Link>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/[0.07] text-[#9CA3AF] text-xs font-medium bg-white/[0.01]">
                  <th className="py-2.5 px-3 font-medium">Outcome</th>
                  <th className="py-2.5 px-3 font-medium">Problem</th>
                  <th className="py-2.5 px-3 font-medium">Mode</th>
                  <th className="py-2.5 px-3 font-medium">Opponent</th>
                  <th className="py-2.5 px-3 font-medium text-right">Delta</th>
                  <th className="py-2.5 px-3 font-medium">Date</th>
                  <th className="py-2.5 px-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {matches.map((match) => {
                  const isWon = match.winner_id === profile.id;
                  const delta = match.player1_id === profile.id ? match.player1_elo_delta : match.player2_elo_delta;
                  const opponentHandle = match.player1_id === profile.id
                    ? (match.player2?.username || 'Instant Demo')
                    : match.player1?.username;

                  return (
                    <tr key={match.id} className="hover:bg-[#161A24] transition">
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium border uppercase ${
                          isWon ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : 'bg-rose-500/10 text-rose-300 border-rose-500/20'
                        }`}>
                          {isWon ? 'VICTORY' : 'DEFEAT'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-medium text-[#F3F4F6]">
                        {match.problem?.title || 'Algorithmic Duel'}
                      </td>
                      <td className="py-2.5 px-3 text-[#9CA3AF] uppercase text-xs">
                        {match.mode}
                      </td>
                      <td className="py-2.5 px-3 text-[#E5E7EB]">
                        @{opponentHandle}
                      </td>
                      <td className="py-2.5 px-3 font-mono tabular-nums text-right">
                        <span className={(delta || 0) >= 0 ? 'text-[#34D399] font-medium' : 'text-rose-400 font-medium'}>
                          {(delta || 0) >= 0 ? `+${delta || 0}` : delta}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[#6B7280] font-mono tabular-nums" suppressHydrationWarning>
                        {new Date(match.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => setSelectedReplayMatch(match)}
                          className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-[#E5E7EB] border border-white/[0.08] font-mono text-xs font-medium transition flex items-center gap-1.5 ml-auto cursor-pointer"
                        >
                          <Play className="w-3 h-3 fill-current text-sky-400" />
                          <span>Watch Replay</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Canvas Replay Modal */}
      <ReplayModal
        match={selectedReplayMatch}
        onClose={() => setSelectedReplayMatch(null)}
      />
    </Container>
  );
}
