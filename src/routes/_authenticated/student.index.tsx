import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useStudents } from "@/lib/student-context";
import { useI18n } from "@/lib/i18n";
import {
  fetchActivePrograms,
  markAttendance,
  fetchTodaySchedule,
  fetchScheduleStatuses,
  fetchPendingAssignments,
  fetchPendingTests,
} from "@/lib/data";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Mic,
  PlayCircle,
  BookOpen,
  PencilLine,
  ClipboardCheck,
  CheckCircle2,
  Lock,
  CalendarX,
  ArrowRight,
} from "lucide-react";
import { fetchTodayRevision } from "@/lib/revision";
import { fetchHomework, summarizeHomework } from "@/lib/homework";
import { ClipboardList } from "lucide-react";
import { fetchActiveProgram, PROGRAMS } from "@/lib/program";
import { fetchHierarchyProgress, pickContinueLesson } from "@/lib/progress-tracking";
import { fetchStudentTeacherAssignments } from "@/lib/teacher-assignments";

export const Route = createFileRoute("/_authenticated/student/")({
  component: TodaysSchool,
});

function TodaysSchool() {
  const { activeStudent, refresh } = useStudents();
  const { t, tr } = useI18n();

  useEffect(() => {
    if (!activeStudent) return;
    markAttendance(activeStudent.id).then(() => refresh()).catch(() => {});
  }, [activeStudent?.id]);

  const { data: programs = [] } = useQuery({
    queryKey: ["active-programs"],
    queryFn: fetchActivePrograms,
  });

  const { data: activeProgram } = useQuery({
    queryKey: ["active-program", activeStudent?.id],
    enabled: !!activeStudent,
    queryFn: () => fetchActiveProgram(activeStudent!.id),
  });

  const classIds = useMemo(
    () => programs.flatMap((b: any) => (b.classes ?? []).map((c: any) => c.id)),
    [programs],
  );
  const classMap = useMemo(() => {
    const m = new Map<string, { className: any; boardName: any; isBridge: boolean }>();
    programs.forEach((b: any) => (b.classes ?? []).forEach((c: any) =>
      m.set(c.id, { className: c.name, boardName: b.name, isBridge: b.code === "kg2-bridge" }),
    ));
    return m;
  }, [programs]);

  const { data: schedule = [] } = useQuery({
    queryKey: ["today-schedule", classIds.join(",")],
    enabled: classIds.length > 0,
    queryFn: () => fetchTodaySchedule(classIds),
  });

  const { data: statuses } = useQuery({
    queryKey: ["schedule-statuses", activeStudent?.id, schedule.map((s: any) => s.id).join(",")],
    enabled: !!activeStudent && schedule.length > 0,
    queryFn: () => fetchScheduleStatuses(activeStudent!.id, schedule),
  });

  const lessonMap = statuses?.lessonMap ?? new Map();
  const aMap = statuses?.aMap ?? new Map();
  const tMap = statuses?.tMap ?? new Map();

  // Compute per-item completion + find next activity
  const enriched = schedule.map((row: any) => {
    const lessonDone = row.lesson ? lessonMap.get(row.lesson.id)?.status === "completed" : true;
    const aSub = row.assignment ? aMap.get(row.assignment.id) : null;
    const assignmentDone = row.assignment ? !!aSub?.completed_at : true;
    const tAtt = row.test ? tMap.get(row.test.id) : null;
    const testDone = row.test ? !!tAtt?.completed_at : true;
    const subjectDone = lessonDone && assignmentDone && testDone;
    return { ...row, lessonDone, assignmentDone, testDone, subjectDone, aSub, tAtt };
  });

  const totalSubjects = enriched.length;
  const doneSubjects = enriched.filter((e: any) => e.subjectDone).length;
  const pct = totalSubjects ? Math.round((doneSubjects / totalSubjects) * 100) : 0;

  // Next activity
  const nextUp = (() => {
    for (const e of enriched) {
      if (e.lesson && !e.lessonDone) return { row: e, step: "lesson" as const };
      if (e.assignment && !e.assignmentDone) return { row: e, step: "assignment" as const };
      if (e.test && !e.testDone) return { row: e, step: "test" as const };
    }
    return null;
  })();

  // Fallback Continue Learning: last in-progress lesson across the student's classes.
  const { data: continueRef } = useQuery({
    queryKey: ["continue-learning", activeStudent?.id, classIds.join(",")],
    enabled: !!activeStudent && classIds.length > 0 && !nextUp,
    queryFn: async () => {
      const tree = await fetchHierarchyProgress(activeStudent!.id, classIds);
      return pickContinueLesson(tree);
    },
  });

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-hero p-6 shadow-pop">
        <div className="text-sm font-bold text-foreground/70">{t("welcome")},</div>
        <h1 className="text-3xl font-extrabold">{activeStudent?.display_name} 👋</h1>
        <p className="mt-1 text-foreground/80">{t("attendance_today")} · 🔥 {activeStudent?.current_streak} {t("streak")}</p>
        {totalSubjects > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm font-bold mb-1">
              <span>Daily progress</span>
              <span>{doneSubjects}/{totalSubjects} subjects</span>
            </div>
            <Progress value={pct} />
          </div>
        )}
      </section>

      {nextUp && <ContinueLearningCard next={nextUp} tr={tr} />}
      {!nextUp && continueRef && <ContinueLearningFallback ref_={continueRef} tr={tr} />}

      <ProgramBanner activeProgram={activeProgram ?? null} />

      {activeStudent && <TodaysRevisionWidget studentId={activeStudent.id} />}

      {activeStudent && <TodaysHomeworkWidget studentId={activeStudent.id} />}

      {activeStudent && <TeacherAssignedWidget studentId={activeStudent.id} />}

      {pct === 100 && totalSubjects > 0 && <DailySummary enriched={enriched} tr={tr} />}

      <section>
        <h2 className="text-xl font-extrabold mb-3">📅 Today's Schedule</h2>
        {totalSubjects === 0 ? (
          <Card className="p-6 text-center">
            <CalendarX className="h-10 w-10 mx-auto text-muted-foreground" />
            <div className="mt-3 font-extrabold">Today's Learning Plan is ready</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Open Today's Learning to start your next lesson, practice, and homework.
            </div>
            <div className="mt-4 flex justify-center">
              <Link to="/student/today"><Button className="rounded-2xl gap-2"><PlayCircle className="h-4 w-4" /> Open Today's Learning</Button></Link>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {enriched.map((row: any) => (
              <SubjectScheduleCard
                key={row.id}
                row={row}
                classInfo={classMap.get(row.class_id)}
                tr={tr}
              />
            ))}
          </div>
        )}
      </section>

      {activeStudent && classIds.length > 0 && (
        <PendingLists studentId={activeStudent.id} classIds={classIds} tr={tr} />
      )}

      <section>
        <h2 className="text-xl font-extrabold mb-3">Try something new</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <Link to="/student/ai-teacher">
            <Card className="p-5 hover:shadow-pop transition cursor-pointer flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center"><Sparkles className="h-6 w-6 text-primary" /></div>
              <div>
                <div className="font-extrabold">AI Teacher</div>
                <div className="text-xs text-muted-foreground">Ask anything, get help</div>
              </div>
            </Card>
          </Link>
          <Link to="/student/reading">
            <Card className="p-5 hover:shadow-pop transition cursor-pointer flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-secondary/40 flex items-center justify-center"><Mic className="h-6 w-6 text-foreground" /></div>
              <div>
                <div className="font-extrabold">Reading Check</div>
                <div className="text-xs text-muted-foreground">Read aloud & earn stars</div>
              </div>
            </Card>
          </Link>
        </div>
      </section>
    </div>
  );
}

