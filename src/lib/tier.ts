import type { Tier } from '@/lib/types/arena';

export function getTier(elo?: number | null): Tier {
  const rating = typeof elo === 'number' && !isNaN(elo) ? elo : 1200;
  if (rating < 1200) return 'Newbie';
  if (rating < 1400) return 'Pupil';
  if (rating < 1600) return 'Specialist';
  if (rating < 1900) return 'Expert';
  return 'Grandmaster';
}

export function getTierBadge(tierOrElo?: Tier | string | number | null): string {
  const tier = typeof tierOrElo === 'number' ? getTier(tierOrElo) : tierOrElo || 'Pupil';
  switch (tier) {
    case 'Grandmaster':
      return 'bg-amber-500/10 text-amber-300 border-amber-500/25';
    case 'Expert':
      return 'bg-purple-500/10 text-purple-300 border-purple-500/25';
    case 'Specialist':
      return 'bg-sky-500/10 text-sky-300 border-sky-500/25';
    case 'Pupil':
      return 'bg-emerald-500/10 text-[#34D399] border-emerald-500/25';
    default:
      return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
  }
}

export function getNextTierThreshold(elo: number) {
  if (elo >= 1900) {
    return {
      currentTier: 'Grandmaster' as const,
      nextTier: 'Legendary GM' as const,
      nextThreshold: 2200,
      needed: 0,
      tierMin: 1900,
      tierMax: 2200,
    };
  }
  if (elo >= 1600) {
    return {
      currentTier: 'Expert' as const,
      nextTier: 'Grandmaster' as const,
      nextThreshold: 1900,
      needed: 1900 - elo,
      tierMin: 1600,
      tierMax: 1900,
    };
  }
  if (elo >= 1400) {
    return {
      currentTier: 'Specialist' as const,
      nextTier: 'Expert' as const,
      nextThreshold: 1600,
      needed: 1600 - elo,
      tierMin: 1400,
      tierMax: 1600,
    };
  }
  if (elo >= 1200) {
    return {
      currentTier: 'Pupil' as const,
      nextTier: 'Specialist' as const,
      nextThreshold: 1400,
      needed: 1400 - elo,
      tierMin: 1200,
      tierMax: 1400,
    };
  }
  return {
    currentTier: 'Newbie' as const,
    nextTier: 'Pupil' as const,
    nextThreshold: 1200,
    needed: 1200 - elo,
    tierMin: 0,
    tierMax: 1200,
  };
}
