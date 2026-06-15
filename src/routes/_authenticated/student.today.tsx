import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useStudents } from "@/lib/student-context";
import { useI18n } from "@/lib/i18n";
import { fetchActiveProgram, fetchSubjectsForProgram, PROGRAMS, type ProgramCode } from "@/lib/program";
import { BookOpen, GraduationCap, ClipboardList, Lock, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/student/today")({
  component: TodaysLearning,
});

function TodaysLearning() {
  const { activeStudent } = useStudents();
  const { data: active } = useQuery({
    queryKey: ["active-program", activeStudent?.id],
    enabled: !!activeStudent,
    queryFn: () => fetchActiveProgram(activeStudent!.id),
  });
  const defaultTab: ProgramCode = (active as ProgramCode) ?? "class1";

  return (
    <div className="space-y-5">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-2xl sm:text-3xl font-extrabold">Today's Learning</h1>
          <p className="text-sm text-muted-foreground">Two programs, one place. Switch tabs to see each day's work.</p>
        </div>
        <Link to="/student/program-select" className="text-xs font-bold text-primary underline shrink-0">Change program</Link>
      </header>

      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="grid grid-cols-2 w-full h-auto">
          {PROGRAMS.map((p) => (
            <TabsTrigger key={p.code} value={p.code} className="py-3 text-base font-bold">
              <span className="mr-2">{p.emoji}</span>
              <span className="truncate">{p.name}</span>
            </TabsTrigger>
          ))}
        </TabsList>
        {PROGRAMS.map((p) => (
          <TabsContent key={p.code} value={p.code} className="mt-4">
            <ProgramDay program={p.code} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function ProgramDay({ program }: { program: ProgramCode }) {
  const { tr } = useI18n();
  const { data: subjects = [], isLoading } = useQuery({
    queryKey: ["program-subjects", program],
    queryFn: () => fetchSubjectsForProgram(program),
  });
  const isKg2 = program === "kg2_brushup";

  if (isLoading) return <Card className="p-6 text-center text-muted-foreground">Loading…</Card>;
  if (subjects.length === 0) {
    return (
      <Card className="p-6 text-center text-muted-foreground">
        No subjects found for this program yet. Ask your teacher to set it up.
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-extrabold">{isKg2 ? "Today's Revision" : "Today's Classes"}</h2>
        <Badge variant="secondary" className="font-bold">{subjects.length} subject{subjects.length === 1 ? "" : "s"}</Badge>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {subjects.map((s: any) => (
          <Link key={s.id} to="/student/daily/$program/$subjectId" params={{ program, subjectId: s.id }}>
            <Card className="p-4 h-auto hover:shadow-pop transition cursor-pointer">
              <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
                <div className="h-11 w-11 rounded-2xl flex items-center justify-center text-xl" style={{ backgroundColor: (s.color ?? "#FDE68A") + "33" }}>
                  {s.icon || (isKg2 ? "📖" : "📘")}
                </div>
                <div className="min-w-0">
                  <div className="font-extrabold truncate">{tr(s.name)}{isKg2 ? " · Revision" : ""}</div>
                  <div className="text-xs text-muted-foreground">Teacher Lesson · Practice · Homework</div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] font-bold">
                <StepPill icon={GraduationCap} label="Lesson" tone="primary" />
                <StepPill icon={BookOpen} label="Practice" tone="muted" locked />
                <StepPill icon={ClipboardList} label="Homework" tone="muted" locked />
              </div>
            </Card>
          </Link>
        ))}
      </div>
      {!isKg2 && (
        <Card className="p-4 mt-3 bg-accent/40">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <div className="min-w-0">
              <div className="text-xs font-bold uppercase text-primary">This Week</div>
              <div className="font-extrabold truncate">Weekly Assignment & Weekly Test</div>
              <div className="text-xs text-muted-foreground">Unlocks at the end of the week.</div>
            </div>
            <Link to="/student/weekly" className="text-sm font-bold text-primary shrink-0">Open →</Link>
          </div>
        </Card>
      )}
      {isKg2 && (
        <Card className="p-4 mt-3 bg-accent/40">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <div className="min-w-0">
              <div className="text-xs font-bold uppercase text-primary">This Week</div>
              <div className="font-extrabold truncate">Weekly Brush-Up Assignment</div>
              <div className="text-xs text-muted-foreground">Light revision across all four subjects.</div>
            </div>
            <Link to="/student/weekly" className="text-sm font-bold text-primary shrink-0">Open →</Link>
          </div>
        </Card>
      )}
    </div>
  );
}

function StepPill({ icon: Icon, label, tone, locked }: { icon: any; label: string; tone: "primary" | "muted"; locked?: boolean }) {
  return (
    <div className={`rounded-xl border px-2 py-1.5 flex items-center gap-1 ${tone === "primary" ? "border-primary/30 bg-primary/5" : "border-muted bg-muted/30 text-muted-foreground"}`}>
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{label}</span>
      {locked && <Lock className="h-3 w-3 ml-auto shrink-0" />}
    </div>
  );
}