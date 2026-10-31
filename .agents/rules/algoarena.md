---
description: Non-negotiable architectural, visual, and performance standards for AlgoArena.
trigger: always_on
---

# AlgoArena Non-Negotiable Engineering Standards

These standards are persistent and strictly enforced across all development and refactoring tasks in AlgoArena.

---

## 1. Stack & Zero-AI Determinism
- **Core Stack**: Pure Next.js (App Router, Server Components, Server Actions, Route Handlers), strict TypeScript, Tailwind CSS, and Supabase (`@supabase/ssr`).
- **Zero-AI Determinism**: 100% deterministic software engineering and algorithmic verification.
  - **NEVER** integrate LLM or AI API calls (OpenAI, Anthropic, Gemini, etc.) anywhere in the application runtime or verification flow.
  - All test generation, code validation, and execution judging must run purely on algorithmic logic and hard test assertions.

---

## 2. macOS Pro Studio Design System & Zero Layout Shift (CLS = 0)
- **Surfaces & Glass Acrylics**:
  - App Canvas Base: `#0E1117` with an ultra-subtle radial top spotlight (`radial-gradient(900px circle at 50% 0%, rgba(56, 189, 248, 0.06), transparent 70%)`).
  - Floating Studio Islands: `rgba(22, 27, 38, 0.78)` with `backdrop-filter: blur(24px) saturate(180%)`, `rounded-2xl` (`16px` radius), `1px solid rgba(255, 255, 255, 0.08)` outer border, and a macOS top-edge specular inner highlight (`box-shadow: inset 0 1px 0 0 rgba(255, 255, 255, 0.12), 0 16px 36px -12px rgba(0, 0, 0, 0.5)`).
  - Elevated cockpit panels: `#161B26` / `rgba(22, 27, 38, 0.78)`.
  - Interactive cards & hover states: `rgba(30, 38, 54, 0.6)`.
  - Hairline borders: `1px solid rgba(255, 255, 255, 0.08)`.
  - Specular edge highlights: `1px solid rgba(255, 255, 255, 0.12)`.
- **Eye-Comfort Semantic Accents**:
  - **Primary Focus / Active Pointer**: Soft Sky Blue (`#38BDF8` / `#0EA5E9`).
  - **Optimal Path / Passing State**: Sage Mint Emerald (`#34D399` / `#10B981`).
  - **Counterexample Divergence / Sabotage**: Warm Coral Rose (`#FB7185` / `#F43F5E`).
  - **Queue / Speculative State**: Warm Amber (`#FBBF24`).
  - **Expert Tier Accent**: Indigo (`#6366F1`).
- **Typography**:
  - UI Controls: `Inter` or `Geist Sans`.
  - Telemetry / Engine: `JetBrains Mono` or `Geist Mono` for code blocks, bitmasks, complexity badges ($O(N)$, $O(1)$), countdown timers, and Elo values.
- **Zero Layout Shift (CLS = 0)**:
  - Every asynchronous boundary and loading state must use an exact-geometry shimmer skeleton matching the final rendered component's pixel height and width.
  - Dynamic content must never push, reflow, or shift adjacent UI elements.

---

## 3. 60 FPS Canvas & Frontend Speed Architecture
- **Zero React Re-renders During Animation**:
  - **NEVER** store animation frame indices, step counters, or execution trace arrays in React `useState` during playback.
  - Hold the execution trace buffer in a mutable `useRef`.
  - Drive HTML5 Canvas rendering strictly via `requestAnimationFrame` with proper `window.devicePixelRatio` scaling so that React re-renders remain at **0** during 60 FPS playback.
- **Monaco Editor Bundle Preloading**:
  - Preload the Monaco Editor bundle asynchronously via `next/dynamic` (`ssr: false`) while users are on `/lobby` or `/profile`.
  - Navigating to `/arena/[matchId]` must present zero Monaco loading spinners or layout delays.
- **Client Draft Persistence**:
  - Persist in-progress code drafts keyed by `(matchId, problemId)` to IndexedDB via `idb-keyval` on a debounced 150ms keystroke listener.
  - Unintended browser refreshes or disconnects must never lose user code.

---

## 4. Web Worker Sandbox & Execution Safety
- **Untrusted Code Isolation**:
  - **NEVER** execute user submissions or adversarial inputs on the main UI thread.
  - **NEVER** execute user submissions inside Vercel serverless functions with raw `eval()`.
- **Client-Side Judge Worker**:
  - Execute all submissions and adversarial hack inputs in a dedicated Web Worker (`src/workers/judge.worker.ts`).
  - **TLE Kill Switch**: Enforce a strict 500ms execution timeout via `worker.terminate()`.
  - **OOM Protection**: Enforce a hard cap of 500 trace frames per execution to prevent Out-Of-Memory crashes.

---

## 5. Supabase Security, RLS & Atomic Concurrency
- **Test Case Security**:
  - Split test cases into public samples (`problems.public_samples`) and secret judge tests (`problem_secret_tests`).
  - Lock down `problem_secret_tests` with strict Row-Level Security (RLS) policies so client-side `anon` / `authenticated` roles cannot query hidden tests.
  - Access secret test cases exclusively through `SECURITY DEFINER` PL/pgSQL RPCs or server-side routes using `service_role`.
- **Atomic Matchmaking & Settlement**:
  - All matchmaking queue pairing logic and match Elo settlements **MUST** execute inside atomic PostgreSQL PL/pgSQL RPC functions.
  - Use `SELECT ... FOR UPDATE` and `SKIP LOCKED` to eliminate race conditions and avoid double-matching or concurrent settlement corruption.

