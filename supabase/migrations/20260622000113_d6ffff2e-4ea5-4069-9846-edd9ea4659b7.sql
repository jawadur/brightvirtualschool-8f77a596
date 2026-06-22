
ALTER TABLE public.student_profiles ADD COLUMN IF NOT EXISTS section text;

CREATE TABLE IF NOT EXISTS public.teacher_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('lesson','practice','homework','test')),
  scope text NOT NULL CHECK (scope IN ('class','section','students')),
  class_id uuid REFERENCES public.classes(id) ON DELETE CASCADE,
  section text,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
  lesson_id uuid REFERENCES public.lessons(id) ON DELETE SET NULL,
  title text NOT NULL,
  notes text,
  assigned_date date NOT NULL DEFAULT (now()::date),
  due_date date,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.teacher_assignments TO authenticated;
GRANT ALL ON public.teacher_assignments TO service_role;
ALTER TABLE public.teacher_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "teacher_assignments read all auth" ON public.teacher_assignments
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "teacher_assignments admin/teacher manage" ON public.teacher_assignments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'teacher'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'teacher'));

CREATE TRIGGER trg_teacher_assignments_updated
  BEFORE UPDATE ON public.teacher_assignments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.teacher_assignment_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_assignment_id uuid NOT NULL REFERENCES public.teacher_assignments(id) ON DELETE CASCADE,
  student_profile_id uuid NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  completed_at timestamptz,
  score integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (teacher_assignment_id, student_profile_id)
);

CREATE INDEX IF NOT EXISTS teacher_assignment_targets_student_idx
  ON public.teacher_assignment_targets(student_profile_id);
CREATE INDEX IF NOT EXISTS teacher_assignment_targets_ta_idx
  ON public.teacher_assignment_targets(teacher_assignment_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.teacher_assignment_targets TO authenticated;
GRANT ALL ON public.teacher_assignment_targets TO service_role;
ALTER TABLE public.teacher_assignment_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "teacher_assignment_targets student read/update" ON public.teacher_assignment_targets
  FOR SELECT TO authenticated
  USING (
    public.can_access_student(student_profile_id)
    OR public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'teacher')
  );

CREATE POLICY "teacher_assignment_targets student complete" ON public.teacher_assignment_targets
  FOR UPDATE TO authenticated
  USING (
    public.can_access_student(student_profile_id)
    OR public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'teacher')
  )
  WITH CHECK (
    public.can_access_student(student_profile_id)
    OR public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'teacher')
  );

CREATE POLICY "teacher_assignment_targets admin/teacher manage" ON public.teacher_assignment_targets
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'teacher'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'teacher'));

CREATE TRIGGER trg_teacher_assignment_targets_updated
  BEFORE UPDATE ON public.teacher_assignment_targets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
