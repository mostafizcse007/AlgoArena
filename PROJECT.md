# Project: AlgoArena Match Header Operations Counter

## Architecture
- **Component**: `src/components/arena/ArenaCockpitClient.tsx`
  - Top Broadcast HUD header bar (`<header>` element):
    - Left Zone: Player 1 (@username, elo badge, tests passed, operations counter with tooltip)
    - Center Zone: Match countdown clock
    - Right Zone: Opponent / Bot (@username, bot badge, tests passed, layout mode, audio toggle)
  - Execution Pipeline:
    - `handleRunTrace`: runs public samples via `runJudge`
    - `handleSubmitCode`: runs public + secret tests via `runJudge`
    - State: `liveOps` tracks operations count of last execution
  - Post-Match Modal: `AfterActionReportModal` displaying `operationsCount`
- **Canvas Visualizer Fix**: `src/components/canvas/DualTraceVisualizer.tsx`
  - Add missing `useMemo` import from 'react' to resolve ReferenceError in arena cockpit.
- **Testing**: `scripts/verify-operations-counter.js`
  - Playwright E2E automation verifying initial state (0 ops), idle stability, hover tooltip text, post-run updates, and oracle isolation.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Initial Counter 0 Ops | Operations counter next to player name starts at 0 before execution; remove random interval | M1 | ORIGINAL_REQUEST §R1 |
| 2 | Last Run Ops Tracking | Operations counter updates only after a run to count operations of the player's last execution | M1 | ORIGINAL_REQUEST §R2 |
| 3 | Exact Tooltip Text | Hovering over operations counter displays exact tooltip text "Operations executed in your last run" | M1 | ORIGINAL_REQUEST §R2 |
| 4 | Oracle Counter Handling | Confirmed counter is Player 1 ops, isolated from opponent/oracle telemetry | M1 | ORIGINAL_REQUEST §R3 |
| 5 | Automated Verification | Automated Playwright test verifying 0 ops initial, stable idle, tooltip text, and post-run update | M1 | ORIGINAL_REQUEST §Verification |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Operations Counter Fix & Automated Verification | `ArenaCockpitClient.tsx`, `scripts/verify-operations-counter.js`, `package.json`, `DualTraceVisualizer.tsx` (import fix) | none | IN_PROGRESS |

## Interface Contracts
### ArenaCockpitClient ↔ Runner Traces
- `JudgeResult.results`: array of `JudgeTestResult`
- Operations count computed as `results.reduce((acc, t) => acc + (t.traces?.length || 0), 0)`
- `liveOps` state initialized to `0`, updated only upon completion of `handleRunTrace` or `handleSubmitCode`.
- Tooltip: `title="Operations executed in your last run"` and macOS studio glass hover card with exact text `"Operations executed in your last run"`.

## Code Layout
- `src/components/arena/ArenaCockpitClient.tsx`: Match header UI, execution triggers, state management
- `src/components/canvas/DualTraceVisualizer.tsx`: Fix missing `useMemo` import
- `scripts/verify-operations-counter.js`: Automated Playwright test suite
- `package.json`: NPM test script definition
