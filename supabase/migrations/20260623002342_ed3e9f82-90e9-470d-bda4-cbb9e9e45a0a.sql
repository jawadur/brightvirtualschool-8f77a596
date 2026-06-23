
CREATE OR REPLACE FUNCTION public._strip_answer_keys(_questions jsonb)
RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT COALESCE(jsonb_agg(q - 'answer' - 'mapping'), '[]'::jsonb)
  FROM jsonb_array_elements(COALESCE(_questions, '[]'::jsonb)) q
$$;
REVOKE ALL ON FUNCTION public._strip_answer_keys(jsonb) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.get_test_for_student(_test_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  SELECT t.id, t.title, t.duration_minutes, t.pass_threshold, t.subject_id,
         t.scope, t.metadata,
         public._strip_answer_keys(t.questions) AS questions
  INTO r FROM public.tests t WHERE t.id = _test_id;
  IF r.id IS NULL THEN RAISE EXCEPTION 'test not found'; END IF;
  RETURN jsonb_build_object(
    'id', r.id, 'title', r.title, 'duration_minutes', r.duration_minutes,
    'pass_threshold', r.pass_threshold, 'subject_id', r.subject_id,
    'scope', r.scope, 'metadata', r.metadata, 'questions', r.questions
  );
END $$;
REVOKE ALL ON FUNCTION public.get_test_for_student(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_test_for_student(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_assignment_for_student(_assignment_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  SELECT a.id, a.title, a.instructions, a.pass_threshold, a.lesson_id, a.subject_id,
         public._strip_answer_keys(a.questions) AS questions
  INTO r FROM public.assignments a WHERE a.id = _assignment_id;
  IF r.id IS NULL THEN RAISE EXCEPTION 'assignment not found'; END IF;
  RETURN jsonb_build_object(
    'id', r.id, 'title', r.title, 'instructions', r.instructions,
    'pass_threshold', r.pass_threshold, 'lesson_id', r.lesson_id,
    'subject_id', r.subject_id, 'questions', r.questions
  );
END $$;
REVOKE ALL ON FUNCTION public.get_assignment_for_student(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_assignment_for_student(uuid) TO authenticated;
