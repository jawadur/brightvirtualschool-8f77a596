
CREATE TABLE public.daily_schedule (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date date NOT NULL,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  lesson_id uuid REFERENCES public.lessons(id) ON DELETE SET NULL,
  assignment_id uuid REFERENCES public.assignments(id) ON DELETE SET NULL,
  test_id uuid REFERENCES public.tests(id) ON DELETE SET NULL,
  sort_order integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX daily_schedule_date_class_idx ON public.daily_schedule(date, class_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_schedule TO authenticated;
GRANT ALL ON public.daily_schedule TO service_role;
ALTER TABLE public.daily_schedule ENABLE ROW LEVEL SECURITY;
CREATE POLICY "daily_schedule read all auth" ON public.daily_schedule FOR SELECT TO authenticated USING (true);
CREATE POLICY "daily_schedule admin manage" ON public.daily_schedule FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_daily_schedule_updated BEFORE UPDATE ON public.daily_schedule FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
