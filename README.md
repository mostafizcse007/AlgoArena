# AlgoArena

<div align="center">

![AlgoArena Cover Banner](https://raw.githubusercontent.com/algoarena/algoarena/main/public/cover.png)

### Real-Time 1v1 Competitive Algorithmic Duels

[![Next.js](https://img.shields.io/badge/Next.js-16.4.3-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.3.0-149eca?style=for-the-badge&logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict_5-3178c6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL_17-3ecf8e?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Canvas](https://img.shields.io/badge/HTML5_Canvas-60_FPS-f59e0b?style=for-the-badge&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)

<p align="center">
  <b>Outsmart your opponent in real time.</b><br/>
  Write your solution, watch both traces animate side by side on a 60 FPS Canvas, and break their code with an adversarial counterexample.
</p>

[Quickstart](#getting-started) • [Architecture](#architecture--engineering-standards) • [Game Modes](#game-modes--mechanics) • [Visualizer Engine](#dual-trace-visualizer-60-fps) • [Database & Security](#database-security--rls) • [Shortcuts](#keyboard-shortcuts)

---

</div>

## Overview

**AlgoArena** is a high-performance, real-time competitive programming platform designed around deterministic execution, visual algorithm tracing, and adversarial counterexample verification (sabotage / hacks).

Unlike traditional competitive programming platforms that only return static verdict strings (`AC`, `WA`, `TLE`), AlgoArena captures fine-grained algorithm state snapshots and renders execution side by side. Competitors can inspect their memory transitions, analyze time complexity down to individual operations, and exploit subtle greedy or asymptotic flaws in an opponent's code using adversarial test injection.

---

## Key Features

- **Ranked 1v1 Matchmaking & Custom Duels**: Instant Elo-based pairing powered by atomic PostgreSQL queues using `SELECT ... FOR UPDATE SKIP LOCKED`. Private duel rooms (`ALGO-XXX`) support friendly challenges and custom matches.
- **Dual Trace Visualizer (60 FPS Canvas)**: Side-by-side synchronized rendering of Graph traversals (Dijkstra, BFS), 2D Dynamic Programming matrices (LIS, Knapsack), and Two-Pointer scans with zero React re-renders during animation.
- **Sabotage Mode (Counterexample Injection)**: Submit targeted inputs against an opponent's buggy implementation to prove divergence from the optimal oracle solution. Successful hacks award bonus Elo.
- **DAW-Style Execution Scrubber**: Scrub backwards and forwards through individual execution frames. Inspect active pointers, visited nodes, min-heap states, and local variables.
- **Sandboxed Web Worker Judge**: 100% deterministic, client-side code evaluation in an isolated Web Worker (`judge.worker.ts`). Features a strict 500ms timeout kill switch, 500-frame memory ceiling, and operation count instrumentation.
- **Zero-AI Determinism**: Zero LLMs or generative AI in the execution or judging loop. Every verdict is derived purely from algorithmic analysis, hard test assertions, and oracle comparisons.
- **macOS Pro Studio Design System**: Custom glass acrylic surfaces (`rgba(22, 27, 38, 0.78)` with `backdrop-filter: blur(24px) saturate(180%)`), specular inner highlights, eye-comfort semantic palettes, and guaranteed **CLS = 0** layout stability.
- **Synthesized Web Audio SFX Engine**: Procedurally generated sound effects built directly on the native Web Audio API—no external MP3/WAV assets required.
- **Monaco Bundle Preloading & IDB Draft Persistence**: Monaco Editor dependencies preload in the lobby. User code is debounced and cached to IndexedDB (`idb-keyval`) per match, preventing accidental loss on network drops or tab refreshes.
- **Competitive Profiles & University Leaderboards**: Interactive Elo trajectory graphs, Skill Radar pentagons across 5 core problem categories, GitHub-style duel heatmaps, and nationwide campus rankings.

---

## Architecture & Engineering Standards

AlgoArena is built under strict non-negotiable architectural constraints to ensure competitive fairness, visual smoothness, and data integrity:

```
┌────────────────────────────────────────────────────────────────────────┐
│                              NEXT.JS APP                               │
│  App Router (Server Components & Partial Prerendering) + Tailwind v4   │
└──────────────────┬─────────────────────────────────┬───────────────────┘
                   │                                 │
                   ▼                                 ▼
      ┌──────────────────────────┐     ┌───────────────────────────┐
      │     SUPABASE BACKEND     │     │    CLIENT-SIDE SANDBOX    │
      │  - PostgreSQL 17 / RLS   │     │  - Web Worker Judge       │
      │  - Atomic PL/pgSQL RPCs  │     │  - 500ms Kill Switch      │
      │  - Realtime Publications │     │  - Ops Instrumentation    │
      │  - Secret Tests Shield   │     │  - Zero-AI Determinism    │
      └──────────────────────────┘     └─────────────┬─────────────┘
                                                     │
                                                     ▼
                                       ┌───────────────────────────┐
                                       │    60 FPS CANVAS ENGINE   │
                                       │  - requestAnimationFrame  │
                                       │  - Mutable useRef Buffer  │
                                       │  - 0 React Re-renders     │
                                       │  - DAW Trace Scrubber     │
                                       └───────────────────────────┘
```

### 1. Zero React Re-renders During 60 FPS Playback
Animation frame indices and execution trace arrays are held strictly inside mutable `useRef` containers rather than React state. HTML5 Canvas rendering runs via `requestAnimationFrame` with `window.devicePixelRatio` scaling, guaranteeing **0 React re-renders** throughout full trace playback.

### 2. Client-Side Untrusted Code Isolation
User code submissions and adversarial hack inputs run inside an isolated Web Worker (`src/workers/judge.worker.ts`).
- **TLE Protection**: A hard 500ms execution timeout enforced by `worker.terminate()`.
- **OOM Protection**: A 500-frame limit per test execution prevents memory exhaustion and infinite loops.
- **Instrumentation**: AST-level loop & statement counter tracks the exact operations executed during runtime.

### 3. Supabase Security & RLS Isolation
- **Test Case Partitioning**: Problems maintain public samples (`problems.public_samples`) for client-side local debugging, while secret judge test cases are stored in `problem_secret_tests`.
- **Locked RLS**: The `problem_secret_tests` table is sealed from client queries. Secret test evaluation bundles are served exclusively through `SECURITY DEFINER` PL/pgSQL RPCs (`get_problem_eval_bundle`).
- **Atomic Matchmaking**: Pairing logic in `join_ranked_queue` and match Elo settlements in `settle_match_result` execute inside PostgreSQL transactions using `SELECT ... FOR UPDATE SKIP LOCKED` to prevent race conditions or double-matching.

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Framework** | [Next.js 16.4.3](https://nextjs.org/) (App Router, Turbopack, Partial Prerendering) |
| **UI Library** | [React 19.3.0](https://react.dev/), [Tailwind CSS v4](https://tailwindcss.com/) |
| **Editor** | [Monaco Editor](https://microsoft.github.io/monaco-editor/) (`@monaco-editor/react`) |
| **Motion & Icons** | [Framer Motion](https://www.framer.com/motion/), [Lucide React](https://lucide.dev/) |
| **Database & Auth** | [Supabase](https://supabase.com/) (`@supabase/ssr`, `@supabase/supabase-js`, PostgreSQL 17) |
| **Local Persistence** | [idb-keyval](https://github.com/jakearchibald/idb-keyval) (IndexedDB draft caching) |
| **Audio** | Native Web Audio API (Synthesized oscillators, envelope shaping) |
| **Testing & CI** | [Playwright](https://playwright.dev/), [ESLint 9](https://eslint.org/) |

---

## Directory Structure

```text
algoarena/
├── .agents/rules/           # Architecture rules & non-negotiable engineering standards
├── public/                  # Static assets & web manifest
├── scripts/                 # Playwright test scripts & verification suites
│   ├── verify-operations-counter.js  # E2E test for operations counter HUD
│   └── verify_round3_polish.mjs      # Multi-viewport responsive polish suite
├── src/
│   ├── app/                 # Next.js App Router routes & server components
│   │   ├── arena/[matchId]/ # Live match cockpit & arena header
│   │   ├── auth/            # OAuth & magic-link callback handlers
│   │   ├── forgot-password/ # Password recovery flow
│   │   ├── leaderboard/     # Global & campus Elo leaderboards
│   │   ├── lobby/           # Ranked queue, custom room creation & join
│   │   ├── login/           # Dual authentication (username or email)
│   │   ├── profile/         # Player profile, Elo history, skill radar & heatmap
│   │   ├── reset-password/  # Password reset handler
│   │   ├── settings/        # Editor keybindings, theme, audio & profile settings
│   │   ├── signup/          # User registration & username availability check
│   │   ├── layout.tsx       # Root studio layout & command palette wrapper
│   │   └── page.tsx         # Editorial landing page & live duel demo canvas
│   ├── components/
│   │   ├── arena/           # ArenaCockpitClient, SabotageDrawer, AfterActionReport
│   │   ├── canvas/          # DualTraceVisualizer, DAWScrubber, MiniDuelHeroCanvas
│   │   ├── layout/          # Navbar, Container, CommandPalette, ShortcutsModal
│   │   ├── profile/         # EloTrajectoryChart, SkillRadarChart, DuelHeatmap
│   │   └── ui/              # BrandLogo, CustomSelect, Toast
│   ├── lib/
│   │   ├── audio/           # Procedural Web Audio SFX engine (sfx.ts)
│   │   ├── constants/       # Supported campus & university registries
│   │   ├── judge/           # Client-side worker judge orchestrator (runner.ts)
│   │   ├── settings/        # Editor preferences & local storage helpers
│   │   ├── supabase/        # Browser, server, and middleware Supabase clients
│   │   ├── types/           # Core domain models (arena.ts, tier.ts)
│   │   └── proxy.ts         # Edge middleware & route protection
│   └── workers/
│       └── judge.worker.ts  # Isolated, deterministic code execution sandbox
└── supabase/
    ├── migrations/          # PostgreSQL migrations, schema, RLS, & RPC functions
    │   ├── 20261029000000_algoarena_core.sql               # Core schema & RPCs
    │   ├── 20261029000001_unconfirmed_users_username_fix.sql # Username triggers
    │   └── 20261030000000_problem_complexity_metadata.sql   # Big-O complexity metadata
    └── seed.sql             # Benchmark profiles, competitive match data & problems
```

---

## Getting Started

### Prerequisites

- **Node.js**: `v20.x` or higher (Node 22 LTS recommended)
- **Package Manager**: `npm`, `pnpm`, or `bun`
- **Supabase Account / CLI**: Cloud project or local Supabase CLI instance

### 1. Clone the Repository

```bash
git clone https://github.com/algoarena/algoarena.git
cd algoarena
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

> **Note:** Client-side components only interact with the database via the public Supabase client (`anon` key). All privileged operations (secret test evaluation, queue matchmaking, Elo adjustments) run inside `SECURITY DEFINER` PL/pgSQL RPCs.

### 4. Database Setup & Migrations

If using Supabase CLI:

```bash
# Link to your Supabase project
npx supabase link --project-ref your-project-ref

# Apply database migrations
npx supabase db push

# (Optional) Seed realistic competitor and problem data
npx supabase db execute --file supabase/seed.sql
```

Alternatively, apply the SQL files in `supabase/migrations/` sequentially via the Supabase SQL Editor.

### 5. Launch the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Game Modes & Mechanics

### 1. Ranked 1v1 Duels
- **Matchmaking Queue**: Players queue in `/lobby`. An atomic PostgreSQL transaction searches for an opponent within a rating window ($\pm 150$ Elo) using `SKIP LOCKED`.
- **Rating Formula**: Match settlements follow the standard Elo rating system with $K = 32$:
  $$E_A = \frac{1}{1 + 10^{(R_B - R_A)/400}}$$
  $$\Delta R_A = \text{round}(K \cdot (S_A - E_A))$$
- **Elo Tiers**:
  - 🟢 **Newbie**: $< 1200$
  - 🔵 **Pupil**: $1200 - 1399$
  - 🟣 **Specialist**: $1400 - 1599$
  - 🟡 **Expert**: $1600 - 1899$
  - 🔴 **Grandmaster**: $\ge 1900$

### 2. Custom Duels & Friendly Matches
- Generate a private room code (e.g., `ALGO-8E2`) from the lobby.
- Share the link `/lobby/join/ALGO-8E2` with a friend to duel on a selected problem without affecting public ranked standings.

### 3. Sabotage Mode (Adversarial Counterexample Injection)
- When facing an opponent or a challenge solution, open the **Sabotage Drawer** (`Cmd+H` / `Ctrl+H`).
- Construct a targeted JSON counterexample input that satisfies problem constraints (e.g., tricky negative weight, disconnected component, duplicate elements).
- The judge tests the input against both the **Defender's Code** and the **Oracle Reference Solution**.
- If the defender produces an incorrect output while the oracle produces the expected optimal output, a **Successful Hack** is registered, instantly winning the round.

---

## Dual Trace Visualizer (60 FPS)

The visualizer transforms raw algorithmic steps into synchronized graphical representations:

| Visualizer Type | Supported Problems | Canvas State Rendered |
|---|---|---|
| **Graph / Dijkstra** | Dijkstra's Shortest Path | Node graph with active cursor, visited set, min-heap priority queue entries, and edge relaxation flashes. |
| **Dynamic Programming Grid** | Longest Increasing Subsequence (LIS), Grid Paths | 2D dynamic programming matrices, active cell coordinate highlights, and recurrence dependency pointers. |
| **Two Pointers & Arrays** | Container With Most Water, Two Sum | Linear array layout, left/right active pointer tags, element comparisons, and area bounding boxes. |

### Trace Step Types

Every frame emitted by the judge worker corresponds to an atomic algorithmic operation:
- `POINTER_MOVE`: Movement of array indices or scanning markers.
- `ARRAY_COMPARE`: Comparison between elements with color-coded comparison badges.
- `VISIT_NODE`: Node exploration in graph algorithms.
- `UPDATE_DIST`: Relaxation of path distance values.
- `PUSH_HEAP` / `POP_HEAP`: Min/max heap modifications.
- `GRID_CELL`: DP table transition snapshot.
- `DIVERGENCE`: Detected deviation between the player's execution and the oracle.

---

## Database Security & RLS

The database is built on PostgreSQL 17 with strict Row-Level Security enabled on all tables:

| Table | RLS Policy | Access Scope |
|---|---|---|
| `profiles` | Public Read / Self Update | Anyone can inspect profiles; users can only modify their own bio, university, and settings. |
| `problems` | Public Read | Public problem statements, constraints, and sample tests. |
| `problem_secret_tests` | **RESTRICTED** | Completely inaccessible to `anon` and `authenticated` clients. Accessible solely via `SECURITY DEFINER` RPC `get_problem_eval_bundle`. |
| `matches` | Public Read / Participant Update | Spectators can view live and completed duels. Participants can record state. |
| `matchmaking_queue` | Owner Only | Players can only insert or remove their own queue entries. |
| `match_submissions` | Participant Read / Author Insert | Only match participants can view submission details and code. |
| `match_hacks` | Participant Read / Attacker Insert | Records hack attempts and counterexamples for post-match analysis. |
| `duel_activity` | Public Read | Daily activity logs feeding the profile heatmap. |

---

## Keyboard Shortcuts

AlgoArena features a complete macOS-style keyboard navigation system:

| Shortcut | Action |
|---|---|
| <kbd>Cmd</kbd> / <kbd>Ctrl</kbd> + <kbd>Enter</kbd> | Run Public Tests / Submit Solution |
| <kbd>Cmd</kbd> / <kbd>Ctrl</kbd> + <kbd>K</kbd> | Open Global Command Palette |
| <kbd>Cmd</kbd> / <kbd>Ctrl</kbd> + <kbd>H</kbd> | Toggle Sabotage / Counterexample Drawer |
| <kbd>Space</kbd> | Play / Pause Trace Visualization |
| <kbd>←</kbd> / <kbd>→</kbd> | Step Backward / Forward 1 frame in DAW Scrubber |
| <kbd>Home</kbd> / <kbd>End</kbd> | Jump to Start / End of Trace |
| <kbd>?</kbd> | Open Keyboard Shortcuts Cheat Sheet |
| <kbd>Esc</kbd> | Close Active Modal / Drawer / Palette |

---

## Scripts & Testing

AlgoArena includes test suites for linting, typechecking, and end-to-end browser verification:

```bash
# Run ESLint across all TypeScript and React components
npm run lint

# Compile production build with Turbopack and TypeScript verification
npm run build

# Run automated Playwright E2E verification for the operations counter HUD
npm test

# Run multi-viewport responsive UI verification (mobile to 1080p desktop)
node scripts/verify_round3_polish.mjs
```

---

## Contributing

Contributions are welcome! To contribute:

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/awesome-feature`.
3. Adhere to the standards in `.agents/rules/algoarena.md` (macOS Pro Studio aesthetic, 0 CLS, 0 React re-renders on canvas, zero AI determinism).
4. Verify your changes pass `npm run lint` and `npm run build`.
5. Submit a pull request with a descriptive summary of your changes.

---

## License

This project is licensed under the [MIT License](LICENSE).
