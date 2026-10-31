import React from 'react';
import { Container } from '@/components/layout/Container';

export default function ProfileLoading() {
  return (
    <Container className="flex-1 flex flex-col gap-6 py-8 animate-pulse">
      {/* Dossier Header Skeleton */}
      <div className="w-full p-6 rounded-xl bg-[#11141C] border border-white/[0.07] flex flex-col lg:flex-row lg:items-center justify-between gap-6 shadow-sm">
        <div className="flex items-center gap-5">
          <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-xl bg-[#0B0D12] border border-white/[0.08]" />
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="h-6 w-36 rounded bg-white/[0.06]" />
              <div className="h-5 w-16 rounded bg-white/[0.04]" />
            </div>
            <div className="h-4 w-40 rounded bg-white/[0.03] mb-2" />
            <div className="h-3 w-56 rounded bg-white/[0.02]" />
          </div>
        </div>

        {/* 4 Right-aligned Metric Skeletons */}
        <div className="flex items-center gap-6 bg-[#0B0D12] p-3.5 rounded-xl border border-white/[0.07]">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col items-center gap-1 min-w-[70px]">
              <div className="h-2.5 w-14 rounded bg-white/[0.04]" />
              <div className="h-6 w-12 rounded bg-white/[0.07]" />
            </div>
          ))}
        </div>
      </div>

      {/* 2-Column Grid: Left 8-col + Right 4-col (Exact Geometry, CLS = 0) */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Rating Trajectory Chart + Duel Heatmap */}
        <div className="lg:col-span-8 w-full flex flex-col gap-6">
          {/* Rating Chart Skeleton */}
          <div className="w-full p-5 rounded-xl bg-[#11141C] border border-white/[0.07] flex flex-col gap-3 shadow-sm">
            <div className="flex items-center justify-between border-b border-white/[0.07] pb-3">
              <div className="h-4 w-36 rounded bg-white/[0.05]" />
              <div className="h-4 w-32 rounded bg-white/[0.04]" />
            </div>
            <div className="w-full h-[240px] rounded-lg bg-[#0B0D12] border border-white/[0.05]" />
          </div>

          {/* Activity Heatmap Skeleton */}
          <div className="w-full p-5 rounded-xl bg-[#11141C] border border-white/[0.07] flex flex-col gap-3 shadow-sm">
            <div className="flex items-center justify-between border-b border-white/[0.07] pb-3">
              <div className="h-4 w-32 rounded bg-white/[0.05]" />
              <div className="h-4 w-28 rounded bg-white/[0.04]" />
            </div>
            <div className="w-full h-[120px] rounded-lg bg-[#0B0D12] border border-white/[0.05]" />
          </div>
        </div>

        {/* Right Column: Skill Breakdown (Horizontal Bars) + Sabotage Ratio */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Skill Breakdown Skeleton (5 Horizontal Bars) */}
          <div className="w-full p-5 rounded-xl bg-[#11141C] border border-white/[0.07] flex flex-col gap-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-white/[0.07] pb-3">
              <div className="h-4 w-32 rounded bg-white/[0.05]" />
              <div className="h-4 w-24 rounded bg-white/[0.04]" />
            </div>
            <div className="flex flex-col gap-3.5 pt-1">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <div className="h-3.5 w-24 rounded bg-white/[0.05]" />
                    <div className="h-3.5 w-16 rounded bg-white/[0.04]" />
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/[0.06]" />
                </div>
              ))}
            </div>
          </div>

          {/* Sabotage Ratio Skeleton */}
          <div className="w-full p-5 rounded-xl bg-[#11141C] border border-white/[0.07] flex flex-col gap-3 shadow-sm">
            <div className="flex items-center justify-between border-b border-white/[0.07] pb-3">
              <div className="h-4 w-28 rounded bg-white/[0.05]" />
              <div className="h-4 w-24 rounded bg-white/[0.04]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="h-20 rounded-lg bg-[#0B0D12] border border-white/[0.05]" />
              <div className="h-20 rounded-lg bg-[#0B0D12] border border-white/[0.05]" />
            </div>
          </div>
        </div>
      </div>

      {/* Match History Table Skeleton */}
      <div className="w-full p-5 rounded-xl bg-[#11141C] border border-white/[0.07] flex flex-col gap-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-white/[0.07] pb-3">
          <div className="h-4 w-32 rounded bg-white/[0.05]" />
          <div className="h-4 w-20 rounded bg-white/[0.04]" />
        </div>
        <div className="w-full h-48 rounded-lg bg-[#0B0D12] border border-white/[0.05]" />
      </div>
    </Container>
  );
}
