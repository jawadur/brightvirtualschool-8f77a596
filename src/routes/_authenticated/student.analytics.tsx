import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStudents } from "@/lib/student-context";
import { useI18n } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, AlertTriangle, Sparkles, Clock, Mic } from "lucide-react";

export const Route = createFileRoute("/_authenticated/student/analytics")({
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const { activeStudent } = useStudents();
  const { tr } = useI18n();

  const progressQ = useQuery({
    queryKey: ["analytics-progress", activeStudent?.id],
    enabled: !!activeStudent,
    queryFn: async () => {
      const { data } = await supabase
        .from("progress")
        .select("lesson_id, status, score, completed_at, time_spent_seconds, lessons(title, units(subject_id, subjects(name)))")
        .eq("student_profile_id", activeStudent!.id)
        .order("completed_at", { ascending: false });
      return data ?? [];
    },
  });

  const attemptsQ = useQuery({
    queryKey: ["analytics-attempts", activeStudent?.id],
    enabled: !!activeStudent,
    queryFn: async () => {
      const { data } = await supabase
        .from("test_attempts")
        .select("id, score, status, completed_at, tests(title, lesson_id, lessons(units(subjects(name))))")
        .eq("student_profile_id", activeStudent!.id)
        .eq("status", "completed")
        .order("completed_at", { ascending: false });
      return data ?? [];
    },
  });

  const revisionQ = useQuery({
    queryKey: ["analytics-rev", activeStudent?.id],
    enabled: !!activeStudent,
    queryFn: async () => {
      const { data } = await supabase
        .from("revision_progress")
        .select("mastery_level, last_reviewed_at, review_count")
        .eq("student_profile_id", activeStudent!.id);
      return data ?? [];
    },
  });

  const prefsQ = useQuery({
    queryKey: ["analytics-prefs", activeStudent?.id],
    enabled: !!activeStudent,
    queryFn: async () => {
      const { data } = await supabase
        .from("student_preferences")
        .select("voice_reader, auto_read_lesson")
        .eq("student_profile_id", activeStudent!.id)
        .maybeSingle();
      return data;
    },
  });

  // Strong / weak by subject (avg test score)
  const bySubject: Record<string, { name: any; scores: number[] }> = {};
  for (const a of attemptsQ.data ?? []) {
    const nm: any = (a as any).tests?.lessons?.units?.subjects?.name;
    const key = JSON.stringify(nm ?? {});
    bySubject[key] ??= { name: nm, scores: [] };
    bySubject[key].scores.push(a.score ?? 0);
  }
  const subjectAverages = Object.values(bySubject).map((s) => ({
    name: s.name,
    avg: Math.round(s.scores.reduce((a, b) => a + b, 0) / Math.max(s.scores.length, 1)),
    count: s.scores.length,
  }));
  const strong = subjectAverages.filter((s) => s.avg >= 75).sort((a, b) => b.avg - a.avg);
  const weak = subjectAverages.filter((s) => s.avg < 60).sort((a, b) => a.avg - b.avg);

  const totalTime = (progressQ.data ?? []).reduce((acc, p: any) => acc + (p.time_spent_seconds ?? 0), 0);
  const revisionCount = (revisionQ.data ?? []).reduce((acc, r: any) => acc + (r.review_count ?? 0), 0);

  // Timeline (last 14 events)
  const events: { date: string; label: string; icon: string }[] = [];
  for (const p of progressQ.data ?? []) {
    if (p.status === "completed" && p.completed_at) {
      events.push({ date: p.completed_at, label: `Completed: ${tr((p as any).lessons?.title)}`, icon: "📘" });
    }
  }
  for (const a of attemptsQ.data ?? []) {
    if (a.completed_at) events.push({ date: a.completed_at, label: `${(a.score ?? 0) >= 60 ? "Passed" : "Took"}: ${tr((a as any).tests?.title)} — ${a.score}%`, icon: "🏁" });
  }
  events.sort((a, b) => +new Date(b.date) - +new Date(a.date));

  // Recommended next lesson — pick first not-completed in weakest subject
  const recommendedQ = useQuery({
    queryKey: ["analytics-rec", activeStudent?.class_id, weak[0]?.avg],
    enabled: !!activeStudent?.class_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("lessons")
        .select("id, title, units!inner(subject_id, subjects!inner(class_id, name))")
        .eq("units.subjects.class_id", activeStudent!.class_id!)
        .eq("is_published", true)
        .limit(50);
      const completed = new Set((progressQ.data ?? []).filter((p) => p.status === "completed").map((p) => p.lesson_id));
      const pending = (data ?? []).filter((l) => !completed.has(l.id));
      // prefer weakest subject
      const targetName = weak[0]?.name;
      if (targetName) {
        const match = pending.find((l: any) => JSON.stringify(l.units?.subjects?.name) === JSON.stringify(targetName));
        if (match) return match;
      }
      return pending[0] ?? null;
    },
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-extrabold">Learning Analytics</h1>
        <p className="text-sm text-muted-foreground">How you're doing across every subject.</p>
      </header>

      <section className="grid sm:grid-cols-4 gap-3">
        <Stat icon={<Sparkles className="h-4 w-4" />} label="Lessons done" value={(progressQ.data ?? []).filter((p) => p.status === "completed").length} />
        <Stat icon={<TrendingUp className="h-4 w-4" />} label="Tests taken" value={attemptsQ.data?.length ?? 0} />
        <Stat icon={<Clock className="h-4 w-4" />} label="Time learning" value={`${Math.round(totalTime / 60)}m`} />
        <Stat icon={<Mic className="h-4 w-4" />} label="Voice Reader" value={prefsQ.data?.voice_reader ? "On" : "Off"} />
      </section>

      <section className="grid md:grid-cols-2 gap-4">
        <Card className="p-4 min-h-[160px]">
          <div className="font-extrabold mb-2 flex items-center gap-2"><Sparkles className="h-4 w-4 text-success" /> Strong Areas</div>
          {strong.length === 0 && <p className="text-sm text-muted-foreground">Take a few tests to see your strengths.</p>}
          <ul className="space-y-2">
            {strong.map((s, i) => (
              <li key={i} className="flex items-center gap-3">
                <span className="font-bold no-clip flex-1">{tr(s.name)}</span>
                <span className="text-success font-extrabold shrink-0">{s.avg}%</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-4 min-h-[160px]">
          <div className="font-extrabold mb-2 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" /> Needs Improvement</div>
          {weak.length === 0 && <p className="text-sm text-muted-foreground">Great — nothing weak yet!</p>}
          <ul className="space-y-2">
            {weak.map((s, i) => (
              <li key={i} className="flex items-center gap-3">
                <span className="font-bold no-clip flex-1">{tr(s.name)}</span>
                <span className="text-destructive font-extrabold shrink-0">{s.avg}%</span>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      {recommendedQ.data && (
        <Card className="p-4 bg-primary/5 border-primary/30">
          <div className="text-xs uppercase font-bold text-primary">Recommended Next Lesson</div>
          <div className="font-extrabold text-lg no-clip mt-1">{tr((recommendedQ.data as any).title)}</div>
          <p className="text-xs text-muted-foreground mt-1">Based on where you can grow most.</p>
        </Card>
      )}

      <section>
        <div className="font-extrabold mb-2">Revision activity</div>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Total reviews:</span>
            <span className="text-2xl font-extrabold">{revisionCount}</span>
          </div>
          <Progress className="mt-2" value={Math.min(100, (revisionCount / 50) * 100)} />
        </Card>
      </section>

      <section>
        <div className="font-extrabold mb-2">Learning timeline</div>
        <ol className="space-y-2">
          {events.slice(0, 14).map((e, i) => (
            <li key={i} className="flex items-start gap-3 rounded-lg border p-3">
              <span className="text-xl shrink-0" aria-hidden>{e.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="font-bold no-clip">{e.label}</div>
                <div className="text-xs text-muted-foreground">{new Date(e.date).toLocaleString()}</div>
              </div>
            </li>
          ))}
          {events.length === 0 && <p className="text-sm text-muted-foreground">Start a lesson to see your journey here.</p>}
        </ol>
      </section>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <Card className="p-4 min-h-[88px]">
      <div className="flex items-center gap-2 text-primary"><span className="shrink-0">{icon}</span><span className="text-[11px] uppercase font-bold text-muted-foreground truncate">{label}</span></div>
      <div className="mt-1 text-2xl font-extrabold no-clip">{value}</div>
    </Card>
  );
}