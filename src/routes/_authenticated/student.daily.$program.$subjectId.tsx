import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStudents } from "@/lib/student-context";
import { useI18n } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fetchHomework } from "@/lib/homework";
import { GraduationCap, BookOpen, ClipboardList, CheckCircle2, ArrowLeft } from "lucide-react";
import type { ProgramCode } from "@/lib/program";

export const Route = createFileRoute("/_authenticated/student/daily/$program/$subjectId")({
  component: SubjectDailyFlow,
});

function SubjectDailyFlow() {
  const { program, subjectId } = Route.useParams();
  const programCode = program as ProgramCode;
  const { activeStudent } = useStudents();
  const { tr } = useI18n();

  const { data: subject } = useQuery({
    queryKey: ["subject", subjectId],
    queryFn: async () => {
      const { data } = await supabase.from("subjects").select("id, name, icon, color").eq("id", subjectId).maybeSingle();
      return data;
    },
  });

  const { data: lessons = [] } = useQuery({
    queryKey: ["subject-lessons", subjectId],
    queryFn: async () => {
      const { data } = await supabase
        .from("lessons")
        .select("id, title, sort_order, units!inner(subject_id)")
        .eq("units.subject_id", subjectId)
        .eq("is_published", true)
        .order("sort_order");
      return (data ?? []) as any[];
    },
  });

  const { data: progress = [] } = useQuery({
    queryKey: ["subject-progress", subjectId, activeStudent?.id],
    enabled: !!activeStudent,
    queryFn: async () => {
      const ids = lessons.map((l: any) => l.id);
      if (ids.length === 0) return [];
      const { data } = await supabase
        .from("progress")
        .select("lesson_id, status")
        .eq("student_profile_id", activeStudent!.id)
        .in("lesson_id", ids);
      return (data ?? []) as any[];
    },
  });

  const { data: homework = [] } = useQuery({
    queryKey: ["homework", activeStudent?.id],
    enabled: !!activeStudent,
    queryFn: () => fetchHomework(activeStudent!.id),
  });

  const todayLesson = lessons[0]; // simplest: first unfinished, fallback to first
  const nextLesson = lessons.find((l: any) => !progress.some((p) => p.lesson_id === l.id && p.status === "completed")) ?? todayLesson;
  const lessonDone = nextLesson && progress.some((p) => p.lesson_id === nextLesson.id && p.status === "completed");
  const subjectHomework = homework.filter((h: any) => h.subject_id === subjectId);
  const homeworkPending = subjectHomework.some((h: any) => !h.completed_at);

  const { data: nextLessonStages = [] } = useQuery({
    queryKey: ["lesson-stages-homework", nextLesson?.id],
    enabled: !!nextLesson,
    queryFn: async () => {
      const { data } = await supabase
        .from("lesson_stages")
        .select("id, stage_type")
        .eq("lesson_id", nextLesson!.id);
      return (data ?? []) as Array<{ id: string; stage_type: string }>;
    },
  });
  const homeworkStage =
    nextLessonStages.find((s) => s.stage_type === "assignment") ||
    nextLessonStages.find((s) => s.stage_type === "homework");

  const { data: homeworkStageProgress } = useQuery({
    queryKey: ["homework-stage-progress", activeStudent?.id, nextLesson?.id, homeworkStage?.stage_type],
    enabled: !!activeStudent && !!nextLesson && !!homeworkStage,
    queryFn: async () => {
      const { data } = await supabase
        .from("student_stage_progress")
        .select("completed_at")
        .eq("student_profile_id", activeStudent!.id)
        .eq("lesson_id", nextLesson!.id)
        .eq("stage_type", homeworkStage!.stage_type)
        .maybeSingle();
      return data;
    },
  });
  const homeworkStageDone = !!homeworkStageProgress?.completed_at;

  const hasHomework = subjectHomework.length > 0 || !!homeworkStage;
  const homeworkAllDone = !homeworkPending && !!homeworkStage && homeworkStageDone;
  const homeworkAction = homeworkStage && nextLesson
    ? { label: homeworkStageDone ? "Revisit Homework" : "Start Homework", to: "/student/classroom/$lessonId", params: { lessonId: nextLesson.id } }
    : subjectHomework.length > 0
    ? { label: "Start Homework", to: "/student/homework" }
    : undefined;
  const homeworkSubtitle = homeworkStage
    ? (homeworkStageDone ? "Homework completed" : "Practice questions from this lesson")
    : subjectHomework.length === 0
    ? "No homework set"
    : homeworkPending
    ? `${subjectHomework.filter((h: any) => !h.completed_at).length} pending`
    : "All done";

  const isKg2 = programCode === "kg2_brushup";

  return (
    <div className="space-y-5">
      <Link to="/student/today" className="inline-flex items-center gap-1 text-sm font-bold text-primary"><ArrowLeft className="h-4 w-4" /> Today's Learning</Link>
      <header className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
        <div className="h-14 w-14 rounded-2xl flex items-center justify-center text-3xl shrink-0" style={{ backgroundColor: (subject?.color ?? "#FDE68A") + "33" }}>
          {subject?.icon || "📘"}
        </div>
        <div className="min-w-0">
          <Badge variant="secondary" className="font-bold">{isKg2 ? "KG2 Brush-Up" : "Class 1"}</Badge>
          <h1 className="text-2xl font-extrabold truncate mt-1">{tr(subject?.name) || "Subject"}{isKg2 ? " · Revision" : ""}</h1>
        </div>
      </header>

      <StepCard
        step={1}
        icon={GraduationCap}
        title={isKg2 ? "Teacher Revision Lesson" : "Teacher Lesson"}
        subtitle={nextLesson ? tr(nextLesson.title) : "No lessons yet"}
        status={lessonDone ? "done" : "open"}
        action={nextLesson ? { label: lessonDone ? "Revisit" : "Start", to: "/student/classroom/$lessonId", params: { lessonId: nextLesson.id } } : undefined}
      />
      <StepCard
        step={2}
        icon={BookOpen}
        title="Practice"
        subtitle="Short activities to reinforce the lesson"
        status="open"
        action={nextLesson ? { label: "Start Practice", to: "/student/lesson/$lessonId", params: { lessonId: nextLesson.id } } : undefined}
        emptyLabel="No Practice Available"
      />
      <StepCard
        step={3}
        icon={ClipboardList}
        title="Homework"
        subtitle={homeworkSubtitle}
        status={hasHomework && (homeworkAllDone || (!homeworkStage && !homeworkPending)) ? "done" : "open"}
        action={homeworkAction}
        emptyLabel="No Homework Available"
      />

      {!isKg2 && (
        <Card className="p-4 bg-accent/30">
          <div className="text-xs font-bold uppercase text-primary">Weekly</div>
          <div className="font-extrabold">Weekly Assignment & Test unlock at week-end.</div>
          <Link to="/student/weekly" className="text-sm font-bold text-primary">Open weekly →</Link>
        </Card>
      )}
    </div>
  );
}

function StepCard({ step, icon: Icon, title, subtitle, status, action, emptyLabel }: {
  step: number;
  icon: any;
  title: string;
  subtitle: string;
  status: "open" | "done";
  action?: { label: string; to: string; params?: Record<string, string> };
  emptyLabel?: string;
}) {
  const done = status === "done";
  return (
    <Card className="p-4 h-auto">
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
        <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 ${done ? "bg-success/15 text-success" : "bg-primary/10 text-primary"}`}>
          {done ? <CheckCircle2 className="h-6 w-6" /> : <Icon className="h-6 w-6" />}
        </div>
        <div className="min-w-0">
          <div className="text-xs font-bold uppercase text-muted-foreground">Step {step}</div>
          <div className="font-extrabold truncate">{title}</div>
          <div className="text-sm text-muted-foreground break-words">{subtitle}</div>
        </div>
        {action ? (
          <Button asChild size="sm" className="rounded-2xl">
            <Link to={action.to as any} params={action.params as any}>{action.label}</Link>
          </Button>
        ) : (
          emptyLabel && <span className="text-xs font-bold text-muted-foreground">{emptyLabel}</span>
        )}
      </div>
    </Card>
  );
}