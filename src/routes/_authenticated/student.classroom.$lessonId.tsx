import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useStudents } from "@/lib/student-context";
import { TeacherClassroom } from "@/components/lesson/TeacherClassroom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronLeft, GraduationCap, Trophy, PlayCircle } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/student/classroom/$lessonId")({
  component: ClassroomPage,
});

function ClassroomPage() {
  const { lessonId } = Route.useParams();
  const { activeStudent } = useStudents();
  const { tr } = useI18n();
  const navigate = useNavigate();
  const [done, setDone] = useState(false);

  const lesson = useQuery({
    queryKey: ["lesson-meta", lessonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons").select("id, title, content").eq("id", lessonId).single();
      if (error) throw error; return data;
    },
  });

  const stagesCount = useQuery({
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

  const lang = (activeStudent?.preferred_language as "en" | "hi" | "te") ?? "en";

  if (lesson.isLoading || stagesCount.isLoading) return <p className="text-muted-foreground">Loading classroom…</p>;

  // Fallback: if this lesson has no teacher-led stages, send the student to the
  // standard lesson player so "Enter Class" always opens something useful.
  if ((stagesCount.data ?? 0) === 0) {
    return (
      <Card className="p-8 text-center max-w-lg mx-auto">
        <GraduationCap className="h-12 w-12 mx-auto text-primary" />
        <h1 className="mt-3 text-2xl font-extrabold">{tr(lesson.data?.title)}</h1>
        <p className="mt-2 text-muted-foreground">
          This lesson uses the interactive lesson player. Tap below to start.
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <Link to="/student/lesson/$lessonId" params={{ lessonId }}>
            <Button size="lg" className="rounded-2xl gap-2"><PlayCircle className="h-5 w-5" /> Start Lesson</Button>
          </Link>
        </div>
      </Card>
    );
  }

  if (done) {
    return (
      <Card className="p-8 text-center max-w-lg mx-auto">
        <Trophy className="h-16 w-16 mx-auto text-primary" />
        <h1 className="mt-4 text-3xl font-extrabold no-clip">Lesson complete!</h1>
        <p className="mt-2 text-muted-foreground">👩‍🏫 You did wonderfully today. Come back tomorrow for more learning!</p>
        <div className="mt-6 flex justify-center gap-2">
          <Button onClick={() => navigate({ to: "/student" })}>Back to school</Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Link to="/student" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary">
        <ChevronLeft className="h-4 w-4" /> Back
      </Link>
      <header className="flex flex-wrap items-center gap-2">
        <GraduationCap className="h-6 w-6 text-primary shrink-0" />
        <h1 className="text-2xl sm:text-3xl font-extrabold no-clip">{tr(lesson.data?.title)} — Virtual Classroom</h1>
      </header>
      <TeacherClassroom lessonId={lessonId} lang={lang} onAllComplete={() => setDone(true)} />
    </div>
  );
}