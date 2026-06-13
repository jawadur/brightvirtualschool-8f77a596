import { supabase } from "@/integrations/supabase/client";

export type LessonStep =
  | { type: "introduction"; text: Record<string, string> }
  | { type: "teacher_explanation"; text: Record<string, string> }
  | { type: "multiple_choice"; question: Record<string, string>; options: Record<string, string>[]; answer: number; coins?: number }
  | { type: "match_pairs"; pairs: { left: Record<string, string>; right: Record<string, string> }[]; coins?: number }
  | { type: "fill_blank"; question: Record<string, string>; answer: string; coins?: number }
  | { type: "tracing_activity"; letter: string; instructions: Record<string, string> };

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
    .select("id, code, title, description, lesson_type, estimated_minutes, sort_order, content, unit_id, units!inner(id, title, sort_order, subject_id)")
    .eq("units.subject_id", subjectId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
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
}