import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStudents } from "@/lib/student-context";
import { useI18n } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fetchHomework } from "@/lib/homework";
import { GraduationCap, BookOpen, ClipboardList, Lock, CheckCircle2, ArrowLeft } from "lucide-react";
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
  const practiceUnlocked = !!lessonDone;
  const homeworkUnlocked = practiceUnlocked; // practice completion equates to attempt for now

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
        status={!practiceUnlocked ? "locked" : "open"}
        action={practiceUnlocked && nextLesson ? { label: "Practice", to: "/student/lesson/$lessonId", params: { lessonId: nextLesson.id } } : undefined}
      />
      <StepCard
        step={3}
        icon={ClipboardList}
        title="Homework"
        subtitle={subjectHomework.length === 0 ? "No homework set" : homeworkPending ? `${subjectHomework.filter((h: any) => !h.completed_at).length} pending` : "All done"}
        status={!homeworkUnlocked ? "locked" : homeworkPending ? "open" : "done"}
        action={homeworkUnlocked ? { label: "Open Homework", to: "/student/homework" } : undefined}
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

function StepCard({ step, icon: Icon, title, subtitle, status, action }: {
  step: number;
  icon: any;
  title: string;
  subtitle: string;
  status: "open" | "locked" | "done";
  action?: { label: string; to: string; params?: Record<string, string> };
}) {
  const locked = status === "locked";
  const done = status === "done";
  return (
    <Card className={`p-4 h-auto ${locked ? "opacity-60" : ""}`}>
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
        <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 ${done ? "bg-success/15 text-success" : locked ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"}`}>
          {done ? <CheckCircle2 className="h-6 w-6" /> : locked ? <Lock className="h-5 w-5" /> : <Icon className="h-6 w-6" />}
        </div>
        <div className="min-w-0">
          <div className="text-xs font-bold uppercase text-muted-foreground">Step {step}</div>
          <div className="font-extrabold truncate">{title}</div>
          <div className="text-sm text-muted-foreground break-words">{subtitle}</div>
        </div>
        {action && !locked && (
          <Link to={action.to as any} params={action.params as any}>
            <Button size="sm" className="rounded-2xl">{action.label}</Button>
          </Link>
        )}
        {locked && <span className="text-xs font-bold text-muted-foreground">Locked</span>}
      </div>
    </Card>
  );
}