import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { PROGRAMS, type ProgramCode } from "@/lib/program";
import { useI18n } from "@/lib/i18n";
import { CalendarRange } from "lucide-react";

export const Route = createFileRoute("/_authenticated/student/weekly")({
  component: WeeklyView,
});

function currentWeek() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  return Math.ceil(((+now - +start) / 86400000 + start.getDay() + 1) / 7);
}

function WeeklyView() {
  const week = currentWeek();
  return (
    <div className="space-y-5">
      <header className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
        <CalendarRange className="h-8 w-8 text-primary shrink-0" />
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold truncate">This Week's Work</h1>
          <p className="text-sm text-muted-foreground">Weekly assignments and tests by program.</p>
        </div>
        <Badge variant="secondary" className="font-bold">Week {week}</Badge>
      </header>
      <Tabs defaultValue="class1">
        <TabsList className="grid grid-cols-2 w-full h-auto">
          {PROGRAMS.map((p) => (
            <TabsTrigger key={p.code} value={p.code} className="py-3 font-bold">{p.emoji} {p.name}</TabsTrigger>
          ))}
        </TabsList>
        {PROGRAMS.map((p) => (
          <TabsContent key={p.code} value={p.code} className="mt-4">
            <ProgramWeek program={p.code} week={week} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function ProgramWeek({ program, week }: { program: ProgramCode; week: number }) {
  const { tr } = useI18n();
  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["weekly-plans", program, week],
    queryFn: async () => {
      const { data } = await supabase
        .from("weekly_plans")
        .select("id, subject_id, week_number, lesson_ids, homework_titles, assignment_id, test_id, notes, subjects(name, icon, color), assignments(id, title), tests(id, title)")
        .eq("program_code", program)
        .eq("week_number", week);
      return (data ?? []) as any[];
    },
  });

  if (isLoading) return <Card className="p-6 text-center text-muted-foreground">Loading…</Card>;
  if (plans.length === 0) {
    return (
      <Card className="p-6 text-center text-muted-foreground">
        No weekly plan published for Week {week} yet.
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {plans.map((row: any) => (
        <Card key={row.id} className="p-4 h-auto">
          <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-2xl flex items-center justify-center text-lg shrink-0" style={{ backgroundColor: (row.subjects?.color ?? "#FDE68A") + "33" }}>
              {row.subjects?.icon || "📘"}
            </div>
            <div className="min-w-0">
              <div className="font-extrabold truncate">{tr(row.subjects?.name) || "Subject"}</div>
              {row.notes && <div className="text-xs text-muted-foreground break-words">{row.notes}</div>}
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-2 text-sm">
            {row.assignment_id && row.assignments ? (
              <Link to="/student/assignment/$assignmentId" params={{ assignmentId: row.assignment_id }}>
                <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-3 hover:bg-primary/10">
                  <div className="text-[11px] font-bold uppercase text-primary">Weekly Assignment</div>
                  <div className="font-bold truncate">{tr(row.assignments.title)}</div>
                </div>
              </Link>
            ) : (
              <div className="rounded-xl border-2 border-dashed p-3 text-muted-foreground">No weekly assignment</div>
            )}
            {program === "class1" && (
              row.test_id && row.tests ? (
                <Link to="/student/test/$testId" params={{ testId: row.test_id }}>
                  <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-3 hover:bg-primary/10">
                    <div className="text-[11px] font-bold uppercase text-primary">Weekly Test</div>
                    <div className="font-bold truncate">{tr(row.tests.title)}</div>
                  </div>
                </Link>
              ) : (
                <div className="rounded-xl border-2 border-dashed p-3 text-muted-foreground">No weekly test</div>
              )
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}