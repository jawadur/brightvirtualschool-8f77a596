
-- 1. Mastery enum
DO $$ BEGIN
  CREATE TYPE mastery_level AS ENUM ('new','learning','familiar','mastered');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Revision items (letters/words/concepts)
CREATE TABLE public.revision_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_code text NOT NULL,           -- 'telugu' | 'hindi' | 'english' | 'math'
  category text NOT NULL,               -- 'vowel' | 'consonant' | 'sight_word' | 'phonics' | 'number_name' | 'missing_number' | 'before_after' | 'compare'
  value jsonb NOT NULL DEFAULT '{}'::jsonb,  -- {char, transliteration, word, prompt, answer, options...}
  language text NOT NULL DEFAULT 'en',  -- BCP47-ish: 'en','hi','te'
  sort_order integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX revision_items_subject_idx ON public.revision_items(subject_code, sort_order);
GRANT SELECT ON public.revision_items TO authenticated;
GRANT ALL ON public.revision_items TO service_role;
ALTER TABLE public.revision_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "revision_items read all auth" ON public.revision_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "revision_items admin manage" ON public.revision_items FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));

-- 3. Per-student spaced-repetition progress
CREATE TABLE public.revision_progress (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_profile_id uuid NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  revision_item_id uuid NOT NULL REFERENCES public.revision_items(id) ON DELETE CASCADE,
  mastery mastery_level NOT NULL DEFAULT 'new',
  repetitions integer NOT NULL DEFAULT 0,
  correct_count integer NOT NULL DEFAULT 0,
  attempts integer NOT NULL DEFAULT 0,
  last_seen_at timestamptz,
  next_due_at date,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_profile_id, revision_item_id)
);
CREATE INDEX revision_progress_student_due_idx ON public.revision_progress(student_profile_id, next_due_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.revision_progress TO authenticated;
GRANT ALL ON public.revision_progress TO service_role;
ALTER TABLE public.revision_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "revision_progress student access" ON public.revision_progress FOR ALL TO authenticated
  USING (can_access_student(student_profile_id)) WITH CHECK (can_access_student(student_profile_id));
CREATE TRIGGER trg_revision_progress_updated BEFORE UPDATE ON public.revision_progress
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Student accessibility preferences
CREATE TABLE public.student_preferences (
  student_profile_id uuid NOT NULL PRIMARY KEY REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  voice_reader boolean NOT NULL DEFAULT true,
  auto_read_lesson boolean NOT NULL DEFAULT false,
  larger_text boolean NOT NULL DEFAULT false,
  high_contrast boolean NOT NULL DEFAULT false,
  speech_rate numeric NOT NULL DEFAULT 0.9,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_preferences TO authenticated;
GRANT ALL ON public.student_preferences TO service_role;
ALTER TABLE public.student_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "student_preferences student access" ON public.student_preferences FOR ALL TO authenticated
  USING (can_access_student(student_profile_id)) WITH CHECK (can_access_student(student_profile_id));
CREATE TRIGGER trg_student_preferences_updated BEFORE UPDATE ON public.student_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. Placeholder: speech assessments (architecture only)
CREATE TABLE public.speech_assessments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_profile_id uuid NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  ref_type text NOT NULL,           -- 'lesson' | 'revision_item' | 'free'
  ref_id uuid,
  language text NOT NULL DEFAULT 'en',
  prompt_text text,
  transcript text,
  pronunciation_score integer,      -- 0-100, future
  fluency_score integer,            -- 0-100, future
  audio_url text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.speech_assessments TO authenticated;
GRANT ALL ON public.speech_assessments TO service_role;
ALTER TABLE public.speech_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "speech_assessments student access" ON public.speech_assessments FOR ALL TO authenticated
  USING (can_access_student(student_profile_id)) WITH CHECK (can_access_student(student_profile_id));
