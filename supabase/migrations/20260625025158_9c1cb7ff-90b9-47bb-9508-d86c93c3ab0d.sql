-- ============================================================
-- AI QUESTION BANK GENERATOR — schema, helpers, RPCs, analytics
-- ============================================================

-- 1. ai_question_pool
CREATE TABLE IF NOT EXISTS public.ai_question_pool (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  class_id uuid REFERENCES public.classes(id) ON DELETE CASCADE,
  unit_id uuid REFERENCES public.units(id) ON DELETE CASCADE,
  lesson_id uuid REFERENCES public.lessons(id) ON DELETE CASCADE,
  stage_id uuid REFERENCES public.lesson_stages(id) ON DELETE CASCADE,
  topic text,
  difficulty text NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy','medium','hard')),
  language text NOT NULL DEFAULT 'en',
  question_type text NOT NULL,
  payload jsonb NOT NULL,
  source text NOT NULL DEFAULT 'ai' CHECK (source IN ('ai','manual_imported')),
  generated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  generation_model text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_aiqp_lookup
  ON public.ai_question_pool(subject_id, lesson_id, stage_id, difficulty);
CREATE INDEX IF NOT EXISTS idx_aiqp_topic
  ON public.ai_question_pool(subject_id, topic);

GRANT SELECT ON public.ai_question_pool TO authenticated;
GRANT ALL ON public.ai_question_pool TO service_role;

ALTER TABLE public.ai_question_pool ENABLE ROW LEVEL SECURITY;

-- Only admins/teachers can SELECT directly. Students must use helpers.
CREATE POLICY "Staff read pool"
  ON public.ai_question_pool FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'teacher'));

CREATE POLICY "Staff write pool"
  ON public.ai_question_pool FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'teacher'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'teacher'));

CREATE TRIGGER trg_aiqp_updated_at BEFORE UPDATE ON public.ai_question_pool
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. student_question_history
CREATE TABLE IF NOT EXISTS public.student_question_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_profile_id uuid NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  question_pool_id uuid NOT NULL REFERENCES public.ai_question_pool(id) ON DELETE CASCADE,
  lesson_id uuid,
  topic text,
  shown_count int NOT NULL DEFAULT 0,
  correct_count int NOT NULL DEFAULT 0,
  incorrect_count int NOT NULL DEFAULT 0,
  last_shown_at timestamptz,
  last_answered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_profile_id, question_pool_id)
);

CREATE INDEX IF NOT EXISTS idx_sqh_student ON public.student_question_history(student_profile_id, last_shown_at);
CREATE INDEX IF NOT EXISTS idx_sqh_topic ON public.student_question_history(student_profile_id, topic);

GRANT SELECT, INSERT, UPDATE ON public.student_question_history TO authenticated;
GRANT ALL ON public.student_question_history TO service_role;

ALTER TABLE public.student_question_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Student/owner read history"
  ON public.student_question_history FOR SELECT TO authenticated
  USING (public.can_access_student(student_profile_id)
         OR public.has_role(auth.uid(),'admin')
         OR public.has_role(auth.uid(),'teacher'));

CREATE TRIGGER trg_sqh_updated_at BEFORE UPDATE ON public.student_question_history
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. lesson_stages config columns
ALTER TABLE public.lesson_stages
  ADD COLUMN IF NOT EXISTS question_source text NOT NULL DEFAULT 'manual'
    CHECK (question_source IN ('manual','ai','mixed')),
  ADD COLUMN IF NOT EXISTS ai_question_count int NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS ai_difficulty text NOT NULL DEFAULT 'medium'
    CHECK (ai_difficulty IN ('easy','medium','hard','adaptive')),
  ADD COLUMN IF NOT EXISTS ai_randomize boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ai_adaptive boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_weak_area_practice boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ai_show_explanation boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ai_topics jsonb DEFAULT '[]'::jsonb;

-- 4. tests / assignments config columns
ALTER TABLE public.tests
  ADD COLUMN IF NOT EXISTS question_source text NOT NULL DEFAULT 'manual'
    CHECK (question_source IN ('manual','ai','mixed')),
  ADD COLUMN IF NOT EXISTS ai_topics jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS ai_question_count int DEFAULT 10,
  ADD COLUMN IF NOT EXISTS ai_difficulty text DEFAULT 'medium';

