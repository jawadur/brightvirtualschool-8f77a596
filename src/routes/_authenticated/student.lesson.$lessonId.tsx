import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStudents } from "@/lib/student-context";
import { useI18n } from "@/lib/i18n";
import { LessonPlayer } from "@/components/lesson/LessonPlayer";
import { awardCoins, awardStar, completeLesson, type LessonContent } from "@/lib/data";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Trophy, GraduationCap } from "lucide-react";
import { toast } from "sonner";

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

  if (isLoading) return <div className="text-muted-foreground">{t("loading")}</div>;
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

  if (finished) {
    return (
      <Card className="p-8 text-center">
        <Trophy className="h-16 w-16 mx-auto text-primary" />
        <h1 className="mt-4 text-3xl font-extrabold">{t("great_job")}</h1>
        <p className="mt-2 text-muted-foreground">{t("score")}: {finished.score}%</p>
        <p className="mt-1 font-bold text-coin">+ {finished.coinsEarned} coins</p>
        <div className="mt-6 flex justify-center gap-3">
          <Button onClick={() => navigate({ to: "/student" })}>{t("todays_school")}</Button>
        </div>
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