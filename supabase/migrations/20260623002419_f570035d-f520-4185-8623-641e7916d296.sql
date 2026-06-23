
REVOKE EXECUTE ON FUNCTION public.set_student_pin(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.verify_student_pin(text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.submit_test_attempt(uuid, uuid, jsonb, timestamptz, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.submit_assignment(uuid, uuid, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_test_admin(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_assignment_admin(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_test_for_student(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_assignment_for_student(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public._strip_answer_keys(jsonb) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._score_question(jsonb, jsonb) FROM anon, authenticated;