ALTER TABLE public.assignments
  ADD COLUMN IF NOT EXISTS question_source text NOT NULL DEFAULT 'manual'
    CHECK (question_source IN ('manual','ai','mixed')),
  ADD COLUMN IF NOT EXISTS ai_topics jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS ai_question_count int DEFAULT 10,
  ADD COLUMN IF NOT EXISTS ai_difficulty text DEFAULT 'medium';

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Strip answer keys from a single payload (object form)
CREATE OR REPLACE FUNCTION public._strip_payload_answer(_p jsonb)
RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT (_p - 'answer' - 'mapping')
$$;

-- Fetch and merge AI pool questions for a test/assignment, returning stripped
-- payloads each tagged with their pool_id so submit can re-resolve answers.
CREATE OR REPLACE FUNCTION public._fetch_ai_pool_for(
  _subject_id uuid, _lesson_id uuid, _topics jsonb,
  _difficulty text, _count int
) RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path = public AS $$
DECLARE result jsonb;
        topic_filter text[];
BEGIN
  IF _count IS NULL OR _count <= 0 THEN RETURN '[]'::jsonb; END IF;
  IF _topics IS NOT NULL AND jsonb_typeof(_topics) = 'array' AND jsonb_array_length(_topics) > 0 THEN
    SELECT array_agg(value::text) INTO topic_filter
    FROM jsonb_array_elements_text(_topics);
  END IF;

  SELECT jsonb_agg(
    public._strip_payload_answer(q.payload)
      || jsonb_build_object('pool_id', q.id, 'type', q.question_type)
  ) INTO result
  FROM (
    SELECT id, payload, question_type
    FROM public.ai_question_pool
    WHERE subject_id = _subject_id
      AND (_lesson_id IS NULL OR lesson_id = _lesson_id OR lesson_id IS NULL)
      AND (_difficulty IS NULL OR _difficulty = 'adaptive' OR difficulty = _difficulty)
      AND (topic_filter IS NULL OR topic = ANY(topic_filter))
    ORDER BY random()
    LIMIT _count
  ) q;

  RETURN COALESCE(result, '[]'::jsonb);
END $$;

-- ============================================================
-- get_test_for_student — merge AI pool when configured
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_test_for_student(_test_id uuid, _student_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
        attempts int := 0; best int := NULL; latest int := NULL;
        latest_passed boolean := NULL; remaining int := NULL;
        qs jsonb; ai_qs jsonb;
BEGIN
  SELECT t.id, t.title, t.duration_minutes, t.pass_threshold, t.subject_id,
         t.scope, t.metadata, t.allow_retake, t.retake_mode, t.max_attempts,
         t.questions_per_attempt, t.questions,
         t.question_source, t.ai_topics, t.ai_question_count, t.ai_difficulty
  INTO r FROM public.tests t WHERE t.id = _test_id;
  IF r.id IS NULL THEN RAISE EXCEPTION 'test not found'; END IF;

  IF _student_id IS NOT NULL AND public.can_access_student(_student_id) THEN
    SELECT COUNT(*)::int, MAX(score),
           (ARRAY_AGG(score ORDER BY completed_at DESC NULLS LAST))[1]
      INTO attempts, best, latest
    FROM public.test_attempts
    WHERE student_profile_id = _student_id AND test_id = _test_id AND status='completed';
    SELECT (score >= COALESCE(r.pass_threshold,60)) INTO latest_passed
    FROM public.test_attempts
    WHERE student_profile_id = _student_id AND test_id = _test_id AND status='completed'
    ORDER BY completed_at DESC NULLS LAST LIMIT 1;
    IF r.max_attempts IS NOT NULL THEN remaining := GREATEST(r.max_attempts - attempts, 0); END IF;
  END IF;

  qs := public._maybe_random_subset(r.questions, r.retake_mode, r.questions_per_attempt);
  qs := public._strip_answer_keys(qs);

  IF r.question_source IN ('ai','mixed') THEN
    ai_qs := public._fetch_ai_pool_for(r.subject_id, NULL, r.ai_topics,
                                       r.ai_difficulty, COALESCE(r.ai_question_count, 10));
    IF r.question_source = 'ai' THEN
      qs := ai_qs;
    ELSE
      qs := COALESCE(qs,'[]'::jsonb) || COALESCE(ai_qs,'[]'::jsonb);
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'id', r.id, 'title', r.title, 'duration_minutes', r.duration_minutes,
    'pass_threshold', r.pass_threshold, 'subject_id', r.subject_id,
    'scope', r.scope, 'metadata', r.metadata, 'questions', qs,
    'allow_retake', r.allow_retake, 'retake_mode', r.retake_mode,
    'max_attempts', r.max_attempts, 'questions_per_attempt', r.questions_per_attempt,
    'attempt_count', attempts, 'best_score', best, 'latest_score', latest,
    'latest_passed', latest_passed, 'attempts_remaining', remaining,
    'question_source', r.question_source
  );
