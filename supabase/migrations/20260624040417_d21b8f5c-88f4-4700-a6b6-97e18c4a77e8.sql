
-- 1. Schema: retake configuration columns
ALTER TABLE public.lesson_stages
  ADD COLUMN IF NOT EXISTS allow_retake boolean,
  ADD COLUMN IF NOT EXISTS retake_mode text,
  ADD COLUMN IF NOT EXISTS max_attempts integer,
  ADD COLUMN IF NOT EXISTS questions_per_attempt integer;

ALTER TABLE public.tests
  ADD COLUMN IF NOT EXISTS allow_retake boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS retake_mode text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS max_attempts integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS questions_per_attempt integer;

ALTER TABLE public.assignments
  ADD COLUMN IF NOT EXISTS allow_retake boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS retake_mode text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS max_attempts integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS questions_per_attempt integer;

ALTER TABLE public.tests
  ADD CONSTRAINT tests_retake_mode_chk CHECK (retake_mode IN ('none','same_questions','random_questions'));
ALTER TABLE public.assignments
  ADD CONSTRAINT assignments_retake_mode_chk CHECK (retake_mode IN ('none','same_questions','random_questions'));

-- Sensible defaults for existing practice stages
UPDATE public.lesson_stages
SET allow_retake = true,
    retake_mode = 'random_questions',
    max_attempts = NULL
WHERE stage_type IN ('guided','independent') AND allow_retake IS NULL;

-- Column grants so students keep reading the metadata fields they already could
GRANT SELECT (id, title, duration_minutes, pass_threshold, subject_id, scope, metadata,
              allow_retake, retake_mode, max_attempts, questions_per_attempt)
  ON public.tests TO authenticated;
GRANT SELECT (id, title, instructions, pass_threshold, lesson_id, subject_id, metadata, due_in_days,
              allow_retake, retake_mode, max_attempts, questions_per_attempt)
  ON public.assignments TO authenticated;

-- 2. Helper: subset questions when random mode
CREATE OR REPLACE FUNCTION public._maybe_random_subset(_questions jsonb, _mode text, _limit integer)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE total int := COALESCE(jsonb_array_length(_questions), 0);
        out jsonb;
BEGIN
  IF _mode <> 'random_questions' OR _limit IS NULL OR _limit <= 0 OR _limit >= total THEN
    RETURN _questions;
  END IF;
  SELECT jsonb_agg(q ORDER BY random()) INTO out
  FROM (
    SELECT q FROM jsonb_array_elements(_questions) q ORDER BY random() LIMIT _limit
  ) sub;
  RETURN COALESCE(out, '[]'::jsonb);
END $$;

