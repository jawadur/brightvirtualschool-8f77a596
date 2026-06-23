
DROP POLICY IF EXISTS "teacher_assignments read all auth" ON public.teacher_assignments;

CREATE POLICY "teacher_assignments student read targeted" ON public.teacher_assignments
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'teacher')
    OR EXISTS (
      SELECT 1 FROM public.teacher_assignment_targets t
      WHERE t.teacher_assignment_id = teacher_assignments.id
        AND public.can_access_student(t.student_profile_id)
    )
  );
