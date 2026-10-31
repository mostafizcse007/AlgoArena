-- Migration: 20261030000000_problem_complexity_metadata.sql
-- Add complexity and metadata columns to public.problems, store min-heap Dijkstra as O((V + E) log V)

ALTER TABLE public.problems ADD COLUMN IF NOT EXISTS complexity text;
ALTER TABLE public.problems ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- Populate problem complexities and metadata
UPDATE public.problems SET 
  complexity = 'O((V + E) log V)',
  metadata = jsonb_build_object('complexity', 'O((V + E) log V)', 'algorithm', 'min-heap Dijkstra')
WHERE slug = 'dijkstra-shortest-path';

UPDATE public.problems SET 
  complexity = 'O(N log N)',
  metadata = jsonb_build_object('complexity', 'O(N log N)', 'algorithm', 'Patience Sort Binary Search')
WHERE slug = 'longest-increasing-subsequence';

UPDATE public.problems SET 
  complexity = 'O(N)',
  metadata = jsonb_build_object('complexity', 'O(N)', 'algorithm', 'Two Pointers')
WHERE slug = 'container-with-most-water';

UPDATE public.problems SET 
  complexity = 'O(N log N)',
  metadata = jsonb_build_object('complexity', 'O(N log N)', 'algorithm', 'Greedy Sorting')
WHERE slug = 'activity-selection-intervals';

UPDATE public.problems SET 
  complexity = 'O(N)',
  metadata = jsonb_build_object('complexity', 'O(N)', 'algorithm', 'Monotonic Deque')
WHERE slug = 'sliding-window-maximum';

-- Update get_problem_eval_bundle RPC to return complexity and metadata
CREATE OR REPLACE FUNCTION public.get_problem_eval_bundle(p_problem_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prob record;
  v_secret_tests jsonb;
BEGIN
  SELECT * INTO v_prob FROM public.problems WHERE id = p_problem_id;
  IF NOT FOUND THEN
    RETURN null;
  END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', id,
    'input', input,
    'expected_output', expected_output
  )), '[]'::jsonb)
  INTO v_secret_tests
  FROM public.problem_secret_tests
  WHERE problem_id = p_problem_id;

  RETURN jsonb_build_object(
    'id', v_prob.id,
    'title', v_prob.title,
    'category', v_prob.category,
    'difficulty', v_prob.difficulty,
    'visualizer_type', v_prob.visualizer_type,
    'complexity', coalesce(v_prob.complexity, v_prob.metadata->>'complexity', 'O((V + E) log V)'),
    'metadata', coalesce(v_prob.metadata, jsonb_build_object('complexity', coalesce(v_prob.complexity, 'O((V + E) log V)'))),
    'oracle_solution', v_prob.oracle_solution,
    'buggy_sabotage_code', v_prob.buggy_sabotage_code,
    'input_validator', v_prob.input_validator,
    'public_samples', v_prob.public_samples,
    'secret_tests', v_secret_tests
  );
END;
$$;
