export type Tier = 'Newbie' | 'Pupil' | 'Specialist' | 'Expert' | 'Grandmaster';

export interface SkillRadar {
  graphs: number;
  dp: number;
  greedy: number;
  two_pointers: number;
  data_structures: number;
}

export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  university: string;
  bio: string | null;
  avatar_url: string | null;
  elo: number;
  peak_elo: number;
  tier: Tier;
  matches_played: number;
  matches_won: number;
  hacks_landed: number;
  hacks_defended: number;
  skills: SkillRadar;
  created_at: string;
  updated_at: string;
}

export interface PublicSample {
  id: number;
  input: Record<string, unknown>;
  expected_output: unknown;
  explanation?: string;
}

export interface SecretTest {
  id: string;
  input: Record<string, unknown>;
  expected_output: unknown;
}

export interface Problem {
  id: string;
  slug: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  category: 'graphs' | 'dp' | 'greedy' | 'two_pointers' | 'data_structures';
  description: string;
  constraints: Record<string, string>;
  public_samples: PublicSample[];
  starter_code: Record<string, string>;
  oracle_solution: string;
  visualizer_type: 'graph' | 'dp_grid' | 'two_pointers';
  complexity?: string;
  metadata?: Record<string, unknown> & { complexity?: string; algorithm?: string };
  buggy_sabotage_code: string;
  input_validator: string;
  created_at: string;
}

export interface ProblemEvalBundle {
  id: string;
  title: string;
  category: Problem['category'];
  difficulty: Problem['difficulty'];
  visualizer_type: Problem['visualizer_type'];
  complexity?: string;
  metadata?: Record<string, unknown> & { complexity?: string; algorithm?: string };
  starter_code?: Record<string, string>;
  oracle_solution: string;
  buggy_sabotage_code: string;
  input_validator: string;
  public_samples: PublicSample[];
  secret_tests: SecretTest[];
}

export interface Match {
  id: string;
  problem_id: string;
  player1_id: string;
  player2_id: string | null;
  mode: 'ranked_1v1' | 'custom_duel' | 'sabotage';
  room_code: string | null;
  status: 'waiting' | 'in_progress' | 'completed' | 'forfeited' | 'cancelled';
  started_at: string;
  ends_at: string;
  winner_id: string | null;
  player1_elo_before: number;
  player2_elo_before: number | null;
  player1_elo_delta: number | null;
  player2_elo_delta: number | null;
  replay_trace: TraceFrame[] | null;
  created_at: string;
  // Joined fields
  problem?: Problem;
  player1?: Profile;
  player2?: Profile | null;
}

export type TraceStepType =
  | 'POINTER_MOVE'
  | 'ARRAY_COMPARE'
  | 'VISIT_NODE'
  | 'UPDATE_DIST'
  | 'PUSH_HEAP'
  | 'POP_HEAP'
  | 'GRID_CELL'
  | 'DIVERGENCE'
  | 'RETURN';

export interface TraceFrame {
  step: number;
  type: TraceStepType;
  description: string;
  activePointers?: Record<string, number>;
  activeNodes?: number[];
  visitedNodes?: number[];
  highlightElements?: number[];
  gridCoords?: [number, number];
  variables?: Record<string, unknown>;
  isDivergence?: boolean;
}

export interface JudgeTestResult {
  testId: string | number;
  passed: boolean;
  input: unknown;
  expected: unknown;
  actual: unknown;
  executionTimeMs: number;
  ops?: number;
  traces: TraceFrame[];
  error?: string;
}

export interface JudgeResult {
  status: 'passed' | 'failed' | 'tle' | 'oom' | 'error';
  testsPassed: number;
  totalTests: number;
  executionTimeMs: number;
  measuredOps?: number;
  results: JudgeTestResult[];
  firstFailingTest?: JudgeTestResult;
  error?: string;
}

export interface DuelHeatmapDay {
  date: string; // YYYY-MM-DD
  count: number;
}
