import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useStudents } from "@/lib/student-context";
import { TeacherClassroom } from "@/components/lesson/TeacherClassroom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronLeft, GraduationCap, Trophy } from "lucide-react";
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

  const lang = (activeStudent?.preferred_language as "en" | "hi" | "te") ?? "en";

  if (lesson.isLoading) return <p className="text-muted-foreground">Loading classroom…</p>;

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