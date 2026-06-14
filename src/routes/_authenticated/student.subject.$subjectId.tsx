import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useStudents } from "@/lib/student-context";
import { fetchLessonsForSubject, fetchStudentProgress } from "@/lib/data";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, CheckCircle2, ClipboardCheck, FileText, Lock, PlayCircle } from "lucide-react";

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

  const { data: assignments = [] } = useQuery({
    queryKey: ["assignments", subjectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assignments")
        .select("id, title, lesson_id, pass_threshold")
        .eq("subject_id", subjectId)
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: assignmentSubmissions = [] } = useQuery({
    queryKey: ["assignment-submissions", activeStudent?.id, subjectId],
    enabled: !!activeStudent,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assignment_submissions")
        .select("assignment_id, score, completed_at")
        .eq("student_profile_id", activeStudent!.id)
        .not("completed_at", "is", null);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: tests = [] } = useQuery({
    queryKey: ["tests", subjectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tests")
        .select("id, title, scope, pass_threshold, subject_id, unit_id")
        .eq("subject_id", subjectId)
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: testAttempts = [] } = useQuery({
    queryKey: ["test-attempts", activeStudent?.id, subjectId],
    enabled: !!activeStudent,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("test_attempts")
        .select("test_id, score, completed_at")
        .eq("student_profile_id", activeStudent!.id)
        .not("completed_at", "is", null);
      if (error) throw error;
      return data ?? [];
    },
  });

  const completedLessons = new Set(progress.filter((p) => p.status === "completed").map((p) => p.lesson_id));
  const completedAssignments = new Set(assignmentSubmissions.map((s) => s.assignment_id));
  const completedTests = new Set(testAttempts.map((a) => a.test_id));

  const lessonPercent = lessons.length ? Math.round((completedLessons.size / lessons.length) * 100) : 0;
  const assignmentPercent = assignments.length ? Math.round((completedAssignments.size / assignments.length) * 100) : 0;
  const testPercent = tests.length ? Math.round((completedTests.size / tests.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <Link to="/student" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary">
        <ChevronLeft className="h-4 w-4" /> {t("back")}
      </Link>

      <div className="rounded-3xl bg-gradient-to-r from-primary/20 via-accent to-secondary/40 p-6">
        <h1 className="text-3xl font-extrabold">{subject ? tr(subject.name) : ""}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Learn → Practice → Assignment → Test → Revision</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <ProgressCard label="Lessons" value={lessonPercent} detail={`${completedLessons.size}/${lessons.length}`} />
        <ProgressCard label="Assignments" value={assignmentPercent} detail={`${completedAssignments.size}/${assignments.length}`} />
        <ProgressCard label="Tests" value={testPercent} detail={`${completedTests.size}/${tests.length}`} />
      </div>

      <section>
        <h2 className="mb-2 text-lg font-extrabold">{t("lessons")}</h2>
        <div className="space-y-3">
          {lessons.map((lesson: any, index: number) => {
            const isDone = completedLessons.has(lesson.id);
            const previousDone = index === 0 || completedLessons.has((lessons[index - 1] as any).id);
            const locked = !previousDone;
            const linkedAssignments = assignments.filter((a: any) => a.lesson_id === lesson.id);
            const linkedTests = tests.filter((test: any) => test.unit_id === lesson.unit_id || !test.unit_id);

            return (
              <Card key={lesson.id} className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-full ${isDone ? "bg-success text-white" : locked ? "bg-muted text-muted-foreground" : "bg-accent"}`}>
                    {isDone ? <CheckCircle2 className="h-5 w-5" /> : locked ? <Lock className="h-5 w-5" /> : <PlayCircle className="h-5 w-5 text-primary" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-bold">{tr(lesson.title)}</div>
                    <div className="text-xs text-muted-foreground">
                      {lesson.estimated_minutes} min · {lesson.lesson_type}
                    </div>
                  </div>
                  {locked ? (
                    <Button size="sm" disabled variant="secondary">Locked</Button>
                  ) : (
                    <Link to="/student/lesson/$lessonId" params={{ lessonId: lesson.id }}>
                      <Button size="sm">{isDone ? "Review" : "Start"}</Button>
                    </Link>
                  )}
                </div>

                {(linkedAssignments.length > 0 || linkedTests.length > 0) && (
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {linkedAssignments.map((assignment: any) => {
                      const done = completedAssignments.has(assignment.id);
                      return (
                        <Link key={assignment.id} to="/student/assignment/$assignmentId" params={{ assignmentId: assignment.id }}>
                          <div className="flex items-center gap-2 rounded-2xl border bg-card p-3 hover:border-primary/50">
                            <FileText className="h-4 w-4 text-primary" />
                            <span className="flex-1 truncate text-sm font-bold">{tr(assignment.title)}</span>
                            <Badge variant={done ? "default" : "secondary"}>{done ? "Done" : "Open"}</Badge>
                          </div>
                        </Link>
                      );
                    })}
                    {linkedTests.map((test: any) => {
                      const done = completedTests.has(test.id);
                      return (
                        <Link key={test.id} to="/student/test/$testId" params={{ testId: test.id }}>
                          <div className="flex items-center gap-2 rounded-2xl border bg-card p-3 hover:border-primary/50">
                            <ClipboardCheck className="h-4 w-4 text-primary" />
                            <span className="flex-1 truncate text-sm font-bold">{tr(test.title)}</span>
                            <Badge variant={done ? "default" : "secondary"}>{done ? "Done" : test.scope}</Badge>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </Card>
            );
          })}
          {lessons.length === 0 && <Card className="p-6 text-center text-muted-foreground">No lessons added yet.</Card>}
        </div>
      </section>
    </div>
  );
}

function ProgressCard({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="font-bold">{label}</div>
        <div className="text-sm text-muted-foreground">{detail}</div>
      </div>
      <Progress value={value} />
      <div className="mt-1 text-right text-xs font-bold text-muted-foreground">{value}%</div>
    </Card>
  );
}
