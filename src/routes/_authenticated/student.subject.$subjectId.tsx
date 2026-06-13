import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useStudents } from "@/lib/student-context";
import { fetchLessonsForSubject, fetchStudentProgress } from "@/lib/data";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, CheckCircle2, PlayCircle, FileText } from "lucide-react";

export const Route = createFileRoute("/_authenticated/student/subject/$subjectId")({
  component: SubjectPage,
});

function SubjectPage() {
  const { subjectId } = Route.useParams();
  const { tr, t } = useI18n();
  const { activeStudent } = useStudents();

  const { data: subject } = useQuery({
    queryKey: ["subject", subjectId],
    queryFn: async () => {
      const { data, error } = await supabase.from("subjects").select("id, name, color").eq("id", subjectId).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: lessons = [] } = useQuery({
    queryKey: ["lessons", subjectId],
    queryFn: () => fetchLessonsForSubject(subjectId),
  });

  const { data: progress = [] } = useQuery({
    queryKey: ["progress", activeStudent?.id],
    enabled: !!activeStudent,
    queryFn: () => fetchStudentProgress(activeStudent!.id),
  });
  const done = new Set(progress.filter((p) => p.status === "completed").map((p) => p.lesson_id));

  const { data: assignments = [] } = useQuery({
    queryKey: ["assignments", subjectId],
    queryFn: async () => {
      const { data, error } = await supabase.from("assignments").select("id, title").eq("subject_id", subjectId);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <Link to="/student" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary">
        <ChevronLeft className="h-4 w-4" /> {t("back")}
      </Link>
      <h1 className="text-3xl font-extrabold">{subject ? tr(subject.name) : ""}</h1>

      <section>
        <h2 className="text-lg font-extrabold mb-2">{t("lessons")}</h2>
        <div className="space-y-3">
          {lessons.map((l: any) => {
            const isDone = done.has(l.id);
            return (
              <Card key={l.id} className="p-4 flex items-center gap-3">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${isDone ? "bg-success text-white" : "bg-accent"}`}>
                  {isDone ? <CheckCircle2 className="h-5 w-5" /> : <PlayCircle className="h-5 w-5 text-primary" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold truncate">{tr(l.title)}</div>
                  <div className="text-xs text-muted-foreground">{l.estimated_minutes} min · {l.lesson_type}</div>
                </div>
                <Link to="/student/lesson/$lessonId" params={{ lessonId: l.id }}>
                  <Button size="sm">{isDone ? "Review" : "Start"}</Button>
                </Link>
              </Card>
            );
          })}
        </div>
      </section>

      {assignments.length > 0 && (
        <section>
          <h2 className="text-lg font-extrabold mb-2">{t("assignments")}</h2>
          <div className="space-y-3">
            {assignments.map((a: any) => (
              <Card key={a.id} className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
                  <FileText className="h-5 w-5 text-foreground" />
                </div>
                <div className="flex-1 font-bold">{tr(a.title)}</div>
                <Link to="/student/assignment/$assignmentId" params={{ assignmentId: a.id }}>
                  <Button size="sm" variant="secondary">Open</Button>
                </Link>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}