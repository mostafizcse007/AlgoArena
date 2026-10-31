import React from 'react';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ProfileClient } from '@/components/profile/ProfileClient';
import type { Profile, Match } from '@/lib/types/arena';

export const instant = false;

interface ProfilePageProps {
  params: Promise<{ username: string }>;
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  await connection();
  const { username } = await params;
  const cleanUsername = decodeURIComponent(username).replace(/^@/, '');

  const supabase = await createClient();

  // Fetch profile by username
  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .ilike('username', cleanUsername)
    .single();

  if (!profileData) {
    notFound();
  }

  const profile = profileData as Profile;

  // Check if viewing user is profile owner
  const { data: { user } } = await supabase.auth.getUser();
  const isOwner = user?.id === profile.id;

  // Fetch recent completed matches with problem details
  const { data: matchesData } = await supabase
    .from('matches')
    .select(`
      *,
      problem:problems(*),
      player1:profiles!matches_player1_id_fkey(*),
      player2:profiles!matches_player2_id_fkey(*)
    `)
    .or(`player1_id.eq.${profile.id},player2_id.eq.${profile.id}`)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(10);

  const matches = (matchesData || []) as Match[];

  // Fetch 365-day duel activity for heatmap
  const { data: activityRows } = await supabase
    .from('duel_activity')
    .select('duel_date, duel_count')
    .eq('player_id', profile.id)
    .order('duel_date', { ascending: true });

  const activityData = (activityRows || []).map((r) => ({
    date: r.duel_date,
    count: r.duel_count,
  }));

  return (
    <ProfileClient
      initialProfile={profile}
      matches={matches}
      isOwner={isOwner}
      activityData={activityData}
    />
  );
}
