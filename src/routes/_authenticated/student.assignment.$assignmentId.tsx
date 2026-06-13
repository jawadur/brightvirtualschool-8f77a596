import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStudents } from "@/lib/student-context";
import { useI18n } from "@/lib/i18n";
import { awardCoins } from "@/lib/data";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Trophy } from "lucide-react";
import { toast } from "sonner";

type Q = { type: string; question: Record<string, string>; options: Record<string, string>[]; answer: number };

export const Route = createFileRoute("/_authenticated/student/assignment/$assignmentId")({
  component: AssignmentPage,
});

function AssignmentPage() {
  const { assignmentId } = Route.useParams();
  const { activeStudent, refresh } = useStudents();
  const { t, tr } = useI18n();
  const navigate = useNavigate();
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [result, setResult] = useState<null | { score: number; max: number }>(null);

  const { data: assignment, isLoading } = useQuery({
    queryKey: ["assignment", assignmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assignments")
        .select("id, title, instructions, questions, pass_threshold")
        .eq("id", assignmentId).single();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading || !assignment) return <div className="text-muted-foreground">{t("loading")}</div>;

  const questions = (assignment.questions as Q[]) ?? [];

  const submit = async () => {
    if (!activeStudent) return;
    let score = 0;
    questions.forEach((q, i) => { if (answers[i] === q.answer) score += 1; });
    const pct = Math.round((score / Math.max(1, questions.length)) * 100);
    try {
      await supabase.from("assignment_submissions").insert({
        student_profile_id: activeStudent.id,
        assignment_id: assignmentId,
        answers: Object.entries(answers).map(([i, a]) => ({ index: Number(i), answer: a })),
        score: pct,
        max_score: 100,
        status: "completed",
        completed_at: new Date().toISOString(),
      });
      const coinsEarned = Math.round(pct / 10);
      if (coinsEarned > 0) await awardCoins(activeStudent.id, coinsEarned, { en: "Assignment completed" }, assignmentId, "assignment");
      refresh();
      setResult({ score: pct, max: 100 });
    } catch (e) { toast.error((e as Error).message); }
  };

  if (result) {
    const passed = result.score >= (assignment.pass_threshold ?? 60);
    return (
      <Card className="p-8 text-center">
        <Trophy className="h-16 w-16 mx-auto text-primary" />
        <h1 className="mt-4 text-3xl font-extrabold">{passed ? t("great_job") : "Good try!"}</h1>
        <p className="mt-2 text-muted-foreground">{t("score")}: {result.score}%</p>
        <Button className="mt-6" onClick={() => navigate({ to: "/student" })}>{t("todays_school")}</Button>
      </Card>
    );
  }

  const answered = Object.keys(answers).length;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">{tr(assignment.title)}</h1>
      <p className="text-sm text-muted-foreground">{tr(assignment.instructions)}</p>
      <Progress value={(answered / questions.length) * 100} />
      {questions.map((q, i) => (
        <Card key={i} className="p-5">
          <div className="font-bold mb-3">{i + 1}. {tr(q.question)}</div>
          <div className="grid sm:grid-cols-2 gap-2">
            {q.options.map((opt, j) => (
              <button
                key={j}
                onClick={() => setAnswers({ ...answers, [i]: j })}
                className={`rounded-2xl border-2 p-3 text-left font-bold transition ${
                  answers[i] === j ? "border-primary bg-primary/10" : "border-border"
                }`}
              >
                {tr(opt)}
              </button>
            ))}
          </div>
        </Card>
      ))}
      <Button className="w-full" disabled={answered < questions.length} onClick={submit}>{t("submit")}</Button>
    </div>
  );
}