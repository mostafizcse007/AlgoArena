'use client';

import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import type { TraceFrame } from '@/lib/types/arena';
import { Play, CheckCircle2 } from 'lucide-react';
import { playTick } from '@/lib/audio/sfx';

export interface GraphInputData {
  V?: number;
  edges?: number[][];
}

export interface DualTraceVisualizerProps {
  userTraces?: TraceFrame[];
  oracleTraces?: TraceFrame[];
  category?: string;
  visualizerType?: 'graph' | 'dp_grid' | 'two_pointers';
  onFrameChange?: (currentFrame: number, totalFrames: number) => void;
  divergenceFrameIndex?: number;
  nodeCount?: number;
  oracleComplexity?: string;
  userOps?: number | null;
  userPresetTag?: string | null;
  graphInput?: GraphInputData;
  hasRun?: boolean;
  userTitle?: string;
  loadedPreset?: 'Greedy' | 'Optimal' | 'buggy' | 'optimal' | null;
  onRun?: () => void;
}

interface NodeState {
  id: number;
  x: number;
  y: number;
  dist: number;
  parent: number | null;
  isActive: boolean;
  isVisited: boolean;
  isUpdated: boolean;
  isDiverged: boolean;
}

interface HoveredNodeInfo {
  side: 'user' | 'oracle';
  node: NodeState;
  screenX: number;
  screenY: number;
}

interface GraphEdgeDef {
  u: number;
  v: number;
  w: number;
  curve: number;
  isGreedy?: boolean;
  isOptimal?: boolean;
}

interface GraphStateData {
  dist: number[];
  active: number[];
  visited: number[];
  parents: (number | null)[];
  pq: Array<{ u: number; d: number }>;
  updatedIdx: number[];
  divergedIdx: number[];
}

// ---------------------------------------------------------------------------
// DYNAMIC GRAPH GEOMETRY & DETERMINISTIC SIMULATION ALGORITHMS (Zero-AI)
// ---------------------------------------------------------------------------

function computeNodeCoordinates(
  V: number,
  cx: number,
  cy: number,
  rx: number,
  ry: number
): Array<{ id: number; x: number; y: number }> {
  if (V <= 1) {
    return [{ id: 0, x: cx, y: cy }];
  }
  if (V === 2) {
    return [
      { id: 0, x: cx - rx * 0.85, y: cy },
      { id: 1, x: cx + rx * 0.85, y: cy },
    ];
  }
  if (V === 3) {
    return [
      { id: 0, x: cx - rx * 0.85, y: cy },
      { id: 1, x: cx, y: cy - ry * 0.82 },
      { id: 2, x: cx + rx * 0.85, y: cy },
    ];
  }
  if (V === 4) {
    // 4-node graph (Example 1 Diamond Layout):
    // Node 0 on Left, Node 3 on Right, Node 1 on Top, Node 2 on Bottom
    return [
      { id: 0, x: cx - rx * 0.85, y: cy },
      { id: 1, x: cx, y: cy - ry * 0.82 },
      { id: 2, x: cx, y: cy + ry * 0.82 },
      { id: 3, x: cx + rx * 0.85, y: cy },
    ];
  }
  if (V === 5) {
    return [
      { id: 0, x: cx - rx * 0.85, y: cy },
      { id: 1, x: cx - rx * 0.12, y: cy - ry * 0.82 },
      { id: 2, x: cx - rx * 0.28, y: cy + ry * 0.82 },
      { id: 3, x: cx + rx * 0.32, y: cy + ry * 0.72 },
      { id: 4, x: cx + rx * 0.85, y: cy },
    ];
  }

  // General V > 5:
  const coords: Array<{ id: number; x: number; y: number }> = new Array(V);
  coords[0] = { id: 0, x: cx - rx * 0.85, y: cy };
  coords[V - 1] = { id: V - 1, x: cx + rx * 0.85, y: cy };

  const topNodes: number[] = [];
  const bottomNodes: number[] = [];

  for (let i = 1; i < V - 1; i++) {
    if (i % 2 === 1) topNodes.push(i);
    else bottomNodes.push(i);
  }

  const assignTrack = (nodes: number[], isTop: boolean) => {
    const count = nodes.length;
    const trackY = cy + (isTop ? -1 : 1) * ry * 0.82;
    nodes.forEach((nodeId, idx) => {
      const frac = count === 1 ? 0.5 : idx / (count - 1);
      const trackX = cx - rx * 0.5 + frac * rx;
      coords[nodeId] = { id: nodeId, x: trackX, y: trackY };
    });
  };

  assignTrack(topNodes, true);
  assignTrack(bottomNodes, false);

  return coords;
}

function buildDynamicEdges(
  V: number,
  edges: number[][]
): GraphEdgeDef[] {
  const edgeCountMap = new Map<string, number>();

  return edges.map(([u, v, w]) => {
    const pairKey = u < v ? `${u}-${v}` : `${v}-${u}`;
    const seenCount = edgeCountMap.get(pairKey) || 0;
    edgeCountMap.set(pairKey, seenCount + 1);

    let curve = 0;
    let isGreedy = false;
    let isOptimal = false;

    if (V === 4) {
      if (u === 0 && v === 1) curve = -0.12;
      else if (u === 1 && v === 3) curve = -0.12;
      else if (u === 0 && v === 2) curve = 0.12;
      else if (u === 2 && v === 3) curve = 0.12;
      else if ((u === 1 && v === 2) || (u === 2 && v === 1)) curve = 0;
      else curve = u < v ? -0.15 : 0.15;

      isGreedy = (u === 0 && v === 1) || (u === 1 && v === 3);
      isOptimal = (u === 0 && v === 2) || (u === 2 && v === 3);
    } else if (V === 5) {
      if (u === 0 && v === 1) curve = -0.22;
      else if (u === 1 && v === 4) curve = -0.24;
      else if (u === 0 && v === 2) curve = 0.18;
      else if (u === 2 && v === 3) curve = 0.15;
      else if (u === 3 && v === 4) curve = 0.18;
      else curve = 0;

      isGreedy = (u === 0 && v === 1) || (u === 1 && v === 4);
      isOptimal = (u === 0 && v === 2) || (u === 2 && v === 3) || (u === 3 && v === 4);
    } else if (V === 8) {
      const baseCurve = u < v ? -0.12 : 0.12;
      curve = seenCount === 0 ? baseCurve : baseCurve * (seenCount + 1);

      isGreedy = (u === 0 && v === 1) || (u === 1 && v === 3) || (u === 3 && v === 5) || (u === 5 && v === 7);
      isOptimal = (u === 0 && v === 2) || (u === 2 && v === 3) || (u === 2 && v === 4) || (u === 4 && v === 6) || (u === 6 && v === 7);
    } else {
      const baseCurve = u < v ? -0.12 : 0.12;
      curve = seenCount === 0 ? baseCurve : baseCurve * (seenCount + 1);
    }

    return {
      u,
      v,
      w,
      curve,
      isGreedy,
      isOptimal,
    };
  });
}

