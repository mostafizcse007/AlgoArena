import React from 'react';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ArenaCockpitClient } from '@/components/arena/ArenaCockpitClient';
import type { Match, ProblemEvalBundle } from '@/lib/types/arena';

export const instant = false;

interface ArenaPageProps {
  params: Promise<{ matchId: string }>;
  searchParams: Promise<{ view?: string }>;
}

export default async function ArenaPage({ params, searchParams }: ArenaPageProps) {
  await connection();
  const { matchId } = await params;
  const { view } = await searchParams;

  const supabase = await createClient();

  // Get current user session (optional; falls back to match.player1_id for spectator / demo duels)
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch match details
  const { data: matchData, error: matchError } = await supabase
    .from('matches')
    .select(`
      *,
      problem:problems(*),
      player1:profiles!matches_player1_id_fkey(*),
      player2:profiles!matches_player2_id_fkey(*)
    `)
    .eq('id', matchId)
    .single();

  if (matchError || !matchData) {
    notFound();
  }

  const match = matchData as Match;

  // Fetch problem evaluation bundle safely via SECURITY DEFINER RPC
  const { data: evalBundleData, error: bundleError } = await supabase.rpc(
    'get_problem_eval_bundle',
    { p_problem_id: match.problem_id }
  );

  if (bundleError || !evalBundleData) {
    notFound();
  }

  const evalBundle = evalBundleData as ProblemEvalBundle;

  return (
    <ArenaCockpitClient
      initialMatch={match}
      evalBundle={evalBundle}
      currentUserId={user?.id || match.player1_id}
      isSpectator={view === 'spectator'}
      durationSeconds={900}
    />
  );
}
