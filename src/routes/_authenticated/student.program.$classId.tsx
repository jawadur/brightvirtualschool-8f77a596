import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useStudents } from "@/lib/student-context";
import { fetchSubjectsForClass, fetchProgramProgress, fetchReadinessScore, fetchStudentProgress } from "@/lib/data";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, GraduationCap } from "lucide-react";

export const Route = createFileRoute("/_authenticated/student/program/$classId")({
  component: ProgramPage,
});

function ProgramPage() {
  const { classId } = Route.useParams();
  const { activeStudent } = useStudents();
  const { tr, t } = useI18n();

  const { data: klass } = useQuery({
    queryKey: ["class", classId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select("id, name, boards(code, name)")
        .eq("id", classId)
        .single();
      if (error) throw error;
      return data as any;
    },
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ["subjects", classId],
    queryFn: () => fetchSubjectsForClass(classId),
  });

  const { data: progress = [] } = useQuery({
    queryKey: ["progress", activeStudent?.id],
    enabled: !!activeStudent,
    queryFn: () => fetchStudentProgress(activeStudent!.id),
  });

  const { data: programProgress } = useQuery({
    queryKey: ["program-progress", activeStudent?.id, classId],
    enabled: !!activeStudent,
    queryFn: () => fetchProgramProgress(activeStudent!.id, classId),
  });

  const isBridge = (klass as any)?.boards?.code === "kg2-bridge";

  const { data: readiness } = useQuery({
    queryKey: ["readiness", activeStudent?.id, classId],
    enabled: !!activeStudent && isBridge,
    queryFn: () => fetchReadinessScore(activeStudent!.id, classId),
  });

  const { data: allLessons = [] } = useQuery({
    queryKey: ["lessons-summary", classId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("id, units!inner(subject_id, subjects!inner(class_id))")
        .eq("units.subjects.class_id", classId)
        .eq("is_published", true);
      if (error) throw error;
      return data ?? [];
    },
  });

  const completedIds = new Set(progress.filter((p: any) => p.status === "completed").map((p: any) => p.lesson_id));

  return (
    <div className="space-y-6">
      <Link to="/student" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary">
        <ChevronLeft className="h-4 w-4" /> {t("back")}
      </Link>

      <section className="rounded-3xl bg-gradient-to-br from-primary/20 via-accent to-secondary/40 p-6 shadow-pop">
        <div className="flex items-center gap-3">
          <div className="text-4xl">{isBridge ? "🌱" : "🎒"}</div>
          <div>
            <h1 className="text-3xl font-extrabold">{klass ? tr((klass as any).name) : ""}</h1>
            <p className="text-sm text-foreground/80">{klass ? tr((klass as any).boards?.name ?? {}) : ""}</p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Card className="p-4">
            <div className="text-xs font-bold text-muted-foreground">Program progress</div>
            <div className="mt-1 text-2xl font-extrabold">{programProgress?.pct ?? 0}%</div>
            <Progress value={programProgress?.pct ?? 0} className="mt-2" />
            <div className="mt-1 text-xs text-muted-foreground">{programProgress?.done ?? 0} of {programProgress?.total ?? 0} lessons</div>
          </Card>
          {isBridge && (
            <Card className="p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                <GraduationCap className="h-4 w-4" /> Readiness score
              </div>
              <div className="mt-1 text-2xl font-extrabold">{readiness?.score ?? 0}%</div>
              <Progress value={readiness?.score ?? 0} className="mt-2" />
              <div className="mt-1 text-[11px] text-muted-foreground">
                Lessons {readiness?.breakdown.lessons ?? 0}% · Homework {readiness?.breakdown.assignments ?? 0}% · Tests {readiness?.breakdown.tests ?? 0}%
              </div>
            </Card>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-extrabold mb-3">{t("subjects")}</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map((s: any) => {
            const subjectLessons = allLessons.filter((l: any) => l.units.subject_id === s.id);
            const done = subjectLessons.filter((l: any) => completedIds.has(l.id)).length;
            const total = subjectLessons.length;
            const pct = total ? Math.round((done / total) * 100) : 0;
            return (
              <Link key={s.id} to="/student/subject/$subjectId" params={{ subjectId: s.id }}>
                <Card className="p-5 hover:shadow-pop transition cursor-pointer h-full">
                  <div className="flex items-center justify-between">
                    <div className="text-3xl">{s.icon ?? "📚"}</div>
                    <div
                      className="rounded-full px-3 py-1 text-xs font-bold"
                      style={{ background: (s.color ?? "#F97316") + "22", color: s.color ?? "#F97316" }}
                    >
                      {done}/{total}
                    </div>
                  </div>
                  <h3 className="mt-3 text-lg font-extrabold">{tr(s.name)}</h3>
                  <Progress value={pct} className="mt-3" />
                </Card>
              </Link>
            );
          })}
          {subjects.length === 0 && <Card className="p-6 text-center text-muted-foreground">No subjects yet.</Card>}
        </div>
      </section>
    </div>
  );
}