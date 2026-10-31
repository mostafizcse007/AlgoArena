'use client';

import React, { useState, useMemo, useSyncExternalStore } from 'react';
import type { DuelHeatmapDay } from '@/lib/types/arena';

interface DuelHeatmapProps {
  activityData?: DuelHeatmapDay[];
}

const emptySubscribe = () => () => {};

export function DuelHeatmap({ activityData = [] }: DuelHeatmapProps) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  // Generate 52 weeks x 7 days grid strictly after client mount to avoid Next.js 16 Date prerender warnings
  const days = useMemo(() => {
    if (!mounted) {
      // Deterministic skeleton grid without Date calculations for SSR / prerender (CLS = 0)
      return Array.from({ length: 365 }, (_, i) => ({
        date: `day-${i}`,
        count: 0,
        dayOfWeek: i % 7,
      }));
    }

    const activityMap = new Map<string, number>();
    activityData.forEach((d) => activityMap.set(d.date, d.count));

    const today = new Date();
    const result = [];
    for (let i = 364; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const count = activityMap.get(dateStr) || 0;
      result.push({ date: dateStr, count, dayOfWeek: d.getUTCDay() });
    }
    return result;
  }, [activityData, mounted]);

  const getColor = (count: number) => {
    if (count === 0) return '#161926';
    if (count <= 2) return 'rgba(16, 185, 129, 0.35)';
    if (count <= 5) return 'rgba(16, 185, 129, 0.7)';
    return '#10B981';
  };

  const cellSize = 11;
  const cellGap = 3;

  return (
    <div className="w-full bg-[#141824] rounded-xl p-5 flex flex-col gap-3 relative overflow-hidden shadow-sm">
      <div className="flex items-center justify-between text-xs border-b border-white/[0.07] pb-3 select-none">
        <span className="font-display text-sm font-semibold text-[#E5E7EB]">Activity Heatmap</span>
        <div className="flex items-center gap-1.5 text-xs text-[#9CA3AF]">
          <span>Less</span>
          <span className="w-2.5 h-2.5 rounded-sm bg-white/[0.04] border border-white/[0.08]" />
          <span className="w-2.5 h-2.5 rounded-sm bg-[#34D399]/35" />
          <span className="w-2.5 h-2.5 rounded-sm bg-[#34D399]/70" />
          <span className="w-2.5 h-2.5 rounded-sm bg-[#34D399]" />
          <span>More</span>
        </div>
      </div>

      <div className="w-full overflow-x-auto pb-1">
        <svg
          width={53 * (cellSize + cellGap)}
          height={7 * (cellSize + cellGap)}
          className="overflow-visible select-none"
        >
          {days.map((item, idx) => {
            const week = Math.floor(idx / 7);
            const row = item.dayOfWeek;
            const x = week * (cellSize + cellGap);
            const y = row * (cellSize + cellGap);

            return (
              <rect
                key={item.date}
                x={x}
                y={y}
                width={cellSize}
                height={cellSize}
                rx={2}
                fill={getColor(item.count)}
                stroke="rgba(255, 255, 255, 0.05)"
                className="cursor-pointer transition-all hover:stroke-[#06B6D4]"
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setTooltip({
                    x: rect.left + rect.width / 2,
                    y: rect.top - 28,
                    text: `${item.count} duels on ${item.date}`,
                  });
                }}
                onMouseLeave={() => setTooltip(null)}
              />
            );
          })}
        </svg>
      </div>

      {tooltip && (
        <div
          className="fixed z-50 bg-[#090A0F] border border-white/20 text-white text-xs font-mono px-2 py-1 rounded shadow-xl pointer-events-none -translate-x-1/2"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}

