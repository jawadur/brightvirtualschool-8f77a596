import { supabase } from "@/integrations/supabase/client";

export type LessonNode = {
  id: string;
  title: any;
  sort_order: number;
  stagesTotal: number;
  stagesDone: number;
  pct: number;
  status: "not_started" | "in_progress" | "completed";
  lastAccessed: string | null;
  practiceDone: boolean;
  homeworkDone: boolean;
  testPassed: boolean | null; // null if no test
};
export type UnitNode = {
  id: string;
  title: any;
  sort_order: number;
  lessons: LessonNode[];
  pct: number;
  lastAccessed: string | null;
};
export type SubjectNode = {
  id: string;
  name: any;
  color: string | null;
  icon: string | null;
  units: UnitNode[];
  pct: number;
  lastAccessed: string | null;
  totals: { lessons: number; lessonsDone: number; practiceDone: number; homeworkDone: number; testsPassed: number; testsTotal: number };
};
export type ClassNode = {
  id: string;
  name: any;
  boardName: any;
  subjects: SubjectNode[];
  pct: number;
  lastAccessed: string | null;
  totals: { lessons: number; lessonsDone: number; practiceDone: number; homeworkDone: number; testsPassed: number; testsTotal: number };
};

export type ContinueRef = {
  lesson: { id: string; title: any };
  subject: { id: string; name: any; color: string | null; icon: string | null };
  className: any;
  pct: number;
  lastAccessed: string | null;
} | null;

/**
 * Build a Class → Subject → Unit → Lesson tree with per-level stats for a student.
 * Only includes classes the student is enrolled in (board_id/class_id) plus any class
 * they have progress in.
 */
