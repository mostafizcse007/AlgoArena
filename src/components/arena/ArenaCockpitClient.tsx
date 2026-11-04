'use client';

import React, { useState, useEffect, useRef, useCallback, useSyncExternalStore } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { get, set } from 'idb-keyval';
import {
  Play,
  Send,
  ShieldAlert,
  Clock,
  Tv,
  CheckCircle2,
  XCircle,
  Loader2,
  Zap,
  Code,
  Columns,
  Maximize2,
  Volume2,
  VolumeX,
  Copy,
  Check,
  PanelRightClose,
  Bot,
  Lock,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { DualTraceVisualizer } from '@/components/canvas/DualTraceVisualizer';
import { DAWScrubber } from '@/components/canvas/DAWScrubber';
import { SabotageDrawer } from '@/components/arena/SabotageDrawer';
import { AfterActionReportModal } from '@/components/arena/AfterActionReportModal';
import { runJudge } from '@/lib/judge/runner';
import { getTier } from '@/lib/tier';
import { playPass, playFail, playVictory, playDefeat, playHack, toggleMute, useIsMuted } from '@/lib/audio/sfx';
import { useEditorSettings } from '@/lib/settings/editorSettings';
import { useToast } from '@/components/ui/Toast';
import { getBlankStarterCode } from '@/lib/judge/starterCode';
import { profileStore } from '@/lib/stores/useProfileStore';
import type { Match, ProblemEvalBundle, TraceFrame, JudgeResult } from '@/lib/types/arena';

// Canonical Multi-Step Graph Divergence Trace for Demos & Sabotage
const DIVERGENCE_TRACES: TraceFrame[] = [
  { step: 0, type: 'POINTER_MOVE', description: 'Counterexample loaded: V=5, testing shortest path from 0 to 4', activeNodes: [0], visitedNodes: [] },
  { step: 1, type: 'VISIT_NODE', description: 'Start node 0 explored. Incident edges: (0->1, w=1), (0->2, w=2)', activeNodes: [0], visitedNodes: [0] },
  { step: 2, type: 'UPDATE_DIST', description: 'Greedy candidate greedily hops to node 1 with immediate smallest weight 1', activeNodes: [1], visitedNodes: [0, 1] },
  { step: 3, type: 'UPDATE_DIST', description: 'Oracle relaxes node 2 with weight 2 and keeps searching optimal frontier', activeNodes: [2], visitedNodes: [0, 2] },
  { step: 4, type: 'VISIT_NODE', description: 'Greedy forced along edge 1 -> 4 with heavy penalty weight 19 (total = 20)', activeNodes: [1, 4], visitedNodes: [0, 1, 4], isDivergence: true },
  { step: 5, type: 'DIVERGENCE', description: 'Divergence detected: Oracle finds path 0->2->3->4 with total weight 6 vs Greedy 20!', activeNodes: [2, 3, 4], visitedNodes: [0, 2, 3, 4], isDivergence: true },
  { step: 6, type: 'RETURN', description: 'Counterexample confirmed: Opponent returned 20 vs Oracle 6. Hack successful!', activeNodes: [4], visitedNodes: [0, 1, 4], isDivergence: true },
];

// Layout Switcher Presets: Editor takes primary visual weight (~46% in Balanced mode)
type LayoutModeId = 'code_focus' | 'balanced' | 'canvas_theater';
const LAYOUT_PRESETS: Record<LayoutModeId, [number, number, number]> = {
  code_focus: [22, 56, 22],
  balanced: [24, 46, 30],
  canvas_theater: [18, 32, 50],
};

const LAYOUT_MODES = [
  { id: 'code_focus' as const, label: 'Code focus', shortcut: '1', icon: <Code className="w-3 h-3" /> },
  { id: 'balanced' as const, label: 'Balanced', shortcut: '2', icon: <Columns className="w-3 h-3" /> },
  { id: 'canvas_theater' as const, label: 'Canvas theater', shortcut: '3', icon: <Maximize2 className="w-3 h-3" /> },
];

// Dynamic Monaco Editor import with local bundle configuration (Rule 3)
import { loader } from '@monaco-editor/react';

if (typeof window !== 'undefined') {
  loader.config({ paths: { vs: '/monaco/vs' } });
}

const Editor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

const emptySubscribe = () => () => {};

function detectIsMac(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const uaDataPlatform = (navigator as { userAgentData?: { platform?: string } }).userAgentData?.platform;
  if (typeof uaDataPlatform === 'string' && uaDataPlatform.length > 0) {
    if (/mac/i.test(uaDataPlatform)) return true;
    if (/win|linux|android/i.test(uaDataPlatform)) return false;
  }
  const platform = navigator.platform || '';
  const userAgent = navigator.userAgent || '';
  return /Mac|iPhone|iPod|iPad/i.test(platform) || /Macintosh|Mac OS X|iPhone|iPod|iPad/i.test(userAgent);
}

interface ArenaCockpitClientProps {
  initialMatch: Match;
  evalBundle: ProblemEvalBundle;
  currentUserId: string;
  isSpectator?: boolean;
  durationSeconds?: number;
}

export function ArenaCockpitClient({
  initialMatch,
  evalBundle,
  currentUserId,
  isSpectator = false,
  durationSeconds = 900,
}: ArenaCockpitClientProps) {
  const router = useRouter();
  const matchId = initialMatch.id;
  const problemId = evalBundle.id;

  const isMac = useSyncExternalStore(
    emptySubscribe,
    detectIsMac,
    () => false
  );

  const { showToast } = useToast();
  const isCompetitiveMode = (initialMatch.mode as string) === 'ranked' || initialMatch.mode === 'ranked_1v1';
  const publicTestCount = evalBundle.public_samples?.length || 0;
  const secretTestCount = evalBundle.secret_tests?.length || 0;
  const totalAllTestCount = publicTestCount + secretTestCount;

  const [match, setMatch] = useState<Match>(initialMatch);
  const [code, setCode] = useState<string>(() => getBlankStarterCode(evalBundle));

  // Layout mode state
  const [layoutMode, setLayoutMode] = useState<LayoutModeId>('balanced');
  const [paneWidths, setPaneWidths] = useState<[number, number, number]>(LAYOUT_PRESETS.balanced);
  const splitContainerRef = useRef<HTMLDivElement | null>(null);
  const isDraggingHandleRef = useRef<0 | 1 | null>(null);
  const dragStartXRef = useRef<number>(0);
  const initialWidthsRef = useRef<[number, number, number]>([24, 46, 30]);

  // Collapsible Trace Panel state
  const [isTraceCollapsed, setIsTraceCollapsed] = useState<boolean>(false);
  const [mobileTab, setMobileTab] = useState<'problem' | 'code' | 'trace'>('code');

  // Editor cursor & document telemetry state
  const [cursorPos, setCursorPos] = useState<{ line: number; col: number }>({ line: 1, col: 1 });
  const [copiedSampleId, setCopiedSampleId] = useState<number | string | null>(null);

  // Sabotage Drawer & 20s Cooldown timer between consecutive sabotage attempts
  const [isSabotageOpen, setIsSabotageOpen] = useState(false);
  const [sabotageCooldown, setSabotageCooldown] = useState<number>(0);

  useEffect(() => {
    if (sabotageCooldown <= 0) return;
    const interval = setInterval(() => {
      setSabotageCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [sabotageCooldown]);

  // Execution & Judge State
  const [runningTrace, setRunningTrace] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [judgeResult, setJudgeResult] = useState<JudgeResult | null>(null);

  // Single shared test evaluation state for editor header badge, toast, and status line
  const [testEvaluationState, setTestEvaluationState] = useState<{
    passedCount: number;
    totalCount: number;
    hasRun: boolean;
  }>({
    passedCount: 0,
    totalCount: publicTestCount,
    hasRun: false,
  });

  // Measured ops from last run & preset tag metadata (User solution never claims Big-O)
  const [lastRunOps, setLastRunOps] = useState<number | null>(null);
  const [activePresetTag, setActivePresetTag] = useState<string | null>(null);
  const loadedPresetCodeRef = useRef<string | null>(null);

  // Active test sample selection, run lifecycle, and loaded preset
  const [selectedSampleIndex, setSelectedSampleIndex] = useState<number>(0);
  const [hasRun, setHasRun] = useState<boolean>(false);
  const [loadedPreset, setLoadedPreset] = useState<'Greedy' | 'Optimal' | null>(null);

  // Traces for Canvas
  const [userTraces, setUserTraces] = useState<TraceFrame[]>([]);
  const [oracleTraces] = useState<TraceFrame[]>([]);
  const [currentCanvasFrame, setCurrentCanvasFrame] = useState(0);
  const [divergenceFrameIdx, setDivergenceFrameIdx] = useState<number | undefined>(undefined);

  // Post-Match After-Action Report Modal State
  const [isAAROpen, setIsAAROpen] = useState(false);
  const [aarReason, setAarReason] = useState<'tests_passed' | 'successful_hack' | 'spectator_demo'>('tests_passed');
  const [aarEloDelta, setAarEloDelta] = useState(18);

  // Spectator / Projector Mode state
  const [spectatorActive, setSpectatorActive] = useState<boolean>(isSpectator);

  // Deterministic Countdown timer (strictly initializes with 900s to eliminate Next.js 16 prerender warning)
  const [remainingSeconds, setRemainingSeconds] = useState<number>(durationSeconds ?? 900);

  // Live telemetry OPS counter
  const [liveOps, setLiveOps] = useState<number>(0);

  // 45s Presence Disconnect Timer
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);
  const [disconnectCountdown, setDisconnectCountdown] = useState<number>(45);

  // Segmented Test Progress
  const [myPassCount, setMyPassCount] = useState<number>(0);
  const [opponentPassCount, setOpponentPassCount] = useState<number>(0);
  const muted = useIsMuted();
  const editorSettings = useEditorSettings();

  // Monaco editor instance and line decorations
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editorRef = useRef<any>(null);
  const decorationsRef = useRef<string[]>([]);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Switch layout mode and animate widths
  const handleSelectLayoutMode = (mode: LayoutModeId) => {
    setLayoutMode(mode);
    setPaneWidths(LAYOUT_PRESETS[mode]);
  };

  // Reset pane widths on double click of resize handle
  const handleResetPaneWidths = () => {
    setPaneWidths(LAYOUT_PRESETS[layoutMode]);
  };

  // Mouse drag handler for pill-shaped resize handles
  const handleMouseDownHandle = (handleIndex: 0 | 1, e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingHandleRef.current = handleIndex;
    dragStartXRef.current = e.clientX;
    initialWidthsRef.current = [...paneWidths];

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (isDraggingHandleRef.current === null || !splitContainerRef.current) return;
      const containerWidth = splitContainerRef.current.getBoundingClientRect().width;
      if (containerWidth <= 0) return;

      const deltaX = moveEvent.clientX - dragStartXRef.current;
      const deltaPct = (deltaX / containerWidth) * 100;
      const [w0, w1, w2] = initialWidthsRef.current;

      if (isDraggingHandleRef.current === 0) {
        // Resizing between Left (0) and Center (1)
        const newW0 = Math.min(Math.max(16, w0 + deltaPct), 45);
        const diff = newW0 - w0;
        const newW1 = Math.max(20, w1 - diff);
        setPaneWidths([newW0, newW1, w2]);
      } else if (isDraggingHandleRef.current === 1) {
        // Resizing between Center (1) and Right (2)
        const newW1 = Math.min(Math.max(20, w1 + deltaPct), 65);
        const diff = newW1 - w1;
        const newW2 = Math.max(20, w2 - diff);
        setPaneWidths([w0, newW1, newW2]);
      }
    };

    const handleMouseUp = () => {
      isDraggingHandleRef.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // IndexedDB Draft Persistence (150ms debounce - Rule 3)
  useEffect(() => {
    const draftKey = `draft:${matchId}:${problemId}`;
    get(draftKey).then((savedDraft) => {
      if (savedDraft && typeof savedDraft === 'string' && savedDraft.trim().length > 0) {
        setCode(savedDraft);
        if (savedDraft.trim() === evalBundle.buggy_sabotage_code.trim()) {
          loadedPresetCodeRef.current = evalBundle.buggy_sabotage_code;
          setActivePresetTag('Preset: Greedy Suboptimal');
          setLastRunOps(14);
        } else if (savedDraft.trim() === evalBundle.oracle_solution.trim()) {
          loadedPresetCodeRef.current = evalBundle.oracle_solution;
          setActivePresetTag(
            evalBundle.metadata?.algorithm
              ? `Preset: ${evalBundle.metadata.algorithm}`
              : 'Preset: Canonical Dijkstra'
          );
          setLastRunOps(24);
        } else {
          loadedPresetCodeRef.current = null;
          setActivePresetTag(null);
        }
      } else {
        const blank = getBlankStarterCode(evalBundle);
        setCode(blank);
        loadedPresetCodeRef.current = null;
        setActivePresetTag(null);
        if (editorRef.current) {
          editorRef.current.setValue?.(blank);
        }
      }
    });
  }, [matchId, problemId, evalBundle.buggy_sabotage_code, evalBundle.oracle_solution, evalBundle.metadata?.algorithm, evalBundle.category, evalBundle.starter_code]);

  // Reset active state when problem changes (adjusting state during render per React Compiler standard)
  const [prevProblemId, setPrevProblemId] = useState(problemId);
  if (problemId !== prevProblemId) {
    setPrevProblemId(problemId);
    setSelectedSampleIndex(0);
    setHasRun(false);
    setLoadedPreset(null);
    setUserTraces([]);
    setJudgeResult(null);
    setCurrentCanvasFrame(0);
    setDivergenceFrameIdx(undefined);
    const blank = getBlankStarterCode(evalBundle);
    setCode(blank);
    setTestEvaluationState({
      passedCount: 0,
      totalCount: publicTestCount,
      hasRun: false,
    });
  }

  const handleCodeChange = (newCode?: string) => {
    const val = newCode || '';
    setCode(val);

    // Clear preset tag and ref as soon as code is modified from preset
    if (loadedPreset !== null) {
      setLoadedPreset(null);
    }
    if (loadedPresetCodeRef.current !== null && val.trim() !== loadedPresetCodeRef.current.trim()) {
      loadedPresetCodeRef.current = null;
      setActivePresetTag(null);
    }

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      const draftKey = `draft:${matchId}:${problemId}`;
      set(draftKey, val);
    }, 150);
  };

  // Server-Synced Countdown Clock (strictly computes Date.now() deltas inside useEffect interval on client)
  useEffect(() => {
    const timer = setInterval(() => {
      if (match.ends_at) {
        const ends = new Date(match.ends_at).getTime();
        const diff = Math.floor((ends - Date.now()) / 1000);
        if (diff > 0) {
          setRemainingSeconds(diff);
          return;
        }
      }
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          return 900;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [match.ends_at]);

  // Highlight Active Line in Monaco with soft sky-blue translucent bar on frame change
  useEffect(() => {
    if (!editorRef.current) return;
    const editor = editorRef.current;
    const model = editor.getModel?.();
    if (!model) return;

    const lineCount = model.getLineCount();
    // Step through solution lines as frame advances
    const activeLine = Math.min(Math.max(1, (currentCanvasFrame % 8) + 2), lineCount);

    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, [
      {
        range: {
          startLineNumber: activeLine,
          startColumn: 1,
          endLineNumber: activeLine,
          endColumn: 1,
        },
        options: {
          isWholeLine: true,
          className: 'monaco-active-line-highlight',
        },
      },
    ]);
  }, [currentCanvasFrame]);

  // Supabase Realtime Broadcast & Presence
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`arena:${matchId}`, {
      config: { presence: { key: currentUserId } },
    });

    channel
      .on('broadcast', { event: 'test_progress' }, (payload) => {
        if (payload.payload.playerId !== currentUserId) {
          setOpponentPassCount(payload.payload.passed);
        }
      })
      .on('broadcast', { event: 'match_settled' }, (payload) => {
        if (payload.payload.winnerId === currentUserId) {
          playVictory();
        } else {
          playDefeat();
        }
        setMatch((prev) => ({ ...prev, status: 'completed', winner_id: payload.payload.winnerId }));
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const userIds = Object.keys(state);
        const opponentId = match.player1_id === currentUserId ? match.player2_id : match.player1_id;

        if (opponentId && !userIds.includes(opponentId)) {
          setOpponentDisconnected(true);
        } else {
          setOpponentDisconnected(false);
          setDisconnectCountdown(45);
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ online_at: 'active' });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, currentUserId, match.player1_id, match.player2_id]);

  // 45s Disconnect Countdown Timer
  useEffect(() => {
    if (!opponentDisconnected) return;
    const interval = setInterval(async () => {
      setDisconnectCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          const supabase = createClient();
          supabase.rpc('settle_match', {
            p_match_id: matchId,
            p_winner_id: currentUserId,
            p_reason: 'opponent_forfeit_disconnect',
            p_category: evalBundle.category,
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [opponentDisconnected, matchId, currentUserId, evalBundle.category]);

  // Run Trace against public samples inside Web Worker Sandbox
  const handleRunTrace = useCallback(async () => {
    setRunningTrace(true);
    setJudgeResult(null);

    const testSet = evalBundle.public_samples.map((s) => ({
      id: s.id,
      input: s.input,
      expected_output: s.expected_output,
    }));

    const result = await runJudge(code, testSet, evalBundle.category);
    setRunningTrace(false);
    setJudgeResult(result);
    setHasRun(true);

    const totalOps = result.measuredOps ?? (result.results ? result.results.reduce((sum, r) => sum + (r.traces?.length || 0), 0) : 0);
    setLastRunOps(totalOps);
    setLiveOps(totalOps);

    // Synchronize test execution count between toast and editor header badge
    setTestEvaluationState({
      passedCount: result.testsPassed,
      totalCount: result.totalTests,
      hasRun: true,
    });
    setMyPassCount(result.testsPassed);

    showToast(
      `${result.testsPassed} / ${result.totalTests} passed`,
      result.status === 'passed' ? 'success' : 'error'
    );

    if (result.status === 'passed') {
      playPass();
    } else {
      playFail();
    }

    if (result.results && result.results.length > 0) {
      const activeTest = result.results[selectedSampleIndex] || result.firstFailingTest || result.results[0];
      setUserTraces(activeTest.traces || []);

      if (!activeTest.passed) {
        setDivergenceFrameIdx(Math.max(0, (activeTest.traces?.length || 1) - 2));
      } else {
        setDivergenceFrameIdx(undefined);
      }
      setCurrentCanvasFrame(0);
    }
  }, [code, evalBundle.category, evalBundle.public_samples, selectedSampleIndex, showToast]);

  const handleSelectSample = (idx: number) => {
    setSelectedSampleIndex(idx);
    if (hasRun && judgeResult?.results && judgeResult.results[idx]) {
      const targetTest = judgeResult.results[idx];
      setUserTraces(targetTest.traces || []);
      if (!targetTest.passed) {
        setDivergenceFrameIdx(Math.max(0, (targetTest.traces?.length || 1) - 2));
      } else {
        setDivergenceFrameIdx(undefined);
      }
      setCurrentCanvasFrame(0);
    }
  };

  // Submit Solution against public samples + secret judge tests
  const handleSubmitCode = useCallback(async () => {
    setSubmitting(true);

    const allTests = [
      ...evalBundle.public_samples.map((s) => ({ id: `pub_${s.id}`, input: s.input, expected_output: s.expected_output })),
      ...evalBundle.secret_tests.map((s) => ({ id: `sec_${s.id}`, input: s.input, expected_output: s.expected_output })),
    ];

    // In Ranked mode, reject instant submissions if normalized code is an unmodified copy of stored reference solutions
    const normalizeCode = (src: string) => src.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '').replace(/\s+/g, ' ').trim();
    if (isCompetitiveMode) {
      const normCode = normalizeCode(code);
      const normOracle = normalizeCode(evalBundle.oracle_solution);
      const normGreedy = normalizeCode(evalBundle.buggy_sabotage_code);
      if (normCode === normOracle || normCode === normGreedy) {
        setSubmitting(false);
        playFail();
        showToast('Instant submission rejected: Unmodified copy of reference solution is prohibited in Ranked matches.', 'error');
        setJudgeResult({
          status: 'failed',
          testsPassed: 0,
          totalTests: allTests.length,
          executionTimeMs: 0,
          results: [],
          error: 'Submission rejected: Unmodified copy of problem reference solution detected. Please implement your own solution.',
        });
        return;
      }
    }

    const result = await runJudge(code, allTests, evalBundle.category);
    setSubmitting(false);
    setJudgeResult(result);
    setHasRun(true);

    const totalOps = result.measuredOps ?? (result.results ? result.results.reduce((sum, r) => sum + (r.traces?.length || 0), 0) : 0);
    setLastRunOps(totalOps);
    setLiveOps(totalOps);

    // Synchronize test execution count between toast and editor header badge
    setTestEvaluationState({
      passedCount: result.testsPassed,
      totalCount: result.totalTests,
      hasRun: true,
    });
    setMyPassCount(result.testsPassed);

    showToast(
      `${result.testsPassed} / ${result.totalTests} passed`,
      result.status === 'passed' ? 'success' : 'error'
    );

    const supabase = createClient();
    supabase.channel(`arena:${matchId}`).send({
      type: 'broadcast',
      event: 'test_progress',
      payload: { playerId: currentUserId, passed: result.testsPassed, total: allTests.length },
    });

    if (result.status === 'passed') {
      playVictory();

      const { data: settleRes } = await supabase.rpc('settle_match', {
        p_match_id: matchId,
        p_winner_id: currentUserId,
        p_reason: 'tests_passed',
        p_replay_trace: userTraces,
        p_category: evalBundle.category,
      });

      const delta = isCompetitiveMode ? (settleRes?.player1_delta ?? 18) : 0;
      setAarEloDelta(delta);
      setAarReason('tests_passed');
      setIsAAROpen(true);

      if (isCompetitiveMode && settleRes?.new_elo1) {
        profileStore.updateElo(settleRes.new_elo1, settleRes.new_peak_elo1);
        window.dispatchEvent(
          new CustomEvent('algoarena:profile_updated', {
            detail: { elo: settleRes.new_elo1, peakElo: settleRes.new_peak_elo1 },
          })
        );
      }

      setMatch((prev) => ({ ...prev, status: 'completed', winner_id: currentUserId }));
    } else {
      playFail();
    }
  }, [code, currentUserId, evalBundle.category, evalBundle.public_samples, evalBundle.secret_tests, evalBundle.oracle_solution, evalBundle.buggy_sabotage_code, isCompetitiveMode, matchId, userTraces, showToast]);

  // Keyboard Shortcuts (Cmd/Ctrl + Enter, Cmd/Ctrl + Shift + S, Cmd/Ctrl + Shift + H, 1/2/3 Layout switch)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      if (isCmdOrCtrl && e.key === 'Enter') {
        e.preventDefault();
        handleRunTrace();
        return;
      } else if (isCmdOrCtrl && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSubmitCode();
        return;
      } else if (isCmdOrCtrl && e.shiftKey && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        if (sabotageCooldown > 0) {
          showToast(`Sabotage is on cooldown (${sabotageCooldown}s remaining)`, 'error');
          return;
        }
        setIsSabotageOpen((prev) => !prev);
        return;
      }

      // Check if typing inside input, textarea, or Monaco editor
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable ||
          Boolean(target.closest('.monaco-editor')));

      if (!isInput && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (e.key === '1') {
          e.preventDefault();
          handleSelectLayoutMode('code_focus');
        } else if (e.key === '2') {
          e.preventDefault();
          handleSelectLayoutMode('balanced');
        } else if (e.key === '3') {
          e.preventDefault();
          handleSelectLayoutMode('canvas_theater');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRunTrace, handleSubmitCode, sabotageCooldown, showToast]);

  // Starter Code Loader (Blank, Greedy example, Optimal example)
  const handleLoadPreset = (preset: 'blank' | 'buggy' | 'optimal') => {
    // Lock down Greedy & Optimal presets in competitive matches
    if (isCompetitiveMode && (preset === 'buggy' || preset === 'optimal')) {
      showToast('Solution presets are disabled in competitive Ranked matches.', 'error');
      return;
    }

    let targetCode = '';
    if (preset === 'blank') {
      targetCode = getBlankStarterCode(evalBundle);
      setCode(targetCode);
      loadedPresetCodeRef.current = null;
      setLoadedPreset(null);
      setActivePresetTag(null);
    } else if (preset === 'buggy') {
      targetCode = evalBundle.buggy_sabotage_code;
      setCode(targetCode);
      loadedPresetCodeRef.current = targetCode;
      setLoadedPreset('Greedy');
      setActivePresetTag('Preset: Greedy Suboptimal');
      playFail();
    } else {
      targetCode = evalBundle.oracle_solution;
      setCode(targetCode);
      loadedPresetCodeRef.current = targetCode;
      setLoadedPreset('Optimal');
      setActivePresetTag(
        evalBundle.metadata?.algorithm
          ? `Preset: ${evalBundle.metadata.algorithm}`
          : 'Preset: Canonical Dijkstra'
      );
      playPass();
    }
    const draftKey = `draft:${matchId}:${problemId}`;
    set(draftKey, targetCode);
    if (editorRef.current) {
      editorRef.current.setValue?.(targetCode);
    }
  };

  // Copy sample input to clipboard with feedback
  const handleCopySampleInput = (sampleId: number | string, input: unknown) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(JSON.stringify(input, null, 2));
      setCopiedSampleId(sampleId);
      setTimeout(() => setCopiedSampleId(null), 1500);
    }
  };

  // Toggle Spectator / Projector Mode
  const handleToggleSpectator = () => {
    const next = !spectatorActive;
    setSpectatorActive(next);
    router.push(`/arena/${matchId}?view=${next ? 'spectator' : 'player'}`);
  };

  // 1-Click Trigger Live Sabotage in Spectator Mode (Unrated)
  const handleTriggerSpectatorSabotage = () => {
    setUserTraces(DIVERGENCE_TRACES);
    setDivergenceFrameIdx(4);
    playHack();
    playVictory();
    setAarReason('spectator_demo');
    setAarEloDelta(0);
    setIsAAROpen(true);
    setMatch((prev) => ({ ...prev, status: 'completed', winner_id: match.player1_id }));
  };

  // Handle successful sabotage from drawer
  const handleSabotageSuccess = async (
    advInput: Record<string, unknown>,
    oracleOut: unknown,
    defenderOut: unknown
  ) => {
    setUserTraces(DIVERGENCE_TRACES);
    setDivergenceFrameIdx(4);
    playHack();

    const supabase = createClient();

    await supabase.from('match_hacks').insert({
      match_id: matchId,
      attacker_id: currentUserId,
      defender_id: match.player1_id === currentUserId ? (match.player2_id || currentUserId) : match.player1_id,
      adversarial_input: advInput,
      result: 'successful_hack',
      attacker_oracle_output: oracleOut,
      defender_output: defenderOut,
    });

    const { data: settleRes } = await supabase.rpc('settle_match', {
      p_match_id: matchId,
      p_winner_id: currentUserId,
      p_reason: 'successful_hack',
      p_replay_trace: DIVERGENCE_TRACES,
      p_category: evalBundle.category,
    });

    const delta = isCompetitiveMode ? (settleRes?.player1_delta ?? 24) : 0;
    setAarEloDelta(delta);
    setAarReason('successful_hack');
    setIsAAROpen(true);

    if (isCompetitiveMode && settleRes?.new_elo1) {
      profileStore.updateElo(settleRes.new_elo1, settleRes.new_peak_elo1);
      window.dispatchEvent(
        new CustomEvent('algoarena:profile_updated', {
          detail: { elo: settleRes.new_elo1, peakElo: settleRes.new_peak_elo1 },
        })
      );
    }

    playVictory();
    setMatch((prev) => ({ ...prev, status: 'completed', winner_id: currentUserId }));
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Live Tab Title Telemetry: Dynamic countdown clock + vs handles (Feature 3)
  useEffect(() => {
    const p1 = match.player1?.username || 'antu';
    const p2 = match.player2?.username || 'Instant_Demo';
    const formatted = formatTimer(remainingSeconds);
    document.title = `${formatted} · @${p1} vs @${p2} | AlgoArena`;

    return () => {
      document.title = 'AlgoArena: 1v1 coding duels';
    };
  }, [remainingSeconds, match.player1?.username, match.player2?.username]);

  const activeSample = evalBundle.public_samples?.[selectedSampleIndex] ?? evalBundle.public_samples?.[0];
  const graphInput = React.useMemo(() => {
    if (!activeSample?.input || typeof activeSample.input !== 'object') return undefined;
    const inp = activeSample.input as { V?: number; edges?: number[][] };
    return {
      V: typeof inp.V === 'number' ? inp.V : undefined,
      edges: Array.isArray(inp.edges) ? inp.edges : undefined,
    };
  }, [activeSample]);

  const userTitle = loadedPreset ? `Your Solution (${loadedPreset})` : 'Your Solution';
  const totalTraceFrames = Math.max(userTraces.length, oracleTraces.length);

  return (
    <div className="flex-1 flex flex-col h-screen max-h-screen overflow-hidden bg-[#0B0D12]">
      {/* ===================================================================
         TOP BROADCAST HUD: 3-ZONE BAR (h-12 border-b border-white/[0.07] bg-[#11141C] px-4)
         =================================================================== */}
      <header className="relative h-12 border-b border-white/[0.07] bg-[#11141C] px-4 flex items-center justify-between select-none z-20 shrink-0 gap-3">
        {/* Left Zone: Player 1 (@antu) */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-6 h-6 rounded-md bg-white/[0.05] border border-white/[0.08] flex items-center justify-center font-mono font-semibold text-xs text-[#F3F4F6] shrink-0 overflow-hidden">
            {match.player1?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={match.player1.avatar_url}
                alt={match.player1.username || 'P1'}
                className="w-full h-full object-cover"
              />
            ) : match.player1?.username ? (
              match.player1.username[0]?.toUpperCase()
            ) : (
              'A'
            )}
          </div>

          <span className="font-semibold text-xs text-[#F3F4F6] whitespace-nowrap shrink-0">
            @{match.player1?.username || 'antu'}
          </span>

          <span className="hidden sm:inline-flex text-xs font-mono tabular-nums px-1.5 py-0.5 rounded bg-white/[0.04] text-[#D1D5DB] border border-white/[0.08] shrink-0 font-medium">
            {getTier(match.player1_elo_before)} {match.player1_elo_before || 1844}
          </span>

          {/* Quiet secondary telemetry */}
          <span className="hidden xl:inline-flex text-xs font-mono tabular-nums text-[#9CA3AF] shrink-0">
            {testEvaluationState.passedCount}/{testEvaluationState.totalCount} tests
          </span>

          <div
            className="relative group hidden lg:flex items-center gap-1 text-xs font-mono tabular-nums text-[#9CA3AF] shrink-0 cursor-default"
            title="Operations executed in your last run"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />
            <strong className="text-sky-300 font-medium">{liveOps}</strong> ops

            {/* macOS Studio Glass Hover Tooltip */}
            <div
              role="tooltip"
              className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-2 hidden group-hover:flex items-center whitespace-nowrap rounded-lg px-2.5 py-1 text-[11px] font-sans font-medium text-[#E5E7EB] bg-[#161B26]/95 backdrop-blur-md border border-white/[0.12] shadow-[0_8px_24px_rgba(0,0,0,0.5)] z-50 transition-opacity"
            >
              Operations executed in your last run
            </div>
          </div>
        </div>

        {/* Center Zone: Large Dominant Countdown Timer (Heartbeat of the Match) */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 pointer-events-none">
          <div className="flex items-center gap-2 px-3.5 py-1 rounded-lg bg-white/[0.03] border border-white/[0.06] pointer-events-auto">
            <Clock className="w-4 h-4 text-sky-400 shrink-0" />
            <span
              className="font-mono tabular-nums text-sm md:text-base font-semibold tracking-tight text-[#F3F4F6]"
              suppressHydrationWarning
            >
              {formatTimer(remainingSeconds)}
            </span>
          </div>

          {opponentDisconnected && (
            <div className="text-xs font-mono tabular-nums text-rose-400 font-bold ml-1 animate-pulse pointer-events-auto">
              DISCONNECT IN {disconnectCountdown}s
            </div>
          )}
        </div>

        {/* Right Zone: Opponent Wing + Audio Toggle + Compact Layout Switcher + Spectator Mode */}
        <div className="flex items-center gap-2.5 min-w-0 justify-end">
          {/* Quiet secondary telemetry */}
          <span className="hidden xl:inline-flex text-xs font-mono tabular-nums text-[#9CA3AF] shrink-0">
            {opponentPassCount}/{testEvaluationState.totalCount} tests
          </span>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="font-semibold text-xs text-[#F3F4F6] whitespace-nowrap">
              @{match.player2?.username || 'Instant Demo'}
            </span>
            {(!match.player2 ||
              match.player2.username === 'Instant Demo' ||
              match.player2.username === 'Instant_Demo' ||
              match.player2.username === 'guest_rival' ||
              match.player2.username === 'shafiq_buet') && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-white/[0.05] border border-white/[0.08] text-[#9CA3AF] font-mono font-medium">
                Bot
              </span>
            )}
          </div>

          <div className="w-6 h-6 rounded-md bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-xs text-[#9CA3AF] shrink-0 overflow-hidden">
            {match.player2?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={match.player2.avatar_url}
                alt={match.player2.username || 'P2'}
                className="w-full h-full object-cover"
              />
            ) : match.player2?.username &&
              match.player2.username !== 'Instant Demo' &&
              match.player2.username !== 'Instant_Demo' &&
              match.player2.username !== 'guest_rival' ? (
              match.player2.username[0]?.toUpperCase()
            ) : (
              <Bot className="w-3.5 h-3.5 text-[#9CA3AF]" />
            )}
          </div>

          <div className="w-[1px] h-3.5 bg-white/[0.08] hidden sm:block" />

          {/* Compact Layout Switcher */}
          <div className="hidden sm:flex items-center bg-[#0B0D12] p-0.5 rounded-lg border border-white/[0.07] shrink-0">
            {LAYOUT_MODES.map((mode) => {
              const isActive = layoutMode === mode.id && !isTraceCollapsed;
              return (
                <button
                  key={mode.id}
                  onClick={() => {
                    setIsTraceCollapsed(false);
                    handleSelectLayoutMode(mode.id);
                  }}
                  className={`p-1.5 rounded-md text-xs transition cursor-pointer flex items-center justify-center ${
                    isActive
                      ? 'bg-white/[0.12] text-white shadow-sm'
                      : 'text-[#9CA3AF] hover:text-white hover:bg-white/[0.04]'
                  }`}
                  title={`${mode.label} (${mode.shortcut})`}
                  aria-label={`${mode.label} (${mode.shortcut})`}
                >
                  {mode.icon}
                </button>
              );
            })}
          </div>

          {/* Audio Toggle */}
          <button
            onClick={() => toggleMute()}
            className="p-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] text-[#9CA3AF] hover:text-white transition cursor-pointer shrink-0"
            title={muted ? 'Unmute Audio' : 'Mute Audio'}
            aria-label={muted ? 'Unmute Audio' : 'Mute Audio'}
            suppressHydrationWarning
          >
            {muted ? (
              <VolumeX className="w-3.5 h-3.5 text-rose-400" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
            )}
          </button>

          {/* Spectator Broadcast Toggle (?view=spectator) */}
          <button
            onClick={handleToggleSpectator}
            className={`p-1.5 rounded-lg border transition-all cursor-pointer flex items-center justify-center shrink-0 ${
              spectatorActive
                ? 'bg-sky-500/15 border-sky-400/40 text-sky-300 shadow-sm'
                : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/[0.08] text-[#9CA3AF] hover:text-white'
            }`}
            title={spectatorActive ? 'Switch to Cockpit View' : 'Switch to Spectator Broadcast (?view=spectator)'}
            aria-label="Toggle spectator view"
          >
            <Tv className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {spectatorActive ? (
        /* ===================================================================
           MACOS BROADCAST PROJECTOR VIEW (?view=spectator)
           =================================================================== */
        <div className="flex-1 h-[calc(100vh-3rem)] min-h-0 px-3 pb-3 pt-1 grid grid-cols-12 gap-2 overflow-hidden">
          {/* Left Column (3 cols): Player 1 Telemetry & Optimal Code */}
          <div className="col-span-12 lg:col-span-3 studio-island flex flex-col h-full min-h-0 overflow-hidden">
            <div className="p-3 border-b border-white/10 bg-black/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-sky-500/20 border border-sky-500/40 flex items-center justify-center font-mono font-bold text-xs text-sky-300 overflow-hidden shrink-0">
                  {match.player1?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={match.player1.avatar_url}
                      alt={match.player1.username || 'P1'}
                      className="w-full h-full object-cover"
                    />
                  ) : match.player1?.username ? (
                    match.player1.username[0]?.toUpperCase()
                  ) : (
                    'P1'
                  )}
                </div>
                <div>
                  <div className="font-mono font-bold text-xs text-white">
                    @{match.player1?.username || 'antu'}
                  </div>
                  <div className="text-xs font-mono text-sky-400">{getTier(match.player1_elo_before)} ({match.player1_elo_before} Elo)</div>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-xs font-mono bg-emerald-500/20 text-[#34D399] border border-emerald-500/40 font-medium">
                6/6 PASSING
              </span>
            </div>

            {/* Test segments */}
            <div className="px-4 py-2 bg-black/20 border-b border-white/[0.06] flex items-center gap-1.5">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex-1 h-1.5 rounded-sm bg-[#34D399]" />
              ))}
            </div>

            {/* Live Read-Only Code View */}
            <div className="flex-1 flex flex-col min-h-0 bg-[#0B0D12]">
              <div className="px-3 py-1.5 bg-black/20 border-b border-white/[0.06] text-xs text-[#9CA3AF] flex items-center justify-between">
                <span className="font-mono">dijkstra_optimal.ts</span>
                <span className="text-[#34D399] font-medium font-sans tabular-nums">{evalBundle.complexity || 'O((V + E) log V)'}</span>
              </div>
              <pre className="flex-1 p-3 font-mono text-xs leading-relaxed text-[#D1D5DB] overflow-y-auto whitespace-pre-wrap select-all">
                {evalBundle.oracle_solution}
              </pre>
            </div>

            {/* Telemetry Footer */}
            <div className="p-3 bg-black/20 border-t border-white/[0.07] font-mono text-xs grid grid-cols-3 gap-2 text-center text-[#9CA3AF]">
              <div className="bg-white/[0.02] p-1.5 rounded-lg border border-white/[0.06]">
                <div className="text-xs text-[#9CA3AF]">EXEC</div>
                <div className="text-white font-medium tabular-nums">14ms</div>
              </div>
              <div className="bg-white/[0.02] p-1.5 rounded-lg border border-white/[0.06]">
                <div className="text-xs text-[#9CA3AF]">MEMORY</div>
                <div className="text-white font-medium tabular-nums">1.2MB</div>
              </div>
              <div className="bg-white/[0.02] p-1.5 rounded-lg border border-white/[0.06]">
                <div className="text-xs text-[#9CA3AF]">TRACE</div>
                <div className="text-[#34D399] font-medium tabular-nums">
                  {hasRun && totalTraceFrames > 0 ? `${currentCanvasFrame + 1} / ${totalTraceFrames}` : '0 / 0'}
                </div>
              </div>
            </div>
          </div>

          {/* Center Column (6 cols): Large Dual-Trace 60 FPS Canvas + DAW Scrubber + Event Log */}
          <div className="col-span-12 lg:col-span-6 studio-island flex flex-col h-full min-h-0 overflow-hidden">
            <div className="flex-1 w-full min-h-0 relative overflow-hidden">
              <DualTraceVisualizer
                userTraces={userTraces}
                oracleTraces={oracleTraces}
                category={evalBundle.category}
                visualizerType={evalBundle.visualizer_type}
                divergenceFrameIndex={divergenceFrameIdx}
                oracleComplexity={evalBundle.complexity || 'O((V + E) log V)'}
                userOps={lastRunOps}
                userPresetTag={activePresetTag}
                onFrameChange={(frame) => setCurrentCanvasFrame(frame)}
                graphInput={graphInput}
                hasRun={hasRun}
                userTitle={userTitle}
                loadedPreset={loadedPreset}
                onRun={handleRunTrace}
              />
            </div>

            <div className="shrink-0 border-t border-white/[0.08]">
              <DAWScrubber
                totalFrames={hasRun ? totalTraceFrames : 0}
                currentFrame={currentCanvasFrame}
                divergenceFrameIndex={divergenceFrameIdx}
              />
            </div>

            {/* Live Battle Event Log */}
            <div className="h-32 bg-black/30 border-t border-white/10 p-3 font-mono text-xs overflow-y-auto flex flex-col gap-1.5">
              <div className="text-xs uppercase font-bold text-slate-400 flex items-center justify-between border-b border-white/5 pb-1">
                <span>Live Esports Broadcast Stream</span>
                <span className="text-[#34D399] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#34D399] animate-ping" />
                  LIVE
                </span>
              </div>
              <div className="text-slate-300 text-xs flex items-center gap-2">
                <span className="text-slate-500">[00:02]</span>
                <span>Match initialized: <strong className="text-white">{evalBundle.title}</strong></span>
              </div>
              <div className="text-[#38BDF8] text-xs flex items-center gap-2">
                <span className="text-slate-500">[00:08]</span>
                <span>@{match.player1?.username || 'antu'} deployed canonical Dijkstra algorithm.</span>
              </div>
              <div className="text-[#FBBF24] text-xs flex items-center gap-2">
                <span className="text-slate-500">[00:15]</span>
                <span>@{match.player2?.username || 'Instant Demo'} deployed Greedy Suboptimal heuristic.</span>
              </div>
              {divergenceFrameIdx !== undefined && (
                <div className="text-[#FB7185] text-xs font-bold flex items-center gap-2 animate-pulse">
                  <span className="text-slate-500">[00:22]</span>
                  <span>CRITICAL DIVERGENCE: Greedy diverged on graph vertex 4 (Cost 20 vs 6)!</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Column (3 cols): Opponent Telemetry & Sabotage Trigger */}
          <div className="col-span-12 lg:col-span-3 studio-island flex flex-col h-full min-h-0 overflow-hidden">
            <div className="p-3 border-b border-white/10 bg-black/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center font-mono font-bold text-xs text-rose-300 overflow-hidden shrink-0">
                  {match.player2?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={match.player2.avatar_url}
                      alt={match.player2.username || 'P2'}
                      className="w-full h-full object-cover"
                    />
                  ) : match.player2?.username ? (
                    match.player2.username[0]?.toUpperCase()
                  ) : (
                    'D'
                  )}
                </div>
                <div>
                  <div className="font-mono font-bold text-xs text-white">
                    @{match.player2?.username || 'Instant Demo'}
                  </div>
                  <div className="text-xs font-mono text-[#9CA3AF]">Challenger ({match.player2_elo_before || 1200} Elo)</div>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-xs font-mono bg-rose-500/20 text-rose-300 border border-rose-500/40 font-medium">
                VULNERABLE
              </span>
            </div>

            <div className="p-3 bg-rose-500/10 border-b border-rose-500/20 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-rose-400">
                <ShieldAlert className="w-4 h-4" />
                <span>ASYMPTOTIC VULNERABILITY</span>
              </div>
              <p className="text-xs text-[#D1D5DB]">
                Greedy makes short-sighted choices and misses the lower multi-hop detour.
              </p>
            </div>

            <div className="flex-1 flex flex-col min-h-0 bg-[#0E1117]/80">
              <div className="px-3 py-1.5 bg-black/30 border-b border-white/5 text-xs font-mono text-[#9CA3AF] flex items-center justify-between">
                <span>greedy_suboptimal.ts</span>
                <span className="text-rose-400">14 ops • Preset: Greedy</span>
              </div>
              <pre className="flex-1 p-3 font-mono text-xs leading-relaxed text-[#D1D5DB] overflow-y-auto whitespace-pre-wrap select-all">
                {evalBundle.buggy_sabotage_code}
              </pre>
            </div>

            <div className="p-3 bg-black/20 border-t border-white/[0.07]">
              <button
                onClick={handleTriggerSpectatorSabotage}
                className="w-full py-2.5 px-3 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 font-medium text-xs flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Zap className="w-4 h-4 text-rose-400" />
                <span>Trigger Live Sabotage Demo</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ===================================================================
           FLOATING 3-ISLAND SPLIT VIEW WITH PILL DRAG HANDLES
           =================================================================== */
        <div
          ref={splitContainerRef}
          className="flex-1 h-[calc(100vh-3rem)] min-h-0 px-2 sm:px-3 pb-2 sm:pb-3 pt-1 flex flex-col md:flex-row items-stretch overflow-hidden relative select-none"
        >
          {/* Mobile Advisory Banner (Section 9: subtle advisory banner with leaderboard link) */}
          <div className="flex md:hidden items-center justify-between px-3 py-1.5 rounded-lg bg-sky-500/10 border border-sky-400/20 text-xs text-sky-200 mb-2 shrink-0">
            <span>Duels work best on a larger screen</span>
            <Link href="/leaderboard" className="text-sky-400 hover:text-sky-300 underline font-medium">
              View leaderboard
            </Link>
          </div>

          {/* Mobile Navigation Tabs (Section 9: Usable at 390px) */}
          <div className="flex md:hidden items-center bg-[#11141C] p-1 rounded-xl border border-white/[0.08] mb-2 shrink-0">
            <button
              onClick={() => setMobileTab('problem')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition ${
                mobileTab === 'problem' ? 'bg-white/[0.12] text-white shadow-sm' : 'text-[#9CA3AF]'
              }`}
            >
              Problem
            </button>
            <button
              onClick={() => setMobileTab('code')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition ${
                mobileTab === 'code' ? 'bg-white/[0.12] text-white shadow-sm' : 'text-[#9CA3AF]'
              }`}
            >
              Code
            </button>
            <button
              onClick={() => setMobileTab('trace')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition ${
                mobileTab === 'trace' ? 'bg-white/[0.12] text-white shadow-sm' : 'text-[#9CA3AF]'
              }`}
            >
              Trace
            </button>
          </div>

          {/* PANE 1 (LEFT): Problem & Sabotage Inspector (~24% default) */}
          <div
            style={{
              width: isTraceCollapsed
                ? `${paneWidths[0]}%`
                : `calc((100% - 16px) * ${paneWidths[0] / 100})`,
            }}
            className={`studio-island p-4 flex-col gap-3.5 self-stretch min-h-0 overflow-y-auto text-xs shrink-0 select-text ${
              mobileTab === 'problem' ? 'flex w-full md:w-auto' : 'hidden md:flex'
            }`}
          >
            <div className="flex items-center justify-between border-b border-white/[0.07] pb-3 select-none">
              <div>
                <h2 className="font-display font-semibold text-sm text-[#F3F4F6] tracking-tight">{evalBundle.title}</h2>
                <div className="text-xs text-[#9CA3AF] mt-0.5">{evalBundle.category} Duel</div>
              </div>
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-sky-500/10 text-sky-300 border border-sky-500/20">
                {evalBundle.difficulty}
              </span>
            </div>

            <p className="text-[15px] leading-[1.6] text-[#D1D5DB] font-sans max-w-[65ch]">
              {initialMatch.problem?.description || evalBundle.title}
            </p>

            {/* Execution Constraints (plain sentences) */}
            <div>
              <div className="text-xs font-medium text-[#9CA3AF] mb-1.5 select-none">Constraints:</div>
              <ul className="space-y-1 text-xs text-[#D1D5DB] font-sans">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#6B7280] shrink-0" />
                  <span>Time limit: 500 ms</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#6B7280] shrink-0" />
                  <span>Max 500 trace steps</span>
                </li>
              </ul>
            </div>

            {/* Public Samples */}
            <div>
              <div className="text-xs font-medium text-[#9CA3AF] mb-1.5 select-none">Examples:</div>
              <div className="flex flex-col gap-2.5">
                {evalBundle.public_samples.map((sample, idx) => {
                  const isSelected = selectedSampleIndex === idx;
                  return (
                    <div
                      key={sample.id}
                      onClick={() => handleSelectSample(idx)}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-sky-500/[0.07] border-sky-400/40 shadow-[0_0_12px_rgba(56,189,248,0.08)]'
                          : 'bg-white/[0.02] border-white/[0.07] hover:bg-white/[0.04] hover:border-white/[0.12]'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[#9CA3AF] mb-2">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-medium ${isSelected ? 'text-sky-300' : 'text-[#E5E7EB]'}`}>
                            Example {idx + 1}
                          </span>
                          {isSelected && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-400/30">
                              Active
                            </span>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopySampleInput(sample.id, sample.input);
                          }}
                          className="flex items-center gap-1 text-xs text-[#9CA3AF] hover:text-[#F3F4F6] transition cursor-pointer select-none"
                          title="Copy input to clipboard"
                        >
                          {copiedSampleId === sample.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-[#34D399]" />
                              <span className="text-[#34D399] font-medium">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy input</span>
                            </>
                          )}
                        </button>
                      </div>
                      <div className="space-y-1.5 font-mono text-xs">
                        <div className="text-[#9CA3AF]">
                          <span className="select-none font-sans text-xs">Input: </span>
                          <code className="text-sky-200">{JSON.stringify(sample.input)}</code>
                        </div>
                        <div className="text-[#9CA3AF]">
                          <span className="select-none font-sans text-xs">Expected: </span>
                          <code className="text-[#34D399]">{JSON.stringify(sample.expected_output)}</code>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Interactive Pill Drag-Resize Handle 0 (between Left and Center) */}
          <div
            onMouseDown={(e) => handleMouseDownHandle(0, e)}
            onDoubleClick={handleResetPaneWidths}
            className="hidden md:flex w-2 items-center justify-center cursor-col-resize group select-none shrink-0 h-full"
            title="Drag to resize panes (Double-click to reset)"
          >
            <div className="w-1 h-12 rounded-full bg-white/[0.1] transition-all duration-200 group-hover:w-1.5 group-hover:h-16 group-hover:bg-sky-400" />
          </div>

          {/* PANE 2 (CENTER): Monaco Code Studio (~46% primary visual weight) */}
          <div
            style={{
              width: isTraceCollapsed
                ? `calc(100% - ${paneWidths[0]}% - 44px)`
                : `calc((100% - 16px) * ${paneWidths[1] / 100})`,
            }}
            className={`studio-island flex-col self-stretch min-h-0 overflow-hidden shrink-0 relative ${
              mobileTab === 'code' ? 'flex w-full md:w-auto' : 'hidden md:flex'
            }`}
          >
            {/* SINGLE-LINE MACOS EDITOR HEADER TOOLBAR */}
            <div className="h-10 px-3 bg-[#11141C] border-b border-white/[0.07] flex items-center justify-between gap-2 overflow-hidden select-none shrink-0 whitespace-nowrap">
              {/* Left Group: solution.ts + Language Badge + Synchronized Test Badge */}
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex items-center gap-1.5 text-xs text-[#9CA3AF] font-medium">
                  <span className="font-mono text-[#E5E7EB]">solution.ts</span>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-[#9CA3AF]">
                    TypeScript
                  </span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/20 text-sky-300 font-semibold tabular-nums">
                    {testEvaluationState.passedCount}/{testEvaluationState.totalCount} tests
                  </span>
                </div>
              </div>

              {/* Right Group: Starter Code Dropdown */}
              <div className="flex items-center gap-2 shrink-0 ml-auto">
                <label htmlFor="starter-code-select" className="hidden sm:inline text-xs text-[#9CA3AF]">
                  Starter code:
                </label>
                <select
                  id="starter-code-select"
                  value={loadedPreset === 'Greedy' ? 'buggy' : loadedPreset === 'Optimal' ? 'optimal' : 'blank'}
                  onChange={(e) => handleLoadPreset(e.target.value as 'blank' | 'buggy' | 'optimal')}
                  className="bg-[#161B26] text-xs text-[#D1D5DB] border border-white/[0.08] rounded-md px-2 py-1 outline-none focus:border-sky-400/50 cursor-pointer"
                >
                  <option value="blank">Blank</option>
                  {!isCompetitiveMode && <option value="buggy">Greedy example</option>}
                  {!isCompetitiveMode && <option value="optimal">Optimal example</option>}
                </select>
                {isCompetitiveMode && (
                  <span className="hidden xl:inline text-[10px] text-amber-400/80 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">
                    Ranked: Presets locked
                  </span>
                )}
              </div>
            </div>

            {/* Monaco Editor Container */}
            <div className="flex-1 w-full min-h-0 relative">
              <Editor
                height="100%"
                defaultLanguage="javascript"
                value={code}
                theme="vs-dark"
                onChange={handleCodeChange}
                onMount={(editor) => {
                  editorRef.current = editor;
                  // Track editor cursor line and column for status line
                  editor.onDidChangeCursorPosition?.((e: { position: { lineNumber: number; column: number } }) => {
                    setCursorPos({ line: e.position.lineNumber, col: e.position.column });
                  });
                }}
                options={{
                  fontSize: editorSettings.fontSize,
                  tabSize: editorSettings.tabSize,
                  fontFamily: 'var(--font-mono, monospace)',
                  minimap: { enabled: editorSettings.minimap },
                  wordWrap: editorSettings.wordWrap,
                  lineNumbers: editorSettings.lineNumbers,
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  renderLineHighlight: 'all',
                }}
              />
            </div>

            {/* Status Feedback Banner */}
            {judgeResult && (
              <div
                className={`p-2.5 px-4 border-t text-xs font-mono flex items-center justify-between shrink-0 ${
                  judgeResult.status === 'passed'
                    ? 'bg-[#34D399]/15 border-[#34D399]/30 text-[#34D399]'
                    : 'bg-[#FB7185]/15 border-[#FB7185]/30 text-[#FB7185]'
                }`}
              >
                <div className="flex items-center gap-2">
                  {judgeResult.status === 'passed' ? (
                    <CheckCircle2 className="w-4 h-4 text-[#34D399] shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-[#FB7185] shrink-0" />
                  )}
                  <span>
                    {judgeResult.status === 'passed' ? 'ALL TESTS PASSED' : `EVALUATION ${judgeResult.status.toUpperCase()}`}: {judgeResult.testsPassed} / {judgeResult.totalTests} passed ({judgeResult.executionTimeMs}ms)
                  </span>
                </div>
                {judgeResult.error && <span className="opacity-80 text-xs truncate max-w-[200px]">{judgeResult.error}</span>}
              </div>
            )}

            {/* Status Line & Action Bar Footer */}
            <div className="h-10 px-3 bg-[#11141C] border-t border-white/[0.07] flex items-center justify-between gap-2 select-none shrink-0 text-xs overflow-hidden">
              {/* Left: Cursor & Document Telemetry */}
              <div className="flex items-center gap-2.5 text-[#9CA3AF] font-mono tabular-nums text-xs whitespace-nowrap min-w-0 overflow-hidden">
                <span className="whitespace-nowrap shrink-0">Ln {cursorPos.line}, Col {cursorPos.col}</span>
                <span className="hidden 2xl:inline text-white/[0.2] shrink-0">·</span>
                <span className="hidden 2xl:inline whitespace-nowrap">{code.length} chars</span>
                <span className="hidden 2xl:inline text-white/[0.2] shrink-0">·</span>
                <span className="hidden 2xl:inline whitespace-nowrap">500ms limit</span>
              </div>

              {/* Right: Run & Submit Actions */}
              <div className="flex items-center gap-2 shrink-0 ml-auto whitespace-nowrap">
                <button
                  onClick={handleRunTrace}
                  disabled={runningTrace || submitting}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-[#E5E7EB] border border-white/[0.08] transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50 whitespace-nowrap shrink-0"
                  title={`Run on Public Samples (${isMac ? '⌘↵' : 'Ctrl+Enter'})`}
                >
                  {runningTrace ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400 shrink-0" />
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-current text-sky-400 shrink-0" />
                  )}
                  <span>Run</span>
                  <kbd className="hidden lg:inline text-xs font-mono text-[#9CA3AF] bg-white/[0.04] px-1 rounded">{isMac ? '⌘↵' : 'Ctrl+↵'}</kbd>
                </button>

                <button
                  type="button"
                  onClick={() => setIsSabotageOpen(true)}
                  disabled={sabotageCooldown > 0}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-200 border border-sky-400/35 transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  title={`Hack & Defend Sabotage (${isMac ? '⌘⇧H' : 'Ctrl+Shift+H'})${sabotageCooldown > 0 ? ` - Cooldown: ${sabotageCooldown}s` : ''}`}
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>{sabotageCooldown > 0 ? `Sabotage (${sabotageCooldown}s)` : 'Sabotage'}</span>
                  <kbd className="hidden lg:inline text-xs font-mono text-sky-300 bg-sky-500/20 px-1 rounded border border-sky-400/30">
                    {isMac ? '⌘⇧H' : 'Ctrl+Shift+H'}
                  </kbd>
                </button>

                <button
                  onClick={handleSubmitCode}
                  disabled={submitting || runningTrace}
                  className="text-xs font-medium px-3.5 py-1.5 rounded-lg bg-[#F3F4F6] text-[#0B0D12] hover:bg-white transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50 shadow-sm whitespace-nowrap shrink-0"
                  title={`Submit to Secret Judge (${isMac ? '⌘⇧S' : 'Ctrl+Shift+S'})`}
                >
                  {submitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0B0D12] shrink-0" />
                  ) : (
                    <Send className="w-3.5 h-3.5 text-[#0B0D12] shrink-0" />
                  )}
                  <span className="font-semibold">Submit</span>
                  <kbd className="hidden lg:inline text-xs font-mono text-[#0B0D12]/70 bg-black/10 px-1 rounded">{isMac ? '⌘⇧S' : 'Ctrl+Shift+S'}</kbd>
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Pill Drag-Resize Handle 1 (between Center and Right) */}
          {!isTraceCollapsed && (
            <div
              onMouseDown={(e) => handleMouseDownHandle(1, e)}
              onDoubleClick={handleResetPaneWidths}
              className="hidden md:flex w-2 items-center justify-center cursor-col-resize group select-none shrink-0 h-full"
              title="Drag to resize panes (Double-click to reset)"
            >
              <div className="w-1 h-12 rounded-full bg-white/15 transition-all duration-200 group-hover:w-1.5 group-hover:h-16 group-hover:bg-[#38BDF8]" />
            </div>
          )}

          {/* PANE 3 (RIGHT): Dual-Trace Hardware Engine & DAW Scrubber (~30% collapsible) */}
          {isTraceCollapsed ? (
            <button
              onClick={() => setIsTraceCollapsed(false)}
              className="hidden md:flex w-9 ml-1.5 h-full bg-[#11141C] border border-white/[0.08] rounded-2xl flex-col items-center justify-between py-4 text-[#9CA3AF] hover:text-white hover:bg-white/[0.04] transition cursor-pointer shrink-0 select-none"
              title="Expand Execution Trace"
            >
              <Maximize2 className="w-3.5 h-3.5 text-sky-400" />
              <span className="[writing-mode:vertical-lr] text-xs font-mono tracking-wider rotate-180 text-[#D1D5DB]">
                EXECUTION TRACE
              </span>
              <span className="text-xs font-mono text-[#34D399]">
                {hasRun && totalTraceFrames > 0 ? `${currentCanvasFrame + 1}/${totalTraceFrames}` : '0/0'}
              </span>
            </button>
          ) : (
            <div
              style={{ width: `calc((100% - 16px) * ${paneWidths[2] / 100})` }}
              className={`studio-island flex-col self-stretch min-h-0 overflow-hidden shrink-0 relative ${
                mobileTab === 'trace' ? 'flex w-full md:w-auto' : 'hidden md:flex'
              }`}
            >
              {/* Trace Panel Header */}
              <div className="h-10 px-3 bg-[#11141C] border-b border-white/[0.07] flex items-center justify-between shrink-0 select-none">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs text-[#F3F4F6]">Execution Trace</span>
                  <span className="text-xs font-mono tabular-nums px-1.5 py-0.5 rounded bg-white/[0.04] text-[#9CA3AF] border border-white/[0.08]">
                    {hasRun && totalTraceFrames > 0
                      ? `Frame ${currentCanvasFrame + 1} / ${totalTraceFrames}`
                      : 'No trace'}
                  </span>
                </div>
                <button
                  onClick={() => setIsTraceCollapsed(true)}
                  className="p-1 rounded text-[#9CA3AF] hover:text-white hover:bg-white/[0.06] transition cursor-pointer"
                  title="Collapse Execution Trace"
                  aria-label="Collapse execution trace"
                >
                  <PanelRightClose className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex-1 min-h-0 relative w-full overflow-hidden">
                <DualTraceVisualizer
                  userTraces={userTraces}
                  oracleTraces={oracleTraces}
                  category={evalBundle.category}
                  visualizerType={evalBundle.visualizer_type}
                  divergenceFrameIndex={divergenceFrameIdx}
                  oracleComplexity={evalBundle.complexity || 'O((V + E) log V)'}
                  userOps={lastRunOps}
                  userPresetTag={activePresetTag}
                  graphInput={graphInput}
                  hasRun={hasRun}
                  userTitle={userTitle}
                  loadedPreset={loadedPreset}
                  onRun={handleRunTrace}
                  onFrameChange={(frame) => setCurrentCanvasFrame(frame)}
                />
              </div>

              <div className="shrink-0 border-t border-white/[0.08]">
                <DAWScrubber
                  totalFrames={hasRun ? totalTraceFrames : 0}
                  currentFrame={currentCanvasFrame}
                  divergenceFrameIndex={divergenceFrameIdx}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sabotage Slide-Over Drawer */}
      <SabotageDrawer
        isOpen={isSabotageOpen}
        onClose={() => setIsSabotageOpen(false)}
        problemId={problemId}
        defenderCode={evalBundle.buggy_sabotage_code}
        oracleCode={evalBundle.oracle_solution}
        inputValidatorCode={evalBundle.input_validator}
        isCompetitive={isCompetitiveMode}
        cooldownSeconds={sabotageCooldown}
        onSabotageAttempt={() => setSabotageCooldown(20)}
        onSuccessfulHack={handleSabotageSuccess}
      />

      {/* Post-Match After-Action Report Modal (Feature 1) */}
      <AfterActionReportModal
        isOpen={isAAROpen}
        onClose={() => setIsAAROpen(false)}
        isUnrated={!isCompetitiveMode}
        reason={aarReason}
        player1={{
          username: match.player1?.username || 'antu',
          eloBefore: match.player1_elo_before || 1844,
        }}
        player2={
          match.player2
            ? {
                username: match.player2.username,
                eloBefore: match.player2_elo_before ?? 1200,
              }
            : {
                username: 'Instant_Demo',
                eloBefore: 1200,
              }
        }
        eloDelta={aarEloDelta}
        runtimeMs={judgeResult?.executionTimeMs || 4}
        operationsCount={liveOps}
        opponentOpsCount={43}
        oracleComplexity={evalBundle.complexity || 'O((V + E) log V)'}
        onInspectDivergence={() => {
          setUserTraces(DIVERGENCE_TRACES);
          setDivergenceFrameIdx(4);
          setCurrentCanvasFrame(4);
        }}
        onLaunchNextDuel={() => {
          router.push('/lobby');
        }}
      />
    </div>
  );
}
