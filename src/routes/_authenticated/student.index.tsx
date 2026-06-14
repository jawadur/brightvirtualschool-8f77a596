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

      {activeStudent && <TodaysRevisionWidget studentId={activeStudent.id} />}

      {pct === 100 && totalSubjects > 0 && <DailySummary enriched={enriched} tr={tr} />}

      <section>
        <h2 className="text-xl font-extrabold mb-3">📅 Today's Schedule</h2>
        {totalSubjects === 0 ? (
          <Card className="p-8 text-center">
            <CalendarX className="h-10 w-10 mx-auto text-muted-foreground" />
            <div className="mt-3 font-extrabold">No school schedule found for today.</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Admin can create a schedule from the Curriculum Manager.
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