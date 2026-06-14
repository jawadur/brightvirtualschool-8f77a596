import { supabase } from "@/integrations/supabase/client";

export type LessonStep =
  | { type: "introduction"; text: Record<string, string> }
  | { type: "teacher_explanation"; text: Record<string, string> }
  | { type: "multiple_choice"; question: Record<string, string>; options: Record<string, string>[]; answer: number; coins?: number }
  | { type: "match_pairs"; pairs: { left: Record<string, string>; right: Record<string, string> }[]; coins?: number }
  | { type: "fill_blank"; question: Record<string, string>; answer: string; coins?: number }
  | { type: "tracing_activity"; letter: string; instructions: Record<string, string> }
  | { type: "drag_drop"; question: Record<string, string>; items: Record<string, string>[]; targets: Record<string, string>[]; mapping: number[]; coins?: number }
  | { type: "picture_question"; image_url: string; question: Record<string, string>; options: Record<string, string>[]; answer: number; coins?: number }
  | { type: "audio_placeholder"; instructions: Record<string, string> }
  | { type: "speaking_placeholder"; prompt: Record<string, string> };

export type LessonContent = { steps: LessonStep[] };

export async function fetchSubjectsForClass(classId: string) {
  const { data, error } = await supabase
    .from("subjects")
    .select("id, code, name, icon, color, sort_order")
    .eq("class_id", classId)
    .order("sort_order");
  if (error) throw error;
  return data ?? [];
}

