import { supabase } from "@/integrations/supabase/client";

// ------------------------------------------------------------
// Adaptive Learning + School Readiness computation library
// ------------------------------------------------------------
// All functions are pure reads from existing tables — no new
// schema. Scores are blended from lesson completion, assignment
// scores, test scores, revision completion and attendance.
// ------------------------------------------------------------

export type MasteryLevel = "new" | "learning" | "practicing" | "mastered";

export type SubjectReadiness = {
  subject_id: string;
  subject_code: string;
  subject_name: Record<string, string>;
  icon: string | null;
  color: string | null;
  score: number;
  breakdown: { lessons: number; assignments: number; tests: number };
  totalLessons: number;
  doneLessons: number;
};

export type WeakConcept = {
  lesson_id: string;
  lesson_code: string;
  lesson_title: Record<string, string>;
  subject_id: string;
  subject_name: Record<string, string>;
  reason: "low_score" | "failed_test" | "failed_assignment" | "not_started";
  score: number | null;
};

export type RecoveryPlanItem = {
  lesson_id: string;
  lesson_title: Record<string, string>;
  subject_name: Record<string, string>;
  minutesPerDay: number;
  days: number;
};

export type LessonMastery = {
  lesson_id: string;
  lesson_title: Record<string, string>;
  subject_name: Record<string, string>;
  mastery: number;
  level: MasteryLevel;
};

export type SchoolReadiness = {
  overall: number;
  subjects: SubjectReadiness[];
  weakConcepts: WeakConcept[];
  recoveryPlan: RecoveryPlanItem[];
  mastery: LessonMastery[];
  attendancePct: number;
};

export function masteryToLevel(m: number): MasteryLevel {
  if (m >= 85) return "mastered";
  if (m >= 60) return "practicing";
  if (m > 0) return "learning";
  return "new";
}

// ------------------------------------------------------------
// Subject + lesson tree for a class
// ------------------------------------------------------------
async function fetchClassTree(classId: string) {
  const { data, error } = await supabase
    .from("subjects")
    .select(
      "id, code, name, icon, color, sort_order, units(id, lessons(id, code, title))",
    )
    .eq("class_id", classId)
    .order("sort_order");
  if (error) throw error;
  return (data ?? []) as any[];
}

