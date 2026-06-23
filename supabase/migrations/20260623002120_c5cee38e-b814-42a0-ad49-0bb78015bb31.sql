
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.student_profiles ADD COLUMN IF NOT EXISTS pin_hash text;

UPDATE public.student_profiles
SET pin_hash = crypt(pin, gen_salt('bf', 10))
WHERE pin IS NOT NULL AND length(pin) > 0 AND pin_hash IS NULL;

ALTER TABLE public.student_profiles DROP COLUMN IF EXISTS pin;

CREATE OR REPLACE FUNCTION public.set_student_pin(_student_id uuid, _pin text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.can_access_student(_student_id) THEN RAISE EXCEPTION 'not authorized'; END IF;
  UPDATE public.student_profiles
  SET pin_hash = CASE WHEN _pin IS NULL OR length(_pin)=0 THEN NULL
                      ELSE crypt(_pin, gen_salt('bf',10)) END
  WHERE id = _student_id;
END $$;
REVOKE ALL ON FUNCTION public.set_student_pin(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_student_pin(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.verify_student_pin(_name text, _pin text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  SELECT sp.id INTO v_id
  FROM public.student_profiles sp
  WHERE lower(sp.display_name) = lower(_name)
    AND sp.pin_hash IS NOT NULL
    AND sp.pin_hash = crypt(_pin, sp.pin_hash)
    AND public.can_access_student(sp.id)
  LIMIT 1;
  RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.verify_student_pin(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_student_pin(text, text) TO authenticated;

DROP POLICY IF EXISTS "tests read all auth" ON public.tests;
DROP POLICY IF EXISTS "assignments read all auth" ON public.assignments;
DROP POLICY IF EXISTS "question_bank read all auth" ON public.question_bank;

CREATE POLICY "tests staff read" ON public.tests
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'teacher'));
CREATE POLICY "assignments staff read" ON public.assignments
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'teacher'));
CREATE POLICY "question_bank staff read" ON public.question_bank
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'teacher'));

CREATE OR REPLACE FUNCTION public._strip_answer_keys(_questions jsonb)
RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT COALESCE(jsonb_agg(q - 'answer' - 'mapping'), '[]'::jsonb)
  FROM jsonb_array_elements(COALESCE(_questions, '[]'::jsonb)) q
$$;

CREATE OR REPLACE VIEW public.tests_safe
WITH (security_invoker = off) AS
SELECT t.id, t.title, t.subject_id, t.unit_id, t.duration_minutes,
       t.pass_threshold, t.scope, t.metadata, t.created_at, t.program_code,
       public._strip_answer_keys(t.questions) AS questions
FROM public.tests t;

CREATE OR REPLACE VIEW public.assignments_safe
WITH (security_invoker = off) AS
SELECT a.id, a.title, a.instructions, a.subject_id, a.lesson_id, a.pass_threshold,
       a.due_in_days, a.metadata, a.created_at, a.program_code,
       public._strip_answer_keys(a.questions) AS questions
FROM public.assignments a;

GRANT SELECT ON public.tests_safe TO authenticated;
GRANT SELECT ON public.assignments_safe TO authenticated;

CREATE OR REPLACE FUNCTION public._score_question(_q jsonb, _ans jsonb)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE qtype text := _q->>'type'; atype text := _ans->>'type';
BEGIN
  IF _ans IS NULL THEN RETURN false; END IF;
  IF qtype IN ('multiple_choice','picture_question') THEN
    RETURN atype = 'choice' AND (_ans->>'value')::int = (_q->>'answer')::int;
  ELSIF qtype = 'fill_blank' THEN
    RETURN atype = 'text'
      AND lower(btrim(_ans->>'value')) = lower(btrim(_q->>'answer'));
  ELSIF qtype = 'match_pairs' THEN
    RETURN atype = 'mapping' AND NOT EXISTS (
      SELECT 1 FROM generate_series(0, COALESCE(jsonb_array_length(_q->'pairs'),0) - 1) i
      WHERE COALESCE(((_ans->'value')->>(i::text))::int, -1) <> i
    );
  ELSIF qtype = 'drag_drop' THEN
    RETURN atype = 'mapping' AND NOT EXISTS (
      SELECT 1 FROM generate_series(0, COALESCE(jsonb_array_length(_q->'mapping'),0) - 1) i
      WHERE COALESCE(((_ans->'value')->>(i::text))::int, -1)
            <> ((_q->'mapping')->>i)::int
    );
  END IF;
  RETURN false;
END $$;

CREATE OR REPLACE FUNCTION public.submit_test_attempt(
  _student_id uuid, _test_id uuid, _answers jsonb,
  _started_at timestamptz DEFAULT NULL, _auto boolean DEFAULT false
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t_questions jsonb; t_threshold int; total int; correct int := 0;
        q jsonb; ans jsonb; idx int; score int; passed boolean;
BEGIN
  IF NOT public.can_access_student(_student_id) THEN RAISE EXCEPTION 'not authorized'; END IF;
  SELECT questions, pass_threshold INTO t_questions, t_threshold
  FROM public.tests WHERE id = _test_id;
  IF t_questions IS NULL THEN RAISE EXCEPTION 'test not found'; END IF;
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
  INSERT INTO public.test_attempts(
    student_profile_id, test_id, answers, score, max_score, status,
    started_at, completed_at, metadata)
  VALUES (_student_id, _test_id, _answers, score, 100, 'completed',
    COALESCE(_started_at, now()), now(),
    jsonb_build_object('auto_submitted', _auto, 'correct', correct, 'total', total));
  RETURN jsonb_build_object('score', score, 'correct', correct, 'total', total, 'passed', passed);
END $$;
REVOKE ALL ON FUNCTION public.submit_test_attempt(uuid, uuid, jsonb, timestamptz, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_test_attempt(uuid, uuid, jsonb, timestamptz, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.submit_assignment(
  _student_id uuid, _assignment_id uuid, _answers jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a_questions jsonb; a_threshold int; total int; correct int := 0;
        q jsonb; ans jsonb; idx int; score int; passed boolean;
BEGIN
  IF NOT public.can_access_student(_student_id) THEN RAISE EXCEPTION 'not authorized'; END IF;
  SELECT questions, pass_threshold INTO a_questions, a_threshold
  FROM public.assignments WHERE id = _assignment_id;
  IF a_questions IS NULL THEN RAISE EXCEPTION 'assignment not found'; END IF;
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
  INSERT INTO public.assignment_submissions(
    student_profile_id, assignment_id, answers, score, max_score, status,
    completed_at, metadata)
  VALUES (_student_id, _assignment_id, _answers, score, 100, 'completed', now(),
    jsonb_build_object('correct', correct, 'total', total));
  RETURN jsonb_build_object('score', score, 'correct', correct, 'total', total, 'passed', passed);
END $$;
REVOKE ALL ON FUNCTION public.submit_assignment(uuid, uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_assignment(uuid, uuid, jsonb) TO authenticated;

DROP POLICY IF EXISTS "user_roles bootstrap first admin" ON public.user_roles;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.email)
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'parent')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;
