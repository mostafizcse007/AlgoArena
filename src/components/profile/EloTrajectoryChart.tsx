'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { TrendingUp, Swords } from 'lucide-react';

export interface MatchPoint {
  id: string;
  date: string;
  elo: number;
  delta: number;
  opponent: string;
  result: 'win' | 'loss' | 'draw';
}

interface EloTrajectoryChartProps {
  currentElo: number;
  peakElo: number;
  matches?: MatchPoint[];
}

/**
 * Cleanly format x-axis label from date string or match identifier
 */
function formatAxisLabel(dateStr: string, index: number): string {
  if (!dateStr || dateStr === 'Start' || dateStr === 'Current') {
    return dateStr || `#${index + 1}`;
  }
  if (dateStr.startsWith('Match')) {
    return dateStr;
  }
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  return dateStr;
}

export function EloTrajectoryChart({
  currentElo = 1200,
  peakElo = 1200,
  matches = [],
}: EloTrajectoryChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<MatchPoint | null>(null);

  // If the user has fewer than 5 rated matches, show a friendly empty state instead of a flat line
  if (!matches || matches.length < 5) {
    return (
      <div className="w-full bg-[#141824] rounded-xl p-5 flex flex-col gap-3 relative overflow-hidden shadow-sm">
        {/* Card Header */}
        <div className="flex items-center justify-between text-xs border-b border-white/[0.07] pb-3 select-none">
          <span className="font-display text-sm font-semibold text-[#E5E7EB]">Rating Trajectory</span>

          <div className="flex items-center gap-4 text-xs font-mono tabular-nums text-[#9CA3AF]">
            <span>
              Current: <strong className="text-[#38BDF8] font-semibold">{currentElo}</strong>
            </span>
            <span>
              Peak: <strong className="text-[#34D399] font-semibold">{peakElo}</strong>
            </span>
          </div>
        </div>

        {/* Friendly Empty State */}
        <div className="w-full h-[220px] flex flex-col items-center justify-center text-center p-6 border border-dashed border-white/[0.08] rounded-lg bg-white/[0.01]">
          <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-3">
            <TrendingUp className="w-5 h-5 text-sky-400" />
          </div>
          <p className="text-sm font-medium text-[#E5E7EB]">
            Play 5 ranked matches to see your rating history
          </p>
          <p className="text-xs text-[#9CA3AF] mt-1 max-w-xs">
            {matches && matches.length > 0
              ? `${matches.length} of 5 rated matches completed.`
              : 'Complete ranked 1v1 showdowns to unlock your rating history and analytics.'}
          </p>
          <Link
            href="/lobby"
            className="mt-4 px-3 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/25 text-sky-300 font-medium text-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <Swords className="w-3.5 h-3.5" />
            <span>Enter Ranked Arena</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <EloTrajectoryChartActive
      currentElo={currentElo}
      peakElo={peakElo}
      matches={matches}
      hoveredPoint={hoveredPoint}
      setHoveredPoint={setHoveredPoint}
    />
  );
}

function EloTrajectoryChartActive({
  currentElo,
  peakElo,
  matches,
  hoveredPoint,
  setHoveredPoint,
}: {
  currentElo: number;
  peakElo: number;
  matches: MatchPoint[];
  hoveredPoint: MatchPoint | null;
  setHoveredPoint: (pt: MatchPoint | null) => void;
}) {
  // Build chronological progression
  const history: MatchPoint[] = React.useMemo(() => {
    return [...matches].sort((a, b) => {
      const timeA = new Date(a.date).getTime();
      const timeB = new Date(b.date).getTime();
      return isNaN(timeA) || isNaN(timeB) ? 0 : timeA - timeB;
    });
  }, [matches]);

  const svgWidth = 720;
  const svgHeight = 280;
  const paddingLeft = 52;
  const paddingRight = 116; // Reserves dedicated right-edge column for tier labels so trajectory NEVER crosses them
  const paddingTop = 24;
  const paddingBottom = 44; // Room for x-axis line and match/date markers

  // Zoom the y-axis to the actual data range (min - 50 to max + 50) instead of always 1200-1900
  const eloValues = history.map((pt) => pt.elo);
  const dataMin = Math.min(...eloValues);
  const dataMax = Math.max(...eloValues);
  const minElo = Math.max(0, dataMin - 50);
  const maxElo = dataMax + 50;

  const getX = React.useCallback(
    (idx: number) => {
      const usableWidth = svgWidth - paddingLeft - paddingRight;
      return paddingLeft + (idx / Math.max(history.length - 1, 1)) * usableWidth;
    },
    [history.length]
  );

  const getY = React.useCallback(
    (elo: number) => {
      const usableHeight = svgHeight - paddingTop - paddingBottom;
      const ratio = maxElo === minElo ? 0.5 : Math.max(0, Math.min(1, (elo - minElo) / (maxElo - minElo)));
      return svgHeight - paddingBottom - ratio * usableHeight;
    },
    [minElo, maxElo]
  );

  const pointsString = history.map((pt, i) => `${getX(i).toFixed(1)},${getY(pt.elo).toFixed(1)}`).join(' ');

  // Dynamic round Y-axis grid ticks within [minElo, maxElo]
  const yTicks = React.useMemo(() => {
    const range = maxElo - minElo;
    const step = range > 400 ? 100 : range > 160 ? 50 : 25;
    const firstTick = Math.ceil(minElo / step) * step;
    const ticks: number[] = [];
    for (let t = firstTick; t <= maxElo; t += step) {
      ticks.push(t);
    }
    return ticks;
  }, [minElo, maxElo]);

  // Division tier labels on the right edge outside the plot in neutral muted gray
  const allTierBands = [
    { label: 'Grandmaster 1900', yStart: 1900, yEnd: Math.max(maxElo, 2400), fill: 'rgba(255, 255, 255, 0.015)', textColor: '#9CA3AF' },
    { label: 'Expert 1600', yStart: 1600, yEnd: 1899, fill: 'rgba(255, 255, 255, 0.015)', textColor: '#9CA3AF' },
    { label: 'Specialist 1400', yStart: 1400, yEnd: 1599, fill: 'rgba(255, 255, 255, 0.015)', textColor: '#9CA3AF' },
    { label: 'Pupil 1200', yStart: 1200, yEnd: 1399, fill: 'rgba(255, 255, 255, 0.015)', textColor: '#9CA3AF' },
    { label: 'Newbie <1200', yStart: Math.min(minElo, 0), yEnd: 1199, fill: 'rgba(255, 255, 255, 0.015)', textColor: '#9CA3AF' },
  ];
  const tierBands = allTierBands.filter((b) => b.yEnd >= minElo && b.yStart <= maxElo);

  // De-duplicate ticks: only show tick for a date once (eliminating duplicate labels like "Oct 29, Oct 30, Oct 30")
  const xTicks = React.useMemo(() => {
    if (history.length === 0) return [];

    const parsed = history.map((pt, i) => {
      const d = new Date(pt.date);
      const isValid = !isNaN(d.getTime());
      const dateLabel = isValid
        ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : pt.date || `M${i + 1}`;
      const timeLabel = isValid
        ? d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
        : '';
      return {
        index: i,
        id: pt.id,
        dateLabel,
        timeLabel,
      };
    });

    const uniqueDates = new Set(parsed.map((p) => p.dateLabel));
    const rawTicks: { x: number; label: string; id: string }[] = [];
    const seenLabels = new Set<string>();

    parsed.forEach((item) => {
      let label = item.dateLabel;
      // If all matches occurred on the same day, distinguish them with time
      if (uniqueDates.size === 1 && item.timeLabel) {
        label = item.index === 0 ? `${item.dateLabel} ${item.timeLabel}` : item.timeLabel;
      }

      if (!seenLabels.has(label)) {
        seenLabels.add(label);
        rawTicks.push({
          x: getX(item.index),
          label,
          id: item.id,
        });
      }
    });

    // Ensure minimum visual distance (50px) between rendered tick labels to avoid crowding
    const filtered: typeof rawTicks = [];
    let lastX = -999;
    for (const tick of rawTicks) {
      if (tick.x - lastX >= 50) {
        filtered.push(tick);
        lastX = tick.x;
      }
    }

    return filtered.length > 0 ? filtered : rawTicks;
  }, [history, getX]);

  return (
    <div className="w-full bg-[#141824] rounded-xl p-5 flex flex-col gap-3 relative overflow-hidden shadow-sm">
      {/* Card Header */}
      <div className="flex items-center justify-between text-xs border-b border-white/[0.07] pb-3 select-none">
        <span className="font-display text-sm font-semibold text-[#E5E7EB]">Rating Trajectory</span>

        <div className="flex items-center gap-4 text-xs font-mono tabular-nums text-[#9CA3AF]">
          <span>
            Current: <strong className="text-[#38BDF8] font-semibold">{currentElo}</strong>
          </span>
          <span>
            Peak: <strong className="text-[#34D399] font-semibold">{peakElo}</strong>
          </span>
        </div>
      </div>

      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto overflow-visible select-none"
        >
          <defs>
            {/* Ultra-subtle area gradient below curve */}
            <linearGradient id="eloGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.04" />
              <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Background Tier Bands & Right-Edge Labels */}
          {tierBands.map((band, idx) => {
            const yTop = Math.max(getY(band.yEnd), paddingTop);
            const yBottom = Math.min(getY(band.yStart), svgHeight - paddingBottom);
            const height = Math.max(0, yBottom - yTop);

            return (
              <g key={idx}>
                {/* Full-width low-contrast band */}
                <rect
                  x={paddingLeft}
                  y={yTop}
                  width={svgWidth - paddingLeft - 8}
                  height={height}
                  fill={band.fill}
                />
                {/* Dedicated right-edge tier label (trajectory never crosses this zone) */}
                <text
                  x={svgWidth - 12}
                  y={yTop + Math.max(14, Math.min(height - 4, height / 2 + 4))}
                  textAnchor="end"
                  fill={band.textColor}
                  fontSize="12"
                  fontFamily="Inter, system-ui, sans-serif"
                  fontWeight="600"
                  opacity="0.9"
                >
                  {band.label}
                </text>
              </g>
            );
          })}

          {/* Subtle vertical divider separating graph plot from right tier labels */}
          <line
            x1={svgWidth - paddingRight + 8}
            y1={paddingTop}
            x2={svgWidth - paddingRight + 8}
            y2={svgHeight - paddingBottom}
            stroke="rgba(255, 255, 255, 0.06)"
            strokeDasharray="2 2"
          />

          {/* Dynamic Horizontal Rating Grid lines */}
          {yTicks.map((level) => {
            const y = getY(level);
            return (
              <g key={level}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={svgWidth - paddingRight + 8}
                  y2={y}
                  stroke="rgba(255, 255, 255, 0.06)"
                  strokeDasharray="4 4"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  fill="#64748B"
                  fontSize="12"
                  fontFamily="Inter, system-ui, sans-serif"
                  fontWeight="500"
                >
                  {level}
                </text>
              </g>
            );
          })}

          {/* X-Axis Baseline */}
          <line
            x1={paddingLeft}
            y1={svgHeight - paddingBottom}
            x2={svgWidth - paddingRight}
            y2={svgHeight - paddingBottom}
            stroke="rgba(255, 255, 255, 0.10)"
          />

          {/* De-duplicated X-Axis Match / Date Markers */}
          {xTicks.map((tick) => (
            <g key={`x-axis-${tick.id}`}>
              {/* Tick mark */}
              <line
                x1={tick.x}
                y1={svgHeight - paddingBottom}
                x2={tick.x}
                y2={svgHeight - paddingBottom + 5}
                stroke="rgba(255, 255, 255, 0.18)"
              />
              {/* Marker label */}
              <text
                x={tick.x}
                y={svgHeight - paddingBottom + 18}
                textAnchor="middle"
                fill="#9CA3AF"
                fontSize="12"
                fontFamily="Inter, system-ui, sans-serif"
                fontWeight="500"
              >
                {tick.label}
              </text>
            </g>
          ))}

          {/* Area fill under curve (ultra-subtle) */}
          <polygon
            points={`${paddingLeft},${svgHeight - paddingBottom} ${pointsString} ${getX(history.length - 1).toFixed(1)},${
              svgHeight - paddingBottom
            }`}
            fill="url(#eloGradient)"
          />

          {/* Main Trajectory Line (Clean thin solid line, zero neon glow) */}
          <polyline
            fill="none"
            stroke="#38BDF8"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={pointsString}
          />

          {/* Interactive Match Points */}
          {history.map((pt, i) => {
            const cx = getX(i);
            const cy = getY(pt.elo);
            const isHovered = hoveredPoint?.id === pt.id;

            return (
              <g key={pt.id} className="cursor-pointer">
                {isHovered && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r="6"
                    fill="none"
                    stroke="#38BDF8"
                    strokeWidth="1.5"
                    opacity="0.8"
                  />
                )}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isHovered ? 4 : 2.5}
                  fill={pt.result === 'win' ? '#34D399' : pt.result === 'loss' ? '#FB7185' : '#38BDF8'}
                  stroke="#11141C"
                  strokeWidth="1.5"
                  className="transition-all duration-150"
                  onMouseEnter={() => setHoveredPoint(pt)}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
              </g>
            );
          })}
        </svg>

        {/* Floating Glass Tooltip */}
        {hoveredPoint && (
          <div className="absolute top-2 right-2 rounded-xl bg-[#11141C] border border-white/[0.12] p-3 text-xs shadow-xl pointer-events-none z-10 flex flex-col gap-1">
            <div className="text-white font-semibold flex items-center gap-1.5">
              <span>{hoveredPoint.opponent}</span>
              <span className="text-xs text-[#9CA3AF]">
                ({formatAxisLabel(hoveredPoint.date, 0)})
              </span>
            </div>
            <div className="text-[#9CA3AF] text-xs">
              Elo Rating: <strong className="text-white font-mono tabular-nums">{hoveredPoint.elo}</strong>
            </div>
            <div
              className={`text-xs font-semibold font-mono tabular-nums ${
                hoveredPoint.delta >= 0 ? 'text-[#34D399]' : 'text-[#FB7185]'
              }`}
            >
              Delta: {hoveredPoint.delta >= 0 ? `+${hoveredPoint.delta}` : hoveredPoint.delta} Elo
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
