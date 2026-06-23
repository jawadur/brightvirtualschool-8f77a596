
DROP POLICY IF EXISTS "students update own" ON public.student_profiles;

CREATE POLICY "students update own" ON public.student_profiles
  FOR UPDATE TO authenticated
  USING (
    (owner_user_id = auth.uid())
    OR (auth_user_id = auth.uid())
    OR public.has_role(auth.uid(),'admin')
  )
  WITH CHECK (
    public.has_role(auth.uid(),'admin')
    OR (
      (owner_user_id = auth.uid() OR auth_user_id = auth.uid())
      AND owner_user_id IS NOT DISTINCT FROM (
        SELECT sp.owner_user_id FROM public.student_profiles sp WHERE sp.id = student_profiles.id
      )
      AND auth_user_id IS NOT DISTINCT FROM (
        SELECT sp.auth_user_id FROM public.student_profiles sp WHERE sp.id = student_profiles.id
      )
    )
  );
