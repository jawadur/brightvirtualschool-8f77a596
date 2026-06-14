import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useStudents } from "@/lib/student-context";
import { useI18n } from "@/lib/i18n";
import { fetchActivePrograms } from "@/lib/data";
import { computeSchoolReadiness } from "@/lib/readiness";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCcw, ArrowRight, Lightbulb } from "lucide-react";

export const Route = createFileRoute("/_authenticated/student/revision-center")({
  component: RevisionCenter,
});

function RevisionCenter() {
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

  if (!activeStudent) return null;
  if (readiness.isLoading || !readiness.data) {
    return <p className="text-muted-foreground">Loading revision center…</p>;
  }
  const r = readiness.data;
  // Lessons that the student has touched but not yet mastered
  const toRevise = r.mastery.filter((m) => m.mastery > 0 && m.mastery < 85).slice(0, 10);
  const weakConcepts = r.weakConcepts;
  const recommended = r.recoveryPlan;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <RefreshCcw className="h-6 w-6 text-primary" />
        <h1 className="text-3xl font-extrabold">Revision Center</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Revisit lessons that need a little more practice so you can confidently move ahead.
      </p>

      <section>
        <h2 className="font-extrabold mb-2">Lessons to Revise</h2>
        {toRevise.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing to revise right now — great work!</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-2">
            {toRevise.map((m) => (
              <Card key={m.lesson_id} className="p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-muted-foreground truncate">{tr(m.subject_name)}</div>
                  <div className="font-bold truncate">{tr(m.lesson_title)}</div>
                </div>
                <Badge variant="secondary">{m.mastery}%</Badge>
                <Link to="/student/classroom/$lessonId" params={{ lessonId: m.lesson_id }}>
                  <Button size="sm" variant="outline" className="gap-1">Revise <ArrowRight className="h-3 w-3" /></Button>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-extrabold mb-2">Weak Concepts</h2>
        {weakConcepts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No weak concepts. 🎉</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {weakConcepts.map((w) => (
              <Link key={w.lesson_id} to="/student/classroom/$lessonId" params={{ lessonId: w.lesson_id }}>
                <Badge variant="destructive" className="cursor-pointer">{tr(w.lesson_title)}</Badge>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-extrabold mb-2 flex items-center gap-2"><Lightbulb className="h-4 w-4" /> Recommended Review</h2>
        {recommended.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recommendations.</p>
        ) : (
          <div className="space-y-2">
            {recommended.map((p) => (
              <Card key={p.lesson_id} className="p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-bold truncate">{tr(p.lesson_title)}</div>
                  <div className="text-xs text-muted-foreground">{tr(p.subject_name)} • {p.minutesPerDay} mins × {p.days} days</div>
                </div>
                <Link to="/student/classroom/$lessonId" params={{ lessonId: p.lesson_id }}>
                  <Button size="sm">Start</Button>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}