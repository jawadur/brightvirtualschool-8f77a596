
-- Drop the views (Security Definer View lint error)
DROP VIEW IF EXISTS public.tests_safe;
DROP VIEW IF EXISTS public.assignments_safe;
DROP FUNCTION IF EXISTS public._strip_answer_keys(jsonb);

-- Replace admin/teacher-only SELECT with open SELECT but column-restricted GRANTs
DROP POLICY IF EXISTS "tests staff read" ON public.tests;
DROP POLICY IF EXISTS "assignments staff read" ON public.assignments;
-- question_bank stays staff-only (no student paths read it)

CREATE POLICY "tests read all auth" ON public.tests
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "assignments read all auth" ON public.assignments
  FOR SELECT TO authenticated USING (true);

-- Column-level: hide the answer-bearing 'questions' column from authenticated.
REVOKE SELECT ON public.tests FROM authenticated;
GRANT SELECT (id, subject_id, unit_id, scope, title, description,
              duration_minutes, pass_threshold, metadata, created_at, program_code)
  ON public.tests TO authenticated;

REVOKE SELECT ON public.assignments FROM authenticated;
GRANT SELECT (id, lesson_id, subject_id, title, instructions, pass_threshold,
              due_in_days, metadata, created_at, program_code)
  ON public.assignments TO authenticated;

-- Admin/teacher helpers that include the full questions JSON.
CREATE OR REPLACE FUNCTION public.get_test_admin(_test_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r jsonb;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'teacher')) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  SELECT to_jsonb(t) INTO r FROM public.tests t WHERE t.id = _test_id;
  RETURN r;
END $$;
REVOKE ALL ON FUNCTION public.get_test_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_test_admin(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_assignment_admin(_assignment_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r jsonb;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'teacher')) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  SELECT to_jsonb(a) INTO r FROM public.assignments a WHERE a.id = _assignment_id;
  RETURN r;
END $$;
REVOKE ALL ON FUNCTION public.get_assignment_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_assignment_admin(uuid) TO authenticated;

-- Lock down helper exposed to PUBLIC
REVOKE ALL ON FUNCTION public._score_question(jsonb, jsonb) FROM PUBLIC;