function simulateDijkstraTrace(
  V: number,
  edges: number[][]
): GraphStateData[] {
  const frames: GraphStateData[] = [];
  const adj: Array<Array<{ v: number; w: number }>> = Array.from({ length: V }, () => []);
  for (const edge of edges) {
    if (edge && edge.length >= 3) {
      const [u, v, w] = edge;
      if (u >= 0 && u < V && v >= 0 && v < V) {
        adj[u].push({ v, w });
      }
    }
  }

  const dist = new Array(V).fill(Infinity);
  dist[0] = 0;
  const parents: (number | null)[] = new Array(V).fill(null);
  const visited: number[] = [];
  const visitedSet = new Set<number>();
  const pq: Array<{ u: number; d: number }> = [{ u: 0, d: 0 }];

  frames.push({
    dist: [...dist],
    active: [0],
    visited: [],
    parents: [...parents],
    pq: pq.map((item) => ({ ...item })),
    updatedIdx: [],
    divergedIdx: [],
  });

  const target = V - 1;

  while (pq.length > 0) {
    const current = pq.shift()!;
    const u = current.u;
    const d = current.d;

    if (visitedSet.has(u)) continue;

    visitedSet.add(u);
    visited.push(u);

    if (u === target) {
      frames.push({
        dist: [...dist],
        active: [u],
        visited: [...visited],
        parents: [...parents],
        pq: pq.map((item) => ({ ...item })),
        updatedIdx: [],
        divergedIdx: [],
      });
      break;
    }

    const updatedThisStep: number[] = [];
    const activeNodes: number[] = [u];

    for (const { v, w } of adj[u]) {
      activeNodes.push(v);
      if (!visitedSet.has(v) && d + w < dist[v]) {
        dist[v] = d + w;
        parents[v] = u;
        updatedThisStep.push(v);
        pq.push({ u: v, d: dist[v] });
      }
    }

    pq.sort((a, b) => a.d - b.d || a.u - b.u);

    frames.push({
      dist: [...dist],
      active: activeNodes,
      visited: [...visited],
      parents: [...parents],
      pq: pq.map((item) => ({ ...item })),
      updatedIdx: updatedThisStep,
      divergedIdx: [],
    });
  }

  return frames.length > 0 ? frames : [defaultEmptyState(V)];
}

function simulateGreedyTrace(
  V: number,
  edges: number[][],
  oracleOptimalDist?: number
): GraphStateData[] {
  const frames: GraphStateData[] = [];
  const adj: Array<Array<{ v: number; w: number }>> = Array.from({ length: V }, () => []);
  for (const edge of edges) {
    if (edge && edge.length >= 3) {
      const [u, v, w] = edge;
      if (u >= 0 && u < V && v >= 0 && v < V) {
        adj[u].push({ v, w });
      }
    }
  }

  const dist = new Array(V).fill(Infinity);
  dist[0] = 0;
  const parents: (number | null)[] = new Array(V).fill(null);
  const visited: number[] = [];
  const visitedSet = new Set<number>();

  let curr = 0;
  let totalDist = 0;
  const target = V - 1;

  frames.push({
    dist: [...dist],
    active: [0],
    visited: [],
    parents: [...parents],
    pq: [{ u: 0, d: 0 }],
    updatedIdx: [],
    divergedIdx: [],
  });

  visitedSet.add(0);
  visited.push(0);

  while (curr !== target) {
    let best: { v: number; w: number } | null = null;
    for (const { v, w } of adj[curr]) {
      if (!visitedSet.has(v) && (!best || w < best.w || (w === best.w && v < best.v))) {
        best = { v, w };
      }
    }

    if (!best) break;

    const nextNode = best.v;
    const edgeWeight = best.w;
    totalDist += edgeWeight;
    dist[nextNode] = totalDist;
    parents[nextNode] = curr;
    visitedSet.add(nextNode);
    visited.push(nextNode);

    const isTarget = nextNode === target;
    const isDivergent = isTarget && oracleOptimalDist !== undefined && totalDist > oracleOptimalDist;

    frames.push({
      dist: [...dist],
      active: [curr, nextNode],
      visited: [...visited],
      parents: [...parents],
      pq: isTarget ? [] : [{ u: nextNode, d: totalDist }],
      updatedIdx: [nextNode],
      divergedIdx: isDivergent ? [nextNode] : [],
    });

    curr = nextNode;
  }

  return frames;
}

function mapUserTracesToGraphStates(
  userTraces: TraceFrame[],
  V: number
): GraphStateData[] {
  const dist = new Array(V).fill(Infinity);
  dist[0] = 0;
  const parents: (number | null)[] = new Array(V).fill(null);
  const visitedSet = new Set<number>();

  return userTraces.map((trace) => {
    const active = trace.activeNodes || [];
    const visited = trace.visitedNodes || [];
    for (const v of visited) visitedSet.add(v);

    if (trace.variables) {
      if (typeof trace.variables.node === 'number' && typeof trace.variables.currentDist === 'number') {
        const u = trace.variables.node;
        if (u >= 0 && u < V) dist[u] = trace.variables.currentDist;
      }
      if (typeof trace.variables.finalOutput === 'number') {
        dist[V - 1] = trace.variables.finalOutput;
      }
    }

    const isDiverged = !!trace.isDivergence;

    return {
      dist: [...dist],
      active: [...active],
      visited: [...visited],
      parents: [...parents],
      pq: [],
      updatedIdx: active.length > 0 ? [...active] : [],
      divergedIdx: isDiverged ? (active.length > 0 ? [...active] : [V - 1]) : [],
    };
  });
}

function defaultEmptyState(V: number): GraphStateData {
  return {
    dist: new Array(V).fill(Infinity),
    active: [],
    visited: [],
    parents: new Array(V).fill(null),
    pq: [],
    updatedIdx: [],
    divergedIdx: [],
  };
}

function computeSimulationFrames(
  V: number,
  edges: number[][],
  userTraces?: TraceFrame[],
  loadedPreset?: 'Greedy' | 'Optimal' | 'buggy' | 'optimal' | null
): { userFrames: GraphStateData[]; oracleFrames: GraphStateData[] } {
  const oracleFrames = simulateDijkstraTrace(V, edges);
  const oracleOptimalDist = oracleFrames[oracleFrames.length - 1]?.dist[V - 1];

  let userFrames: GraphStateData[];
  if (userTraces && userTraces.length > 0) {
    userFrames = mapUserTracesToGraphStates(userTraces, V);
  } else if (loadedPreset === 'optimal' || loadedPreset === 'Optimal') {
    userFrames = oracleFrames;
  } else {
    userFrames = simulateGreedyTrace(V, edges, oracleOptimalDist);
  }

  return { userFrames, oracleFrames };
}

