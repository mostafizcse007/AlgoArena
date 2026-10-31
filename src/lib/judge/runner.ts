import type { JudgeResult } from '@/lib/types/arena';

export async function runJudge(
  code: string,
  tests: Array<{ id: string | number; input: Record<string, unknown>; expected_output: unknown }>,
  category: string = 'graphs'
): Promise<JudgeResult> {
  if (typeof window === 'undefined') {
    return {
      status: 'error',
      testsPassed: 0,
      totalTests: tests.length,
      executionTimeMs: 0,
      results: [],
      error: 'Judge runner must run in client-side Web Worker environment.',
    };
  }

  return new Promise((resolve) => {
    let worker: Worker | null = null;
    let isTerminated = false;

    // Hard 500ms TLE Kill Switch
    const tleTimer = setTimeout(() => {
      if (!isTerminated && worker) {
        isTerminated = true;
        worker.terminate();
        resolve({
          status: 'tle',
          testsPassed: 0,
          totalTests: tests.length,
          executionTimeMs: 500,
          results: [],
          error: 'Time Limit Exceeded: Execution took longer than 500ms limit.',
        });
      }
    }, 500);

    try {
      worker = new Worker(new URL('../../workers/judge.worker.ts', import.meta.url), {
        type: 'module',
      });

      worker.onmessage = (e: MessageEvent) => {
        if (isTerminated) return;
        clearTimeout(tleTimer);
        isTerminated = true;
        worker?.terminate();

        if (e.data.type === 'JUDGE_RESULT') {
          resolve(e.data.result);
        } else {
          resolve({
            status: 'error',
            testsPassed: 0,
            totalTests: tests.length,
            executionTimeMs: 0,
            results: [],
            error: 'Unknown worker response format.',
          });
        }
      };

      worker.onerror = (err) => {
        if (isTerminated) return;
        clearTimeout(tleTimer);
        isTerminated = true;
        worker?.terminate();
        resolve({
          status: 'error',
          testsPassed: 0,
          totalTests: tests.length,
          executionTimeMs: 0,
          results: [],
          error: err.message || 'Worker runtime error.',
        });
      };

      worker.postMessage({
        type: 'RUN_TESTS',
        code,
        tests,
        category,
      });
    } catch (err: unknown) {
      clearTimeout(tleTimer);
      if (worker) worker.terminate();
      resolve({
        status: 'error',
        testsPassed: 0,
        totalTests: tests.length,
        executionTimeMs: 0,
        results: [],
        error: err instanceof Error ? err.message : 'Failed to instantiate Web Worker.',
      });
    }
  });
}