function ContinueLearningCard({ next, tr }: { next: any; tr: (v: any) => string }) {
  const { row, step } = next;
  const stepLabel = step === "lesson" ? "Lesson" : step === "assignment" ? "Assignment" : "Test";
  const target =
    step === "lesson"
      ? { to: "/student/lesson/$lessonId", params: { lessonId: row.lesson.id } }
      : step === "assignment"
      ? { to: "/student/assignment/$assignmentId", params: { assignmentId: row.assignment.id } }
      : { to: "/student/test/$testId", params: { testId: row.test.id } };
  const title = step === "lesson" ? tr(row.lesson.title) : step === "assignment" ? tr(row.assignment.title) : tr(row.test.title);
  return (
    <Link {...(target as any)}>
      <Card className="p-5 hover:shadow-pop transition cursor-pointer flex items-center gap-4 bg-gradient-to-r from-primary/15 to-accent">
        <div className="h-14 w-14 rounded-2xl bg-primary/20 flex items-center justify-center">
          <PlayCircle className="h-8 w-8 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold text-primary uppercase">Continue Learning · {tr(row.subject?.name)}</div>
          <div className="truncate text-lg font-extrabold">{title}</div>
          <div className="text-xs text-muted-foreground">Next: {stepLabel}</div>
        </div>
        <Button size="sm" className="rounded-2xl">Start</Button>
      </Card>
    </Link>
  );
}

