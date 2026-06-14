import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useStudents } from "@/lib/student-context";
import { useI18n } from "@/lib/i18n";
import { fetchActivePrograms } from "@/lib/data";
import { computeSchoolReadiness, awardReadinessBadges, type MasteryLevel } from "@/lib/readiness";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, GraduationCap, AlertTriangle, Target, TrendingUp, BookOpen, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/student/readiness")({
  component: ReadinessPage,
});

const LEVEL_COLOR: Record<MasteryLevel, string> = {
  new: "bg-muted text-muted-foreground",
  learning: "bg-yellow-100 text-yellow-800",
  practicing: "bg-blue-100 text-blue-800",
  mastered: "bg-emerald-100 text-emerald-800",
};

function ReadinessPage() {
  const { activeStudent } = useStudents();
  const { tr } = useI18n();

  const { data: programs = [] } = useQuery({
    queryKey: ["active-programs"],
    queryFn: fetchActivePrograms,
  });
  const classIds = useMemo(
    () => programs.flatMap((b: any) => (b.classes ?? []).map((c: any) => c.id)),
    [programs],
  );

  const readiness = useQuery({
    queryKey: ["readiness", activeStudent?.id, classIds.join(",")],
    enabled: !!activeStudent && classIds.length > 0,
    queryFn: () => computeSchoolReadiness(activeStudent!.id, classIds),
  });

  // Award motivation badges when readiness changes
  useEffect(() => {
    if (!activeStudent || !readiness.data) return;
    const key = `readiness:last:${activeStudent.id}`;
    const prev = Number(localStorage.getItem(key) ?? "NaN");
    awardReadinessBadges(activeStudent.id, readiness.data.overall, Number.isFinite(prev) ? prev : null).catch(() => {});
    localStorage.setItem(key, String(readiness.data.overall));
  }, [activeStudent?.id, readiness.data?.overall]);

  if (!activeStudent) return null;
  if (readiness.isLoading || !readiness.data) {
    return <p className="text-muted-foreground">Calculating readiness…</p>;
  }
  const r = readiness.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <GraduationCap className="h-6 w-6 text-primary" />
        <h1 className="text-3xl font-extrabold">School Readiness</h1>
      </div>

      {/* Overall hero */}
      <Card className="p-6 bg-gradient-to-br from-primary/10 to-accent/20 border-primary/20">
        <div className="flex flex-col sm:flex-row sm:items-end gap-6">
          <div className="flex-1">
            <div className="text-xs font-bold uppercase text-muted-foreground">Overall School Readiness</div>
            <div className="text-6xl font-extrabold text-primary mt-2">{r.overall}%</div>
            <p className="text-sm text-muted-foreground mt-2 max-w-md">
              {r.overall >= 80
                ? "Excellent! You are confidently ready to continue Class 1."
                : r.overall >= 60
                  ? "Good progress. Keep practicing the weak areas below."
                  : "Let’s build a daily routine. Follow the recovery plan below."}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center text-xs sm:w-64">
            <Stat label="Attendance" value={`${r.attendancePct}%`} />
            <Stat label="Subjects" value={r.subjects.length} />
          </div>
        </div>
      </Card>

      {/* Per-subject readiness */}
      <section>
        <h2 className="text-lg font-extrabold mb-3 flex items-center gap-2"><BookOpen className="h-4 w-4" /> Subject readiness</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {r.subjects.map((s) => (
            <Card key={s.subject_id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="font-bold">{tr(s.subject_name)}</div>
                <div className="text-2xl font-extrabold text-primary">{s.score}%</div>
              </div>
              <Progress value={s.score} className="mt-2" />
              <div className="mt-2 grid grid-cols-3 gap-1 text-[10px] font-bold uppercase text-muted-foreground">
                <div>Lessons {s.breakdown.lessons}%</div>
                <div>Asgmts {s.breakdown.assignments}%</div>
                <div>Tests {s.breakdown.tests}%</div>
              </div>
              <div className="text-xs text-muted-foreground mt-1">{s.doneLessons}/{s.totalLessons} lessons done</div>
            </Card>
          ))}
          {r.subjects.length === 0 && (
            <p className="text-sm text-muted-foreground">No subjects enrolled yet.</p>
          )}
        </div>
      </section>

      {/* Needs improvement */}
      <section>
        <h2 className="text-lg font-extrabold mb-3 flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-4 w-4" /> Needs Improvement
        </h2>
        {r.weakConcepts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No weak areas detected — keep it up!</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-2">
            {r.weakConcepts.map((w) => (
              <Card key={w.lesson_id} className="p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-muted-foreground truncate">{tr(w.subject_name)}</div>
                  <div className="font-bold truncate">{tr(w.lesson_title)}</div>
                </div>
                {w.score != null && <Badge variant="destructive">{w.score}%</Badge>}
                <Link to="/student/classroom/$lessonId" params={{ lessonId: w.lesson_id }}>
                  <Button size="sm" variant="outline" className="gap-1">Revise <ArrowRight className="h-3 w-3" /></Button>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Recovery plan */}
      <section>
        <h2 className="text-lg font-extrabold mb-3 flex items-center gap-2"><Target className="h-4 w-4 text-primary" /> Smart Recovery Plan</h2>
        {r.recoveryPlan.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recovery needed right now. 🎉</p>
        ) : (
          <div className="space-y-2">
            {r.recoveryPlan.map((p) => (
              <Card key={p.lesson_id} className="p-3 flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-bold truncate">{tr(p.lesson_title)}</div>
                  <div className="text-xs text-muted-foreground">
                    {tr(p.subject_name)} • {p.minutesPerDay} mins/day for {p.days} days
                  </div>
                </div>
                <Link to="/student/classroom/$lessonId" params={{ lessonId: p.lesson_id }}>
                  <Button size="sm">Start</Button>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Mastery list */}
      <section>
        <h2 className="text-lg font-extrabold mb-3 flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Lesson Mastery</h2>
        <div className="space-y-1.5">
          {r.mastery.slice(0, 20).map((m) => (
            <Card key={m.lesson_id} className="p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-xs text-muted-foreground truncate">{tr(m.subject_name)}</div>
                <div className="font-bold truncate">{tr(m.lesson_title)}</div>
              </div>
              <div className="w-24 text-right">
                <div className="text-sm font-extrabold">{m.mastery}%</div>
                <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${LEVEL_COLOR[m.level]}`}>{m.level}</span>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-background/60 p-2">
      <div className="text-[10px] font-bold uppercase text-muted-foreground">{label}</div>
      <div className="text-lg font-extrabold">{value}</div>
    </div>
  );
}