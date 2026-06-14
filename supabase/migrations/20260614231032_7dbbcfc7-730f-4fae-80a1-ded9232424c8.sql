
-- 1) Extend student_preferences with voice tuning
ALTER TABLE public.student_preferences
  ADD COLUMN IF NOT EXISTS speech_pitch numeric NOT NULL DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS speech_volume numeric NOT NULL DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS preferred_voice_uri text;

-- 2) Streak counters on student_profiles
ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS homework_streak integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reading_streak integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS revision_streak integer NOT NULL DEFAULT 0;

-- 3) Homework
CREATE TABLE IF NOT EXISTS public.homework (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_profile_id uuid NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('practice','reading','writing','revision')),
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  lesson_id uuid REFERENCES public.lessons(id) ON DELETE SET NULL,
  assignment_id uuid REFERENCES public.assignments(id) ON DELETE SET NULL,
  due_date date NOT NULL DEFAULT (now()::date),
  assigned_date date NOT NULL DEFAULT (now()::date),
  completed_at timestamptz,
  score integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS homework_student_due_idx ON public.homework(student_profile_id, due_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.homework TO authenticated;
GRANT ALL ON public.homework TO service_role;
ALTER TABLE public.homework ENABLE ROW LEVEL SECURITY;
CREATE POLICY "homework student access" ON public.homework
  FOR ALL TO authenticated
  USING (public.can_access_student(student_profile_id) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.can_access_student(student_profile_id) OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_homework_updated BEFORE UPDATE ON public.homework
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4) Writing practice completions
CREATE TABLE IF NOT EXISTS public.writing_practice_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_profile_id uuid NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  script text NOT NULL CHECK (script IN ('english','telugu','hindi','number')),
  glyph text NOT NULL,
  strokes integer NOT NULL DEFAULT 0,
  accuracy integer,
  completed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS writing_student_idx ON public.writing_practice_completions(student_profile_id, completed_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.writing_practice_completions TO authenticated;
GRANT ALL ON public.writing_practice_completions TO service_role;
ALTER TABLE public.writing_practice_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "writing student access" ON public.writing_practice_completions
  FOR ALL TO authenticated
  USING (public.can_access_student(student_profile_id))
  WITH CHECK (public.can_access_student(student_profile_id));

-- 5) Reading sessions
CREATE TABLE IF NOT EXISTS public.reading_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_profile_id uuid NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  passage_id text NOT NULL,
  language text NOT NULL DEFAULT 'en',
  words_read integer NOT NULL DEFAULT 0,
  duration_sec integer NOT NULL DEFAULT 0,
  completed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reading_student_idx ON public.reading_sessions(student_profile_id, completed_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reading_sessions TO authenticated;
GRANT ALL ON public.reading_sessions TO service_role;
ALTER TABLE public.reading_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reading student access" ON public.reading_sessions
  FOR ALL TO authenticated
  USING (public.can_access_student(student_profile_id))
  WITH CHECK (public.can_access_student(student_profile_id));

-- 6) Journey events for Portfolio timeline
CREATE TABLE IF NOT EXISTS public.student_journey_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_profile_id uuid NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  title text NOT NULL,
  description text,
  icon text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS journey_student_idx ON public.student_journey_events(student_profile_id, occurred_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_journey_events TO authenticated;
GRANT ALL ON public.student_journey_events TO service_role;
ALTER TABLE public.student_journey_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "journey student access" ON public.student_journey_events
  FOR ALL TO authenticated
  USING (public.can_access_student(student_profile_id))
  WITH CHECK (public.can_access_student(student_profile_id));
