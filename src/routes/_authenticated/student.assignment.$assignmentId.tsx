import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStudents } from "@/lib/student-context";
import { useI18n } from "@/lib/i18n";
import { awardCoins } from "@/lib/data";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { QuestionRenderer, isAnswered, scoreQuestion, type LearningQuestion, type QuestionAnswer } from "@/components/learning/QuestionRenderer";
import { ChevronLeft, RotateCcw, Trophy } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/student/assignment/$assignmentId")({
  component: AssignmentPage,
});

function AssignmentPage() {
  const { assignmentId } = Route.useParams();
  const { activeStudent, refresh } = useStudents();
  const { t, tr } = useI18n();
  const navigate = useNavigate();
  const [answers, setAnswers] = useState<Record<number, QuestionAnswer>>({});
  const [showFeedback, setShowFeedback] = useState(false);
  const [result, setResult] = useState<null | { score: number; correct: number; total: number; passed: boolean }>(null);

  const { data: assignment, isLoading } = useQuery({
    queryKey: ["assignment", assignmentId, activeStudent?.id ?? null],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_assignment_for_student", {
        _assignment_id: assignmentId,
        _student_id: activeStudent?.id ?? null,
      } as any);
      if (error) throw error;
      return data as any;
    },
  });

  const questions = useMemo(() => ((assignment?.questions as LearningQuestion[] | null) ?? []), [assignment]);
  const answeredCount = questions.filter((question, index) => isAnswered(question, answers[index])).length;
  const progress = questions.length ? Math.round((answeredCount / questions.length) * 100) : 0;

  if (isLoading || !assignment) return <div className="text-muted-foreground">{t("loading")}</div>;

  const attemptCount = (assignment as any).attempt_count ?? 0;
  const maxAttempts = (assignment as any).max_attempts as number | null;
  const allowRetake = !!(assignment as any).allow_retake;
  const bestScore = (assignment as any).best_score as number | null;
  const latestScore = (assignment as any).latest_score as number | null;
  const attemptsLeft = (assignment as any).attempts_remaining as number | null;
  const canRetake = allowRetake && (maxAttempts == null || attemptCount < maxAttempts);

  const submit = async () => {
    if (!activeStudent) return;
    try {
      const { data: result, error } = await supabase.rpc("submit_assignment", {
        _student_id: activeStudent.id,
        _assignment_id: assignmentId,
        _answers: Object.entries(answers).map(([index, answer]) => ({ index: Number(index), answer })),
      } as any);
      if (error) throw error;
      const score = (result as any)?.score ?? 0;
      const correct = (result as any)?.correct ?? 0;
      const passed = (result as any)?.passed ?? false;
      const coinsEarned = passed ? Math.max(5, Math.round(score / 10)) : Math.max(1, Math.round(score / 20));
      await awardCoins(activeStudent.id, coinsEarned, { en: "Assignment completed", hi: "होमवर्क पूरा", te: "హోంవర్క్ పూర్తయింది" }, assignmentId, "assignment");
      refresh();
      setShowFeedback(true);
      setResult({ score, correct, total: questions.length, passed });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  if (result) {
    return (
      <div className="space-y-4">
        <Link to="/student" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary">
          <ChevronLeft className="h-4 w-4" /> {t("back")}
        </Link>
        <Card className="p-8 text-center">
          <Trophy className={`mx-auto h-16 w-16 ${result.passed ? "text-primary" : "text-muted-foreground"}`} />
          <h1 className="mt-4 text-3xl font-extrabold">{result.passed ? t("great_job") : t("try_again")}</h1>
          <p className="mt-2 text-muted-foreground">
            {t("score")}: {result.score}% · {result.correct}/{result.total}
          </p>
          <Badge className="mt-3" variant={result.passed ? "default" : "secondary"}>
            {result.passed ? "Passed" : "Practice again"}
          </Badge>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            {allowRetake && (maxAttempts == null || attemptCount + 1 < maxAttempts) && (
              <Button variant="outline" onClick={() => window.location.reload()}>
                <RotateCcw className="mr-1 h-4 w-4" /> Retake Homework
              </Button>
            )}
            <Button onClick={() => navigate({ to: "/student" })}>{t("todays_school")}</Button>
          </div>
        </Card>

        <div className="space-y-3">
          {questions.map((question, index) => (
            <QuestionRenderer
              key={index}
              question={question}
              index={index}
              answer={answers[index]}
              onAnswer={(answer) => setAnswers({ ...answers, [index]: answer })}
              showFeedback={showFeedback}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Link to="/student" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary">
        <ChevronLeft className="h-4 w-4" /> {t("back")}
      </Link>
      <div>
        <h1 className="text-2xl font-extrabold">{tr(assignment.title)}</h1>
        <p className="text-sm text-muted-foreground">{tr(assignment.instructions)}</p>
      </div>
      <div className="sticky top-16 z-10 rounded-2xl bg-background/80 p-3 backdrop-blur">
        <div className="mb-2 flex justify-between text-sm font-bold">
          <span>{answeredCount}/{questions.length}</span>
          <span>{progress}%</span>
        </div>
        <Progress value={progress} />
      </div>

      <div className="space-y-3">
        {questions.map((question, index) => (
          <QuestionRenderer
            key={index}
            question={question}
            index={index}
            answer={answers[index]}
            onAnswer={(answer) => setAnswers({ ...answers, [index]: answer })}
          />
        ))}
      </div>

      <Button className="w-full" disabled={answeredCount < questions.length} onClick={submit}>
        {t("submit")}
      </Button>
    </div>
  );
}
