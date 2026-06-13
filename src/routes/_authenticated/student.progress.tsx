import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStudents } from "@/lib/student-context";
import { useI18n } from "@/lib/i18n";
import { fetchStudentProgress } from "@/lib/data";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/_authenticated/student/progress")({
  component: ProgressPage,
});

function ProgressPage() {
  const { activeStudent } = useStudents();
  const { t, tr } = useI18n();

  const { data: subjects = [] } = useQuery({
    queryKey: ["subjects", activeStudent?.class_id],
    enabled: !!activeStudent?.class_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subjects").select("id, name, color")
        .eq("class_id", activeStudent!.class_id!).order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: lessons = [] } = useQuery({
    queryKey: ["lessons-summary", activeStudent?.class_id],
    enabled: !!activeStudent?.class_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("id, units!inner(subject_id, subjects!inner(class_id))")
        .eq("units.subjects.class_id", activeStudent!.class_id!);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: progress = [] } = useQuery({
    queryKey: ["progress", activeStudent?.id],
    enabled: !!activeStudent,
    queryFn: () => fetchStudentProgress(activeStudent!.id),
  });

  const doneIds = new Set(progress.filter((p) => p.status === "completed").map((p) => p.lesson_id));

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold">{t("progress")}</h1>
      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="text-sm text-muted-foreground">{t("lessons")} done</div>
          <div className="text-3xl font-extrabold">{doneIds.size}/{lessons.length}</div>
        </Card>
        <Card className="p-5">
          <div className="text-sm text-muted-foreground">{t("coins")}</div>
          <div className="text-3xl font-extrabold">{activeStudent?.coins ?? 0}</div>
        </Card>
        <Card className="p-5">
          <div className="text-sm text-muted-foreground">{t("streak")}</div>
          <div className="text-3xl font-extrabold">🔥 {activeStudent?.current_streak ?? 0}</div>
        </Card>
      </div>

      <div className="space-y-3">
        {subjects.map((s: any) => {
          const subjLessons = (lessons as any[]).filter((l) => l.units.subject_id === s.id);
          const done = subjLessons.filter((l) => doneIds.has(l.id)).length;
          const total = subjLessons.length || 1;
          const pct = Math.round((done / total) * 100);
          return (
            <Card key={s.id} className="p-4">
              <div className="flex justify-between items-center mb-2">
                <div className="font-bold">{tr(s.name)}</div>
                <div className="text-sm text-muted-foreground">{done}/{total}</div>
              </div>
              <Progress value={pct} />
            </Card>
          );
        })}
      </div>
    </div>
  );
}