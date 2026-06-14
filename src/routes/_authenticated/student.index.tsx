import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStudents } from "@/lib/student-context";
import { useI18n } from "@/lib/i18n";
import { fetchActivePrograms, fetchStudentProgress, markAttendance, fetchProgramProgress } from "@/lib/data";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Sparkles, Mic, PlayCircle, GraduationCap } from "lucide-react";

export const Route = createFileRoute("/_authenticated/student/")({
  component: Dashboard,
});

function Dashboard() {
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

  const { data: progress = [] } = useQuery({
    queryKey: ["progress", activeStudent?.id],
    enabled: !!activeStudent,
    queryFn: () => fetchStudentProgress(activeStudent!.id),
  });
  const completedIds = new Set(progress.filter((p: any) => p.status === "completed").map((p: any) => p.lesson_id));

  // Flatten classes from all active programs (KG2 Bridge first, then Class 1)
  const classCards = programs.flatMap((b: any) =>
    (b.classes ?? []).map((c: any) => ({
      board: b,
      klass: c,
      isBridge: b.code === "kg2-bridge",
    })),
  );

  // Find first program with incomplete lessons → recommend next lesson there
  const { data: nextLesson } = useQuery({
    queryKey: ["next-lesson", activeStudent?.id, programs.map((p: any) => p.id).join(",")],
    enabled: !!activeStudent && programs.length > 0,
    queryFn: async () => {
      for (const program of programs as any[]) {
        const sortedClasses = program.classes ?? [];
        for (const klass of sortedClasses) {
          const { data } = await supabase
            .from("lessons")
            .select("id, title, sort_order, unit_id, units!inner(subject_id, sort_order, subjects!inner(id, name, color, class_id, sort_order))")
            .eq("units.subjects.class_id", klass.id)
            .eq("is_published", true)
            .order("sort_order");
          const lessons = (data ?? []) as any[];
          const sorted = lessons.sort((a, b) => {
            const sa = a.units.subjects.sort_order - b.units.subjects.sort_order;
            if (sa !== 0) return sa;
            const ua = a.units.sort_order - b.units.sort_order;
            if (ua !== 0) return ua;
            return a.sort_order - b.sort_order;
          });
          const next = sorted.find((l) => !completedIds.has(l.id));
          if (next) return { lesson: next, klass, program };
        }
      }
      return null;
    },
  });

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-hero p-6 shadow-pop">
        <div className="text-sm font-bold text-foreground/70">{t("welcome")},</div>
        <h1 className="text-3xl font-extrabold">{activeStudent?.display_name} 👋</h1>
        <p className="mt-1 text-foreground/80">{t("attendance_today")} · 🔥 {activeStudent?.current_streak} {t("streak")}</p>
      </section>

      {nextLesson && (
        <Link
          to="/student/lesson/$lessonId"
          params={{ lessonId: (nextLesson as any).lesson.id }}
        >
          <Card className="p-5 hover:shadow-pop transition cursor-pointer flex items-center gap-4 bg-gradient-to-r from-primary/15 to-accent">
            <div className="h-14 w-14 rounded-2xl bg-primary/20 flex items-center justify-center">
              <PlayCircle className="h-8 w-8 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-primary uppercase">Next up · {tr((nextLesson as any).klass.name)}</div>
              <div className="truncate text-lg font-extrabold">{tr((nextLesson as any).lesson.title)}</div>
            </div>
          </Card>
        </Link>
      )}

      <section>
        <h2 className="text-xl font-extrabold mb-3">My Programs</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {classCards.map(({ board, klass, isBridge }) => (
            <ProgramCard
              key={klass.id}
              classId={klass.id}
              studentId={activeStudent!.id}
              title={tr(klass.name)}
              subtitle={tr(board.name)}
              isBridge={isBridge}
            />
          ))}
          {classCards.length === 0 && (
            <Card className="p-6 text-center text-muted-foreground sm:col-span-2">No active programs yet.</Card>
          )}
        </div>
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

function ProgramCard({ classId, studentId, title, subtitle, isBridge }: { classId: string; studentId: string; title: string; subtitle: string; isBridge: boolean }) {
  const { data: pp } = useQuery({
    queryKey: ["program-progress", studentId, classId],
    queryFn: () => fetchProgramProgress(studentId, classId),
  });
  return (
    <Link to="/student/program/$classId" params={{ classId }}>
      <Card className="p-5 hover:shadow-pop transition cursor-pointer h-full">
        <div className="flex items-center gap-3">
          <div className="text-3xl">{isBridge ? "🌱" : "🎒"}</div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold uppercase text-muted-foreground">{subtitle}</div>
            <div className="truncate text-lg font-extrabold">{title}</div>
          </div>
          {isBridge && pp?.pct === 100 && <GraduationCap className="h-6 w-6 text-success" />}
        </div>
        <div className="mt-4 flex items-center gap-2">
          <Progress value={pp?.pct ?? 0} className="flex-1" />
          <div className="text-sm font-extrabold">{pp?.pct ?? 0}%</div>
        </div>
        <div className="mt-1 text-xs text-muted-foreground">{pp?.done ?? 0}/{pp?.total ?? 0} lessons</div>
      </Card>
    </Link>
  );
}