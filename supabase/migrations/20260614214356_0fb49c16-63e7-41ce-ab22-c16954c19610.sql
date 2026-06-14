
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT true;

UPDATE public.boards SET is_active = false WHERE code = 'TSB';

INSERT INTO public.badges (code, name, description, icon, criteria)
VALUES (
  'kg2-bridge-complete',
  '{"en":"KG2 Bridge Graduate","hi":"KG2 ब्रिज स्नातक","te":"KG2 బ్రిడ్జ్ గ్రాడ్యుయేట్"}'::jsonb,
  '{"en":"Completed every lesson in the KG2 Bridge Course"}'::jsonb,
  '🎓',
  '{"type":"program_complete","board_code":"kg2-bridge"}'::jsonb
) ON CONFLICT (code) DO NOTHING;