-- 3. Updated get_test_for_student: include retake info + per-student stats
CREATE OR REPLACE FUNCTION public.get_test_for_student(_test_id uuid, _student_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
        attempts int := 0; best int := NULL; latest int := NULL;
        latest_passed boolean := NULL; remaining int := NULL;
        qs jsonb;
BEGIN
  SELECT t.id, t.title, t.duration_minutes, t.pass_threshold, t.subject_id,
         t.scope, t.metadata, t.allow_retake, t.retake_mode, t.max_attempts,
         t.questions_per_attempt, t.questions
  INTO r FROM public.tests t WHERE t.id = _test_id;
  IF r.id IS NULL THEN RAISE EXCEPTION 'test not found'; END IF;

  IF _student_id IS NOT NULL AND public.can_access_student(_student_id) THEN
    SELECT COUNT(*)::int,
           MAX(score),
           (ARRAY_AGG(score ORDER BY completed_at DESC NULLS LAST))[1]
      INTO attempts, best, latest
    FROM public.test_attempts
    WHERE student_profile_id = _student_id AND test_id = _test_id AND status = 'completed';
    SELECT (score >= COALESCE(r.pass_threshold,60)) INTO latest_passed
    FROM public.test_attempts
    WHERE student_profile_id = _student_id AND test_id = _test_id AND status='completed'
    ORDER BY completed_at DESC NULLS LAST LIMIT 1;
    IF r.max_attempts IS NOT NULL THEN remaining := GREATEST(r.max_attempts - attempts, 0); END IF;
  END IF;

  qs := public._maybe_random_subset(r.questions, r.retake_mode, r.questions_per_attempt);
  qs := public._strip_answer_keys(qs);

  RETURN jsonb_build_object(
    'id', r.id, 'title', r.title, 'duration_minutes', r.duration_minutes,
    'pass_threshold', r.pass_threshold, 'subject_id', r.subject_id,
    'scope', r.scope, 'metadata', r.metadata, 'questions', qs,
    'allow_retake', r.allow_retake, 'retake_mode', r.retake_mode,
    'max_attempts', r.max_attempts, 'questions_per_attempt', r.questions_per_attempt,
    'attempt_count', attempts, 'best_score', best, 'latest_score', latest,
    'latest_passed', latest_passed, 'attempts_remaining', remaining
  );
END $$;

-- 4. Updated get_assignment_for_student: same shape
CREATE OR REPLACE FUNCTION public.get_assignment_for_student(_assignment_id uuid, _student_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
        attempts int := 0; best int := NULL; latest int := NULL;
        latest_passed boolean := NULL; remaining int := NULL;
        qs jsonb;
BEGIN
  SELECT a.id, a.title, a.instructions, a.pass_threshold, a.lesson_id, a.subject_id,
         a.allow_retake, a.retake_mode, a.max_attempts, a.questions_per_attempt,
         a.questions
  INTO r FROM public.assignments a WHERE a.id = _assignment_id;
  IF r.id IS NULL THEN RAISE EXCEPTION 'assignment not found'; END IF;

  IF _student_id IS NOT NULL AND public.can_access_student(_student_id) THEN
    SELECT COUNT(*)::int,
           MAX(score),
           (ARRAY_AGG(score ORDER BY completed_at DESC NULLS LAST))[1]
      INTO attempts, best, latest
    FROM public.assignment_submissions
    WHERE student_profile_id = _student_id AND assignment_id = _assignment_id AND status='completed';
    SELECT (score >= COALESCE(r.pass_threshold,60)) INTO latest_passed
    FROM public.assignment_submissions
    WHERE student_profile_id = _student_id AND assignment_id = _assignment_id AND status='completed'
    ORDER BY completed_at DESC NULLS LAST LIMIT 1;
    IF r.max_attempts IS NOT NULL THEN remaining := GREATEST(r.max_attempts - attempts, 0); END IF;
  END IF;

  qs := public._maybe_random_subset(r.questions, r.retake_mode, r.questions_per_attempt);
  qs := public._strip_answer_keys(qs);

  RETURN jsonb_build_object(
    'id', r.id, 'title', r.title, 'instructions', r.instructions,
    'pass_threshold', r.pass_threshold, 'lesson_id', r.lesson_id,
    'subject_id', r.subject_id, 'questions', qs,
    'allow_retake', r.allow_retake, 'retake_mode', r.retake_mode,
    'max_attempts', r.max_attempts, 'questions_per_attempt', r.questions_per_attempt,
    'attempt_count', attempts, 'best_score', best, 'latest_score', latest,
    'latest_passed', latest_passed, 'attempts_remaining', remaining
  );
END $$;

-- 5. submit_test_attempt: enforce attempts, record attempt_number, return best
CREATE OR REPLACE FUNCTION public.submit_test_attempt(_student_id uuid, _test_id uuid, _answers jsonb,
                                                       _started_at timestamptz DEFAULT NULL, _auto boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t_questions jsonb; t_threshold int; t_allow boolean; t_max int;
        total int; correct int := 0; q jsonb; ans jsonb; idx int;
        score int; passed boolean; attempts int; attempt_no int; best int;
BEGIN
  IF NOT public.can_access_student(_student_id) THEN RAISE EXCEPTION 'not authorized'; END IF;
  SELECT questions, pass_threshold, allow_retake, max_attempts
    INTO t_questions, t_threshold, t_allow, t_max
  FROM public.tests WHERE id = _test_id;
  IF t_questions IS NULL THEN RAISE EXCEPTION 'test not found'; END IF;

  SELECT COUNT(*)::int INTO attempts
  FROM public.test_attempts
  WHERE student_profile_id=_student_id AND test_id=_test_id AND status='completed';

  IF attempts >= 1 AND NOT COALESCE(t_allow,false) THEN
    RAISE EXCEPTION 'retakes are not allowed for this test';
  END IF;
  IF t_max IS NOT NULL AND attempts >= t_max THEN
    RAISE EXCEPTION 'maximum attempts reached';
  END IF;

  total := COALESCE(jsonb_array_length(t_questions), 0);
  IF total > 0 THEN
    FOR idx IN 0 .. total - 1 LOOP
      q := t_questions->idx;
      ans := NULL;
      SELECT (a->'answer') INTO ans
      FROM jsonb_array_elements(COALESCE(_answers,'[]'::jsonb)) a
      WHERE (a->>'index')::int = idx LIMIT 1;
      IF public._score_question(q, ans) THEN correct := correct + 1; END IF;
    END LOOP;
  END IF;
  score := CASE WHEN total = 0 THEN 0 ELSE round(correct::numeric * 100 / total) END;
  passed := score >= COALESCE(t_threshold, 60);
  attempt_no := attempts + 1;

  INSERT INTO public.test_attempts(
    student_profile_id, test_id, answers, score, max_score, status,
    started_at, completed_at, metadata)
  VALUES (_student_id, _test_id, _answers, score, 100, 'completed',
    COALESCE(_started_at, now()), now(),
    jsonb_build_object('auto_submitted', _auto, 'correct', correct, 'total', total, 'attempt_number', attempt_no));

  SELECT MAX(score) INTO best FROM public.test_attempts
   WHERE student_profile_id=_student_id AND test_id=_test_id AND status='completed';

  RETURN jsonb_build_object('score', score, 'correct', correct, 'total', total, 'passed', passed,
                            'attempt_number', attempt_no, 'best_score', best,
                            'attempts_remaining', CASE WHEN t_max IS NULL THEN NULL ELSE GREATEST(t_max - attempt_no, 0) END);
END $$;

-- 6. submit_assignment: same gates
CREATE OR REPLACE FUNCTION public.submit_assignment(_student_id uuid, _assignment_id uuid, _answers jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a_questions jsonb; a_threshold int; a_allow boolean; a_max int;
        total int; correct int := 0; q jsonb; ans jsonb; idx int;
        score int; passed boolean; attempts int; attempt_no int; best int;
BEGIN
  IF NOT public.can_access_student(_student_id) THEN RAISE EXCEPTION 'not authorized'; END IF;
  SELECT questions, pass_threshold, allow_retake, max_attempts
    INTO a_questions, a_threshold, a_allow, a_max
  FROM public.assignments WHERE id = _assignment_id;
  IF a_questions IS NULL THEN RAISE EXCEPTION 'assignment not found'; END IF;

  SELECT COUNT(*)::int INTO attempts
  FROM public.assignment_submissions
  WHERE student_profile_id=_student_id AND assignment_id=_assignment_id AND status='completed';

  IF attempts >= 1 AND NOT COALESCE(a_allow,false) THEN
    RAISE EXCEPTION 'retakes are not allowed for this homework';
  END IF;
  IF a_max IS NOT NULL AND attempts >= a_max THEN
    RAISE EXCEPTION 'maximum attempts reached';
  END IF;

  total := COALESCE(jsonb_array_length(a_questions), 0);
  IF total > 0 THEN
    FOR idx IN 0 .. total - 1 LOOP
      q := a_questions->idx;
      ans := NULL;
      SELECT (x->'answer') INTO ans
      FROM jsonb_array_elements(COALESCE(_answers,'[]'::jsonb)) x
      WHERE (x->>'index')::int = idx LIMIT 1;
      IF public._score_question(q, ans) THEN correct := correct + 1; END IF;
    END LOOP;
  END IF;
  score := CASE WHEN total = 0 THEN 0 ELSE round(correct::numeric * 100 / total) END;
  passed := score >= COALESCE(a_threshold, 60);
  attempt_no := attempts + 1;

  INSERT INTO public.assignment_submissions(
    student_profile_id, assignment_id, answers, score, max_score, status,
    completed_at, metadata)
  VALUES (_student_id, _assignment_id, _answers, score, 100, 'completed', now(),
    jsonb_build_object('correct', correct, 'total', total, 'attempt_number', attempt_no));

  SELECT MAX(score) INTO best FROM public.assignment_submissions
   WHERE student_profile_id=_student_id AND assignment_id=_assignment_id AND status='completed';

  RETURN jsonb_build_object('score', score, 'correct', correct, 'total', total, 'passed', passed,
                            'attempt_number', attempt_no, 'best_score', best,
                            'attempts_remaining', CASE WHEN a_max IS NULL THEN NULL ELSE GREATEST(a_max - attempt_no, 0) END);
END $$;