function ContinueLearningFallback({ ref_, tr }: { ref_: any; tr: (v: any) => string }) {
  return (
    <Link to="/student/lesson/$lessonId" params={{ lessonId: ref_.lesson.id }}>
      <Card className="p-5 hover:shadow-pop transition cursor-pointer flex items-center gap-4 bg-gradient-to-r from-primary/15 to-accent">
        <div className="h-14 w-14 rounded-2xl bg-primary/20 flex items-center justify-center">
          <PlayCircle className="h-8 w-8 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold uppercase text-primary">Continue Learning · {tr(ref_.subject?.name)}</div>
          <div className="truncate text-lg font-extrabold">{tr(ref_.lesson.title)}</div>
          <div className="text-xs text-muted-foreground">{ref_.pct}% done · Pick up where you left off</div>
        </div>
        <Button size="sm" className="rounded-2xl">Resume</Button>
      </Card>
    </Link>
  );
}

function SubjectScheduleCard({ row, classInfo, tr }: { row: any; classInfo: any; tr: (v: any) => string }) {
  const subjectColor = row.subject?.color || "#FDE68A";
  const items = [
    row.lesson && {
      kind: "lesson" as const,
      icon: BookOpen,
      label: "Lesson",
      title: tr(row.lesson.title),
      done: row.lessonDone,
      locked: false,
      score: row.lessonDone ? lessonMapScore(row, "lesson") : undefined,
      to: { to: "/student/lesson/$lessonId", params: { lessonId: row.lesson.id } },
    },
    row.assignment && {
      kind: "assignment" as const,
      icon: PencilLine,
      label: "Assignment",
      title: tr(row.assignment.title),
      done: row.assignmentDone,
      locked: !!row.lesson && !row.lessonDone,
      score: row.aSub?.completed_at ? Math.round(((row.aSub.score ?? 0) / Math.max(1, row.aSub.max_score)) * 100) : undefined,
      to: { to: "/student/assignment/$assignmentId", params: { assignmentId: row.assignment.id } },
    },
    row.test && {
      kind: "test" as const,
      icon: ClipboardCheck,
      label: "Test",
      title: tr(row.test.title),
      done: row.testDone,
      locked: (!!row.lesson && !row.lessonDone) || (!!row.assignment && !row.assignmentDone),
      score: row.tAtt?.completed_at ? Math.round(((row.tAtt.score ?? 0) / Math.max(1, row.tAtt.max_score)) * 100) : undefined,
      to: { to: "/student/test/$testId", params: { testId: row.test.id } },
    },
  ].filter(Boolean) as any[];

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3 mb-3">
        <div
          className="h-11 w-11 rounded-2xl flex items-center justify-center text-xl"
          style={{ backgroundColor: subjectColor + "33" }}
        >
          {row.subject?.icon || "📘"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-extrabold truncate">{tr(row.subject?.name)}</div>
          {classInfo && (
            <div className="text-xs text-muted-foreground truncate">{tr(classInfo.className)}</div>
          )}
        </div>
        {row.subjectDone && <CheckCircle2 className="h-6 w-6 text-success" />}
      </div>
      <div className="grid sm:grid-cols-3 gap-2">
        {items.map((it: any) => (
          <ActivityChip key={it.kind} item={it} />
        ))}
      </div>
    </Card>
  );
}

function lessonMapScore(row: any, _kind: string) {
  return undefined;
}

