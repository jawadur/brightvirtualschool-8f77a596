import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStudents } from "@/lib/student-context";
import { useI18n } from "@/lib/i18n";
import { LessonPlayer } from "@/components/lesson/LessonPlayer";
import { TeacherClassroom } from "@/components/lesson/TeacherClassroom";
import { awardCoins, awardStar, completeLesson, type LessonContent } from "@/lib/data";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Trophy, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { findNextLesson } from "@/lib/lesson-nav";
import { PlayCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/student/lesson/$lessonId")({
  component: LessonPage,
  errorComponent: ({ error }) => (
    <Card className="p-6 max-w-lg mx-auto text-center">
      <h1 className="text-xl font-extrabold">Couldn't open this lesson</h1>
      <p className="mt-2 text-sm text-muted-foreground">{(error as Error)?.message ?? "Unknown error"}</p>
      <Link to="/student" className="mt-4 inline-block text-primary underline">Back to school</Link>
    </Card>
  ),
  notFoundComponent: () => (
    <Card className="p-6 max-w-lg mx-auto text-center">
      <h1 className="text-xl font-extrabold">Lesson not found</h1>
      <Link to="/student" className="mt-3 inline-block text-primary underline">Back to school</Link>
    </Card>
  ),
});

function LessonPage() {
  const { lessonId } = Route.useParams();
  const { activeStudent, refresh } = useStudents();
  const { t, tr } = useI18n();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [finished, setFinished] = useState<null | { score: number; coinsEarned: number }>(null);

  const nextLessonQ = useQuery({
    queryKey: ["next-lesson", lessonId],
    enabled: !!finished,
    queryFn: () => findNextLesson(lessonId),
  });

  const { data: lesson, isLoading } = useQuery({
    queryKey: ["lesson", lessonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("id, title, content, units(subject_id, subjects(id, name))")
        .eq("id", lessonId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: stagesCount, isLoading: stagesLoading } = useQuery({
    queryKey: ["lesson-stages-count", lessonId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("lesson_stages")
        .select("id", { count: "exact", head: true })
        .eq("lesson_id", lessonId);
      if (error) throw error;
      return count ?? 0;
    },
  });

  if (isLoading || stagesLoading) return <div className="text-muted-foreground">{t("loading")}</div>;
  if (!lesson) {
    return (
      <Card className="p-6 max-w-lg mx-auto text-center">
        <h1 className="text-xl font-extrabold">This lesson isn't available yet</h1>
        <p className="mt-1 text-sm text-muted-foreground">It may not be published. Please pick another lesson.</p>
        <Link to="/student" className="mt-4 inline-block text-primary underline">Back to school</Link>
      </Card>
    );
  }
  const content = lesson.content as LessonContent;
  const steps = Array.isArray(content?.steps) ? content.steps : [];
  const lang = (activeStudent?.preferred_language as "en" | "hi" | "te") ?? "en";
  // Primary source: lesson_stages (KG2/Class-1 curriculum). Fallback: lessons.content.steps.
  const preferStages = (stagesCount ?? 0) > 0;
  console.log("[LessonPage]", { lessonId, stageCount: stagesCount, legacyStepCount: steps.length, preferStages });

  if (finished) {
    return (
      <Card className="p-8 text-center">
        <Trophy className="h-16 w-16 mx-auto text-primary" />
        <h1 className="mt-4 text-3xl font-extrabold">{t("great_job")}</h1>
        <p className="mt-2 text-muted-foreground">{t("score")}: {finished.score}%</p>
        <p className="mt-1 font-bold text-coin">+ {finished.coinsEarned} coins</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button onClick={() => navigate({ to: "/student" })}>{t("todays_school")}</Button>
          {nextLessonQ.data && (
            <Button
              onClick={() => {
                setFinished(null);
                navigate({ to: "/student/lesson/$lessonId", params: { lessonId: nextLessonQ.data!.id } });
              }}
              className="gap-1"
            >
              <PlayCircle className="h-4 w-4" /> Start Next Lesson
            </Button>
          )}
        </div>
      </Card>
    );
  }

  if (preferStages) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-extrabold no-clip">{tr(lesson.title)}</h1>
        <TeacherClassroom
          lessonId={lessonId}
          lang={lang}
          onAllComplete={async () => {
            if (!activeStudent) return;
            try {
              await completeLesson(activeStudent.id, lessonId, 100);
              await awardCoins(activeStudent.id, 10, { en: "Lesson completed" }, lessonId, "lesson");
              refresh();
              qc.invalidateQueries({ queryKey: ["progress"] });
              setFinished({ score: 100, coinsEarned: 10 });
            } catch (e) {
              toast.error((e as Error).message);
            }
          }}
        />
      </div>
    );
  }

  if (steps.length === 0) {
    return (
      <Card className="p-8 text-center max-w-lg mx-auto">
        <p className="text-lg font-bold">No content available for this lesson</p>
        <p className="mt-2 text-sm text-muted-foreground">This lesson is being prepared. Please pick another.</p>
        <Link to="/student" className="mt-4 inline-block text-primary underline">Back to school</Link>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-extrabold no-clip flex-1 min-w-0">{tr(lesson.title)}</h1>
        <Button asChild variant="outline" className="gap-2">
          <a href={`/student/classroom/${lessonId}`}><GraduationCap className="h-4 w-4" /> Virtual Classroom</a>
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">For a teacher-led, step-by-step lesson, open the Virtual Classroom.</p>
      <LessonPlayer
        steps={steps}
        lessonId={lessonId}
        onFinished={async ({ score, coinsEarned }) => {
          if (!activeStudent) return;
          try {
            await completeLesson(activeStudent.id, lessonId, score);
            if (coinsEarned > 0) await awardCoins(activeStudent.id, coinsEarned, { en: "Lesson completed" }, lessonId, "lesson");
            if (score === 100) await awardStar(activeStudent.id, { en: "Perfect lesson!" }, lessonId, "lesson");
            refresh();
            qc.invalidateQueries({ queryKey: ["progress"] });
            setFinished({ score, coinsEarned });
          } catch (e) {
            toast.error((e as Error).message);
          }
        }}
      />
    </div>
  );
}