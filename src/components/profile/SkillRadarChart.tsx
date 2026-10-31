'use client';

import React from 'react';
import type { SkillRadar } from '@/lib/types/arena';
import { getTier } from '@/lib/tier';

interface SkillRadarChartProps {
  skills?: SkillRadar;
}

export function SkillRadarChart({
  skills = {
    graphs: 1955,
    data_structures: 1750,
    dp: 1794,
    two_pointers: 1880,
    greedy: 1690,
  },
}: SkillRadarChartProps) {
  // Five core skill categories ordered as requested
  const categories = [
    { key: 'graphs', label: 'Graphs', val: skills?.graphs ?? 1955 },
    { key: 'data_structures', label: 'Data Structures', val: skills?.data_structures ?? 1750 },
    { key: 'dp', label: 'Dynamic Programming (DP)', val: skills?.dp ?? 1794 },
    { key: 'two_pointers', label: 'Two Pointers', val: skills?.two_pointers ?? 1880 },
    { key: 'greedy', label: 'Greedy', val: skills?.greedy ?? 1690 },
  ];

  // Rating scale: 1000 base to 2200 maximum for competitive programming tiers
  const minRating = 1000;
  const maxRating = 2200;

  const getPercentage = (val: number) => {
    const clamped = Math.max(minRating, Math.min(val, maxRating));
    return Math.round(((clamped - minRating) / (maxRating - minRating)) * 100);
  };

  const getTierLabel = (val: number) => {
    const tier = getTier(val);
    switch (tier) {
      case 'Grandmaster':
        return { label: tier, color: 'text-amber-300' };
      case 'Expert':
        return { label: tier, color: 'text-purple-300' };
      case 'Specialist':
        return { label: tier, color: 'text-[#38BDF8]' };
      case 'Pupil':
        return { label: tier, color: 'text-[#34D399]' };
      default:
        return { label: tier, color: 'text-[#9CA3AF]' };
    }
  };

  return (
    <div className="w-full bg-[#141824] rounded-xl p-5 flex flex-col gap-4 shadow-sm">
      <div className="w-full flex items-center justify-between text-xs border-b border-white/[0.07] pb-3 select-none">
        <h2 className="font-display text-sm font-semibold text-[#E5E7EB]">Skill Breakdown</h2>
        <span className="text-xs text-[#9CA3AF]">Rating by Category</span>
      </div>

      <div className="flex flex-col gap-3.5 pt-1">
        {categories.map((cat) => {
          const pct = getPercentage(cat.val);
          const tier = getTierLabel(cat.val);

          return (
            <div
              key={cat.key}
              className="flex flex-col gap-1.5"
              title={`${cat.label}: ${cat.val} Elo (${tier.label})`}
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-[#E5E7EB]">{cat.label}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-xs ${tier.color} font-medium`}>{tier.label}</span>
                  <span className="tabular-nums text-xs font-semibold text-[#F3F4F6]">
                    {cat.val}
                  </span>
                </div>
              </div>

              {/* Horizontal Progress Bar Track */}
              <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#38BDF8] transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
