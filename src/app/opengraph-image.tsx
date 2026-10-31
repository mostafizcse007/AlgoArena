import { ImageResponse } from 'next/og';

export const alt = 'AlgoArena: 1v1 coding duels';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0B0D12',
          backgroundImage:
            'radial-gradient(circle at 50% 0%, rgba(56, 189, 248, 0.15), transparent 70%), radial-gradient(circle at 100% 100%, rgba(52, 211, 153, 0.08), transparent 60%)',
          padding: '60px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          color: '#F3F4F6',
          position: 'relative',
        }}
      >
        {/* Outer Hairline Frame */}
        <div
          style={{
            position: 'absolute',
            inset: '30px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '24px',
            pointerEvents: 'none',
          }}
        />

        {/* Central Studio Island */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(17, 20, 28, 0.88)',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            borderRadius: '20px',
            padding: '48px 56px',
            maxWidth: '1000px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          }}
        >
          {/* Top Ticker Pill */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 16px',
              borderRadius: '9999px',
              backgroundColor: 'rgba(56, 189, 248, 0.1)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              color: '#38BDF8',
              fontSize: '14px',
              fontWeight: 600,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              marginBottom: '24px',
            }}
          >
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '9999px',
                backgroundColor: '#34D399',
              }}
            />
            Competitive Programming Duel Engine
          </div>

          {/* Brand Headline */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              fontSize: '64px',
              fontWeight: 800,
              letterSpacing: '-0.04em',
              lineHeight: 1.05,
              color: '#F3F4F6',
              marginBottom: '16px',
            }}
          >
            AlgoArena
            <span
              style={{
                color: '#38BDF8',
                marginLeft: '4px',
              }}
            >
              .
            </span>
          </div>

          {/* Subtitle */}
          <div
            style={{
              fontSize: '24px',
              fontWeight: 500,
              letterSpacing: '-0.02em',
              color: '#9CA3AF',
              marginBottom: '36px',
              textAlign: 'center',
            }}
          >
            1v1 Coding Duels with Side-by-Side Execution Traces
          </div>

          {/* 3 Pillar Badges */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                fontSize: '14px',
                fontWeight: 600,
                color: '#E5E7EB',
              }}
            >
              ⚡ Side-by-Side Execution Trace
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                fontSize: '14px',
                fontWeight: 600,
                color: '#34D399',
              }}
            >
              🛡️ Fair, Repeatable Judging
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                fontSize: '14px',
                fontWeight: 600,
                color: '#FB7185',
              }}
            >
              ⚔️ Hack & Defend Sabotage
            </div>
          </div>
        </div>

        {/* Bottom Telemetry Footer */}
        <div
          style={{
            position: 'absolute',
            bottom: '44px',
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
            fontSize: '12px',
            color: '#6B7280',
            fontFamily: 'monospace',
          }}
        >
          <span>Dijkstra · Shortest Path · Greedy Traps</span>
          <span>•</span>
          <span>Codeforces-Style Rating Curve</span>
          <span>•</span>
          <span>Monaco Editor + Isolated Execution Sandbox</span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
