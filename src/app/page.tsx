import React from 'react';
import Link from 'next/link';
import { Swords, Trophy, ShieldAlert, Cpu, Terminal } from 'lucide-react';
import { MiniDuelHeroCanvas } from '@/components/canvas/MiniDuelHeroCanvas';
import { Container } from '@/components/layout/Container';
import { BrandLogo } from '@/components/ui/BrandLogo';

export default function LandingPage() {
  return (
    <Container className="flex-1 flex flex-col items-center justify-start py-8">
      {/* Hero Section: Editorial Asymmetric Hero */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-10 items-center mb-16 pt-2">
        {/* Left Column: Strong Display Typography */}
        <div className="lg:col-span-6 flex flex-col gap-5">
          <div className="inline-flex items-center gap-2 text-xs text-[#9CA3AF]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8]" />
            <span>Competitive Algorithmic Duels</span>
          </div>

          <h1 className="font-display text-3xl sm:text-4xl lg:text-[2.75rem] font-semibold tracking-[-0.03em] leading-[1.12] text-[#F3F4F6] max-w-xl">
            Outsmart your opponent in real time.
          </h1>

          <p className="text-[15px] sm:text-[16px] leading-[1.65] text-[#D1D5DB] max-w-xl font-sans">
            1v1 coding duels. Write your solution, watch both traces side by side, and break their code with a counterexample.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="/lobby"
              className="px-4 py-2.5 rounded-lg bg-[#F3F4F6] text-[#0B0D12] hover:bg-white font-medium text-xs transition shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <Swords className="w-3.5 h-3.5" />
              <span>Find a ranked match</span>
            </Link>

            <Link
              href="/leaderboard"
              className="px-4 py-2.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[#E5E7EB] font-medium text-xs transition flex items-center gap-2 cursor-pointer"
            >
              <Trophy className="w-3.5 h-3.5 text-[#9CA3AF]" />
              <span>View leaderboard</span>
            </Link>
          </div>

          {/* Quiet status line under hero buttons without hardcoded numbers */}
          <div className="flex items-center gap-2 text-xs text-[#9CA3AF] pt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#34D399]" />
            <span>Ranked play active · Instant browser execution</span>
          </div>

          {/* Aligned Feature Chips Row with Consistent Baselines */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs text-[#9CA3AF]">
            <div className="flex items-center gap-2 py-1">
              <Cpu className="w-3.5 h-3.5 text-[#38BDF8] shrink-0" />
              <span>Fair, repeatable judging</span>
            </div>
            <div className="flex items-center gap-2 py-1">
              <Terminal className="w-3.5 h-3.5 text-[#38BDF8] shrink-0" />
              <span>Runs safely in your browser</span>
            </div>
            <div className="flex items-center gap-2 py-1">
              <ShieldAlert className="w-3.5 h-3.5 text-[#38BDF8] shrink-0" />
              <span>500 ms time limit</span>
            </div>
          </div>
        </div>

        {/* Right Column: Realistic Cropped Duel Screen Demonstration */}
        <div className="lg:col-span-6 w-full flex flex-col justify-center">
          <MiniDuelHeroCanvas />
        </div>
      </div>

      {/* Section 1: How it works (3 steps) */}
      <section className="w-full py-14 border-t border-white/[0.07]">
        <div className="max-w-2xl mb-8">
          <h2 className="font-display text-xl sm:text-2xl font-semibold tracking-tight text-[#F3F4F6] mb-2">
            How it works
          </h2>
          <p className="text-xs sm:text-sm text-[#9CA3AF] leading-relaxed">
            Three simple steps from entering the queue to climbing the Elo ladder.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="p-5 rounded-xl bg-[#141824] flex flex-col gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-400 font-semibold text-xs flex items-center justify-center">
              1
            </div>
            <h3 className="font-display text-sm font-semibold text-[#F3F4F6]">Find a match</h3>
            <p className="text-xs text-[#9CA3AF] leading-relaxed font-sans">
              Queue into the ranked ladder and get paired against players close to your rating within seconds.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-[#141824] flex flex-col gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 font-semibold text-xs flex items-center justify-center">
              2
            </div>
            <h3 className="font-display text-sm font-semibold text-[#F3F4F6]">Solve and watch both traces</h3>
            <p className="text-xs text-[#9CA3AF] leading-relaxed font-sans">
              Write your algorithm in the studio editor. Watch your execution trace step alongside the canonical solution in real time.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-[#141824] flex flex-col gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-400 font-semibold text-xs flex items-center justify-center">
              3
            </div>
            <h3 className="font-display text-sm font-semibold text-[#F3F4F6]">Break their code</h3>
            <p className="text-xs text-[#9CA3AF] leading-relaxed font-sans">
              Spot an asymptotic weakness in your opponent&apos;s approach? Craft an adversarial test case to trigger instant victory.
            </p>
          </div>
        </div>
      </section>

      {/* Section 2: See where it goes wrong */}
      <section className="w-full py-14 border-t border-white/[0.07]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-5 flex flex-col gap-3.5">
            <h2 className="font-display text-xl sm:text-2xl font-semibold tracking-tight text-[#F3F4F6]">
              See where it goes wrong
            </h2>
            <p className="text-xs sm:text-sm text-[#9CA3AF] leading-relaxed font-sans">
              Subtle asymptotic traps miss detours and fail edge cases. The dual-trace engine renders internal array and graph pointers step-by-step so you can isolate the exact decision where a heuristic diverges from optimality.
            </p>
            <div className="flex flex-col gap-2 pt-1 text-xs text-[#D1D5DB]">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#34D399] shrink-0" />
                <span>Side-by-side memory dock and array state inspection</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8] shrink-0" />
                <span>Scrubber controls with frame-by-frame stepping</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FB7185] shrink-0" />
                <span>Immediate highlight of divergence frames</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 bg-[#141824] rounded-xl p-5 flex flex-col gap-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.07] text-xs">
              <span className="font-medium text-[#F3F4F6]">Execution Comparison: Shortest Path</span>
              <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 font-mono text-[11px] border border-rose-500/20">
                Step 5 Divergence
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="p-4 rounded-lg bg-[#0B0D12] border border-white/[0.06] flex flex-col gap-2">
                <div className="text-xs font-semibold text-rose-400">Greedy Heuristic</div>
                <div className="text-xs text-[#9CA3AF] leading-relaxed">
                  Hops immediately to neighbor node 1 (weight 10) and is forced onto edge 1→4 (weight 10). Total path cost: 20.
                </div>
                <div className="mt-auto pt-2 text-xs font-mono text-rose-300">Path: 0 → 1 → 4 (Cost: 20)</div>
              </div>

              <div className="p-4 rounded-lg bg-[#0B0D12] border border-white/[0.06] flex flex-col gap-2">
                <div className="text-xs font-semibold text-[#34D399]">Optimal Dijkstra Oracle</div>
                <div className="text-xs text-[#9CA3AF] leading-relaxed">
                  Explores frontier via nodes 2 and 3, finding a multi-hop composite detour with total weight 6.
                </div>
                <div className="mt-auto pt-2 text-xs font-mono text-[#34D399]">Path: 0 → 2 → 3 → 4 (Cost: 6)</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Final Call to Action */}
      <section className="w-full py-16 border-t border-white/[0.07] flex flex-col items-center text-center">
        <h2 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-[#F3F4F6] mb-2">
          Ready to climb the ladder?
        </h2>
        <p className="text-xs sm:text-sm text-[#9CA3AF] max-w-md mb-6">
          Queue into ranked matches or practice against reference solutions right in your browser.
        </p>
        <Link
          href="/lobby"
          className="px-5 py-2.5 rounded-lg bg-[#F3F4F6] text-[#0B0D12] hover:bg-white font-medium text-xs transition shadow-sm flex items-center gap-2 cursor-pointer"
        >
          <Swords className="w-3.5 h-3.5" />
          <span>Find a ranked match</span>
        </Link>
      </section>

      {/* Minimal Footer: Logo, Leaderboard, Play, GitHub */}
      <footer className="w-full py-6 border-t border-white/[0.07] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#9CA3AF]">
        <div className="flex items-center gap-3">
          <BrandLogo />
        </div>

        <div className="flex items-center gap-6">
          <Link href="/lobby" className="hover:text-[#F3F4F6] transition">
            Play
          </Link>
          <Link href="/leaderboard" className="hover:text-[#F3F4F6] transition">
            Leaderboard
          </Link>
          <a
            href="https://github.com/mostafizcse007"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#F3F4F6] transition"
          >
            GitHub
          </a>
        </div>
      </footer>
    </Container>
  );
}