export async function fetchLessonsForSubject(subjectId: string) {
  const { data, error } = await supabase
    .from("lessons")
    .select("id, code, title, description, lesson_type, estimated_minutes, sort_order, content, is_published, unit_id, units!inner(id, title, sort_order, subject_id)")
    .eq("units.subject_id", subjectId)
    .eq("is_published", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function fetchActivePrograms() {
  const { data, error } = await supabase
    .from("boards")
    .select("id, code, name, description, sort_order, classes(id, code, name, sort_order)")
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw error;
  return (data ?? []).map((b: any) => ({
    ...b,
    classes: [...(b.classes ?? [])].sort((a: any, z: any) => a.sort_order - z.sort_order),
  }));
}

export async function fetchClassLessonIds(classId: string) {
  const { data, error } = await supabase
    .from("lessons")
    .select("id, units!inner(subjects!inner(class_id))")
    .eq("units.subjects.class_id", classId)
    .eq("is_published", true);
  if (error) throw error;
  return (data ?? []).map((l: any) => l.id as string);
}

export async function fetchProgramProgress(studentId: string, classId: string) {
  const lessonIds = await fetchClassLessonIds(classId);
  if (lessonIds.length === 0) return { total: 0, done: 0, pct: 0 };
  const { data, error } = await supabase
    .from("progress")
    .select("lesson_id")
    .eq("student_profile_id", studentId)
    .eq("status", "completed")
    .in("lesson_id", lessonIds);
  if (error) throw error;
  const done = data?.length ?? 0;
  return { total: lessonIds.length, done, pct: Math.round((done / lessonIds.length) * 100) };
}

export async function fetchReadinessScore(studentId: string, classId: string) {
  const lessonIds = await fetchClassLessonIds(classId);
  if (lessonIds.length === 0) return { score: 0, breakdown: { lessons: 0, assignments: 0, tests: 0 } };

  const [{ data: prog }, { data: subs }, { data: attempts }] = await Promise.all([
    supabase.from("progress").select("lesson_id, score, status").eq("student_profile_id", studentId).in("lesson_id", lessonIds),
    supabase.from("assignment_submissions").select("score, completed_at, assignments!inner(lesson_id)").eq("student_profile_id", studentId).in("assignments.lesson_id", lessonIds).not("completed_at", "is", null),
    supabase.from("test_attempts").select("score, completed_at, tests!inner(subject_id, subjects!inner(class_id))").eq("student_profile_id", studentId).eq("tests.subjects.class_id", classId).not("completed_at", "is", null),
  ]);

  const doneLessons = (prog ?? []).filter((p: any) => p.status === "completed").length;
  const lessonPct = Math.round((doneLessons / lessonIds.length) * 100);
  const aScores = (subs ?? []).map((s: any) => s.score ?? 0);
  const aAvg = aScores.length ? Math.round(aScores.reduce((a, b) => a + b, 0) / aScores.length) : 0;
  const tScores = (attempts ?? []).map((a: any) => a.score ?? 0);
  const tAvg = tScores.length ? Math.round(tScores.reduce((a, b) => a + b, 0) / tScores.length) : 0;
  // weights: lessons 50%, assignments 25%, tests 25%
  const score = Math.round(lessonPct * 0.5 + aAvg * 0.25 + tAvg * 0.25);
  return { score, breakdown: { lessons: lessonPct, assignments: aAvg, tests: tAvg } };
}

export async function checkProgramGraduation(studentId: string, boardCode: string, badgeCode: string) {
  const { data: board } = await supabase.from("boards").select("id, classes(id)").eq("code", boardCode).maybeSingle();
  if (!board) return false;
  for (const c of (board as any).classes ?? []) {
    const p = await fetchProgramProgress(studentId, c.id);
    if (p.total === 0 || p.done < p.total) return false;
  }
  const { data: badge } = await supabase.from("badges").select("id").eq("code", badgeCode).maybeSingle();
  if (!badge) return false;
  const { data: existing } = await supabase.from("student_badges").select("id").eq("student_profile_id", studentId).eq("badge_id", (badge as any).id).maybeSingle();
  if (existing) return false;
  await supabase.from("student_badges").insert({ student_profile_id: studentId, badge_id: (badge as any).id });
  return true;
}

export async function fetchStudentProgress(studentId: string) {
  const { data, error } = await supabase
    .from("progress")
    .select("lesson_id, status, score, completed_at")
    .eq("student_profile_id", studentId);
  if (error) throw error;
  return data ?? [];
}

export async function markAttendance(studentId: string) {
  const today = new Date().toISOString().slice(0, 10);
  const { error } = await supabase
    .from("attendance")
    .upsert(
      { student_profile_id: studentId, date: today, present: true, first_lesson_at: new Date().toISOString() },
      { onConflict: "student_profile_id,date" }
    );
  if (error) throw error;
  // Bump streak if a new day
  const { data: sp } = await supabase
    .from("student_profiles")
    .select("last_attendance_date, current_streak, longest_streak")
    .eq("id", studentId)
    .single();
  if (sp) {
    const last = sp.last_attendance_date;
    let streak = sp.current_streak ?? 0;
    if (last !== today) {
      const y = new Date(); y.setDate(y.getDate() - 1);
      const yesterday = y.toISOString().slice(0, 10);
      streak = last === yesterday ? streak + 1 : 1;
      await supabase
        .from("student_profiles")
        .update({
          last_attendance_date: today,
          current_streak: streak,
          longest_streak: Math.max(streak, sp.longest_streak ?? 0),
        })
        .eq("id", studentId);
    }
  }
}

export async function awardCoins(studentId: string, amount: number, reason: Record<string, string>, refId?: string, refType?: string) {
  if (amount <= 0) return;
  await supabase.from("rewards").insert({
    student_profile_id: studentId,
    reward_type: "coin",
    amount,
    reason,
    ref_id: refId ?? null,
    ref_type: refType ?? null,
  });
  const { data: sp } = await supabase.from("student_profiles").select("coins").eq("id", studentId).single();
  await supabase.from("student_profiles").update({ coins: (sp?.coins ?? 0) + amount }).eq("id", studentId);
}

export async function awardStar(studentId: string, reason: Record<string, string>, refId?: string, refType?: string) {
  await supabase.from("rewards").insert({
    student_profile_id: studentId,
    reward_type: "star",
    amount: 1,
    reason,
    ref_id: refId ?? null,
    ref_type: refType ?? null,
  });
  const { data: sp } = await supabase.from("student_profiles").select("stars").eq("id", studentId).single();
  await supabase.from("student_profiles").update({ stars: (sp?.stars ?? 0) + 1 }).eq("id", studentId);
}

export async function completeLesson(studentId: string, lessonId: string, score: number) {
  await supabase.from("progress").upsert(
    {
      student_profile_id: studentId,
      lesson_id: lessonId,
      status: "completed",
      score,
      completed_at: new Date().toISOString(),
      started_at: new Date().toISOString(),
    },
    { onConflict: "student_profile_id,lesson_id" }
  );
  // Check if KG2 Bridge Course is now complete and award the badge
  try {
    await checkProgramGraduation(studentId, "kg2-bridge", "kg2-bridge-complete");
  } catch (e) {
    console.warn("graduation check failed", e);
  }
}

export async function fetchTodaySchedule(classIds: string[]) {
  if (classIds.length === 0) return [];
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("daily_schedule")
    .select(`
      id, date, class_id, sort_order,
      subject:subjects(id, code, name, color, icon, class_id),
      lesson:lessons(id, title),
      assignment:assignments(id, title),
      test:tests(id, title)
    `)
    .eq("date", today)
    .in("class_id", classIds)
    .order("sort_order");
  if (error) throw error;
  return (data ?? []) as any[];
}

export async function fetchScheduleStatuses(studentId: string, items: any[]) {
  const lessonIds = items.map((i) => i.lesson?.id).filter(Boolean);
  const assignmentIds = items.map((i) => i.assignment?.id).filter(Boolean);
  const testIds = items.map((i) => i.test?.id).filter(Boolean);
  const [{ data: prog }, { data: subs }, { data: atts }] = await Promise.all([
    lessonIds.length
      ? supabase.from("progress").select("lesson_id, status, score").eq("student_profile_id", studentId).in("lesson_id", lessonIds)
      : Promise.resolve({ data: [] as any[] }),
    assignmentIds.length
      ? supabase.from("assignment_submissions").select("assignment_id, status, score, max_score, completed_at").eq("student_profile_id", studentId).in("assignment_id", assignmentIds)
      : Promise.resolve({ data: [] as any[] }),
    testIds.length
      ? supabase.from("test_attempts").select("test_id, status, score, max_score, completed_at").eq("student_profile_id", studentId).in("test_id", testIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);
  const lessonMap = new Map((prog ?? []).map((p: any) => [p.lesson_id, p]));
  const aMap = new Map<string, any>();
  (subs ?? []).forEach((s: any) => {
    const prev = aMap.get(s.assignment_id);
    if (!prev || (s.completed_at && !prev.completed_at) || (s.score ?? 0) > (prev.score ?? 0)) aMap.set(s.assignment_id, s);
  });
  const tMap = new Map<string, any>();
  (atts ?? []).forEach((a: any) => {
    const prev = tMap.get(a.test_id);
    if (!prev || (a.completed_at && !prev.completed_at) || (a.score ?? 0) > (prev.score ?? 0)) tMap.set(a.test_id, a);
  });
  return { lessonMap, aMap, tMap };
}