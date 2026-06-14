import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BookOpen, ClipboardList, ClipboardCheck, Layers } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/curriculum-progress")({
  component: CurriculumProgressPage,
});

function CurriculumProgressPage() {
  const { tr } = useI18n();

  const subjectsQ = useQuery({
    queryKey: ["admin-cov-subjects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subjects")
        .select("id, name, color, class_id, classes(id, name, board_id, boards(id, code, name)), units(id, lessons(id, is_published))")
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const lessonIds = (subjectsQ.data ?? []).flatMap((s: any) =>
    (s.units ?? []).flatMap((u: any) => (u.lessons ?? []).map((l: any) => l.id))
  );

  const assignmentsQ = useQuery({
    queryKey: ["admin-cov-assignments", lessonIds.length],
    enabled: lessonIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("assignments").select("id, lesson_id").in("lesson_id", lessonIds);
      if (error) throw error;
      return data ?? [];
    },
  });

  const testsQ = useQuery({
    queryKey: ["admin-cov-tests", lessonIds.length],
    enabled: lessonIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("tests").select("id, lesson_id").in("lesson_id", lessonIds);
      if (error) throw error;
      return data ?? [];
    },
  });

  const aByLesson = new Set((assignmentsQ.data ?? []).map((a: any) => a.lesson_id));
  const tByLesson = new Set((testsQ.data ?? []).map((t: any) => t.lesson_id));

  // Group by class (program)
  const byClass: Record<string, { name: any; subjects: any[] }> = {};
  for (const s of subjectsQ.data ?? []) {
    const k = s.class_id;
    byClass[k] ??= { name: s.classes?.name, subjects: [] };
    byClass[k].subjects.push(s);
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold">Curriculum Progress</h1>
        <p className="text-sm text-muted-foreground">Coverage of units, lessons, assignments and tests per program.</p>
      </header>

      {subjectsQ.isLoading && <p className="text-muted-foreground">Loading…</p>}

      {Object.entries(byClass).map(([cid, group]) => (
        <section key={cid} className="space-y-3">
          <h2 className="text-lg font-extrabold no-clip">{tr(group.name) || "Program"}</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {group.subjects.map((s: any) => {
              const units = s.units ?? [];
              const lessons = units.flatMap((u: any) => u.lessons ?? []);
              const published = lessons.filter((l: any) => l.is_published).length;
              const assignments = lessons.filter((l: any) => aByLesson.has(l.id)).length;
              const tests = lessons.filter((l: any) => tByLesson.has(l.id)).length;
              const denom = lessons.length || 1;
              const completion = Math.round(((published + assignments + tests) / (denom * 3)) * 100);
              return (
                <Card key={s.id} className="p-4 min-h-[180px] flex flex-col gap-3">
                  <div className="font-extrabold text-base no-clip">{tr(s.name)}</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <Stat icon={<Layers className="h-3.5 w-3.5" />} label="Units" value={units.length} />
                    <Stat icon={<BookOpen className="h-3.5 w-3.5" />} label="Lessons" value={lessons.length} />
                    <Stat icon={<ClipboardList className="h-3.5 w-3.5" />} label="Assignments" value={assignments} />
                    <Stat icon={<ClipboardCheck className="h-3.5 w-3.5" />} label="Tests" value={tests} />
                  </div>
                  <div className="mt-auto">
                    <div className="flex items-center justify-between text-xs font-bold mb-1">
                      <span className="text-muted-foreground">Completion</span>
                      <span>{completion}%</span>
                    </div>
                    <Progress value={completion} />
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-lg bg-muted/50 p-2 flex items-center gap-2 min-w-0">
      <span className="text-primary shrink-0">{icon}</span>
      <span className="text-muted-foreground truncate">{label}</span>
      <span className="ml-auto font-extrabold">{value}</span>
    </div>
  );
}