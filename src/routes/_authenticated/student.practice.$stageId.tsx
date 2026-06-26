import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStudents } from "@/lib/student-context";
import { useI18n } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, CheckCircle2, XCircle, Sparkles } from "lucide-react";
import { QuestionRenderer, type LearningQuestion, type QuestionAnswer } from "@/components/learning/QuestionRenderer";

export const Route = createFileRoute("/_authenticated/student/practice/$stageId")({
  component: AIPracticePlayer,
});

type PoolQuestion = LearningQuestion & { pool_id: string; topic?: string };

function AIPracticePlayer() {
  const { stageId } = Route.useParams();
  const navigate = useNavigate();
  const { activeStudent } = useStudents();
  const { tr } = useI18n();

  const isWeak = stageId === "weak";

  const stageQ = useQuery({
    queryKey: ["practice-stage", stageId],
    enabled: !isWeak,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lesson_stages")
        .select("id, title, lesson_id, ai_question_count, ai_show_explanation, ai_weak_area_practice")
        .eq("id", stageId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const desiredCount = isWeak ? 10 : ((stageQ.data as any)?.ai_question_count ?? 10);
  const showExplanation = isWeak ? true : ((stageQ.data as any)?.ai_show_explanation ?? true);

  const questionsQ = useQuery({
    queryKey: ["practice-questions", stageId, activeStudent?.id, desiredCount],
    enabled: !!activeStudent && (isWeak || !!stageQ.data),
    queryFn: async () => {
      if (isWeak) {
        const { data, error } = await supabase.rpc("get_weak_practice_questions", {
          _student_id: activeStudent!.id,
          _count: desiredCount,
        } as any);
        if (error) throw error;
        return (data ?? []) as PoolQuestion[];
      }
      const { data, error } = await supabase.rpc("get_practice_questions", {
        _student_id: activeStudent!.id,
        _stage_id: stageId,
        _count: desiredCount,
      } as any);
      if (error) throw error;
      return (data ?? []) as PoolQuestion[];
    },
  });

  const questions = questionsQ.data ?? [];
  const [idx, setIdx] = useState(0);
  const [answer, setAnswer] = useState<QuestionAnswer | undefined>(undefined);
  const [results, setResults] = useState<{ correct: boolean; explanation?: string; correctAnswer?: any }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => { setAnswer(undefined); setRevealed(false); }, [idx]);

  const current = questions[idx] as PoolQuestion | undefined;
  const totalCorrect = results.filter((r) => r.correct).length;

  const weakQ = useQuery({
    queryKey: ["weak-topics-end", activeStudent?.id],
    enabled: done && !!activeStudent,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_student_weak_topics", {
        _student_id: activeStudent!.id,
      } as any);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const submit = async () => {
    if (!current || !answer || !activeStudent) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc("submit_pool_answer", {
        _student_id: activeStudent.id,
        _pool_id: current.pool_id,
        _answer: answer as any,
      } as any);
      if (error) throw error;
      const r = (data ?? {}) as any;
      setResults([...results, { correct: !!r.correct, explanation: r.explanation, correctAnswer: r.correct_answer }]);
      setRevealed(true);
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const next = () => {
    if (idx + 1 >= questions.length) setDone(true);
    else setIdx(idx + 1);
  };

  const headerTitle = useMemo(() => {
    if (isWeak) return "Weak-Area Practice";
    const t = (stageQ.data as any)?.title;
    return t ? tr(t) : "AI Practice";
  }, [isWeak, stageQ.data, tr]);

  if (questionsQ.isLoading || (!isWeak && stageQ.isLoading)) {
    return <p className="text-muted-foreground">Loading questions…</p>;
  }

  if (questions.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Sparkles className="h-10 w-10 mx-auto text-primary" />
        <div className="mt-3 font-extrabold">No practice questions yet</div>
        <div className="mt-1 text-sm text-muted-foreground">
          Your teacher hasn't generated questions for this topic yet. Try again later.
        </div>
        <Button className="mt-4" onClick={() => navigate({ to: "/student" })}>
          <ArrowLeft className="h-4 w-4 mr-1" />Back
        </Button>
      </Card>
    );
  }

  if (done) {
    const pct = Math.round((totalCorrect / Math.max(1, results.length)) * 100);
    const weak = (weakQ.data ?? []) as any[];
    return (
      <div className="space-y-4">
        <Card className="p-6 text-center bg-gradient-to-r from-primary/15 to-accent">
          <div className="text-4xl">{pct >= 80 ? "🌟" : pct >= 50 ? "💪" : "📚"}</div>
          <h2 className="text-2xl font-extrabold mt-2">{headerTitle} complete</h2>
          <div className="mt-1 text-sm text-muted-foreground">
            You scored {totalCorrect} out of {results.length} ({pct}%)
          </div>
        </Card>
        {weak.length > 0 && (
          <Card className="p-5">
            <h3 className="font-extrabold">Topics to revisit</h3>
            <ul className="mt-2 space-y-1 text-sm">
              {weak.slice(0, 5).map((w, i) => (
                <li key={i} className="flex justify-between border-b py-1 last:border-0">
                  <span className="font-bold">{w.topic}</span>
                  <span className="text-muted-foreground">{Math.round(Number(w.accuracy) * 100)}% · {w.attempts} attempts</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
        <div className="flex gap-2 justify-center">
          <Button variant="outline" onClick={() => navigate({ to: "/student" })}>Back to dashboard</Button>
          <Button onClick={() => { setResults([]); setIdx(0); setDone(false); questionsQ.refetch(); }}>
            <Sparkles className="h-4 w-4 mr-1" />Practice again
          </Button>
        </div>
      </div>
    );
  }

  if (!current) return null;
  const last = results[results.length - 1];
  const pct = Math.round((idx / questions.length) * 100);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/student" })}>
          <ArrowLeft className="h-4 w-4 mr-1" />Exit
        </Button>
        <div className="flex-1">
          <div className="flex justify-between text-xs font-bold mb-1">
            <span>{headerTitle}</span>
            <span>Q{idx + 1} / {questions.length} · {totalCorrect} correct</span>
          </div>
          <Progress value={pct} />
        </div>
      </div>

      {current.topic && (
        <div className="text-xs uppercase font-bold text-primary">Topic: {current.topic}</div>
      )}

      <QuestionRenderer
        question={current}
        index={idx}
        answer={answer}
        onAnswer={(a) => !revealed && setAnswer(a)}
        showFeedback={false}
      />

      {revealed && (
        <Card className={`p-4 ${last?.correct ? "bg-success/10 border-success/40" : "bg-destructive/10 border-destructive/40"}`}>
          <div className="flex items-center gap-2 font-extrabold">
            {last?.correct ? <CheckCircle2 className="h-5 w-5 text-success" /> : <XCircle className="h-5 w-5 text-destructive" />}
            {last?.correct ? "Correct!" : "Not quite."}
          </div>
          {showExplanation && last?.explanation && (
            <p className="mt-2 text-sm">{last.explanation}</p>
          )}
        </Card>
      )}

      <div className="flex justify-end gap-2">
        {!revealed ? (
          <Button disabled={!answer || submitting} onClick={submit}>
            {submitting ? "Checking…" : "Submit"}
          </Button>
        ) : (
          <Button onClick={next}>
            {idx + 1 >= questions.length ? "Finish" : "Next"}
          </Button>
        )}
      </div>
    </div>
  );
}