END $$;

-- ============================================================
-- get_assignment_for_student — merge AI pool when configured
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_assignment_for_student(_assignment_id uuid, _student_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
        attempts int := 0; best int := NULL; latest int := NULL;
        latest_passed boolean := NULL; remaining int := NULL;
        qs jsonb; ai_qs jsonb;
BEGIN
  SELECT a.id, a.title, a.instructions, a.pass_threshold, a.lesson_id, a.subject_id,
         a.allow_retake, a.retake_mode, a.max_attempts, a.questions_per_attempt,
         a.questions, a.question_source, a.ai_topics, a.ai_question_count, a.ai_difficulty
  INTO r FROM public.assignments a WHERE a.id = _assignment_id;
  IF r.id IS NULL THEN RAISE EXCEPTION 'assignment not found'; END IF;

  IF _student_id IS NOT NULL AND public.can_access_student(_student_id) THEN
    SELECT COUNT(*)::int, MAX(score),
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

  IF r.question_source IN ('ai','mixed') THEN
    ai_qs := public._fetch_ai_pool_for(r.subject_id, r.lesson_id, r.ai_topics,
                                       r.ai_difficulty, COALESCE(r.ai_question_count, 10));
    IF r.question_source = 'ai' THEN
      qs := ai_qs;
    ELSE
      qs := COALESCE(qs,'[]'::jsonb) || COALESCE(ai_qs,'[]'::jsonb);
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'id', r.id, 'title', r.title, 'instructions', r.instructions,
    'pass_threshold', r.pass_threshold, 'lesson_id', r.lesson_id,
    'subject_id', r.subject_id, 'questions', qs,
    'allow_retake', r.allow_retake, 'retake_mode', r.retake_mode,
    'max_attempts', r.max_attempts, 'questions_per_attempt', r.questions_per_attempt,
    'attempt_count', attempts, 'best_score', best, 'latest_score', latest,
    'latest_passed', latest_passed, 'attempts_remaining', remaining,
    'question_source', r.question_source
  );
END $$;

-- ============================================================
-- Score a single question given the stored question and a student answer.
-- Reuses _score_question internally.
-- ============================================================

