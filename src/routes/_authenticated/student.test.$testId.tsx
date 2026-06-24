import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStudents } from "@/lib/student-context";
import { useI18n } from "@/lib/i18n";
import { awardCoins, awardStar } from "@/lib/data";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { QuestionRenderer, isAnswered, scoreQuestion, type LearningQuestion, type QuestionAnswer } from "@/components/learning/QuestionRenderer";
import { ChevronLeft, RotateCcw, Timer, Trophy } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/student/test/$testId")({
  component: TestPage,
});

function TestPage() {
  const { testId } = Route.useParams();
  const { activeStudent, refresh } = useStudents();
  const { t, tr } = useI18n();
  const navigate = useNavigate();
  const [answers, setAnswers] = useState<Record<number, QuestionAnswer>>({});
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [result, setResult] = useState<null | { score: number; correct: number; total: number; passed: boolean }>(null);
  const submittedRef = useRef(false);

  const { data: test, isLoading } = useQuery({
    queryKey: ["test", testId, activeStudent?.id ?? null],
    queryFn: async () => {
      // Read base fields directly (no 'questions' column — column-grant blocked for students).
      const { data: base, error } = await supabase
        .from("tests")
        .select("id, title, duration_minutes, pass_threshold, subject_id, scope, metadata, subjects(name)")
        .eq("id", testId)
        .single();
      if (error) throw error;
      // Fetch answer-stripped questions via RPC.
      const { data: safeQs, error: qErr } = await supabase.rpc("get_test_for_student", {
        _test_id: testId,
        _student_id: activeStudent?.id ?? null,
      } as any);
      if (qErr) throw qErr;
      const s = (safeQs as any) ?? {};
      return { ...base, questions: s.questions ?? [], allow_retake: s.allow_retake,
        retake_mode: s.retake_mode, max_attempts: s.max_attempts,
        attempt_count: s.attempt_count ?? 0, best_score: s.best_score,
        latest_score: s.latest_score, attempts_remaining: s.attempts_remaining } as any;
    },
  });

  const questions = useMemo(() => {
    const raw = (test?.questions as LearningQuestion[] | null) ?? [];
    if ((test?.metadata as any)?.randomize) {
      return [...raw].sort(() => Math.random() - 0.5);
    }
    return raw;
  }, [test]);
  const answeredCount = questions.filter((question, index) => isAnswered(question, answers[index])).length;
  const progress = questions.length ? Math.round((answeredCount / questions.length) * 100) : 0;

  useEffect(() => {
    if (!test) return;
    setSecondsLeft(test.duration_minutes * 60);
  }, [test?.id, test]);

  useEffect(() => {
    if (secondsLeft == null || result) return;
    if (secondsLeft <= 0) {
      void submit(true);
      return;
    }
    const id = setTimeout(() => setSecondsLeft((s) => (s ?? 0) - 1), 1000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, result]);

  if (isLoading || !test) return <div className="text-muted-foreground">{t("loading")}</div>;

  const attemptCount = (test as any).attempt_count ?? 0;
  const maxAttempts = (test as any).max_attempts as number | null;
  const allowRetake = !!(test as any).allow_retake;
  const bestScore = (test as any).best_score as number | null;
  const latestScore = (test as any).latest_score as number | null;
  const attemptsLeft = (test as any).attempts_remaining as number | null;
  const canRetake = allowRetake && (maxAttempts == null || attemptCount < maxAttempts);

  async function submit(auto = false) {
    if (submittedRef.current || !activeStudent) return;
    submittedRef.current = true;

    try {
      const { data: result, error } = await supabase.rpc("submit_test_attempt", {
        _student_id: activeStudent.id,
        _test_id: testId,
        _answers: Object.entries(answers).map(([index, answer]) => ({ index: Number(index), answer })),
        _started_at: new Date(startedAt).toISOString(),
        _auto: auto,
      } as any);
      if (error) throw error;
      const score = (result as any)?.score ?? 0;
      const correct = (result as any)?.correct ?? 0;
      const passed = (result as any)?.passed ?? false;
      if (passed) {
        await awardCoins(activeStudent.id, 20, { en: "Test passed", hi: "परीक्षा पास", te: "పరీక్ష ఉత్తీర్ణత" }, testId, "test");
        if (score === 100) await awardStar(activeStudent.id, { en: "Perfect test!", hi: "पूरे अंक!", te: "పూర్తి మార్కులు!" }, testId, "test");
      }
      refresh();
      setShowFeedback(true);
      setResult({ score, correct, total: questions.length, passed });
    } catch (e) {
      submittedRef.current = false;
      toast.error((e as Error).message);
    }
  }


  const mm = Math.floor((secondsLeft ?? 0) / 60).toString().padStart(2, "0");
  const ss = ((secondsLeft ?? 0) % 60).toString().padStart(2, "0");

  if (result) {
    return (
      <div className="space-y-4">
        <Link to="/student/tests" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary">
          <ChevronLeft className="h-4 w-4" /> {t("back")}
        </Link>
        <Card className="p-8 text-center">
          <Trophy className={`mx-auto h-16 w-16 ${result.passed ? "text-primary" : "text-muted-foreground"}`} />
          <h1 className="mt-4 text-3xl font-extrabold">{result.passed ? t("passed") : t("failed")}</h1>
          <p className="mt-2 text-muted-foreground">
            {t("score")}: {result.score}% · {result.correct}/{result.total}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Attempt {attemptCount + 1}{maxAttempts ? ` of ${maxAttempts}` : ""}
            {bestScore != null && <> · Best {Math.max(bestScore, result.score)}%</>}
          </p>
          <Badge className="mt-3" variant={result.passed ? "default" : "secondary"}>
            {result.passed ? "Ready for next lesson" : "Needs practice"}
          </Badge>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            {allowRetake && (maxAttempts == null || attemptCount + 1 < maxAttempts) && (
              <Button variant="outline" onClick={() => window.location.reload()}>
                <RotateCcw className="mr-1 h-4 w-4" /> Retake Test
              </Button>
            )}
            <Button onClick={() => navigate({ to: "/student/tests" })}>{t("tests")}</Button>
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
      <Link to="/student/tests" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary">
        <ChevronLeft className="h-4 w-4" /> {t("back")}
      </Link>
      {(attemptCount > 0 || maxAttempts) && (
        <Card className="p-3 text-sm">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="secondary">Attempt {attemptCount + 1}{maxAttempts ? ` of ${maxAttempts}` : ""}</Badge>
            {bestScore != null && <span><b>Best</b> {bestScore}%</span>}
            {latestScore != null && <span><b>Latest</b> {latestScore}%</span>}
            {attemptsLeft != null && <span className="text-muted-foreground">{attemptsLeft} left</span>}
            {!canRetake && attemptCount > 0 && <span className="text-destructive font-bold">No retakes remaining</span>}
          </div>
        </Card>
      )}
      <div className="sticky top-16 z-10 rounded-2xl bg-background/80 p-3 backdrop-blur">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h1 className="truncate text-xl font-extrabold sm:text-2xl">{tr(test.title)}</h1>
          <div className={`flex items-center gap-1 rounded-full px-3 py-1 text-sm font-bold ${secondsLeft && secondsLeft < 60 ? "bg-destructive/15 text-destructive" : "bg-accent"}`}>
            <Timer className="h-4 w-4" /> {mm}:{ss}
          </div>
        </div>
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

      <Button className="w-full" disabled={answeredCount < questions.length && secondsLeft !== 0} onClick={() => submit(false)}>
        {t("submit")}
      </Button>
    </div>
  );
}