function ActivityChip({ item }: { item: any }) {
  const Icon = item.icon;
  const status = item.locked
    ? "Locked"
    : item.done
    ? item.score !== undefined
      ? `Done · ${item.score}%`
      : "Done"
    : "Available";
  const content = (
    <div
      className={`rounded-2xl border-2 p-3 flex items-center gap-2 transition ${
        item.locked
          ? "opacity-60 border-muted bg-muted/30"
          : item.done
          ? "border-success/40 bg-success/10"
          : "border-primary/40 bg-primary/5 hover:bg-primary/10"
      }`}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-xs font-bold uppercase text-muted-foreground">{item.label}</div>
        <div className="text-sm font-bold truncate">{item.title}</div>
        <div className="text-[11px] text-muted-foreground">{status}</div>
      </div>
      {item.locked && <Lock className="h-4 w-4 text-muted-foreground" />}
    </div>
  );
  if (item.locked) return content;
  return <Link {...(item.to as any)}>{content}</Link>;
}

function DailySummary({ enriched, tr }: { enriched: any[]; tr: (v: any) => string }) {
  const lessonsDone = enriched.filter((e: any) => e.lessonDone && e.lesson).length;
  const assignmentsDone = enriched.filter((e: any) => e.assignmentDone && e.assignment).length;
  const testsTaken = enriched.filter((e: any) => e.testDone && e.test);
  const testAvg = testsTaken.length
    ? Math.round(
        testsTaken.reduce((s: number, e: any) => s + Math.round(((e.tAtt?.score ?? 0) / Math.max(1, e.tAtt?.max_score ?? 1)) * 100), 0) /
          testsTaken.length,
      )
    : 0;
  return (
    <Card className="p-5 bg-gradient-to-r from-success/15 to-accent">
      <div className="text-2xl">🎉</div>
      <h3 className="font-extrabold text-lg">Daily Summary — All done!</h3>
      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <div><div className="font-extrabold text-xl">{lessonsDone}</div><div className="text-muted-foreground">Lessons</div></div>
        <div><div className="font-extrabold text-xl">{assignmentsDone}</div><div className="text-muted-foreground">Assignments</div></div>
        <div><div className="font-extrabold text-xl">{testsTaken.length}</div><div className="text-muted-foreground">Tests · avg {testAvg}%</div></div>
        <div>
          <Link to="/student/rewards" className="font-extrabold text-xl text-primary">View →</Link>
          <div className="text-muted-foreground">Coins & Badges</div>
        </div>
      </div>
    </Card>
  );
}

function TodaysRevisionWidget({ studentId }: { studentId: string }) {
  const { data: groups } = useQuery({
    queryKey: ["today-revision", studentId],
    queryFn: () => fetchTodayRevision(studentId, 5),
  });
  if (!groups) return null;
  const rows = [
    { code: "telugu", label: "Telugu", emoji: "🌼", count: groups.telugu?.length ?? 0 },
    { code: "hindi", label: "Hindi", emoji: "🪷", count: groups.hindi?.length ?? 0 },
    { code: "english", label: "English", emoji: "📚", count: groups.english?.length ?? 0 },
    { code: "math", label: "Maths", emoji: "🔢", count: groups.math?.length ?? 0 },
  ];
  const total = rows.reduce((n, r) => n + r.count, 0);
  if (total === 0) return null;
  return (
    <Link to="/student/brush-up">
      <Card className="p-5 hover:shadow-pop transition cursor-pointer bg-gradient-to-r from-secondary/40 to-accent">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-primary/15 flex items-center justify-center"><Sparkles className="h-6 w-6 text-primary" /></div>
          <div className="flex-1">
            <div className="text-xs font-bold uppercase text-primary">Today's Revision · ~10 min</div>
            <div className="font-extrabold">Daily Brush-Up — {total} quick items</div>
            <div className="text-xs text-muted-foreground">20% revision + 80% new learning keeps memory strong</div>
          </div>
          <ArrowRight className="h-5 w-5 text-primary" />
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
          {rows.map((r) => (
            <div key={r.code} className="rounded-xl bg-background/60 py-2">
              <div className="text-base">{r.emoji}</div>
              <div className="font-bold">{r.count}</div>
              <div className="text-muted-foreground">{r.label}</div>
            </div>
          ))}
        </div>
      </Card>
    </Link>
  );
}

