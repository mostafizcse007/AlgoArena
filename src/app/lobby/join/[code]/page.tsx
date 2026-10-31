import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Users, AlertCircle, ArrowRight } from 'lucide-react';
import { Container } from '@/components/layout/Container';

export const instant = false;

interface JoinRoomPageProps {
  params: Promise<{ code: string }>;
}

export default async function JoinRoomPage({ params }: JoinRoomPageProps) {
  await connection();
  const { code } = await params;
  const cleanCode = decodeURIComponent(code).trim().toUpperCase();

  const supabase = await createClient();

  // Get current authenticated user
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=/lobby/join/${cleanCode}`);
  }

  // Attempt to join custom room via RPC
  const { data: joinRes, error } = await supabase.rpc('join_custom_room', {
    p_player_id: user.id,
    p_room_code: cleanCode,
  });

  if (!error && joinRes?.success && joinRes?.match_id) {
    redirect(`/arena/${joinRes.match_id}`);
  }

  return (
    <Container className="flex-1 flex flex-col items-center justify-center py-12">
      <div className="w-full max-w-md bg-[#11141C] border border-white/[0.08] rounded-xl p-8 flex flex-col items-center text-center gap-6 shadow-sm">
        <Users className="w-8 h-8 text-sky-400 shrink-0" />

        <div>
          <div className="font-mono text-xs text-[#6B7280] mb-1">ROOM CODE: {cleanCode}</div>
          <h1 className="font-display text-xl font-semibold tracking-[-0.025em] text-[#F3F4F6]">Custom Duel Chamber</h1>
        </div>

        {joinRes?.error ? (
          <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs font-mono flex items-center gap-2 text-left">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
            <span>{joinRes.error}</span>
          </div>
        ) : (
          <p className="text-xs text-[#9CA3AF]">
            Waiting for host to synchronize duel parameters and launch...
          </p>
        )}

        <div className="flex items-center gap-3 w-full">
          <Link
            href="/lobby"
            className="flex-1 py-2.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[#E5E7EB] text-xs font-medium transition text-center"
          >
            Back to Matchmaking
          </Link>
          <Link
            href={`/lobby/join/${cleanCode}`}
            className="flex-1 py-2.5 rounded-lg bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-medium transition flex items-center justify-center gap-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]"
          >
            <span>Retry</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </Container>
  );
}
