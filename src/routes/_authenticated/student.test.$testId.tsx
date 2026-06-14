import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStudents } from "@/lib/student-context";
import { useI18n } from "@/lib/i18n";
import { awardCoins, awardStar } from "@/lib/data";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Trophy, Timer } from "lucide-react";
import { toast } from "sonner";

type Q = { type: string; question: Record<string, string>; options: Record<string, string>[]; answer: number };

export const Route = createFileRoute("/_authenticated/student/test/$testId")({
  component: TestPage,
});

function TestPage() {
  const { testId } = Route.useParams();
  const { activeStudent, refresh } = useStudents();
  const { t, tr } = useI18n();
  const navigate = useNavigate();
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [startedAt] = useState(() => Date.now());
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [result, setResult] = useState<null | { score: number; passed: boolean }>(null);
  const submittedRef = useRef(false);

  const { data: test, isLoading } = useQuery({
    queryKey: ["test", testId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tests")
        .select("id, title, questions, duration_minutes, pass_threshold, subject_id, subjects(name)")
        .eq("id", testId).single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!test) return;
    setSecondsLeft(test.duration_minutes * 60);
  }, [test?.id]);

  useEffect(() => {
    if (secondsLeft == null || result) return;
    if (secondsLeft <= 0) { void submit(true); return; }
    const id = setTimeout(() => setSecondsLeft((s) => (s ?? 0) - 1), 1000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, result]);

  if (isLoading || !test) return <div className="text-muted-foreground">{t("loading")}</div>;
  const questions = (test.questions as Q[]) ?? [];

  async function submit(auto = false) {
    if (submittedRef.current || !activeStudent) return;
    submittedRef.current = true;
    let correct = 0;
    questions.forEach((q, i) => { if (answers[i] === q.answer) correct += 1; });
    const pct = Math.round((correct / Math.max(1, questions.length)) * 100);
    const passed = pct >= (test!.pass_threshold ?? 60);
    try {
      await supabase.from("test_attempts").insert({
        student_profile_id: activeStudent.id,
        test_id: testId,
        answers: Object.entries(answers).map(([i, a]) => ({ index: Number(i), answer: a })),
        score: pct,
        max_score: 100,
        status: "completed",
        started_at: new Date(startedAt).toISOString(),
        completed_at: new Date().toISOString(),
        metadata: { auto_submitted: auto },
      });
      if (passed) {
        await awardCoins(activeStudent.id, 20, { en: "Test passed" }, testId, "test");
        if (pct === 100) await awardStar(activeStudent.id, { en: "Perfect test!" }, testId, "test");
      }
      refresh();
      setResult({ score: pct, passed });
    } catch (e) {
      submittedRef.current = false;
      toast.error((e as Error).message);
    }
  }

  if (result) {
    return (
      <Card className="p-8 text-center">
        <Trophy className={`h-16 w-16 mx-auto ${result.passed ? "text-primary" : "text-muted-foreground"}`} />
        <h1 className="mt-4 text-3xl font-extrabold">{result.passed ? t("passed") : t("failed")}</h1>
        <p className="mt-2 text-muted-foreground">{t("score")}: {result.score}%</p>
        <Button className="mt-6" onClick={() => navigate({ to: "/student/tests" })}>{t("tests")}</Button>
      </Card>
    );
  }

  const answered = Object.keys(answers).length;
  const mm = Math.floor((secondsLeft ?? 0) / 60).toString().padStart(2, "0");
  const ss = ((secondsLeft ?? 0) % 60).toString().padStart(2, "0");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 sticky top-16 z-10 bg-background/80 backdrop-blur py-2">
        <h1 className="text-xl sm:text-2xl font-extrabold truncate">{tr(test.title)}</h1>
        <div className={`flex items-center gap-1 rounded-full px-3 py-1 font-bold text-sm ${secondsLeft && secondsLeft < 60 ? "bg-destructive/15 text-destructive" : "bg-accent"}`}>
          <Timer className="h-4 w-4" /> {mm}:{ss}
        </div>
      </div>
      <Progress value={(answered / Math.max(1, questions.length)) * 100} />
      {questions.map((q, i) => (
        <Card key={i} className="p-5">
          <div className="font-bold mb-3">{i + 1}. {tr(q.question)}</div>
          <div className="grid sm:grid-cols-2 gap-2">
            {q.options.map((opt, j) => (
              <button
                key={j}
                onClick={() => setAnswers({ ...answers, [i]: j })}
                className={`rounded-2xl border-2 p-3 text-left font-bold transition ${answers[i] === j ? "border-primary bg-primary/10" : "border-border"}`}
              >
                {tr(opt)}
              </button>
            ))}
          </div>
        </Card>
      ))}
      <Button className="w-full" disabled={answered < questions.length} onClick={() => submit(false)}>
        {t("submit")}
      </Button>
    </div>
  );
}