function TodaysHomeworkWidget({ studentId }: { studentId: string }) {
  const { data = [] } = useQuery({
    queryKey: ["homework", studentId],
    queryFn: () => fetchHomework(studentId),
  });
  const s = summarizeHomework(data);
  if (data.length === 0) return null;
  return (
    <Link to="/student/homework">
      <Card className="p-5 hover:shadow-pop transition cursor-pointer bg-gradient-to-r from-accent to-primary/10">
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-primary/15 flex items-center justify-center"><ClipboardList className="h-6 w-6 text-primary" /></div>
          <div className="min-w-0">
            <div className="text-xs font-bold uppercase text-primary">Today's Homework</div>
            <div className="font-extrabold truncate">{s.pending.length} pending · {s.completed.length} done{s.overdue.length ? ` · ${s.overdue.length} overdue` : ""}</div>
          </div>
          <ArrowRight className="h-5 w-5 text-primary" />
        </div>
      </Card>
    </Link>
  );
}

function ProgramBanner({ activeProgram }: { activeProgram: string | null }) {
  const current = PROGRAMS.find((p) => p.code === activeProgram);
  return (
    <Link to="/student/today">
      <Card className="p-5 h-auto bg-gradient-to-r from-primary/10 to-secondary/40 hover:shadow-pop transition cursor-pointer">
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
          <div className="text-4xl shrink-0">{current?.emoji ?? "🎒"}</div>
          <div className="min-w-0">
            <div className="text-xs font-bold uppercase text-primary">Current Program</div>
            <div className="font-extrabold truncate">{current?.name ?? "Choose a program"}</div>
            <div className="text-xs text-muted-foreground truncate">{current?.tagline ?? "Tap to pick KG2 Brush-Up or Class 1"}</div>
          </div>
          <div className="text-sm font-bold text-primary shrink-0">{current ? "Today's Learning →" : "Choose →"}</div>
        </div>
      </Card>
    </Link>
  );
}

function PendingLists({ studentId, classIds, tr }: { studentId: string; classIds: string[]; tr: (v: any) => string }) {
  const { data: pa = [] } = useQuery({
    queryKey: ["pending-assignments", studentId, classIds.join(",")],
    queryFn: () => fetchPendingAssignments(studentId, classIds),
  });
  const { data: pt = [] } = useQuery({
    queryKey: ["pending-tests", studentId, classIds.join(",")],
    queryFn: () => fetchPendingTests(studentId, classIds),
  });
  if (pa.length === 0 && pt.length === 0) return null;
  return (
    <section className="grid sm:grid-cols-2 gap-4">
      {pa.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <PencilLine className="h-5 w-5 text-primary" />
            <h3 className="font-extrabold">Pending Assignments</h3>
            <span className="ml-auto text-xs font-bold bg-primary/15 text-primary rounded-full px-2 py-0.5">{pa.length}</span>
          </div>
          <div className="space-y-2">
            {pa.map((a: any) => (
              <Link key={a.id} to="/student/assignment/$assignmentId" params={{ assignmentId: a.id }}>
                <div className="rounded-xl border-2 border-primary/20 p-2 hover:bg-primary/5 flex items-center gap-2">
                  <span className="text-lg">{a.subject?.icon || "📘"}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold truncate">{tr(a.title)}</div>
                    <div className="text-xs text-muted-foreground truncate">{tr(a.subject?.name)}</div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}
      {pt.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <ClipboardCheck className="h-5 w-5 text-accent-foreground" />
            <h3 className="font-extrabold">Pending Tests</h3>
            <span className="ml-auto text-xs font-bold bg-accent/40 rounded-full px-2 py-0.5">{pt.length}</span>
          </div>
          <div className="space-y-2">
            {pt.map((t: any) => (
              <Link key={t.id} to="/student/test/$testId" params={{ testId: t.id }}>
                <div className="rounded-xl border-2 border-accent/40 p-2 hover:bg-accent/20 flex items-center gap-2">
                  <span className="text-lg">{t.subject?.icon || "📝"}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold truncate">{tr(t.title)}</div>
                    <div className="text-xs text-muted-foreground truncate">{tr(t.subject?.name)} · {t.scope}</div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </section>
  );
}