// ------------------------------------------------------------
// Main: compute readiness for a student across one or more classes
// ------------------------------------------------------------
export async function computeSchoolReadiness(
  studentId: string,
  classIds: string[],
): Promise<SchoolReadiness> {
  if (classIds.length === 0) {
    return {
      overall: 0,
      subjects: [],
      weakConcepts: [],
      recoveryPlan: [],
      mastery: [],
      attendancePct: 0,
    };
  }

  // 1. Curriculum tree
  const trees: any[] = [];
  for (const cid of classIds) trees.push(...(await fetchClassTree(cid)));

  const allLessons: { id: string; code: string; title: any; subject_id: string; subject_name: any }[] = [];
  for (const s of trees) {
    for (const u of s.units ?? []) {
      for (const l of u.lessons ?? []) {
        allLessons.push({
          id: l.id,
          code: l.code,
          title: l.title,
          subject_id: s.id,
          subject_name: s.name,
        });
      }
    }
  }
  const lessonIds = allLessons.map((l) => l.id);
  if (lessonIds.length === 0) {
    return { overall: 0, subjects: [], weakConcepts: [], recoveryPlan: [], mastery: [], attendancePct: 0 };
  }

  // 2. Pull all signals in parallel
  const since30 = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
  const [prog, subs, attempts, attendance, revProg] = await Promise.all([
    supabase
      .from("progress")
      .select("lesson_id, status, score")
      .eq("student_profile_id", studentId)
      .in("lesson_id", lessonIds)
      .then((r) => r.data ?? []),
    supabase
      .from("assignment_submissions")
      .select("score, completed_at, assignments!inner(lesson_id, subject_id, pass_threshold)")
      .eq("student_profile_id", studentId)
      .in("assignments.lesson_id", lessonIds)
      .not("completed_at", "is", null)
      .then((r) => r.data ?? []),
    supabase
      .from("test_attempts")
      .select("score, completed_at, tests!inner(subject_id, unit_id, pass_threshold)")
      .eq("student_profile_id", studentId)
      .not("completed_at", "is", null)
      .then((r) => r.data ?? []),
    supabase
      .from("attendance")
      .select("date, present")
      .eq("student_profile_id", studentId)
      .gte("date", since30)
      .then((r) => r.data ?? []),
    supabase
      .from("revision_progress")
      .select("revision_item_id, mastery")
      .eq("student_profile_id", studentId)
      .then((r) => r.data ?? []),
  ]);

  const progByLesson = new Map<string, any>();
  prog.forEach((p: any) => progByLesson.set(p.lesson_id, p));

  // Build per-subject aggregations
  const subjectMap = new Map<string, SubjectReadiness>();
  for (const s of trees) {
    subjectMap.set(s.id, {
      subject_id: s.id,
      subject_code: s.code,
      subject_name: s.name,
      icon: s.icon,
      color: s.color,
      score: 0,
      breakdown: { lessons: 0, assignments: 0, tests: 0 },
      totalLessons: 0,
      doneLessons: 0,
    });
  }

  for (const l of allLessons) {
    const s = subjectMap.get(l.subject_id);
    if (!s) continue;
    s.totalLessons += 1;
    const p = progByLesson.get(l.id);
    if (p?.status === "completed") s.doneLessons += 1;
  }

  // Group assignments + tests by subject
  const subjAssign = new Map<string, number[]>();
  for (const sub of subs as any[]) {
    const sid = sub.assignments?.subject_id;
    if (!sid) continue;
    if (!subjAssign.has(sid)) subjAssign.set(sid, []);
    subjAssign.get(sid)!.push(sub.score ?? 0);
  }
  const subjTest = new Map<string, number[]>();
  for (const a of attempts as any[]) {
    const sid = a.tests?.subject_id;
    if (!sid) continue;
    if (!subjTest.has(sid)) subjTest.set(sid, []);
    subjTest.get(sid)!.push(a.score ?? 0);
  }

  for (const sr of subjectMap.values()) {
    const lessonPct = sr.totalLessons ? Math.round((sr.doneLessons / sr.totalLessons) * 100) : 0;
    const aArr = subjAssign.get(sr.subject_id) ?? [];
    const tArr = subjTest.get(sr.subject_id) ?? [];
    const aAvg = aArr.length ? Math.round(aArr.reduce((x, y) => x + y, 0) / aArr.length) : 0;
    const tAvg = tArr.length ? Math.round(tArr.reduce((x, y) => x + y, 0) / tArr.length) : 0;
    sr.breakdown = { lessons: lessonPct, assignments: aAvg, tests: tAvg };
    // Weights: lessons 45 / assignments 25 / tests 30
    sr.score = Math.round(lessonPct * 0.45 + aAvg * 0.25 + tAvg * 0.3);
  }

  // Attendance % (last 30 days, counting weekdays)
  const presentDays = attendance.filter((a: any) => a.present).length;
  const attendancePct = Math.min(100, Math.round((presentDays / 22) * 100)); // ~22 schooldays
  const revCount = (revProg as any[]).filter((r) => r.mastery === "mastered" || r.mastery === "practicing").length;
  const revisionBonus = Math.min(10, Math.round(revCount / 2));

  const subjects = Array.from(subjectMap.values()).sort((a, b) => a.subject_code.localeCompare(b.subject_code));
  // Overall = avg(subject scores) tilted by attendance and revision completion
  const avgSubject = subjects.length ? subjects.reduce((s, x) => s + x.score, 0) / subjects.length : 0;
  const overall = Math.min(
    100,
    Math.round(avgSubject * 0.8 + attendancePct * 0.15 + revisionBonus * 0.5),
  );

  // ----------------------------------------------------------
  // Weak concept detection + mastery per lesson
  // ----------------------------------------------------------
  const assignByLesson = new Map<string, number[]>();
  const assignFailByLesson = new Map<string, boolean>();
  for (const sub of subs as any[]) {
    const lid = sub.assignments?.lesson_id;
    if (!lid) continue;
    const score = sub.score ?? 0;
    if (!assignByLesson.has(lid)) assignByLesson.set(lid, []);
    assignByLesson.get(lid)!.push(score);
    if (score < (sub.assignments?.pass_threshold ?? 60)) assignFailByLesson.set(lid, true);
  }

  const mastery: LessonMastery[] = [];
  const weak: WeakConcept[] = [];
  for (const l of allLessons) {
    const p = progByLesson.get(l.id);
    const completed = p?.status === "completed";
    const lessonScore = typeof p?.score === "number" ? p.score : null;
    const aArr = assignByLesson.get(l.id) ?? [];
    const aAvg = aArr.length ? aArr.reduce((x, y) => x + y, 0) / aArr.length : null;
    const parts: number[] = [];
    if (completed) parts.push(80);
    if (lessonScore != null) parts.push(lessonScore);
    if (aAvg != null) parts.push(aAvg);
    const m = parts.length ? Math.round(parts.reduce((x, y) => x + y, 0) / parts.length) : 0;
    mastery.push({
      lesson_id: l.id,
      lesson_title: l.title,
      subject_name: l.subject_name,
      mastery: m,
      level: masteryToLevel(m),
    });
    if (assignFailByLesson.get(l.id)) {
      weak.push({
        lesson_id: l.id,
        lesson_code: l.code,
        lesson_title: l.title,
        subject_id: l.subject_id,
        subject_name: l.subject_name,
        reason: "failed_assignment",
        score: aAvg != null ? Math.round(aAvg) : null,
      });
    } else if (lessonScore != null && lessonScore < 60) {
      weak.push({
        lesson_id: l.id,
        lesson_code: l.code,
        lesson_title: l.title,
        subject_id: l.subject_id,
        subject_name: l.subject_name,
        reason: "low_score",
        score: lessonScore,
      });
    }
  }

  // Recovery plan: pick up to 5 weakest items, prescribe minutes/days
  const recoveryPlan: RecoveryPlanItem[] = weak
    .slice()
    .sort((a, b) => (a.score ?? 0) - (b.score ?? 0))
    .slice(0, 5)
    .map((w) => {
      const sc = w.score ?? 30;
      const minutesPerDay = sc < 40 ? 15 : sc < 60 ? 10 : 8;
      const days = sc < 40 ? 5 : sc < 60 ? 4 : 3;
      return {
        lesson_id: w.lesson_id,
        lesson_title: w.lesson_title,
        subject_name: w.subject_name,
        minutesPerDay,
        days,
      };
    });

  return {
    overall,
    subjects,
    weakConcepts: weak.slice(0, 12),
    recoveryPlan,
    mastery: mastery.sort((a, b) => a.mastery - b.mastery),
    attendancePct,
  };
}

