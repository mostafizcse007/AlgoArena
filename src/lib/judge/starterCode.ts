/**
 * Canonical Starter Code Templates for AlgoArena Problem Categories
 * Zero-AI Deterministic signatures matching exact function names and parameters.
 */

export const STARTER_CODE_TEMPLATES: Record<string, string> = {
  'dijkstra-shortest-path': 'function shortestPath(V, edges) {\n  // Return shortest distance from 0 to V - 1\n  return -1;\n}',
  'longest-increasing-subsequence': 'function lengthOfLIS(nums) {\n  // Return length of longest increasing subsequence\n  return 0;\n}',
  'container-with-most-water': 'function maxArea(height) {\n  // Two pointer solution\n  return 0;\n}',
  'activity-selection-intervals': 'function maxNonOverlapping(intervals) {\n  // Greedy selection\n  return 0;\n}',
  'sliding-window-maximum': 'function maxSlidingWindow(nums, k) {\n  // Monotonic deque solution\n  return [];\n}',
  // Category fallbacks
  graphs: 'function shortestPath(V, edges) {\n  // Return shortest distance from 0 to V - 1\n  return -1;\n}',
  dp: 'function lengthOfLIS(nums) {\n  // Return length of longest increasing subsequence\n  return 0;\n}',
  two_pointers: 'function maxArea(height) {\n  // Two pointer solution\n  return 0;\n}',
  greedy: 'function maxNonOverlapping(intervals) {\n  // Greedy selection\n  return 0;\n}',
  data_structures: 'function maxSlidingWindow(nums, k) {\n  // Monotonic deque solution\n  return [];\n}',
};

export function getBlankStarterCode(
  problem: {
    slug?: string;
    category?: string;
    starter_code?: Record<string, string>;
  } | null | undefined
): string {
  if (!problem) return STARTER_CODE_TEMPLATES.graphs;

  if (problem.starter_code?.blank && problem.starter_code.blank.trim().length > 0) {
    return problem.starter_code.blank;
  }
  if (problem.starter_code?.javascript && problem.starter_code.javascript.trim().length > 0) {
    return problem.starter_code.javascript;
  }
  if (problem.starter_code?.typescript && problem.starter_code.typescript.trim().length > 0) {
    return problem.starter_code.typescript;
  }

  if (problem.slug && STARTER_CODE_TEMPLATES[problem.slug]) {
    return STARTER_CODE_TEMPLATES[problem.slug];
  }
  if (problem.category && STARTER_CODE_TEMPLATES[problem.category]) {
    return STARTER_CODE_TEMPLATES[problem.category];
  }

  return STARTER_CODE_TEMPLATES.graphs;
}

