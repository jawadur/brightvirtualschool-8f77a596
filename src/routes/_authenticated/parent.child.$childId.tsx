import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, CalendarCheck, BookOpen, ClipboardList, ClipboardCheck, Clock, TrendingUp, GraduationCap, AlertTriangle, Target, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { computeSchoolReadiness } from "@/lib/readiness";
import { fetchHomework, summarizeHomework } from "@/lib/homework";

export const Route = createFileRoute("/_authenticated/parent/child/$childId")({
  component: ChildDetail,
});

function ChildDetail() {
  const { childId } = Route.useParams();
  const { tr } = useI18n();

  const child = useQuery({
    queryKey: ["parent-child", childId],
    queryFn: async () => {
      const { data, error } = await supabase.from("student_profiles").select("*").eq("id", childId).single();
      if (error) throw error; return data;
    },
  });

  const subjects = useQuery({
    queryKey: ["parent-subjects", child.data?.class_id],
    enabled: !!child.data?.class_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subjects")
        .select("id, name, lessons:units(id, lessons(id))")
        .eq("class_id", child.data!.class_id!);
      if (error) throw error; return data ?? [];
    },
  });

  const progress = useQuery({
    queryKey: ["parent-progress", childId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("progress")
        .select("lesson_id, status, score, completed_at, time_spent_seconds, lessons(units(subject_id))")
        .eq("student_profile_id", childId);
      if (error) throw error; return data ?? [];
    },
  });

  const submissions = useQuery({
    queryKey: ["parent-submissions", childId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assignment_submissions")
        .select("id, score, status, completed_at, assignments(title)")
        .eq("student_profile_id", childId)
        .order("completed_at", { ascending: false });
      if (error) throw error; return data ?? [];
    },
  });

  const attempts = useQuery({
    queryKey: ["parent-attempts", childId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("test_attempts")
        .select("id, score, status, completed_at, tests(title, pass_threshold)")
        .eq("student_profile_id", childId)
        .eq("status", "completed")
        .order("completed_at", { ascending: false });
      if (error) throw error; return data ?? [];
    },
  });

  const attendance = useQuery({
    queryKey: ["parent-attendance", childId],
    queryFn: async () => {
      const since = new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("attendance").select("date, present").eq("student_profile_id", childId).gte("date", since);
      if (error) throw error; return data ?? [];
    },
  });

  const readiness = useQuery({
    queryKey: ["parent-readiness", childId, child.data?.class_id],
    enabled: !!child.data?.class_id,
    queryFn: () => computeSchoolReadiness(childId, [child.data!.class_id!]),
  });

  const homework = useQuery({
    queryKey: ["parent-homework", childId],
    queryFn: () => fetchHomework(childId),
  });

  if (child.isLoading || !child.data) return <p className="text-muted-foreground">Loading…</p>;

  const completedLessonIds = new Set(progress.data?.filter((p) => p.status === "completed").map((p) => p.lesson_id));
  const presentDays = (attendance.data ?? []).filter((a) => a.present).length;
  const completedThisWeek = (progress.data ?? []).filter((p) => {
    if (!p.completed_at) return false;
    return new Date(p.completed_at).getTime() > Date.now() - 7 * 24 * 3600 * 1000;
  }).length;
  const completedLastWeek = (progress.data ?? []).filter((p) => {
    if (!p.completed_at) return false;
    const t = new Date(p.completed_at).getTime();
    return t > Date.now() - 14 * 24 * 3600 * 1000 && t <= Date.now() - 7 * 24 * 3600 * 1000;
  }).length;
  const completedThisMonth = (progress.data ?? []).filter((p) => {
    if (!p.completed_at) return false;
    return new Date(p.completed_at).getTime() > Date.now() - 30 * 24 * 3600 * 1000;
  }).length;
  const weeklyGrowth = completedLastWeek === 0
    ? (completedThisWeek > 0 ? "+100%" : "0%")
    : `${completedThisWeek - completedLastWeek >= 0 ? "+" : ""}${Math.round(((completedThisWeek - completedLastWeek) / completedLastWeek) * 100)}%`;
  const totalSeconds = (progress.data ?? []).reduce((acc, p: any) => acc + (p.time_spent_seconds ?? 0), 0);
  const learningTime = totalSeconds >= 3600 ? `${Math.round(totalSeconds / 360) / 10}h` : `${Math.round(totalSeconds / 60)}m`;

  return (
    <div className="space-y-6">
      <Link to="/parent" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary">
        <ChevronLeft className="h-4 w-4" /> Back
      </Link>
      <h1 className="text-3xl font-extrabold">{child.data.display_name}</h1>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard icon={<CalendarCheck className="h-5 w-5" />} label="Present (7d)" value={`${presentDays}/7`} />
        <SummaryCard icon={<BookOpen className="h-5 w-5" />} label="Lessons this week" value={completedThisWeek} />
        <SummaryCard icon={<ClipboardList className="h-5 w-5" />} label="Assignments done" value={submissions.data?.filter((s) => s.status === "completed").length ?? 0} />
        <SummaryCard icon={<ClipboardCheck className="h-5 w-5" />} label="Tests taken" value={attempts.data?.length ?? 0} />
      </section>

      <section className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <SummaryCard icon={<TrendingUp className="h-5 w-5" />} label="Weekly growth" value={weeklyGrowth} />
        <SummaryCard icon={<TrendingUp className="h-5 w-5" />} label="Monthly lessons" value={completedThisMonth} />
        <SummaryCard icon={<Clock className="h-5 w-5" />} label="Learning time" value={learningTime} />
      </section>

      {homework.data && homework.data.length > 0 && (() => {
        const s = summarizeHomework(homework.data);
        return (
          <section>
            <h2 className="text-lg font-extrabold mb-2 flex items-center gap-2"><ClipboardList className="h-5 w-5 text-primary" /> Homework</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <SummaryCard icon={<Clock className="h-5 w-5" />} label="Pending" value={s.pending.length} />
              <SummaryCard icon={<ClipboardCheck className="h-5 w-5" />} label="Completed" value={s.completed.length} />
              <SummaryCard icon={<AlertTriangle className="h-5 w-5" />} label="Overdue" value={s.overdue.length} />
              <SummaryCard icon={<TrendingUp className="h-5 w-5" />} label="Avg score" value={s.avgScore != null ? `${s.avgScore}%` : "—"} />
            </div>
          </section>
        );
      })()}

      {readiness.data && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold flex items-center gap-2"><GraduationCap className="h-5 w-5 text-primary" /> School Readiness</h2>
            <Link to="/parent/report/$childId" params={{ childId }}>
              <Button size="sm" variant="outline" className="gap-1"><FileText className="h-4 w-4" /> Monthly Report</Button>
            </Link>
          </div>
          <Card className="p-5 bg-gradient-to-br from-primary/10 to-accent/20">
            <div className="flex items-end gap-6">
              <div className="flex-1">
                <div className="text-xs font-bold uppercase text-muted-foreground">Overall</div>
                <div className="text-5xl font-extrabold text-primary">{readiness.data.overall}%</div>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                Attendance {readiness.data.attendancePct}%
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
              {readiness.data.subjects.map((s) => (
                <div key={s.subject_id} className="rounded-lg bg-background/60 p-2">
                  <div className="text-xs font-bold truncate">{tr(s.subject_name)}</div>
                  <div className="text-lg font-extrabold">{s.score}%</div>
                </div>
              ))}
            </div>
          </Card>

          <div className="grid sm:grid-cols-2 gap-4">
            <Card className="p-4">
              <div className="font-extrabold flex items-center gap-2 text-success"><TrendingUp className="h-4 w-4" /> Strong Areas</div>
              <ul className="mt-2 text-sm space-y-1">
                {readiness.data.subjects.filter((s) => s.score >= 75).map((s) => (
                  <li key={s.subject_id}>• {tr(s.subject_name)} — {s.score}%</li>
                ))}
                {readiness.data.subjects.filter((s) => s.score >= 75).length === 0 && (
                  <li className="text-muted-foreground">Building up — keep practicing daily.</li>
                )}
              </ul>
            </Card>
            <Card className="p-4">
              <div className="font-extrabold flex items-center gap-2 text-destructive"><AlertTriangle className="h-4 w-4" /> Needs Improvement</div>
              <ul className="mt-2 text-sm space-y-1">
                {readiness.data.weakConcepts.slice(0, 5).map((w) => (
                  <li key={w.lesson_id}>• {tr(w.subject_name)} — {tr(w.lesson_title)}</li>
                ))}
                {readiness.data.weakConcepts.length === 0 && (
                  <li className="text-muted-foreground">No weak areas — great job!</li>
                )}
              </ul>
            </Card>
          </div>

          <Card className="p-4">
            <div className="font-extrabold flex items-center gap-2"><Target className="h-4 w-4 text-primary" /> Recommended Practice</div>
            <ul className="mt-2 text-sm space-y-1">
              {readiness.data.recoveryPlan.map((p) => (
                <li key={p.lesson_id}>• {tr(p.lesson_title)} — {p.minutesPerDay} mins/day × {p.days} days</li>
              ))}
              {readiness.data.recoveryPlan.length === 0 && (
                <li className="text-muted-foreground">No additional practice needed right now.</li>
              )}
            </ul>
          </Card>
        </section>
      )}

      <section>
        <h2 className="text-lg font-extrabold mb-2">Subject progress</h2>
        <div className="space-y-2">
          {(subjects.data ?? []).map((s: any) => {
            const allLessons: string[] = s.lessons?.flatMap((u: any) => u.lessons?.map((l: any) => l.id) ?? []) ?? [];
            const done = allLessons.filter((id) => completedLessonIds.has(id)).length;
            const pct = allLessons.length ? Math.round((done / allLessons.length) * 100) : 0;
            return (
              <Card key={s.id} className="p-4">
                <div className="flex justify-between items-center mb-2">
                  <div className="font-bold">{tr(s.name)}</div>
                  <div className="text-sm text-muted-foreground">{done}/{allLessons.length}</div>
                </div>
                <Progress value={pct} />
              </Card>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-extrabold mb-2">Recent test scores</h2>
        <div className="grid sm:grid-cols-2 gap-2">
          {(attempts.data ?? []).slice(0, 8).map((a: any) => {
            const passed = a.score >= (a.tests?.pass_threshold ?? 60);
            return (
              <Card key={a.id} className="p-3 flex items-center gap-3">
                <div className="flex-1 font-bold">{tr(a.tests?.title)}</div>
                <div className={`text-sm font-extrabold ${passed ? "text-success" : "text-destructive"}`}>{a.score}%</div>
              </Card>
            );
          })}
          {attempts.data?.length === 0 && <p className="text-sm text-muted-foreground">No tests taken yet.</p>}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-extrabold mb-2">Recent assignments</h2>
        <div className="grid sm:grid-cols-2 gap-2">
          {(submissions.data ?? []).slice(0, 8).map((s: any) => (
            <Card key={s.id} className="p-3 flex items-center gap-3">
              <div className="flex-1 font-bold">{tr(s.assignments?.title)}</div>
              <div className="text-sm font-extrabold">{s.score}%</div>
            </Card>
          ))}
          {submissions.data?.length === 0 && <p className="text-sm text-muted-foreground">No assignments yet.</p>}
        </div>
      </section>
    </div>
  );
}

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-primary">{icon}<span className="text-xs font-bold uppercase text-muted-foreground">{label}</span></div>
      <div className="mt-1 text-2xl font-extrabold">{value}</div>
    </Card>
  );
}