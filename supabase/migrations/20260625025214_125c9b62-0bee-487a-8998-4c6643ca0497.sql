DROP VIEW IF EXISTS public.ai_question_analytics;

CREATE VIEW public.ai_question_analytics
WITH (security_invoker = true) AS
SELECT
  p.subject_id,
  p.lesson_id,
  p.topic,
  p.difficulty,
  COUNT(DISTINCT p.id) AS questions_in_pool,
  COALESCE(SUM(h.shown_count), 0) AS total_shown,
  COALESCE(SUM(h.correct_count), 0) AS total_correct,
  COALESCE(SUM(h.incorrect_count), 0) AS total_incorrect,
  CASE WHEN COALESCE(SUM(h.correct_count + h.incorrect_count),0) = 0 THEN NULL
       ELSE ROUND(SUM(h.correct_count)::numeric / NULLIF(SUM(h.correct_count + h.incorrect_count),0), 3)
  END AS accuracy
FROM public.ai_question_pool p
LEFT JOIN public.student_question_history h ON h.question_pool_id = p.id
WHERE public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'teacher')
GROUP BY p.subject_id, p.lesson_id, p.topic, p.difficulty;

GRANT SELECT ON public.ai_question_analytics TO authenticated;