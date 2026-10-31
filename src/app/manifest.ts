import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'AlgoArena: 1v1 coding duels',
    short_name: 'AlgoArena',
    description:
      '1v1 real-time competitive programming arena with side-by-side execution traces, fair repeatable judging, and hack-and-defend sabotage.',
    start_url: '/',
    display: 'standalone',
    orientation: 'landscape-primary',
    background_color: '#0B0D12',
    theme_color: '#0B0D12',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  };
}