// ------------------------------------------------------------
// Monthly readiness report
// ------------------------------------------------------------
export async function computeMonthlyReport(studentId: string, classIds: string[]) {
  const readiness = await computeSchoolReadiness(studentId, classIds);
  const since = new Date(Date.now() - 30 * 86400_000).toISOString();
  const [progress, attempts, attendance] = await Promise.all([
    supabase
      .from("progress")
      .select("lesson_id, status, completed_at")
      .eq("student_profile_id", studentId)
      .gte("completed_at", since)
      .then((r) => r.data ?? []),
    supabase
      .from("test_attempts")
      .select("score, completed_at")
      .eq("student_profile_id", studentId)
      .not("completed_at", "is", null)
      .gte("completed_at", since)
      .then((r) => r.data ?? []),
    supabase
      .from("attendance")
      .select("date, present")
      .eq("student_profile_id", studentId)
      .gte("date", new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10))
      .then((r) => r.data ?? []),
  ]);

  const lessonsCompleted = progress.filter((p: any) => p.status === "completed").length;
  const avgTestScore = attempts.length
    ? Math.round(attempts.reduce((s: number, a: any) => s + (a.score ?? 0), 0) / attempts.length)
    : 0;
  const presentDays = (attendance as any[]).filter((a) => a.present).length;

  // Simple teacher remark generator
  let remark = "Keep up the steady learning! Daily practice will build strong skills.";
  if (readiness.overall >= 85) remark = "Outstanding progress! Your child is confidently ready for Class 1 content.";
  else if (readiness.overall >= 70) remark = "Great work! A little more focus on weak areas will make readiness excellent.";
  else if (readiness.overall >= 50) remark = "Good effort. Follow the recovery plan daily to lift weaker subjects.";
  else remark = "Your child needs daily structured practice. Please follow the recovery plan and brush-up routine.";

  return {
    readiness,
    lessonsCompleted,
    avgTestScore,
    presentDays,
    remark,
    period: { from: new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10), to: new Date().toISOString().slice(0, 10) },
  };
}

// ------------------------------------------------------------
// Award motivation badges when readiness improves or crosses a threshold
// ------------------------------------------------------------
export async function awardReadinessBadges(studentId: string, current: number, previous: number | null) {
  const codesToAward: string[] = [];
  if (current >= 80) codesToAward.push("learning-champion");
  if (previous != null && current - previous >= 5) codesToAward.push("growth-star");
  if (previous != null && previous < 50 && current >= 65) codesToAward.push("improvement-badge");
  if (codesToAward.length === 0) return [];
  const { data: badges } = await supabase.from("badges").select("id, code").in("code", codesToAward);
  const awarded: string[] = [];
  for (const b of badges ?? []) {
    const { data: existing } = await supabase
      .from("student_badges")
      .select("id")
      .eq("student_profile_id", studentId)
      .eq("badge_id", b.id)
      .maybeSingle();
    if (existing) continue;
    await supabase.from("student_badges").insert({ student_profile_id: studentId, badge_id: b.id });
    awarded.push(b.code);
  }
  return awarded;
}