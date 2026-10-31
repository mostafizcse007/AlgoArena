import React from 'react';
import { Container } from '@/components/layout/Container';

export default function LeaderboardLoading() {
  return (
    <Container className="flex-1 flex flex-col gap-6 pt-8 pb-20 animate-pulse">
      {/* Top Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="h-7 w-36 rounded-md bg-white/[0.08] mb-1.5" />
          <div className="h-4 w-60 rounded bg-white/[0.04]" />
        </div>

        <div className="h-9 w-full sm:w-72 rounded-lg bg-[#11141C] border border-white/[0.08]" />
      </div>

      {/* Top-3 Podium Skeleton (Zero CLS exact geometry) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-end pt-6 md:pt-10">
        {/* RUNNER-UP #2 Skeleton (Order-2 on mobile, Column 1 on desktop) */}
        <div className="order-2 md:order-1 rounded-2xl bg-[#11141C]/95 border border-white/[0.08] border-t-2 border-t-sky-400/50 p-5 md:p-6 min-h-[220px] md:min-h-[245px] flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-sky-500/10 border border-sky-500/20" />
              <div>
                <div className="h-4 w-24 rounded bg-white/[0.08] mb-1.5" />
                <div className="h-3 w-16 rounded bg-white/[0.04]" />
              </div>
            </div>
            <div className="h-5 w-8 rounded-full bg-sky-500/15" />
          </div>
          <div>
            <div className="mt-5 pt-3.5 border-t border-white/[0.06] flex items-end justify-between">
              <div>
                <div className="h-3 w-16 rounded bg-white/[0.04] mb-1" />
                <div className="h-8 w-20 rounded bg-white/[0.08]" />
              </div>
              <div className="h-4 w-20 rounded bg-white/[0.05]" />
            </div>
            <div className="h-3.5 w-full rounded bg-white/[0.03] mt-3 pt-2.5 border-t border-white/[0.06]" />
          </div>
        </div>

        {/* CHAMPION #1 Skeleton (Order-1 on mobile, Column 2 on desktop: Visibly Elevated & Larger) */}
        <div className="order-1 md:order-2 rounded-2xl bg-[#161B26] border border-amber-400/35 border-t-2 border-t-amber-400/70 p-5 md:p-6 min-h-[250px] md:min-h-[280px] flex flex-col justify-between shadow-[0_24px_50px_-12px_rgba(245,158,11,0.18)]">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30" />
              <div>
                <div className="h-5 w-32 rounded bg-white/[0.09] mb-2" />
                <div className="h-4 w-24 rounded bg-amber-500/15" />
              </div>
            </div>
            <div className="h-6 w-12 rounded-full bg-amber-500/20" />
          </div>
          <div>
            <div className="mt-4 pt-3.5 border-t border-white/[0.08] flex items-end justify-between">
              <div>
                <div className="h-3.5 w-24 rounded bg-amber-400/20 mb-1.5" />
                <div className="h-10 md:h-12 w-28 rounded bg-white/[0.1]" />
              </div>
              <div className="h-5 w-24 rounded bg-white/[0.05]" />
            </div>
            <div className="h-4 w-full rounded bg-amber-500/10 mt-3 pt-2.5 border-t border-amber-400/20" />
          </div>
        </div>

        {/* THIRD PLACE #3 Skeleton (Order-3 on mobile, Column 3 on desktop) */}
        <div className="order-3 md:order-3 rounded-2xl bg-[#11141C]/95 border border-white/[0.08] border-t-2 border-t-white/20 p-5 min-h-[195px] md:min-h-[220px] flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08]" />
              <div>
                <div className="h-4 w-20 rounded bg-white/[0.07] mb-1.5" />
                <div className="h-3 w-14 rounded bg-white/[0.04]" />
              </div>
            </div>
            <div className="h-5 w-8 rounded-full bg-white/[0.05]" />
          </div>
          <div>
            <div className="mt-5 pt-3.5 border-t border-white/[0.06] flex items-end justify-between">
              <div>
                <div className="h-3 w-16 rounded bg-white/[0.04] mb-1" />
                <div className="h-7 w-16 rounded bg-white/[0.07]" />
              </div>
              <div className="h-4 w-16 rounded bg-white/[0.04]" />
            </div>
            <div className="h-3.5 w-full rounded bg-white/[0.03] mt-3 pt-2.5 border-t border-white/[0.06]" />
          </div>
        </div>
      </div>

      {/* Segmented Division Tabs & Filter Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#11141C] border border-white/[0.07] p-2 rounded-xl">
        <div className="h-8 w-full sm:w-96 rounded-lg bg-[#0B0D12] border border-white/[0.07] p-0.5 flex items-center gap-1">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex-1 h-full rounded-md bg-white/[0.03]" />
          ))}
        </div>
        <div className="h-8 w-full sm:w-60 rounded-lg bg-white/[0.04] border border-white/[0.07]" />
      </div>

      {/* High-Density Data Table Skeleton with 6 exact columns */}
      <div className="rounded-xl bg-[#11141C] border border-white/[0.07] overflow-hidden shadow-sm">
        <div className="h-10 bg-white/[0.01] border-b border-white/[0.07] px-4 flex items-center justify-between text-xs">
          <div className="h-3 w-12 rounded bg-white/[0.05]" />
          <div className="h-3 w-28 rounded bg-white/[0.05]" />
          <div className="h-3 w-16 rounded bg-white/[0.05]" />
          <div className="h-3 w-16 rounded bg-white/[0.05]" />
          <div className="h-3 w-20 rounded bg-white/[0.05]" />
          <div className="h-3 w-20 rounded bg-white/[0.05]" />
        </div>

        <div className="divide-y divide-white/[0.05]">
          {[...Array(10)].map((_, idx) => (
            <div
              key={idx}
              className="h-12 px-4 flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2 w-16">
                <div className="h-3.5 w-6 rounded bg-white/[0.05]" />
              </div>
              <div className="flex items-center gap-2 flex-1">
                <div className="w-6 h-6 rounded-md bg-white/[0.04]" />
                <div className="h-3.5 w-24 rounded bg-white/[0.07]" />
              </div>
              <div className="h-5 w-20 rounded bg-white/[0.04] mx-2" />
              <div className="h-5 w-12 rounded-md bg-white/[0.04] mx-2" />
              <div className="h-4 w-12 rounded bg-sky-400/10 ml-auto mr-6" />
              <div className="h-4 w-16 rounded bg-white/[0.05] ml-auto" />
            </div>
          ))}
        </div>
      </div>
    </Container>
  );
}
