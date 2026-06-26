
-- Parity columns on tests/assignments
ALTER TABLE public.tests
  ADD COLUMN IF NOT EXISTS ai_randomize boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ai_adaptive boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_weak_area_practice boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_show_explanation boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ai_auto_topup boolean NOT NULL DEFAULT false;

ALTER TABLE public.assignments
  ADD COLUMN IF NOT EXISTS ai_randomize boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ai_adaptive boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_weak_area_practice boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_show_explanation boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ai_auto_topup boolean NOT NULL DEFAULT false;

ALTER TABLE public.lesson_stages
  ADD COLUMN IF NOT EXISTS ai_auto_topup boolean NOT NULL DEFAULT false;

-- Weak-area practice RPC: prefer pool questions for topics where the student is weak.
CREATE OR REPLACE FUNCTION public.get_weak_practice_questions(
  _student_id uuid,
  _count int DEFAULT 10,
  _subject_id uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.can_access_student(_student_id) THEN RAISE EXCEPTION 'not authorized'; END IF;

  WITH weak AS (
    SELECT p.topic,
           SUM(h.correct_count)::numeric
           / NULLIF(SUM(h.correct_count + h.incorrect_count), 0) AS acc
    FROM public.student_question_history h
    JOIN public.ai_question_pool p ON p.id = h.question_pool_id
    WHERE h.student_profile_id = _student_id
      AND (_subject_id IS NULL OR p.subject_id = _subject_id)
      AND p.topic IS NOT NULL
    GROUP BY p.topic
    HAVING SUM(h.correct_count + h.incorrect_count) >= 2
       AND (SUM(h.correct_count)::numeric
             / NULLIF(SUM(h.correct_count + h.incorrect_count),0)) < 0.7
  ),
  candidates AS (
    SELECT p.id, p.payload, p.question_type, p.topic, p.difficulty,
           COALESCE(h.shown_count, 0) AS shown,
           COALESCE(h.incorrect_count, 0) AS wrong,
           h.last_shown_at,
           CASE WHEN w.topic IS NOT NULL THEN 0 ELSE 1 END AS topic_rank
    FROM public.ai_question_pool p
    LEFT JOIN weak w ON w.topic = p.topic
    LEFT JOIN public.student_question_history h
      ON h.question_pool_id = p.id AND h.student_profile_id = _student_id
    WHERE (_subject_id IS NULL OR p.subject_id = _subject_id)
  )
  SELECT jsonb_agg(
    public._strip_payload_answer(c.payload)
      || jsonb_build_object('pool_id', c.id, 'type', c.question_type, 'topic', c.topic)
  ) INTO result
  FROM (
    SELECT * FROM candidates
    ORDER BY topic_rank ASC, wrong DESC, shown ASC, last_shown_at ASC NULLS FIRST, random()
    LIMIT GREATEST(_count, 1)
  ) c;

  IF result IS NOT NULL THEN
    INSERT INTO public.student_question_history(
      student_profile_id, question_pool_id, topic, shown_count, last_shown_at)
    SELECT _student_id, (q->>'pool_id')::uuid, q->>'topic', 1, now()
    FROM jsonb_array_elements(result) q
    ON CONFLICT (student_profile_id, question_pool_id) DO UPDATE
    SET shown_count = student_question_history.shown_count + 1,
        last_shown_at = now();
  END IF;

  RETURN COALESCE(result, '[]'::jsonb);
END $$;

REVOKE ALL ON FUNCTION public.get_weak_practice_questions(uuid, int, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_weak_practice_questions(uuid, int, uuid) TO authenticated;

-- Admin helper: low-pool topics (per subject) for auto-topup warnings.
CREATE OR REPLACE FUNCTION public.get_low_pool_topics(
  _subject_id uuid, _threshold int DEFAULT 5
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE result jsonb;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'teacher')) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  SELECT jsonb_agg(jsonb_build_object(
    'topic', topic, 'difficulty', difficulty, 'pool', cnt))
  INTO result
  FROM (
    SELECT topic, difficulty, COUNT(*)::int AS cnt
    FROM public.ai_question_pool
    WHERE subject_id = _subject_id AND topic IS NOT NULL
    GROUP BY topic, difficulty
    HAVING COUNT(*) < _threshold
    ORDER BY cnt ASC
    LIMIT 50
  ) t;
  RETURN COALESCE(result, '[]'::jsonb);
END $$;

REVOKE ALL ON FUNCTION public.get_low_pool_topics(uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_low_pool_topics(uuid, int) TO authenticated;