// ---------------------------------------------------------------------------
// MAIN COMPONENT
// ---------------------------------------------------------------------------

export function DualTraceVisualizer({
  userTraces = [],
  oracleTraces = [],
  category = 'graphs',
  visualizerType = 'graph',
  onFrameChange,
  divergenceFrameIndex,
  nodeCount = 4,
  oracleComplexity = 'O((V + E) log V)',
  userOps,
  userPresetTag,
  graphInput,
  hasRun = false,
  userTitle,
  loadedPreset,
  onRun,
}: DualTraceVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const V = Math.max(graphInput?.V ?? nodeCount ?? 4, 2);
  const rawEdges = useMemo(() => {
    if (graphInput?.edges && graphInput.edges.length > 0) {
      return graphInput.edges;
    }
    const defaultEdges: number[][] = [];
    for (let i = 0; i < V - 1; i++) {
      defaultEdges.push([i, i + 1, 1]);
    }
    return defaultEdges;
  }, [graphInput?.edges, V]);

  // Mutable refs for 60 FPS Canvas rendering with 0 React re-renders (Rule 3)
  const currentFrameRef = useRef<number>(0);
  const isPlayingRef = useRef<boolean>(false);
  const speedRef = useRef<number>(1);
  const userTracesRef = useRef<TraceFrame[]>(userTraces);
  const oracleTracesRef = useRef<TraceFrame[]>(oracleTraces);
  const userFramesRef = useRef<GraphStateData[]>([]);
  const oracleFramesRef = useRef<GraphStateData[]>([]);
  const rafIdRef = useRef<number | null>(null);
  const lastTickTimeRef = useRef<number>(0);
  const hoveredNodeRef = useRef<HoveredNodeInfo | null>(null);
  const onFrameChangeRef = useRef(onFrameChange);
  const lastNodesRef = useRef<{ left: NodeState[]; right: NodeState[] } | null>(null);
  const oracleComplexityRef = useRef<string>(oracleComplexity);
  const userOpsRef = useRef<number | null | undefined>(userOps);
  const userPresetTagRef = useRef<string | null | undefined>(userPresetTag);

  useEffect(() => {
    onFrameChangeRef.current = onFrameChange;
  }, [onFrameChange]);

  // Sync props to refs
  useEffect(() => {
    userTracesRef.current = userTraces;
    oracleTracesRef.current = oracleTraces;
  }, [userTraces, oracleTraces]);

  useEffect(() => {
    oracleComplexityRef.current = oracleComplexity;
    userOpsRef.current = userOps;
    userPresetTagRef.current = userPresetTag;
  }, [oracleComplexity, userOps, userPresetTag]);

  const { userFrames, oracleFrames } = useMemo(() => {
    return computeSimulationFrames(V, rawEdges, userTraces, loadedPreset);
  }, [V, rawEdges, userTraces, loadedPreset]);

  useEffect(() => {
    userFramesRef.current = userFrames;
    oracleFramesRef.current = oracleFrames;
  }, [userFrames, oracleFrames]);

  const totalSimFrames = Math.max(userFrames.length, oracleFrames.length, 1);
  const maxFrames = Math.max(userTraces.length, oracleTraces.length, totalSimFrames);

  // Main Render Frame
  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const dpr = window.devicePixelRatio || 1;

    // Reset transform & scale for Retina displays
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cssWidth = width / dpr;
    const cssHeight = height / dpr;

    // Base Canvas surface #0B0D12
    ctx.fillStyle = '#0B0D12';
    ctx.fillRect(0, 0, cssWidth, cssHeight);

    // Ultra-subtle dot-matrix background (macOS Pro Studio aesthetic)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    const dotSpacing = 24;
    for (let x = 12; x < cssWidth; x += dotSpacing) {
      for (let y = 36; y < cssHeight; y += dotSpacing) {
        ctx.beginPath();
        ctx.arc(x, y, 0.75, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // -------------------------------------------------------------------------
    // EMPTY STATE WHEN !hasRun: Keep columns hidden until trace data exists
    // -------------------------------------------------------------------------
    if (!hasRun) {
      lastNodesRef.current = null;
      ctx.restore();
      return;
    }

    const frameIdx = currentFrameRef.current;
    const effectiveDivergenceIdx = divergenceFrameIndex !== undefined ? divergenceFrameIndex : 999;
    const isAtDivergence = hasRun && frameIdx >= effectiveDivergenceIdx;
    const halfWidth = cssWidth / 2;

    // 1. TOP HEADER BAR: Frame counter & Telemetry strip
    ctx.fillStyle = '#11141C';
    ctx.fillRect(0, 0, cssWidth, 32);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
    ctx.beginPath();
    ctx.moveTo(0, 32);
    ctx.lineTo(cssWidth, 32);
    ctx.stroke();

    ctx.font = '600 12px var(--font-sans, system-ui, sans-serif)';
    ctx.fillStyle = '#E5E7EB';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('Execution Trace', 16, 16);

    const frameBadge = hasRun ? `FRAME ${frameIdx + 1} / ${maxFrames}` : 'NO TRACE';
    ctx.font = '700 12px var(--font-mono, monospace)';
    ctx.fillStyle = hasRun ? (isAtDivergence ? '#FB7185' : '#38BDF8') : '#94A3B8';
    ctx.textAlign = 'right';
    ctx.fillText(frameBadge, cssWidth - 16, 16);

    // Helper for specular pill rendering on canvas
    const drawPillBadge = (
      text: string,
      targetRightX: number,
      y: number,
      color: string,
      bgColor: string,
      borderColor: string
    ) => {
      ctx.font = '700 9.5px var(--font-mono, monospace)';
      const textWidth = ctx.measureText(text).width;
      const pillW = textWidth + 10;
      const pillH = 17;
      const pillX = targetRightX - pillW;
      const pillY = y - pillH / 2;

      ctx.fillStyle = bgColor;
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, pillW, pillH, 4);
      ctx.fill();

      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, pillX + pillW / 2, y);

      return pillW;
    };

    // 2. SUBHEADERS (Rows cleanly separated from canvas nodes)
    // Left Panel: Your Solution (no Big-O claimed, shows measured ops and tag only if from preset)
    const displayTitle = userTitle || (loadedPreset ? `Your Solution (${loadedPreset === 'buggy' ? 'Greedy' : loadedPreset === 'optimal' ? 'Optimal' : loadedPreset})` : 'Your Solution');
    ctx.font = '600 12px var(--font-sans, system-ui, sans-serif)';
    ctx.fillStyle = isAtDivergence ? '#FB7185' : '#38BDF8';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(displayTitle, 16, 46);

    const leftTextEnd = 16 + ctx.measureText(displayTitle).width + 8;

    if (isAtDivergence) {
      ctx.fillStyle = '#FB7185';
      ctx.font = '700 10.5px var(--font-mono, monospace)';
      ctx.fillText('• DIVERGENCE', leftTextEnd, 46);
    }

    // Draw user solution metadata on Left Panel (Right-aligned before divider)
    let userPillRight = halfWidth - 14;
    const currentOps = userOpsRef.current;
    const currentTag = userPresetTagRef.current;

    if (halfWidth >= 280) {
      if (currentOps !== undefined && currentOps !== null) {
        const opsLabel = `${currentOps} ops`;
        const pillW = drawPillBadge(
          opsLabel,
          userPillRight,
          46,
          '#38BDF8',
          'rgba(56, 189, 248, 0.12)',
          'rgba(56, 189, 248, 0.28)'
        );
        userPillRight -= pillW + 6;
      }

      if (currentTag) {
        drawPillBadge(
          currentTag,
          userPillRight,
          46,
          '#FBBF24',
          'rgba(251, 191, 36, 0.12)',
          'rgba(251, 191, 36, 0.28)'
        );
      }
    }

    // Right Panel: Canonical Oracle (Shows stored complexity metadata when pane is wide)
    ctx.fillStyle = '#34D399';
    ctx.font = '600 12px var(--font-sans, system-ui, sans-serif)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('Canonical Oracle (Optimal)', halfWidth + 16, 46);

    if (halfWidth >= 280) {
      const complexityStr = oracleComplexityRef.current || 'O((V + E) log V)';
      drawPillBadge(
        `Complexity: ${complexityStr}`,
        cssWidth - 16,
        46,
        '#34D399',
        'rgba(52, 211, 153, 0.12)',
        'rgba(52, 211, 153, 0.28)'
      );
    }

    // Center divider between Left and Right traces
    ctx.strokeStyle = isAtDivergence ? 'rgba(251, 113, 133, 0.35)' : 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(halfWidth, 32);
    ctx.lineTo(halfWidth, cssHeight);
    ctx.stroke();

    // -------------------------------------------------------------------------
    // CONTAINER SCALING VIA RESIZEOBSERVER:
    // Scale layout dynamically to the full available vertical space of the panel.
    // Fixed compact height for the bottom Memory Dock (~74px) so that the graph
    // is expanded and has 0 unused vertical space.
    // -------------------------------------------------------------------------
    const availableHeight = cssHeight - 32;
    const dockHeight = Math.min(Math.max(68, availableHeight * 0.2), 78);
    const dockY = cssHeight - dockHeight - 8;

    const graphTop = 56;
    const graphBottom = dockY - 14;
    const graphCenterY = (graphTop + graphBottom) / 2;
    const graphHeight = Math.max(120, graphBottom - graphTop);

    // Dynamic horizontal & vertical radii (scaled to container)
    // Keep radiusX calibrated so distance pills (width 32px) on leftmost and rightmost
    // nodes have at least 10px clearance from pane edges and center divider.
    const radiusX = Math.max(48, Math.min(halfWidth * 0.33, (halfWidth - 105) / 1.7));
    const radiusY = Math.max(50, Math.min((graphHeight / 2) - 44, 210));

    if (visualizerType === 'graph' || category === 'graphs') {
      const uFrames = userFramesRef.current;
      const oFrames = oracleFramesRef.current;
      const uSafe = Math.min(Math.max(0, frameIdx), Math.max(0, uFrames.length - 1));
      const oSafe = Math.min(Math.max(0, frameIdx), Math.max(0, oFrames.length - 1));

      const userState = uFrames[uSafe] || defaultEmptyState(V);
      const oracleState = oFrames[oSafe] || defaultEmptyState(V);

      const getNodeLayout = (cx: number, state: GraphStateData): NodeState[] => {
        const rawCoords = computeNodeCoordinates(V, cx, graphCenterY, radiusX, radiusY);
        return rawCoords.map((c) => ({
          id: c.id,
          x: c.x,
          y: c.y,
          dist: state.dist[c.id] !== undefined ? state.dist[c.id] : Infinity,
          parent: state.parents[c.id] !== undefined ? state.parents[c.id] : null,
          isActive: state.active.includes(c.id),
          isVisited: state.visited.includes(c.id),
          isUpdated: state.updatedIdx.includes(c.id),
          isDiverged: state.divergedIdx.includes(c.id),
        }));
      };

      const leftNodes = getNodeLayout(cssWidth * 0.25, userState);
      const rightNodes = getNodeLayout(cssWidth * 0.75, oracleState);
      lastNodesRef.current = { left: leftNodes, right: rightNodes };

      const graphEdges = buildDynamicEdges(V, rawEdges);

      // -----------------------------------------------------------------------
      // DRAW SMOOTH DIRECTED EDGES WITH CLEAR ARROWHEADS & OFFSET WEIGHT LABELS
      // -----------------------------------------------------------------------
      const drawCurvedEdge = (
        u: NodeState,
        v: NodeState,
        w: number,
        curveFactor: number,
        color: string,
        lineWidth: number,
        showWeight: boolean,
        isHighlighted: boolean,
        side: 'user' | 'oracle'
      ) => {
        const nodeR = 18;
        const dx = v.x - u.x;
        const dy = v.y - u.y;
        const dist = Math.hypot(dx, dy);
        if (dist === 0) return;

        // Quadratic control point perpendicular to midpoint
        const mx = (u.x + v.x) / 2;
        const my = (u.y + v.y) / 2;
        const nx = -dy / dist;
        const ny = dx / dist;
        const cpx = mx + nx * (curveFactor * dist);
        const cpy = my + ny * (curveFactor * dist);

        // Midpoint of quadratic curve at t = 0.5
        const curveMidX = mx + nx * (0.5 * curveFactor * dist);
        const curveMidY = my + ny * (0.5 * curveFactor * dist);

        // Tangent angle near start and end point
        const startAngle = Math.atan2(cpy - u.y, cpx - u.x);
        const endAngle = Math.atan2(v.y - cpy, v.x - cpx);

        const sx = u.x + Math.cos(startAngle) * nodeR;
        const sy = u.y + Math.sin(startAngle) * nodeR;
        const ex = v.x - Math.cos(endAngle) * (nodeR + 1);
        const ey = v.y - Math.sin(endAngle) * (nodeR + 1);

        // Curved edge path
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.quadraticCurveTo(cpx, cpy, ex, ey);
        ctx.stroke();

        // ---------------------------------------------------------------------
        // CLEAR DIRECTED ARROWHEAD (11px crisp stealth chevron)
        // ---------------------------------------------------------------------
        const arrowLen = 11;
        const arrowAngle = 0.38; // ~22 degrees
        const w1x = ex - arrowLen * Math.cos(endAngle - arrowAngle);
        const w1y = ey - arrowLen * Math.sin(endAngle - arrowAngle);
        const w2x = ex - arrowLen * Math.cos(endAngle + arrowAngle);
        const w2y = ey - arrowLen * Math.sin(endAngle + arrowAngle);
        const baseX = ex - (arrowLen * 0.75) * Math.cos(endAngle);
        const baseY = ey - (arrowLen * 0.75) * Math.sin(endAngle);

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.lineTo(w1x, w1y);
        ctx.lineTo(baseX, baseY);
        ctx.lineTo(w2x, w2y);
        ctx.closePath();
        ctx.fill();

        // ---------------------------------------------------------------------
        // EDGE WEIGHT LABELS PLACED AT MIDPOINT OFFSET ALONG THE NORMAL
        // The label is offset along the unit normal by 16px, preventing collision
        // with the edge line, arrowhead, and node labels.
        // ---------------------------------------------------------------------
        if (showWeight) {
          const weightText = `w=${w}`;
          ctx.font = '700 9.5px var(--font-mono, monospace)';
          const measuredWidth = ctx.measureText(weightText).width;
          const pillW = Math.max(32, measuredWidth + 10);
          const pillH = 17;

          // Determine normal direction:
          // For edges along the top or bottom track, push weight towards the interior center
          // so that outside node distance labels and edge weights never compete for space.
          const isTopTrackEdge = u.y < graphCenterY - 15 && v.y < graphCenterY - 15;
          const isBottomTrackEdge = u.y > graphCenterY + 15 && v.y > graphCenterY + 15;

          let normalDir = curveFactor !== 0 ? (curveFactor > 0 ? 1 : -1) : 1;
          if (isTopTrackEdge || isBottomTrackEdge) {
            const toCenterY = graphCenterY - my;
            normalDir = ny * toCenterY > 0 ? 1 : -1;
          } else if (curveFactor === 0) {
            const paneCenterX = side === 'user' ? cssWidth * 0.25 : cssWidth * 0.75;
            const toCenterDot = nx * (paneCenterX - mx) + ny * (graphCenterY - my);
            normalDir = toCenterDot > 0 ? -1 : 1;
          }

          const normalOffset = 16;
          const weightX = curveMidX + nx * (normalDir * normalOffset);
          const weightY = curveMidY + ny * (normalDir * normalOffset);

          ctx.fillStyle = '#11141C';
          ctx.beginPath();
          ctx.roundRect(weightX - pillW / 2, weightY - pillH / 2, pillW, pillH, 5);
          ctx.fill();

          ctx.strokeStyle = isHighlighted ? color : 'rgba(148, 163, 184, 0.45)';
          ctx.lineWidth = isHighlighted ? 1.5 : 1;
          ctx.stroke();

          ctx.fillStyle = isHighlighted ? color : '#CBD5E1';
          ctx.font = '700 9.5px var(--font-mono, monospace)';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(weightText, weightX, weightY);
        }
      };

      // Draw Left Edges (User Trace)
      // Raised contrast for unvisited edges (rgba(148, 163, 184, 0.55), width 1.6)
      graphEdges.forEach((e) => {
        const u = leftNodes[e.u];
        const v = leftNodes[e.v];
        if (!u || !v) return;

        let edgeColor = 'rgba(148, 163, 184, 0.55)'; // High-contrast unvisited edge
        let edgeWidth = 1.6;
        let isHighlighted = false;

        if (isAtDivergence && e.isGreedy) {
          edgeColor = '#FB7185';
          edgeWidth = 2.5;
          isHighlighted = true;
        } else if (u.isActive && v.isActive) {
          edgeColor = '#38BDF8';
          edgeWidth = 2.2;
          isHighlighted = true;
        } else if (u.isActive || v.isActive) {
          edgeColor = '#38BDF8';
          edgeWidth = 1.8;
          isHighlighted = true;
        } else if (v.isVisited) {
          edgeColor = 'rgba(56, 189, 248, 0.7)';
          edgeWidth = 1.8;
          isHighlighted = true;
        }

        const isEdgeActive = (u.isActive && v.isActive) || (isAtDivergence && e.isGreedy) || (u.isActive && !v.isVisited);
        const isHovered = hoveredNodeRef.current?.side === 'user' && (hoveredNodeRef.current.node.id === u.id || hoveredNodeRef.current.node.id === v.id);
        const showWeight = isEdgeActive || Boolean(isHovered);

        drawCurvedEdge(u, v, e.w, e.curve, edgeColor, edgeWidth, showWeight, isHighlighted, 'user');
      });

      // Draw Right Edges (Oracle Trace)
      graphEdges.forEach((e) => {
        const u = rightNodes[e.u];
        const v = rightNodes[e.v];
        if (!u || !v) return;

        let edgeColor = 'rgba(148, 163, 184, 0.55)'; // High-contrast unvisited edge
        let edgeWidth = 1.6;
        let isHighlighted = false;

        if (e.isOptimal && (v.isVisited || frameIdx >= effectiveDivergenceIdx)) {
          edgeColor = '#34D399';
          edgeWidth = 2.5;
          isHighlighted = true;
        } else if (u.isActive && v.isActive) {
          edgeColor = '#34D399';
          edgeWidth = 2.2;
          isHighlighted = true;
        } else if (u.isActive || v.isActive) {
          edgeColor = '#34D399';
          edgeWidth = 1.8;
          isHighlighted = true;
        } else if (v.isVisited) {
          edgeColor = 'rgba(52, 211, 153, 0.7)';
          edgeWidth = 1.8;
          isHighlighted = true;
        }

        const isEdgeActive = (u.isActive && v.isActive) || (isAtDivergence && e.isOptimal) || (u.isActive && !v.isVisited);
        const isHovered = hoveredNodeRef.current?.side === 'oracle' && (hoveredNodeRef.current.node.id === u.id || hoveredNodeRef.current.node.id === v.id);
        const showWeight = isEdgeActive || Boolean(isHovered);

        drawCurvedEdge(u, v, e.w, e.curve, edgeColor, edgeWidth, showWeight, isHighlighted, 'oracle');
      });

      // -----------------------------------------------------------------------
      // RENDER NODES WITH OUTSIDE DISTANCE LABELS (AWAY FROM EDGES)
      // Computes the largest angular gap around the node where no incident edges
      // exist, placing the distance pill outside the node away from all edges.
      // -----------------------------------------------------------------------
      const renderNodeWithDistancePill = (
        n: NodeState,
        side: 'user' | 'oracle'
      ) => {
        const nodeR = 18;
        let accentColor = '#94A3B8';
        if (n.isDiverged) accentColor = '#FB7185';
        else if (n.isActive) accentColor = side === 'user' ? '#38BDF8' : '#34D399';
        else if (n.isVisited) accentColor = side === 'user' ? 'rgba(56, 189, 248, 0.85)' : '#34D399';

        // 1. Node circle (flat matte dark surface with clean accent stroke)
        ctx.beginPath();
        ctx.arc(n.x, n.y, nodeR, 0, Math.PI * 2);
        ctx.fillStyle = n.isDiverged
          ? 'rgba(251, 113, 133, 0.15)'
          : n.isActive
          ? side === 'user' ? 'rgba(56, 189, 248, 0.18)' : 'rgba(52, 211, 153, 0.18)'
          : '#161B26';
        ctx.fill();
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = n.isActive || n.isDiverged ? 2 : 1.4;
        ctx.stroke();

        // Node ID label
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '700 12px var(--font-mono, monospace)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(n.id), n.x, n.y);

        // 2. Compute collision-free outside direction away from edges
        let dirX = 0;
        let dirY = -1;

        if (V === 4) {
          if (n.id === 0) { dirX = -1; dirY = 0; }
          else if (n.id === 1) { dirX = 0; dirY = -1; }
          else if (n.id === 2) { dirX = 0; dirY = 1; }
          else if (n.id === 3) { dirX = 1; dirY = 0; }
        } else if (V === 5) {
          if (n.id === 0) { dirX = -1; dirY = 0; }
          else if (n.id === 1) { dirX = 0; dirY = -1; }
          else if (n.id === 2) { dirX = 0; dirY = 1; }
          else if (n.id === 3) { dirX = 0; dirY = 1; }
          else if (n.id === 4) { dirX = 1; dirY = 0; }
        } else if (V === 8) {
          if (n.id === 0) { dirX = -1; dirY = 0; }
          else if (n.id === 1) { dirX = 0; dirY = -1; }
          else if (n.id === 2) { dirX = 0; dirY = 1; }
          else if (n.id === 3) { dirX = 0; dirY = -1; }
          else if (n.id === 4) { dirX = 0; dirY = 1; }
          else if (n.id === 5) { dirX = 0.5; dirY = -1; }
          else if (n.id === 6) { dirX = 0.5; dirY = 1; }
          else if (n.id === 7) { dirX = 1; dirY = 0; }
        } else {
          // Outward radial fallback from pane center
          const paneCenterX = side === 'user' ? cssWidth * 0.25 : cssWidth * 0.75;
          const dX = n.x - paneCenterX;
          const dY = n.y - graphCenterY;
          dirX = dX;
          dirY = dY;
        }

        const dirLen = Math.hypot(dirX, dirY) || 1;
        const udx = dirX / dirLen;
        const udy = dirY / dirLen;

        // Distance pill positioned outside the node perimeter away from edges
        const pillW = 32;
        const pillH = 16;
        const pillRadiusInDir = Math.hypot((pillW / 2) * udx, (pillH / 2) * udy);
        const labelDist = nodeR + pillRadiusInDir + 6;
        let pillX = n.x + udx * labelDist;
        let pillY = n.y + udy * labelDist;

        // Keep inside pane bounds with margin
        const paneLeft = side === 'user' ? 4 : halfWidth + 4;
        const paneRight = side === 'user' ? halfWidth - 4 : cssWidth - 4;
        pillX = Math.max(paneLeft + pillW / 2, Math.min(paneRight - pillW / 2, pillX));
        pillY = Math.max(graphTop + pillH / 2, Math.min(dockY - pillH / 2, pillY));

        const isTargetSettled = n.dist !== Infinity && n.id === V - 1 && side === 'oracle' && frameIdx >= effectiveDivergenceIdx;

        ctx.fillStyle = n.isDiverged
          ? 'rgba(251, 113, 133, 0.25)'
          : isTargetSettled
          ? 'rgba(52, 211, 153, 0.25)'
          : 'rgba(22, 27, 38, 0.95)';
        ctx.beginPath();
        ctx.roundRect(pillX - pillW / 2, pillY - pillH / 2, pillW, pillH, 5);
        ctx.fill();

        ctx.strokeStyle = n.isDiverged
          ? '#FB7185'
          : isTargetSettled
          ? '#34D399'
          : n.isActive
          ? accentColor
          : 'rgba(255, 255, 255, 0.18)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = n.isDiverged
          ? '#FB7185'
          : isTargetSettled
          ? '#34D399'
          : n.dist === Infinity
          ? '#94A3B8' // Raised contrast for unvisited d=∞
          : '#F8FAFC';
        ctx.font = '700 9.5px var(--font-mono, monospace)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const distStr = n.dist === Infinity ? 'd=∞' : `d=${n.dist}`;
        ctx.fillText(distStr, pillX, pillY);
      };

      // Draw Left & Right Nodes
      leftNodes.forEach((n) => renderNodeWithDistancePill(n, 'user'));
      rightNodes.forEach((n) => renderNodeWithDistancePill(n, 'oracle'));

      // -----------------------------------------------------------------------
      // 4. BOTTOM MEMORY DOCK (Compact 72px macOS Live Memory & Min-Heap Dock)
      // -----------------------------------------------------------------------
      const drawMemoryDock = (
        startX: number,
        dockWidth: number,
        state: GraphStateData,
        side: 'user' | 'oracle'
      ) => {
        const pad = 12;
        const cardX = startX + pad;
        const cardY = dockY + 2;
        const cardW = dockWidth - pad * 2;
        const cardH = dockHeight - 4;

        // Frosted card container
        ctx.fillStyle = 'rgba(22, 27, 38, 0.85)';
        ctx.beginPath();
        ctx.roundRect(cardX, cardY, cardW, cardH, 10);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Top specular inner highlight line
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.beginPath();
        ctx.moveTo(cardX + 10, cardY + 1);
        ctx.lineTo(cardX + cardW - 10, cardY + 1);
        ctx.stroke();

        // Header labels
        ctx.font = '700 8.5px var(--font-mono, monospace)';
        ctx.fillStyle = isAtDivergence && side === 'user' ? '#FB7185' : isAtDivergence && side === 'oracle' ? '#34D399' : '#94A3B8';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        const distLabel = isAtDivergence
          ? (side === 'user' ? `dist[0..${V - 1}] • DIFF` : `dist[0..${V - 1}] • OPTIMAL`)
          : `dist[0..${V - 1}]`;
        ctx.fillText(distLabel, cardX + 10, cardY + 11);

        ctx.fillStyle = '#94A3B8';
        ctx.textAlign = 'right';
        ctx.fillText('MIN-HEAP', cardX + cardW - 10, cardY + 11);

        // dist[0..V-1] Array Cells
        const cellCount = V;
        const availForCells = cardW * 0.48;
        const cellSpacing = 3;
        const cellW = Math.max(16, Math.min((availForCells - (cellCount - 1) * cellSpacing - 10) / cellCount, 32));
        const cellH = 22;
        const cellsStartX = cardX + 8;
        const cellsStartY = cardY + 25;

        for (let i = 0; i < cellCount; i++) {
          const cx = cellsStartX + i * (cellW + cellSpacing);
          const cy = cellsStartY;
          const val = state.dist[i] !== undefined ? state.dist[i] : (i === 0 ? 0 : Infinity);
          const isUpdated = state.updatedIdx.includes(i);
          const isDiverged = state.divergedIdx.includes(i);
          const isOptimalDiff = side === 'oracle' && isAtDivergence && i === V - 1;

          // Array index label above cell
          ctx.fillStyle = '#64748B';
          ctx.font = '700 7px var(--font-mono, monospace)';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.fillText(`[${i}]`, cx + cellW / 2, cy - 1);

          // Cell box
          ctx.fillStyle = isDiverged
            ? 'rgba(251, 113, 133, 0.25)'
            : (isOptimalDiff || isUpdated)
            ? 'rgba(52, 211, 153, 0.25)'
            : 'rgba(255, 255, 255, 0.04)';
          ctx.beginPath();
          ctx.roundRect(cx, cy, cellW, cellH, 4);
          ctx.fill();

          ctx.strokeStyle = isDiverged
            ? '#FB7185'
            : (isOptimalDiff || isUpdated)
            ? '#34D399'
            : 'rgba(255, 255, 255, 0.1)';
          ctx.lineWidth = isDiverged || isOptimalDiff || isUpdated ? 1.5 : 1;
          ctx.stroke();

          // Value inside cell
          ctx.fillStyle = isDiverged
            ? '#FB7185'
            : (isOptimalDiff || isUpdated)
            ? '#34D399'
            : val === Infinity
            ? '#64748B'
            : '#F8FAFC';
          ctx.font = cellCount > 6 ? '700 8.5px var(--font-mono, monospace)' : '700 9.5px var(--font-mono, monospace)';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(val === Infinity ? '∞' : String(val), cx + cellW / 2, cy + cellH / 2);
        }

        // Priority Queue (Min-Heap) Tuples
        const pqStartX = cardX + cardW * 0.52;
        const pqY = cellsStartY;
        const pqW = cardW * 0.46;
        const pqH = 22;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.roundRect(pqStartX, pqY, pqW, pqH, 4);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        if (state.pq.length === 0) {
          ctx.fillStyle = '#64748B';
          ctx.font = '8px var(--font-mono, monospace)';
          ctx.fillText('Empty', pqStartX + 6, pqY + pqH / 2);
        } else {
          ctx.font = '700 7.5px var(--font-mono, monospace)';
          let offsetX = pqStartX + 4;
          state.pq.forEach((item) => {
            const badgeText = `(v:${item.u}, d:${item.d})`;
            const textWidth = ctx.measureText(badgeText).width + 5;
            ctx.fillStyle = side === 'user' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(52, 211, 153, 0.15)';
            ctx.beginPath();
            ctx.roundRect(offsetX, pqY + 2, textWidth, pqH - 4, 3);
            ctx.fill();
            ctx.strokeStyle = side === 'user' ? 'rgba(56, 189, 248, 0.4)' : 'rgba(52, 211, 153, 0.4)';
            ctx.stroke();

            ctx.fillStyle = side === 'user' ? '#38BDF8' : '#34D399';
            ctx.fillText(badgeText, offsetX + 2.5, pqY + pqH / 2);
            offsetX += textWidth + 3;
          });
        }
      };

      // Draw Left & Right Memory Docks
      drawMemoryDock(0, halfWidth, userState, 'user');
      drawMemoryDock(halfWidth, halfWidth, oracleState, 'oracle');

      // -----------------------------------------------------------------------
      // 5. MOUSE-HOVER INSPECTION TOOLTIP (Glass acrylic inspection card)
      // -----------------------------------------------------------------------
      if (hoveredNodeRef.current) {
        const { node, screenX, screenY, side } = hoveredNodeRef.current;
        const tipW = 160;
        const tipH = 74;
        let tipX = screenX + 16;
        let tipY = screenY - 40;

        if (tipX + tipW > cssWidth - 10) tipX = screenX - tipW - 16;
        if (tipY < 40) tipY = 40;

        ctx.fillStyle = 'rgba(14, 17, 23, 0.95)';
        ctx.beginPath();
        ctx.roundRect(tipX, tipY, tipW, tipH, 8);
        ctx.fill();
        ctx.strokeStyle = side === 'user' ? 'rgba(56, 189, 248, 0.4)' : 'rgba(52, 211, 153, 0.4)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.beginPath();
        ctx.moveTo(tipX + 8, tipY + 1);
        ctx.lineTo(tipX + tipW - 8, tipY + 1);
        ctx.stroke();

        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.font = '700 10px var(--font-mono, monospace)';
        ctx.fillStyle = side === 'user' ? '#38BDF8' : '#34D399';
        ctx.fillText(`Node Vertex #${node.id} (${side.toUpperCase()})`, tipX + 10, tipY + 10);

        ctx.font = '9px var(--font-mono, monospace)';
        ctx.fillStyle = '#CBD5E1';
        ctx.fillText(`Distance: ${node.dist === Infinity ? '∞' : node.dist}`, tipX + 10, tipY + 26);
        ctx.fillText(`Parent: ${node.parent !== null ? `Vertex #${node.parent}` : 'Root / None'}`, tipX + 10, tipY + 40);
        ctx.fillText(`State: ${node.isActive ? 'Active Frontier' : node.isVisited ? 'Settled' : 'Unvisited'}`, tipX + 10, tipY + 54);
      }
    } else if (visualizerType === 'two_pointers' || category === 'two_pointers') {
      // Two Pointers Bar Visualizer
      const sampleHeights = [1, 8, 6, 2, 5, 4, 8, 3, 7];
      const barWidth = 24;
      const startX = 30;
      const baseY = cssHeight - 50;

      sampleHeights.forEach((h, i) => {
        const bx = startX + i * (barWidth + 6);
        const bh = h * 16;
        const isPointer = i === 1 || i === 8;

        ctx.fillStyle = isPointer ? (isAtDivergence ? '#FB7185' : '#38BDF8') : '#161B26';
        ctx.fillRect(bx, baseY - bh, barWidth, bh);
        ctx.strokeStyle = isPointer ? '#38BDF8' : 'rgba(255, 255, 255, 0.08)';
        ctx.strokeRect(bx, baseY - bh, barWidth, bh);

        ctx.fillStyle = '#94A3B8';
        ctx.font = '10px var(--font-mono, monospace)';
        ctx.fillText(String(h), bx + 8, baseY + 14);
      });

      sampleHeights.forEach((h, i) => {
        const bx = halfWidth + startX + i * (barWidth + 6);
        const bh = h * 16;
        const isPointer = i === 1 || i === 8;

        ctx.fillStyle = isPointer ? '#34D399' : '#161B26';
        ctx.fillRect(bx, baseY - bh, barWidth, bh);
        ctx.strokeStyle = isPointer ? '#34D399' : 'rgba(255, 255, 255, 0.08)';
        ctx.strokeRect(bx, baseY - bh, barWidth, bh);

        ctx.fillStyle = '#94A3B8';
        ctx.font = '10px var(--font-mono, monospace)';
        ctx.fillText(String(h), bx + 8, baseY + 14);
      });
    }

    ctx.restore();
  }, [category, visualizerType, maxFrames, divergenceFrameIndex, V, hasRun, userTitle, loadedPreset, rawEdges]);

  const animateRef = useRef<((timestamp: number) => void) | null>(null);

  // Main 60 FPS animation loop with requestAnimationFrame
  useEffect(() => {
    animateRef.current = (timestamp: number) => {
      if (!isPlayingRef.current) return;

      const interval = 1000 / (15 * speedRef.current);
      if (timestamp - lastTickTimeRef.current >= interval) {
        lastTickTimeRef.current = timestamp;

        if (currentFrameRef.current < maxFrames - 1) {
          currentFrameRef.current += 1;
          playTick();
          if (onFrameChangeRef.current) {
            onFrameChangeRef.current(currentFrameRef.current, maxFrames);
          }
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('algoarena:scrub', {
                detail: { frame: currentFrameRef.current, source: 'visualizer' },
              })
            );
          }
        } else {
          isPlayingRef.current = false;
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('algoarena:play_toggle', {
                detail: { playing: false, speed: speedRef.current },
              })
            );
          }
        }
        renderFrame();
      }

      if (isPlayingRef.current && animateRef.current) {
        rafIdRef.current = requestAnimationFrame(animateRef.current);
      }
    };
  }, [maxFrames, renderFrame]);

  // ResizeObserver for fluid 60 FPS pane resizing, layout mode switching, and Retina scaling
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateSize = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      renderFrame();
    };

    updateSize();

    const resizeObserver = new ResizeObserver(() => {
      updateSize();
    });

    resizeObserver.observe(canvas);
    window.addEventListener('resize', updateSize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, [renderFrame]);

  // Initial draw & redraw on graph input or run change
  useEffect(() => {
    renderFrame();
  }, [renderFrame, V, hasRun]);

  // Mouse move and leave listeners for floating inspection tooltip
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const nodes = lastNodesRef.current;
      if (!nodes) return;

      let hovered: HoveredNodeInfo | null = null;
      for (const n of nodes.left) {
        if (Math.hypot(mouseX - n.x, mouseY - n.y) <= 26) {
          hovered = { side: 'user', node: n, screenX: mouseX, screenY: mouseY };
          break;
        }
      }
      if (!hovered) {
        for (const n of nodes.right) {
          if (Math.hypot(mouseX - n.x, mouseY - n.y) <= 26) {
            hovered = { side: 'oracle', node: n, screenX: mouseX, screenY: mouseY };
            break;
          }
        }
      }

      hoveredNodeRef.current = hovered;
      renderFrame();
    };

    const handleMouseLeave = () => {
      hoveredNodeRef.current = null;
      renderFrame();
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [renderFrame]);

  // Scrub and play event listeners
  useEffect(() => {
    const handleScrub = (e: Event) => {
      const customEvent = e as CustomEvent<{ frame: number; source?: string }>;
      if (customEvent.detail?.source === 'visualizer') return;
      currentFrameRef.current = Math.min(Math.max(0, customEvent.detail?.frame || 0), maxFrames - 1);
      renderFrame();
      if (onFrameChangeRef.current) onFrameChangeRef.current(currentFrameRef.current, maxFrames);
    };

    const handlePlayToggle = (e: Event) => {
      const customEvent = e as CustomEvent<{ playing: boolean; speed: number }>;
      isPlayingRef.current = customEvent.detail?.playing || false;
      speedRef.current = customEvent.detail?.speed || 1;
      if (isPlayingRef.current && animateRef.current) {
        lastTickTimeRef.current = performance.now();
        rafIdRef.current = requestAnimationFrame(animateRef.current);
      } else if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };

    window.addEventListener('algoarena:scrub', handleScrub);
    window.addEventListener('algoarena:play_toggle', handlePlayToggle);

    return () => {
      window.removeEventListener('algoarena:scrub', handleScrub);
      window.removeEventListener('algoarena:play_toggle', handlePlayToggle);
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [maxFrames, renderFrame]);

  return (
    <div className="relative w-full h-full min-h-0 bg-[#0E1117] rounded-2xl overflow-hidden border border-white/10 flex flex-col shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_16px_36px_-12px_rgba(0,0,0,0.5)]">
      {/* Centered Empty State when !hasRun */}
      {!hasRun && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 select-none bg-[#0E1117]">
          <div className="flex flex-col items-center justify-center text-center p-8 rounded-2xl bg-[#161B26] border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_16px_36px_-12px_rgba(0,0,0,0.5)] max-w-sm w-full gap-4">
            <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <Play className="w-5 h-5 fill-current ml-0.5" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-sm font-semibold text-[#F3F4F6]">
                Trace Comparison
              </h3>
              <p className="text-xs text-[#9CA3AF] leading-relaxed font-sans">
                Run your code to compare your trace with the optimal solution.
              </p>
            </div>
            {onRun && (
              <button
                type="button"
                onClick={onRun}
                className="mt-1 px-4 py-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/[0.08] font-medium text-xs flex items-center gap-2 transition cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current text-sky-400" />
                <span>Run</span>
              </button>
            )}
          </div>
        </div>
      )}

      <canvas
        ref={canvasRef}
        data-testid="dual-trace-canvas"
        className="w-full h-full block flex-1 cursor-crosshair"
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}
