import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { computeMonthlyReport } from "@/lib/readiness";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, FileText, Calendar, BookOpen, ClipboardCheck, GraduationCap } from "lucide-react";

export const Route = createFileRoute("/_authenticated/parent/report/$childId")({
  component: MonthlyReport,
});

function MonthlyReport() {
  const { childId } = Route.useParams();
  const { tr } = useI18n();

  const child = useQuery({
    queryKey: ["parent-child", childId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_profiles")
        .select("id, display_name, class_id")
        .eq("id", childId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const report = useQuery({
    queryKey: ["monthly-report", childId, child.data?.class_id],
    enabled: !!child.data?.class_id,
    queryFn: () => computeMonthlyReport(childId, [child.data!.class_id!]),
  });

  if (child.isLoading || !child.data) return <p className="text-muted-foreground">Loading…</p>;
  if (report.isLoading || !report.data) return <p className="text-muted-foreground">Generating report…</p>;
  const r = report.data;

  return (
    <div className="space-y-6 print:p-6">
      <Link to="/parent/child/$childId" params={{ childId }} className="inline-flex items-center text-sm text-muted-foreground hover:text-primary print:hidden">
        <ChevronLeft className="h-4 w-4" /> Back
      </Link>

      <header className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary"><FileText className="h-5 w-5" /><span className="font-bold uppercase text-xs">Monthly Learning Report</span></div>
          <h1 className="text-3xl font-extrabold">{child.data.display_name}</h1>
          <p className="text-xs text-muted-foreground mt-1">{r.period.from} → {r.period.to}</p>
        </div>
        <button onClick={() => window.print()} className="print:hidden text-sm border rounded-md px-3 py-1.5 font-bold hover:bg-accent">Print / Save PDF</button>
      </header>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KV icon={<GraduationCap className="h-4 w-4" />} label="Readiness" value={`${r.readiness.overall}%`} />
        <KV icon={<Calendar className="h-4 w-4" />} label="Attendance" value={`${r.presentDays}/22 days`} />
        <KV icon={<BookOpen className="h-4 w-4" />} label="Lessons" value={r.lessonsCompleted} />
        <KV icon={<ClipboardCheck className="h-4 w-4" />} label="Avg test" value={`${r.avgTestScore}%`} />
      </section>

      <section>
        <h2 className="font-extrabold mb-2">Subject Scores</h2>
        <div className="space-y-2">
          {r.readiness.subjects.map((s) => (
            <Card key={s.subject_id} className="p-3">
              <div className="flex items-center justify-between font-bold">
                <span>{tr(s.subject_name)}</span>
                <span>{s.score}%</span>
              </div>
              <Progress value={s.score} className="mt-1" />
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-extrabold mb-2">Strong Areas</h2>
        <ul className="list-disc list-inside text-sm">
          {r.readiness.subjects.filter((s) => s.score >= 75).map((s) => (
            <li key={s.subject_id}>{tr(s.subject_name)} — {s.score}%</li>
          ))}
          {r.readiness.subjects.filter((s) => s.score >= 75).length === 0 && (
            <li className="text-muted-foreground">Building up — keep practicing daily.</li>
          )}
        </ul>
      </section>

      <section>
        <h2 className="font-extrabold mb-2">Needs Improvement</h2>
        <ul className="list-disc list-inside text-sm">
          {r.readiness.weakConcepts.slice(0, 8).map((w) => (
            <li key={w.lesson_id}>{tr(w.subject_name)} — {tr(w.lesson_title)}</li>
          ))}
          {r.readiness.weakConcepts.length === 0 && (
            <li className="text-muted-foreground">No weak areas detected.</li>
          )}
        </ul>
      </section>

      <section>
        <h2 className="font-extrabold mb-2">Recommended Practice</h2>
        <ul className="list-disc list-inside text-sm">
          {r.readiness.recoveryPlan.map((p) => (
            <li key={p.lesson_id}>{tr(p.lesson_title)} — {p.minutesPerDay} mins/day × {p.days} days</li>
          ))}
          {r.readiness.recoveryPlan.length === 0 && (
            <li className="text-muted-foreground">No additional practice needed.</li>
          )}
        </ul>
      </section>

      <section className="border-t pt-4">
        <h2 className="font-extrabold mb-2">Teacher Remarks</h2>
        <p className="text-sm leading-relaxed bg-accent/30 rounded-lg p-3">{r.remark}</p>
      </section>
    </div>
  );
}

function KV({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <Card className="p-3">
      <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase">{icon}{label}</div>
      <div className="mt-1 text-2xl font-extrabold">{value}</div>
    </Card>
  );
}