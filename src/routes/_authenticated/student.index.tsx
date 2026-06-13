import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStudents } from "@/lib/student-context";
import { useI18n } from "@/lib/i18n";
import { fetchSubjectsForClass, fetchStudentProgress, markAttendance } from "@/lib/data";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, PlayCircle } from "lucide-react";

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

  const { data: subjects = [] } = useQuery({
    queryKey: ["subjects", activeStudent?.class_id],
    enabled: !!activeStudent?.class_id,
    queryFn: () => fetchSubjectsForClass(activeStudent!.class_id!),
  });

  const { data: progress = [] } = useQuery({
    queryKey: ["progress", activeStudent?.id],
    enabled: !!activeStudent,
    queryFn: () => fetchStudentProgress(activeStudent!.id),
  });

  const { data: allLessons = [] } = useQuery({
    queryKey: ["lessons-summary", activeStudent?.class_id],
    enabled: !!activeStudent?.class_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("id, title, sort_order, units!inner(subject_id, subjects!inner(id, name, color, class_id))")
        .eq("units.subjects.class_id", activeStudent!.class_id!);
      if (error) throw error;
      return data ?? [];
    },
  });

  const completedIds = new Set(progress.filter((p) => p.status === "completed").map((p) => p.lesson_id));

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-hero p-6 shadow-pop">
        <div className="text-sm font-bold text-foreground/70">{t("welcome")},</div>
        <h1 className="text-3xl font-extrabold">{activeStudent?.display_name} 👋</h1>
        <p className="mt-1 text-foreground/80">{t("attendance_today")} · 🔥 {activeStudent?.current_streak} {t("streak")}</p>
      </section>

      <section>
        <h2 className="text-xl font-extrabold mb-3">{t("todays_school")}</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map((s) => {
            const subjectLessons = allLessons.filter((l: any) => l.units.subject_id === s.id);
            const done = subjectLessons.filter((l: any) => completedIds.has(l.id)).length;
            const total = subjectLessons.length;
            const pct = total ? Math.round((done / total) * 100) : 0;
            return (
              <Link key={s.id} to="/student/subject/$subjectId" params={{ subjectId: s.id }}>
                <Card className="p-5 hover:shadow-pop transition cursor-pointer h-full">
                  <div className="flex items-center justify-between">
                    <div className="text-3xl">📚</div>
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
        </div>
      </section>
    </div>
  );
}