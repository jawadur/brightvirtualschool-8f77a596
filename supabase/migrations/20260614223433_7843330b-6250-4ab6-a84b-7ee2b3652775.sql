
-- Stage type enum
DO $$ BEGIN
  CREATE TYPE public.lesson_stage_type AS ENUM (
    'welcome','concept','example1','example2','guided','independent','assignment','test','revision'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 1) lesson_stages: the slides/script for each of the 9 stages
CREATE TABLE IF NOT EXISTS public.lesson_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  stage_type public.lesson_stage_type NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  title jsonb NOT NULL DEFAULT '{}'::jsonb,
  explanation jsonb NOT NULL DEFAULT '{}'::jsonb,
  narration_en text,
  narration_hi text,
  narration_te text,
  image_url text,
  slides jsonb NOT NULL DEFAULT '[]'::jsonb,   -- array of {title, body, image}
  questions jsonb NOT NULL DEFAULT '[]'::jsonb, -- for guided/independent/assignment/test
  pass_threshold int NOT NULL DEFAULT 60,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lesson_id, stage_type)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_stages TO authenticated;
GRANT ALL ON public.lesson_stages TO service_role;

ALTER TABLE public.lesson_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone signed in can read stages"
  ON public.lesson_stages FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage stages"
  ON public.lesson_stages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS lesson_stages_lesson_idx ON public.lesson_stages(lesson_id, sort_order);

CREATE TRIGGER lesson_stages_set_updated
  BEFORE UPDATE ON public.lesson_stages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2) student_stage_progress: per-child step tracker
CREATE TABLE IF NOT EXISTS public.student_stage_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_profile_id uuid NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  stage_type public.lesson_stage_type NOT NULL,
  completed_at timestamptz,
  score int,
  attempts int NOT NULL DEFAULT 0,
  time_spent_seconds int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_profile_id, lesson_id, stage_type)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_stage_progress TO authenticated;
GRANT ALL ON public.student_stage_progress TO service_role;

ALTER TABLE public.student_stage_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Access own stage progress"
  ON public.student_stage_progress FOR ALL TO authenticated
  USING (public.can_access_student(student_profile_id))
  WITH CHECK (public.can_access_student(student_profile_id));

CREATE INDEX IF NOT EXISTS stage_prog_student_lesson_idx
  ON public.student_stage_progress(student_profile_id, lesson_id);

CREATE TRIGGER stage_prog_set_updated
  BEFORE UPDATE ON public.student_stage_progress
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