-- ============================================================
-- submit_test_attempt — score answers including pool_id answers
-- ============================================================
CREATE OR REPLACE FUNCTION public.submit_test_attempt(
  _student_id uuid, _test_id uuid, _answers jsonb,
  _started_at timestamptz DEFAULT NULL, _auto boolean DEFAULT false
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t_questions jsonb; t_threshold int; t_allow boolean; t_max int;
        total int; correct int := 0; q jsonb; ans jsonb; idx int;
        score int; passed boolean; attempts int; attempt_no int; best int;
        pool_id uuid; pool_q jsonb; is_correct boolean;
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

  -- total comes from number of submitted answers (covers AI-only and mixed)
  total := COALESCE(jsonb_array_length(_answers), 0);
  IF total > 0 THEN
    FOR idx IN 0 .. total - 1 LOOP
      ans := _answers->idx;
      is_correct := false;
      pool_id := NULLIF(ans->>'pool_id','')::uuid;
      IF pool_id IS NOT NULL THEN
        SELECT payload INTO pool_q FROM public.ai_question_pool WHERE id = pool_id;
        IF pool_q IS NOT NULL THEN
          is_correct := public._score_question(pool_q || jsonb_build_object('type', (pool_q->>'type')), ans->'answer');
          INSERT INTO public.student_question_history(student_profile_id, question_pool_id, shown_count, correct_count, incorrect_count, last_answered_at)
          VALUES (_student_id, pool_id, 1, CASE WHEN is_correct THEN 1 ELSE 0 END, CASE WHEN is_correct THEN 0 ELSE 1 END, now())
          ON CONFLICT (student_profile_id, question_pool_id) DO UPDATE
          SET correct_count = student_question_history.correct_count + CASE WHEN is_correct THEN 1 ELSE 0 END,
              incorrect_count = student_question_history.incorrect_count + CASE WHEN is_correct THEN 0 ELSE 1 END,
              last_answered_at = now();
        END IF;
      ELSE
        -- manual question by index from the stored t_questions
        q := t_questions -> COALESCE((ans->>'index')::int, idx);
        IF q IS NOT NULL THEN
          is_correct := public._score_question(q, ans->'answer');
        END IF;
      END IF;
      IF is_correct THEN correct := correct + 1; END IF;
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

-- ============================================================
-- submit_assignment — score answers including pool_id answers
-- ============================================================
CREATE OR REPLACE FUNCTION public.submit_assignment(
  _student_id uuid, _assignment_id uuid, _answers jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a_questions jsonb; a_threshold int; a_allow boolean; a_max int;
        total int; correct int := 0; q jsonb; ans jsonb; idx int;
        score int; passed boolean; attempts int; attempt_no int; best int;
        pool_id uuid; pool_q jsonb; is_correct boolean;
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

  total := COALESCE(jsonb_array_length(_answers), 0);
  IF total > 0 THEN
    FOR idx IN 0 .. total - 1 LOOP
      ans := _answers->idx;
      is_correct := false;
      pool_id := NULLIF(ans->>'pool_id','')::uuid;
      IF pool_id IS NOT NULL THEN
        SELECT payload INTO pool_q FROM public.ai_question_pool WHERE id = pool_id;
        IF pool_q IS NOT NULL THEN
          is_correct := public._score_question(pool_q, ans->'answer');
          INSERT INTO public.student_question_history(student_profile_id, question_pool_id, shown_count, correct_count, incorrect_count, last_answered_at)
          VALUES (_student_id, pool_id, 1, CASE WHEN is_correct THEN 1 ELSE 0 END, CASE WHEN is_correct THEN 0 ELSE 1 END, now())
          ON CONFLICT (student_profile_id, question_pool_id) DO UPDATE
          SET correct_count = student_question_history.correct_count + CASE WHEN is_correct THEN 1 ELSE 0 END,
              incorrect_count = student_question_history.incorrect_count + CASE WHEN is_correct THEN 0 ELSE 1 END,
              last_answered_at = now();
        END IF;
      ELSE
        q := a_questions -> COALESCE((ans->>'index')::int, idx);
        IF q IS NOT NULL THEN
          is_correct := public._score_question(q, ans->'answer');
        END IF;
      END IF;
      IF is_correct THEN correct := correct + 1; END IF;
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

-- ============================================================
-- get_practice_questions: smart serve for Practice (stage-level)
-- Prefers unseen, then weak topics, then least-recently-shown.
-- Returns stripped payloads with pool_id tags.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_practice_questions(
  _student_id uuid, _stage_id uuid, _count int DEFAULT 10
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE st record; lesson_subject uuid; result jsonb;
BEGIN
  IF NOT public.can_access_student(_student_id) THEN RAISE EXCEPTION 'not authorized'; END IF;
  SELECT s.id, s.lesson_id, s.question_source, s.ai_difficulty, s.ai_topics,
         l.id as lid, u.subject_id
  INTO st
  FROM public.lesson_stages s
  JOIN public.lessons l ON l.id = s.lesson_id
  JOIN public.units u ON u.id = l.unit_id
  WHERE s.id = _stage_id;
  IF st.id IS NULL THEN RAISE EXCEPTION 'stage not found'; END IF;

  WITH candidates AS (
    SELECT p.id, p.payload, p.question_type, p.topic, p.difficulty,
           COALESCE(h.shown_count, 0) AS shown,
           COALESCE(h.incorrect_count, 0) AS wrong,
           h.last_shown_at
    FROM public.ai_question_pool p
    LEFT JOIN public.student_question_history h
      ON h.question_pool_id = p.id AND h.student_profile_id = _student_id
    WHERE p.subject_id = st.subject_id
      AND (p.lesson_id = st.lesson_id OR p.lesson_id IS NULL)
      AND (st.ai_difficulty IS NULL OR st.ai_difficulty = 'adaptive' OR p.difficulty = st.ai_difficulty)
  )
  SELECT jsonb_agg(
    public._strip_payload_answer(c.payload)
      || jsonb_build_object('pool_id', c.id, 'type', c.question_type, 'topic', c.topic)
  ) INTO result
  FROM (
    SELECT * FROM candidates
    ORDER BY shown ASC, wrong DESC, last_shown_at ASC NULLS FIRST, random()
    LIMIT GREATEST(_count, 1)
  ) c;

  -- record shown
  IF result IS NOT NULL THEN
    INSERT INTO public.student_question_history(student_profile_id, question_pool_id, lesson_id, topic, shown_count, last_shown_at)
    SELECT _student_id, (q->>'pool_id')::uuid, st.lesson_id, q->>'topic', 1, now()
    FROM jsonb_array_elements(result) q
    ON CONFLICT (student_profile_id, question_pool_id) DO UPDATE
    SET shown_count = student_question_history.shown_count + 1,
        last_shown_at = now();
  END IF;

  RETURN COALESCE(result, '[]'::jsonb);
END $$;

-- ============================================================
-- submit_pool_answer: score one AI-pool answer, return explanation
-- ============================================================
CREATE OR REPLACE FUNCTION public.submit_pool_answer(
  _student_id uuid, _pool_id uuid, _answer jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pool_q jsonb; is_correct boolean; correct_value jsonb; explanation text;
BEGIN
  IF NOT public.can_access_student(_student_id) THEN RAISE EXCEPTION 'not authorized'; END IF;
  SELECT payload INTO pool_q FROM public.ai_question_pool WHERE id = _pool_id;
  IF pool_q IS NULL THEN RAISE EXCEPTION 'question not found'; END IF;

  is_correct := public._score_question(pool_q, _answer);
  correct_value := pool_q -> 'answer';
  IF correct_value IS NULL THEN correct_value := pool_q -> 'mapping'; END IF;
  explanation := COALESCE(pool_q->>'explanation', 'Great try! Keep practicing.');

  INSERT INTO public.student_question_history(student_profile_id, question_pool_id, shown_count, correct_count, incorrect_count, last_answered_at)
  VALUES (_student_id, _pool_id, 1, CASE WHEN is_correct THEN 1 ELSE 0 END, CASE WHEN is_correct THEN 0 ELSE 1 END, now())
  ON CONFLICT (student_profile_id, question_pool_id) DO UPDATE
  SET correct_count = student_question_history.correct_count + CASE WHEN is_correct THEN 1 ELSE 0 END,
      incorrect_count = student_question_history.incorrect_count + CASE WHEN is_correct THEN 0 ELSE 1 END,
      last_answered_at = now();

  RETURN jsonb_build_object(
    'correct', is_correct,
    'correct_answer', correct_value,
    'explanation', explanation
  );
END $$;

-- ============================================================
-- get_student_weak_topics
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_student_weak_topics(
  _student_id uuid, _subject_id uuid DEFAULT NULL, _accuracy_threshold numeric DEFAULT 0.6
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.can_access_student(_student_id) THEN RAISE EXCEPTION 'not authorized'; END IF;
  SELECT jsonb_agg(jsonb_build_object(
    'topic', topic, 'attempts', total, 'correct', cor, 'accuracy', acc))
  INTO result
  FROM (
    SELECT p.topic,
           SUM(h.correct_count + h.incorrect_count)::int AS total,
           SUM(h.correct_count)::int AS cor,
           CASE WHEN SUM(h.correct_count + h.incorrect_count) = 0 THEN 0
                ELSE ROUND(SUM(h.correct_count)::numeric / SUM(h.correct_count + h.incorrect_count), 2)
           END AS acc
    FROM public.student_question_history h
    JOIN public.ai_question_pool p ON p.id = h.question_pool_id
    WHERE h.student_profile_id = _student_id
      AND (_subject_id IS NULL OR p.subject_id = _subject_id)
      AND p.topic IS NOT NULL
    GROUP BY p.topic
    HAVING SUM(h.correct_count + h.incorrect_count) >= 3
       AND (SUM(h.correct_count)::numeric / NULLIF(SUM(h.correct_count + h.incorrect_count),0)) < _accuracy_threshold
    ORDER BY acc ASC
    LIMIT 20
  ) t;
  RETURN COALESCE(result, '[]'::jsonb);
END $$;

-- ============================================================
-- Analytics view: pool usage and topic accuracy (staff only)
-- ============================================================
CREATE OR REPLACE VIEW public.ai_question_analytics AS
SELECT
  p.subject_id,
  p.lesson_id,
  p.topic,
  p.difficulty,
  COUNT(DISTINCT p.id) AS questions_in_pool,
  COALESCE(SUM(h.shown_count), 0) AS total_shown,
  COALESCE(SUM(h.correct_count), 0) AS total_correct,
  COALESCE(SUM(h.incorrect_count), 0) AS total_incorrect,
  CASE WHEN COALESCE(SUM(h.correct_count + h.incorrect_count),0) = 0 THEN NULL
       ELSE ROUND(SUM(h.correct_count)::numeric / NULLIF(SUM(h.correct_count + h.incorrect_count),0), 3)
  END AS accuracy
FROM public.ai_question_pool p
LEFT JOIN public.student_question_history h ON h.question_pool_id = p.id
GROUP BY p.subject_id, p.lesson_id, p.topic, p.difficulty;

GRANT SELECT ON public.ai_question_analytics TO authenticated;