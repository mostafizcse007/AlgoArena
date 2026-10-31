import React from 'react';
import { Container } from '@/components/layout/Container';

export default function LobbyLoading() {
  return (
    <Container className="flex-1 flex flex-col gap-8 py-8 animate-pulse">
      {/* Top Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="h-8 w-44 rounded-md bg-white/[0.06] mb-2" />
          <div className="h-4 w-64 rounded bg-white/[0.03]" />
        </div>
        <div className="h-9 w-48 rounded-lg bg-white/[0.06]" />
      </div>

      {/* 2-Column Workbench Skeleton matching lg:col-span-7 and lg:col-span-5 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Ranked Match (lg:col-span-7) */}
        <div className="lg:col-span-7 rounded-xl bg-[#11141C] border border-white/[0.07] p-5 flex flex-col justify-between min-h-[380px]">
          <div className="w-full flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <div className="h-4 w-28 rounded bg-white/[0.05]" />
            <div className="h-4 w-16 rounded bg-white/[0.05]" />
          </div>

          {/* Useful status card placeholder */}
          <div className="w-full bg-[#0B0D12] border border-white/[0.07] rounded-xl p-5 my-4 h-[220px] flex flex-col justify-between">
            <div className="h-4 w-32 rounded bg-white/[0.04]" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-1">
              <div className="h-14 rounded-lg bg-white/[0.03]" />
              <div className="h-14 rounded-lg bg-white/[0.03]" />
              <div className="h-14 rounded-lg bg-white/[0.03]" />
              <div className="h-14 rounded-lg bg-white/[0.03]" />
            </div>
            <div className="h-3 w-3/4 rounded bg-white/[0.03]" />
          </div>

          <div className="w-full h-11 rounded-lg bg-white/[0.06]" />
        </div>

        {/* Right Column: Custom Duel Chamber (lg:col-span-5) */}
        <div className="lg:col-span-5 rounded-xl bg-[#11141C] border border-white/[0.07] p-5 flex flex-col justify-between min-h-[380px]">
          <div className="w-full pb-3 border-b border-white/[0.06]">
            <div className="h-4 w-36 rounded bg-white/[0.05] mb-2" />
            <div className="h-3 w-56 rounded bg-white/[0.03]" />
          </div>

          <div className="flex flex-col gap-4 my-4">
            <div className="h-9 w-full rounded-lg bg-white/[0.03]" />
            <div className="h-9 w-full rounded-lg bg-white/[0.03]" />
            <div className="h-9 w-full rounded-lg bg-white/[0.03]" />
          </div>

          <div className="pt-4 border-t border-white/[0.06] flex items-center gap-3">
            <div className="h-10 w-full rounded-lg bg-white/[0.05]" />
          </div>
        </div>
      </div>
    </Container>
  );
}