export async function fetchHierarchyProgress(studentId: string, classIds: string[]): Promise<ClassNode[]> {
  if (classIds.length === 0) return [];

  const [{ data: classRows }, { data: subjects }, { data: units }, { data: lessons }, { data: tests }] = await Promise.all([
    supabase.from("classes").select("id, name, sort_order, board_id, boards(name)").in("id", classIds).order("sort_order"),
    supabase.from("subjects").select("id, class_id, name, color, icon, sort_order").in("class_id", classIds).order("sort_order"),
    supabase.from("units").select("id, subject_id, title, sort_order").order("sort_order"),
    supabase
      .from("lessons")
      .select("id, unit_id, title, sort_order, is_published, units!inner(subject_id, subjects!inner(class_id))")
      .eq("is_published", true)
      .in("units.subjects.class_id", classIds)
      .order("sort_order"),
    supabase.from("tests").select("id, unit_id, pass_threshold, subject_id, subjects!inner(class_id)").in("subjects.class_id", classIds),
  ]);

  const lessonIds = (lessons ?? []).map((l: any) => l.id);
  const testIds = (tests ?? []).map((t: any) => t.id);

  const [{ data: stages }, { data: stageProg }, { data: hw }, { data: atts }] = await Promise.all([
    lessonIds.length
      ? supabase.from("lesson_stages").select("lesson_id, stage_type").in("lesson_id", lessonIds)
      : Promise.resolve({ data: [] as any[] }),
    lessonIds.length
      ? supabase
          .from("student_stage_progress")
          .select("lesson_id, stage_type, completed_at, updated_at, score")
          .eq("student_profile_id", studentId)
          .in("lesson_id", lessonIds)
      : Promise.resolve({ data: [] as any[] }),
    lessonIds.length
      ? supabase
          .from("homework")
          .select("lesson_id, completed_at")
          .eq("student_profile_id", studentId)
          .in("lesson_id", lessonIds)
      : Promise.resolve({ data: [] as any[] }),
    testIds.length
      ? supabase
          .from("test_attempts")
          .select("test_id, score, max_score, completed_at")
          .eq("student_profile_id", studentId)
          .in("test_id", testIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  // Index helpers
  const stagesByLesson = new Map<string, Set<string>>();
  (stages ?? []).forEach((s: any) => {
    if (!stagesByLesson.has(s.lesson_id)) stagesByLesson.set(s.lesson_id, new Set());
    stagesByLesson.get(s.lesson_id)!.add(s.stage_type);
  });
  const progByLesson = new Map<string, { done: Set<string>; last: string | null }>();
  (stageProg ?? []).forEach((p: any) => {
    if (!progByLesson.has(p.lesson_id)) progByLesson.set(p.lesson_id, { done: new Set(), last: null });
    const e = progByLesson.get(p.lesson_id)!;
    if (p.completed_at) e.done.add(p.stage_type);
    const ts = p.updated_at || p.completed_at;
    if (ts && (!e.last || ts > e.last)) e.last = ts;
  });
  const hwByLesson = new Map<string, boolean>();
  (hw ?? []).forEach((h: any) => {
    if (!h.lesson_id) return;
    hwByLesson.set(h.lesson_id, hwByLesson.get(h.lesson_id) || !!h.completed_at);
  });
  const passByTest = new Map<string, boolean>();
  (atts ?? []).forEach((a: any) => {
    if (!a.completed_at) return;
    const pct = a.max_score ? (a.score ?? 0) / a.max_score * 100 : 0;
    passByTest.set(a.test_id, (passByTest.get(a.test_id) || false) || pct >= 60);
  });
  const testsByUnit = new Map<string, string[]>();
  (tests ?? []).forEach((t: any) => {
    if (!t.unit_id) return;
    if (!testsByUnit.has(t.unit_id)) testsByUnit.set(t.unit_id, []);
    testsByUnit.get(t.unit_id)!.push(t.id);
  });

  // Build lessons grouped by unit
  const lessonsByUnit = new Map<string, LessonNode[]>();
  (lessons ?? []).forEach((l: any) => {
    const stageSet = stagesByLesson.get(l.id) ?? new Set<string>();
    const stagesTotal = stageSet.size;
    const prog = progByLesson.get(l.id);
    const stagesDone = prog ? [...prog.done].filter((s) => stageSet.has(s)).length : 0;
    const pct = stagesTotal ? Math.round((stagesDone / stagesTotal) * 100) : 0;
    const status: LessonNode["status"] = stagesTotal === 0 ? "not_started" : stagesDone === 0 ? "not_started" : stagesDone >= stagesTotal ? "completed" : "in_progress";
    const practiceDone = prog ? ["guided", "independent"].some((s) => prog.done.has(s)) : false;
    const homeworkDone = (prog ? prog.done.has("assignment") : false) || !!hwByLesson.get(l.id);
    const testDone = prog ? prog.done.has("test") : false;
    const node: LessonNode = {
      id: l.id,
      title: l.title,
      sort_order: l.sort_order,
      stagesTotal,
      stagesDone,
      pct,
      status,
      lastAccessed: prog?.last ?? null,
      practiceDone,
      homeworkDone,
      testPassed: testDone ? true : null,
    };
    if (!lessonsByUnit.has(l.unit_id)) lessonsByUnit.set(l.unit_id, []);
    lessonsByUnit.get(l.unit_id)!.push(node);
  });

  // Build units grouped by subject (only units that have lessons or tests in our classes)
  const unitsBySubject = new Map<string, UnitNode[]>();
  (units ?? []).forEach((u: any) => {
    const lns = (lessonsByUnit.get(u.id) ?? []).sort((a, b) => a.sort_order - b.sort_order);
    if (lns.length === 0) return;
    const totalPct = lns.reduce((s, l) => s + l.pct, 0);
    const pct = lns.length ? Math.round(totalPct / lns.length) : 0;
    const lastAccessed = lns.reduce<string | null>((acc, l) => (l.lastAccessed && (!acc || l.lastAccessed > acc) ? l.lastAccessed : acc), null);
    const node: UnitNode = { id: u.id, title: u.title, sort_order: u.sort_order, lessons: lns, pct, lastAccessed };
    if (!unitsBySubject.has(u.subject_id)) unitsBySubject.set(u.subject_id, []);
    unitsBySubject.get(u.subject_id)!.push(node);
  });

  // Subjects per class
  const subjectsByClass = new Map<string, SubjectNode[]>();
  (subjects ?? []).forEach((s: any) => {
    const us = (unitsBySubject.get(s.id) ?? []).sort((a, b) => a.sort_order - b.sort_order);
    const lessonsAll = us.flatMap((u) => u.lessons);
    const lessonsDone = lessonsAll.filter((l) => l.status === "completed").length;
    const practiceDone = lessonsAll.filter((l) => l.practiceDone).length;
    const homeworkDone = lessonsAll.filter((l) => l.homeworkDone).length;
    const subjTestIds = us.flatMap((u) => testsByUnit.get(u.id) ?? []);
    const testsPassed = subjTestIds.filter((id) => passByTest.get(id)).length;
    const pct = lessonsAll.length ? Math.round(lessonsAll.reduce((acc, l) => acc + l.pct, 0) / lessonsAll.length) : 0;
    const lastAccessed = lessonsAll.reduce<string | null>((acc, l) => (l.lastAccessed && (!acc || l.lastAccessed > acc) ? l.lastAccessed : acc), null);
    const node: SubjectNode = {
      id: s.id,
      name: s.name,
      color: s.color,
      icon: s.icon,
      units: us,
      pct,
      lastAccessed,
      totals: { lessons: lessonsAll.length, lessonsDone, practiceDone, homeworkDone, testsPassed, testsTotal: subjTestIds.length },
    };
    if (!subjectsByClass.has(s.class_id)) subjectsByClass.set(s.class_id, []);
    subjectsByClass.get(s.class_id)!.push(node);
  });

  return (classRows ?? []).map((c: any) => {
    const subs = subjectsByClass.get(c.id) ?? [];
    const lessonsAll = subs.flatMap((s) => s.units.flatMap((u) => u.lessons));
    const pct = lessonsAll.length ? Math.round(lessonsAll.reduce((acc, l) => acc + l.pct, 0) / lessonsAll.length) : 0;
    const lastAccessed = lessonsAll.reduce<string | null>((acc, l) => (l.lastAccessed && (!acc || l.lastAccessed > acc) ? l.lastAccessed : acc), null);
    const totals = subs.reduce(
      (acc, s) => ({
        lessons: acc.lessons + s.totals.lessons,
        lessonsDone: acc.lessonsDone + s.totals.lessonsDone,
        practiceDone: acc.practiceDone + s.totals.practiceDone,
        homeworkDone: acc.homeworkDone + s.totals.homeworkDone,
        testsPassed: acc.testsPassed + s.totals.testsPassed,
        testsTotal: acc.testsTotal + s.totals.testsTotal,
      }),
      { lessons: 0, lessonsDone: 0, practiceDone: 0, homeworkDone: 0, testsPassed: 0, testsTotal: 0 },
    );
    return { id: c.id, name: c.name, boardName: c.boards?.name, subjects: subs, pct, lastAccessed, totals };
  });
}

/** Pick the best "Continue Learning" lesson: most recently accessed in-progress lesson,
 *  else first not-started lesson in earliest class/subject/unit. */
export function pickContinueLesson(tree: ClassNode[]): ContinueRef {
  let best: { lesson: LessonNode; subject: SubjectNode; className: any; ts: string } | null = null;
  for (const c of tree) {
    for (const s of c.subjects) {
      for (const u of s.units) {
        for (const l of u.lessons) {
          if (l.status === "in_progress" && l.lastAccessed) {
            if (!best || l.lastAccessed > best.ts) best = { lesson: l, subject: s, className: c.name, ts: l.lastAccessed };
          }
        }
      }
    }
  }
  if (best) {
    return {
      lesson: { id: best.lesson.id, title: best.lesson.title },
      subject: { id: best.subject.id, name: best.subject.name, color: best.subject.color, icon: best.subject.icon },
      className: best.className,
      pct: best.lesson.pct,
      lastAccessed: best.lesson.lastAccessed,
    };
  }
  // fallback: first not_started lesson
  for (const c of tree) {
    for (const s of c.subjects) {
      for (const u of s.units) {
        for (const l of u.lessons) {
          if (l.status !== "completed") {
            return {
              lesson: { id: l.id, title: l.title },
              subject: { id: s.id, name: s.name, color: s.color, icon: s.icon },
              className: c.name,
              pct: l.pct,
              lastAccessed: l.lastAccessed,
            };
          }
        }
      }
    }
  }
  return null;
}