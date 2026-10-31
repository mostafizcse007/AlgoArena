'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, ChevronLeft, ChevronRight, CheckCircle2, Zap } from 'lucide-react';

export function MiniDuelHeroCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const frameRef = useRef<number>(5);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [activeFrame, setActiveFrame] = useState<number>(5);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let dpr = window.devicePixelRatio || 1;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
    };
    resize();
    window.addEventListener('resize', resize);

    // 5-Vertex Directed Graph:
    // Node 0: Start (S)
    // Node 1: Greedy local minimum trap
    // Node 2 & 3: Multi-hop Dijkstra detour
    // Node 4: Target (T)
    const nodes = [
      { id: 0, label: '0', x: 0.12, y: 0.5 },
      { id: 1, label: '1', x: 0.44, y: 0.22 },
      { id: 2, label: '2', x: 0.36, y: 0.78 },
      { id: 3, label: '3', x: 0.64, y: 0.78 },
      { id: 4, label: '4', x: 0.88, y: 0.5 },
    ];

    const edges = [
      { u: 0, v: 1, w: 10, path: 'greedy' },
      { u: 1, v: 4, w: 10, path: 'greedy' },
      { u: 0, v: 2, w: 1, path: 'optimal' },
      { u: 2, v: 3, w: 2, path: 'optimal' },
      { u: 3, v: 4, w: 3, path: 'optimal' },
    ];

    let lastTick = performance.now();
    let currentStep = 5; // Start at the dramatic divergence frame

    const loop = (now: number) => {
      if (isPlaying && now - lastTick > 1000) {
        lastTick = now;
        currentStep = (currentStep % 7) + 1;
        frameRef.current = currentStep;
        setActiveFrame(currentStep);
      }

      const cssW = canvas.width / dpr;
      const cssH = canvas.height / dpr;

      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Canvas background
      ctx.fillStyle = '#0B0D12';
      ctx.fillRect(0, 0, cssW, cssH);

      // Subtle engineering dot grid
      ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
      for (let x = 16; x < cssW; x += 24) {
        for (let y = 16; y < cssH; y += 24) {
          ctx.fillRect(x, y, 1, 1);
        }
      }

      const step = frameRef.current;

      // Draw Edges
      edges.forEach((edge) => {
        const u = nodes[edge.u];
        const v = nodes[edge.v];
        const ux = u.x * cssW;
        const uy = u.y * cssH;
        const vx = v.x * cssW;
        const vy = v.y * cssH;

        let strokeColor = 'rgba(255, 255, 255, 0.1)';
        let lineWidth = 1.5;

        // Path highlighting based on current step
        if (edge.path === 'optimal') {
          if (
            (edge.u === 0 && edge.v === 2 && step >= 2) ||
            (edge.u === 2 && edge.v === 3 && step >= 3) ||
            (edge.u === 3 && edge.v === 4 && step >= 4)
          ) {
            strokeColor = '#34D399'; // Mint optimal
            lineWidth = 2.5;
          }
        } else if (edge.path === 'greedy') {
          if (
            (edge.u === 0 && edge.v === 1 && step >= 2) ||
            (edge.u === 1 && edge.v === 4 && step >= 5)
          ) {
            strokeColor = '#FB7185'; // Coral greedy divergence
            lineWidth = 2.5;
          }
        }

        ctx.beginPath();
        ctx.moveTo(ux, uy);
        ctx.lineTo(vx, vy);
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = lineWidth;
        ctx.stroke();

        // Edge Weight Pill
        const mx = (ux + vx) / 2;
        const my = (uy + vy) / 2;
        const pillW = 28;
        const pillH = 18;

        ctx.fillStyle = '#11141C';
        ctx.beginPath();
        ctx.roundRect(mx - pillW / 2, my - pillH / 2, pillW, pillH, 4);
        ctx.fill();
        ctx.strokeStyle = strokeColor === 'rgba(255, 255, 255, 0.1)' ? 'rgba(255, 255, 255, 0.12)' : strokeColor;
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = strokeColor === 'rgba(255, 255, 255, 0.1)' ? '#9CA3AF' : strokeColor;
        ctx.font = '600 11px var(--font-mono, monospace)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`w=${edge.w}`, mx, my);
      });

      // Draw Nodes
      nodes.forEach((n) => {
        const nx = n.x * cssW;
        const ny = n.y * cssH;
        const radius = 17;

        const nodeBg = '#11141C';
        let nodeBorder = 'rgba(255, 255, 255, 0.15)';
        let textColor = '#E5E7EB';
        let costPill: { text: string; color: string } | null = null;

        if (n.id === 0) {
          nodeBorder = '#38BDF8';
          costPill = { text: 'd=0', color: '#38BDF8' };
        } else if (n.id === 1 && step >= 2) {
          nodeBorder = '#FB7185';
          textColor = '#FB7185';
          costPill = { text: 'd=10 (Greedy)', color: '#FB7185' };
        } else if (n.id === 2 && step >= 2) {
          nodeBorder = '#34D399';
          costPill = { text: 'd=1', color: '#34D399' };
        } else if (n.id === 3 && step >= 3) {
          nodeBorder = '#34D399';
          costPill = { text: 'd=3', color: '#34D399' };
        } else if (n.id === 4 && step >= 4) {
          nodeBorder = step >= 5 ? '#FB7185' : '#34D399';
          costPill = {
            text: 'd=6',
            color: '#34D399',
          };
        }

        // Outer Node Circle
        ctx.beginPath();
        ctx.arc(nx, ny, radius, 0, Math.PI * 2);
        ctx.fillStyle = nodeBg;
        ctx.fill();
        ctx.strokeStyle = nodeBorder;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Node Label
        ctx.fillStyle = textColor;
        ctx.font = '600 12px var(--font-mono, monospace)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(n.label, nx, ny);

        // Dynamic Distance Badge
        if (costPill) {
          const badgeY = n.y < 0.4 || n.id === 4 ? ny - 24 : ny + 25;
          ctx.font = '600 11px var(--font-mono, monospace)';
          const textMetrics = ctx.measureText(costPill.text);
          const bW = textMetrics.width + 12;
          const bH = 18;

          ctx.fillStyle = '#11141C';
          ctx.beginPath();
          ctx.roundRect(nx - bW / 2, badgeY - bH / 2, bW, bH, 4);
          ctx.fill();
          ctx.strokeStyle = costPill.color;
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.fillStyle = costPill.color;
          ctx.fillText(costPill.text, nx, badgeY);
        }
      });

      ctx.restore();
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('resize', resize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying]);

  const handleStep = (newStep: number) => {
    const clamped = Math.max(1, Math.min(7, newStep));
    frameRef.current = clamped;
    setActiveFrame(clamped);
  };

  return (
    <div className="flex flex-col w-full bg-[#11141C] border border-white/[0.08] rounded-xl overflow-hidden shadow-sm select-none">
      {/* 1. Clean Card Header with Small Label "Live duel preview" */}
      <div className="h-9 px-3.5 bg-[#141824] border-b border-white/[0.07] flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#34D399]" />
          <span className="font-medium text-[#F3F4F6] text-xs">Live duel preview</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#9CA3AF]">
          <span className="tabular-nums font-mono text-[11px]">Step {activeFrame} / 7</span>
        </div>
      </div>

      {/* 2. 60 FPS HTML5 Dual-Trace Divergence Canvas */}
      <div className="relative w-full h-[260px] bg-[#0B0D12]">
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>

      {/* 3. One-line caption under graph describing the divergence moment */}
      <div className="h-9 px-3.5 bg-[#0D1017] border-t border-white/[0.07] flex items-center justify-between gap-2 text-xs overflow-hidden select-none shrink-0">
        <div className="flex items-center gap-2 text-xs truncate">
          {activeFrame >= 5 ? (
            <>
              <span className="inline-block w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
              <span className="text-rose-300 font-medium truncate">
                Divergence: Greedy takes local edge (20) while Dijkstra detours to optimal path (6).
              </span>
            </>
          ) : (
            <>
              <span className="inline-block w-2 h-2 rounded-full bg-sky-400 shrink-0" />
              <span className="text-[#9CA3AF] truncate">
                Exploring shortest path candidates from node 0 to node 4.
              </span>
            </>
          )}
        </div>
        <span className="text-[11px] font-mono text-[#9CA3AF] shrink-0">
          {activeFrame >= 5 ? 'Greedy 20 vs Optimal 6' : 'Target cost: d=6'}
        </span>
      </div>

      {/* 4. Cropped Duel Scrubber Bar */}
      <footer className="h-10 px-3 bg-[#11141C] border-t border-white/[0.07] flex items-center justify-between gap-3 text-xs">
        {/* Playback Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => handleStep(activeFrame - 1)}
            disabled={activeFrame <= 1}
            className="p-1 rounded text-[#9CA3AF] hover:text-white hover:bg-white/[0.06] disabled:opacity-30 transition cursor-pointer"
            aria-label="Step back"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="px-2 py-1 rounded bg-white/[0.06] hover:bg-white/[0.1] text-white flex items-center gap-1 transition cursor-pointer font-medium"
            aria-label={isPlaying ? 'Pause simulation' : 'Play simulation'}
          >
            {isPlaying ? (
              <Pause className="w-3 h-3 fill-current text-sky-400" />
            ) : (
              <Play className="w-3 h-3 fill-current text-sky-400" />
            )}
            <span className="text-xs">{isPlaying ? 'Pause' : 'Play'}</span>
          </button>

          <button
            onClick={() => handleStep(activeFrame + 1)}
            disabled={activeFrame >= 7}
            className="p-1 rounded text-[#9CA3AF] hover:text-white hover:bg-white/[0.06] disabled:opacity-30 transition cursor-pointer"
            aria-label="Step forward"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 7-Step Frame Track */}
        <div className="flex items-center gap-1.5 flex-1 max-w-xs mx-auto">
          {[1, 2, 3, 4, 5, 6, 7].map((step) => {
            const isDivergenceStep = step === 5;
            const isCurrent = step === activeFrame;
            return (
              <button
                key={step}
                onClick={() => handleStep(step)}
                className={`flex-1 h-2 rounded-full transition-all cursor-pointer ${
                  isCurrent
                    ? isDivergenceStep
                      ? 'bg-[#FB7185] ring-2 ring-rose-400/40'
                      : 'bg-[#38BDF8] ring-2 ring-sky-400/40'
                    : isDivergenceStep
                    ? 'bg-rose-500/40 hover:bg-rose-500/60'
                    : 'bg-white/[0.1] hover:bg-white/[0.2]'
                }`}
                title={`Frame ${step}${isDivergenceStep ? ' (Critical Divergence)' : ''}`}
                aria-label={`Jump to frame ${step}`}
              />
            );
          })}
        </div>

        {/* Telemetry metadata */}
        <div className="flex items-center gap-2 text-xs font-sans text-[#9CA3AF] tabular-nums shrink-0">
          <span className="text-[#34D399] font-medium">O((V + E) log V)</span>
          <span>•</span>
          <span>1x</span>
        </div>
      </footer>
    </div>
  );
}
