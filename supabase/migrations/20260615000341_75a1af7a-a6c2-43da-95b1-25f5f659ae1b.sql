
-- 1. programs catalog
CREATE TABLE public.programs (
  code text PRIMARY KEY,
  name text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.programs TO anon, authenticated;
GRANT ALL ON public.programs TO service_role;
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "programs readable" ON public.programs FOR SELECT USING (true);
CREATE POLICY "programs admin write" ON public.programs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.programs (code, name, description, sort_order) VALUES
  ('kg2_brushup', 'KG2 Brush-Up', 'Quick revision of KG2 concepts to keep memory strong', 1),
  ('class1', 'Telangana Class 1', 'Full Telangana Class 1 daily school program', 2);

-- 2. student_program (current active program per child)
CREATE TABLE public.student_program (
  student_profile_id uuid PRIMARY KEY REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  active_program_code text NOT NULL REFERENCES public.programs(code),
  started_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_program TO authenticated;
GRANT ALL ON public.student_program TO service_role;
ALTER TABLE public.student_program ENABLE ROW LEVEL SECURITY;
CREATE POLICY "student_program owners" ON public.student_program FOR ALL TO authenticated
  USING (public.can_access_student(student_profile_id))
  WITH CHECK (public.can_access_student(student_profile_id));
CREATE TRIGGER trg_student_program_updated BEFORE UPDATE ON public.student_program
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. weekly_plans
CREATE TABLE public.weekly_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_code text NOT NULL REFERENCES public.programs(code),
  subject_id uuid REFERENCES public.subjects(id) ON DELETE CASCADE,
  class_id uuid REFERENCES public.classes(id) ON DELETE CASCADE,
  week_number integer NOT NULL,
  lesson_ids uuid[] NOT NULL DEFAULT '{}',
  homework_titles text[] NOT NULL DEFAULT '{}',
  assignment_id uuid REFERENCES public.assignments(id) ON DELETE SET NULL,
  test_id uuid REFERENCES public.tests(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (program_code, subject_id, week_number)
);
GRANT SELECT ON public.weekly_plans TO authenticated;
GRANT ALL ON public.weekly_plans TO service_role;
ALTER TABLE public.weekly_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "weekly_plans read" ON public.weekly_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "weekly_plans admin write" ON public.weekly_plans FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_weekly_plans_updated BEFORE UPDATE ON public.weekly_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Optional program tag on existing content
ALTER TABLE public.lessons     ADD COLUMN IF NOT EXISTS program_code text REFERENCES public.programs(code);
ALTER TABLE public.subjects    ADD COLUMN IF NOT EXISTS program_code text REFERENCES public.programs(code);
ALTER TABLE public.homework    ADD COLUMN IF NOT EXISTS program_code text REFERENCES public.programs(code);
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS program_code text REFERENCES public.programs(code);
ALTER TABLE public.tests       ADD COLUMN IF NOT EXISTS program_code text REFERENCES public.programs(code);
