
ALTER TABLE public.tests ALTER COLUMN max_attempts DROP NOT NULL;
ALTER TABLE public.tests ALTER COLUMN max_attempts DROP DEFAULT;
ALTER TABLE public.assignments ALTER COLUMN max_attempts DROP NOT NULL;
ALTER TABLE public.assignments ALTER COLUMN max_attempts DROP DEFAULT;
