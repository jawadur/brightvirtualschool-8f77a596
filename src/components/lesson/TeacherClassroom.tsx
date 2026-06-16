import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStudents } from "@/lib/student-context";
import { useStudentPrefs } from "@/lib/student-prefs";
import { useI18n } from "@/lib/i18n";
import { useTts, type TtsLang } from "@/hooks/use-tts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Lock, CheckCircle2, Play, Pause, RotateCcw, Square, ThumbsUp, Sparkles } from "lucide-react";
import teacherAvatar from "@/assets/teacher.png";
import { toast } from "sonner";
import { Blackboard, coerceBlackboardSteps } from "@/components/lesson/Blackboard";

export const STAGE_ORDER = [
  "welcome", "blackboard", "concept", "example1", "example2", "guided", "independent", "assignment", "test", "revision",
] as const;

export type StageType = (typeof STAGE_ORDER)[number];

const STAGE_META: Record<StageType, { label: string; emoji: string; encouragement: string }> = {
  welcome:     { label: "Teacher Welcome",       emoji: "👋", encouragement: "Let's begin together!" },
  blackboard:  { label: "Blackboard Session",    emoji: "📐", encouragement: "Watch the teacher write on the board." },
  concept:     { label: "Concept Explanation",   emoji: "📖", encouragement: "Listen carefully." },
  example1:    { label: "Example 1",             emoji: "✨", encouragement: "Watch the first example." },
  example2:    { label: "Example 2",             emoji: "🌟", encouragement: "Now another one." },
  guided:      { label: "Guided Practice",       emoji: "🤝", encouragement: "Let's try it together." },
  independent: { label: "Independent Practice",  emoji: "🧠", encouragement: "Now you try it." },
  assignment:  { label: "Assignment",            emoji: "📝", encouragement: "Time to practise!" },
  test:        { label: "Test",                  emoji: "🏁", encouragement: "Show what you learned!" },
  revision:    { label: "What you learned",      emoji: "🎓", encouragement: "Great work today!" },
};

type Stage = {
  id: string;
  lesson_id: string;
  stage_type: StageType;
  title: Record<string, string>;
  explanation: Record<string, string>;
  narration_en: string | null;
  narration_hi: string | null;
  narration_te: string | null;
  image_url: string | null;
  slides: { title?: string; body?: string; image?: string }[];
  questions: { prompt: string; options?: string[]; answer: number | string; hint?: string }[];
  pass_threshold: number;
};

export function TeacherClassroom({ lessonId, lang = "en", onAllComplete }: {
  lessonId: string;
  lang?: TtsLang;
  onAllComplete?: () => void;
}) {
  const { activeStudent } = useStudents();
  const { prefs } = useStudentPrefs();
  const { tr } = useI18n();
  const qc = useQueryClient();
  const tts = useTts(lang, { rate: 0.85 });

  const stagesQ = useQuery({
    queryKey: ["lesson-stages", lessonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lesson_stages")
        .select("*")
        .eq("lesson_id", lessonId)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as unknown as Stage[];
    },
  });

  const progressQ = useQuery({
    queryKey: ["stage-progress", activeStudent?.id, lessonId],
    enabled: !!activeStudent,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_stage_progress")
        .select("stage_type, completed_at, score")
        .eq("student_profile_id", activeStudent!.id)
        .eq("lesson_id", lessonId);
      if (error) throw error;
      return data ?? [];
    },
  });

  const completedSet = useMemo(
    () => new Set<string>((progressQ.data ?? []).filter((p) => p.completed_at).map((p) => p.stage_type as string)),
    [progressQ.data],
  );
  const scoreByStage = useMemo(() => {
    const m: Record<string, number> = {};
    for (const p of progressQ.data ?? []) if (p.score != null) m[p.stage_type] = p.score;
    return m;
  }, [progressQ.data]);

  // Order stages strictly using STAGE_ORDER
  const stages = useMemo(() => {
    const byType: Record<string, Stage> = {};
    for (const s of stagesQ.data ?? []) byType[s.stage_type] = s;
    return STAGE_ORDER.map((t) => byType[t]).filter(Boolean) as Stage[];
  }, [stagesQ.data]);

  // Resume: jump to first incomplete
  const firstIncompleteIdx = useMemo(() => {
    for (let i = 0; i < stages.length; i++) if (!completedSet.has(stages[i].stage_type)) return i;
    return Math.max(0, stages.length - 1);
  }, [stages, completedSet]);

  const [activeIdx, setActiveIdx] = useState(firstIncompleteIdx);
  useEffect(() => { setActiveIdx(firstIncompleteIdx); }, [firstIncompleteIdx]);

  const stage = stages[activeIdx];
  const isStageUnlocked = (idx: number) => idx === 0 || completedSet.has(stages[idx - 1]?.stage_type);

  // Lock: assignment requires guided + independent passed; test requires assignment >= threshold
  function isAllowed(idx: number) {
    const target = stages[idx];
    if (!target) return false;
    if (target.stage_type === "test") {
      const assignScore = scoreByStage["assignment"] ?? -1;
      const assignStage = stages.find((s) => s.stage_type === "assignment");
      if (assignStage && assignScore < (assignStage.pass_threshold ?? 60)) return false;
    }
    return isStageUnlocked(idx);
  }

  const completeStage = useMutation({
    mutationFn: async ({ score }: { score: number | null }) => {
      if (!activeStudent || !stage) return;
      const { error } = await supabase.from("student_stage_progress").upsert(
        {
          student_profile_id: activeStudent.id,
          lesson_id: lessonId,
          stage_type: stage.stage_type as any,
          completed_at: new Date().toISOString(),
          score,
        } as any,
        { onConflict: "student_profile_id,lesson_id,stage_type" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stage-progress", activeStudent?.id, lessonId] });
    },
  });

  if (stagesQ.isLoading) return <p className="text-muted-foreground">Loading classroom…</p>;
  if (!stage) {
    return (
      <Card className="p-6 text-center">
        <p className="text-muted-foreground">No classroom stages yet for this lesson.</p>
      </Card>
    );
  }

  const meta = STAGE_META[stage.stage_type];
  const narration =
    (lang === "hi" && stage.narration_hi) ||
    (lang === "te" && stage.narration_te) ||
    stage.narration_en ||
    tr(stage.explanation);

  const handleAdvance = async (score: number | null) => {
    tts.stop();
    await completeStage.mutateAsync({ score });
    if (activeIdx + 1 < stages.length) {
      setActiveIdx(activeIdx + 1);
    } else {
      onAllComplete?.();
    }
  };

  return (
    <div className="space-y-4">
      {/* Stepper */}
      <ol className="grid grid-cols-3 sm:grid-cols-9 gap-1.5">
        {stages.map((s, i) => {
          const done = completedSet.has(s.stage_type);
          const unlocked = isStageUnlocked(i);
          const allowed = isAllowed(i);
          const isActive = i === activeIdx;
          return (
            <button
              key={s.id}
              onClick={() => {
                if (!allowed) {
                  toast.info("Please complete the previous step first.");
                  return;
                }
                setActiveIdx(i);
              }}
              className={`relative rounded-lg border px-2 py-1.5 text-[10px] font-bold text-center truncate min-w-0 ${
                isActive
                  ? "bg-primary text-primary-foreground border-primary"
                  : done
                    ? "bg-success/20 text-foreground border-success/40"
                    : unlocked
                      ? "bg-card border-border"
                      : "bg-muted text-muted-foreground border-transparent"
              }`}
              title={STAGE_META[s.stage_type].label}
            >
              <span className="block truncate">{i + 1}. {STAGE_META[s.stage_type].label}</span>
              {done && <CheckCircle2 className="absolute -top-1 -right-1 h-3.5 w-3.5 text-success bg-background rounded-full" />}
              {!unlocked && <Lock className="absolute -top-1 -right-1 h-3.5 w-3.5 text-muted-foreground bg-background rounded-full p-0.5" />}
            </button>
          );
        })}
      </ol>

      <Card className="p-5 sm:p-6">
        <header className="flex flex-wrap items-start gap-4 mb-4">
          <img
            src={teacherAvatar}
            alt="Teacher"
            width={88}
            height={88}
            loading="lazy"
            className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl bg-accent shrink-0"
          />
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold uppercase text-primary">Step {activeIdx + 1} of {stages.length} · {meta.emoji} {meta.label}</div>
            <h2 className="text-xl sm:text-2xl font-extrabold no-clip mt-1">{tr(stage.title) || meta.label}</h2>
            <p className="text-sm text-muted-foreground italic mt-0.5">{meta.encouragement}</p>
          </div>
        </header>

        <Progress value={Math.round(((activeIdx + 1) / stages.length) * 100)} className="mb-4" />

        {/* Slide content */}
        {stage.stage_type === "blackboard" ? (
          <Blackboard
            steps={coerceBlackboardSteps(stage.slides as any)}
            lang={lang}
            onComplete={() => handleAdvance(null)}
          />
        ) : (
          <StageBody stage={stage} lang={lang} />
        )}

        {/* Voice controls */}
        {prefs.voice_reader !== false && narration && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => tts.speak(narration, lang)}>
              <Play className="h-4 w-4 mr-1" /> Play
            </Button>
            <Button size="sm" variant="outline" onClick={tts.pause} disabled={!tts.speaking || tts.paused}>
              <Pause className="h-4 w-4 mr-1" /> Pause
            </Button>
            <Button size="sm" variant="outline" onClick={tts.resume} disabled={!tts.paused}>
              Resume
            </Button>
            <Button size="sm" variant="outline" onClick={() => tts.speak(narration, lang)}>
              <RotateCcw className="h-4 w-4 mr-1" /> Replay
            </Button>
            <Button size="sm" variant="outline" onClick={tts.stop} disabled={!tts.speaking}>
              <Square className="h-4 w-4 mr-1" /> Stop
            </Button>
            <span className="text-xs text-muted-foreground ml-auto">{tts.supported ? "Female teacher voice" : "Voice unavailable on this device"}</span>
          </div>
        )}

        {/* Stage actions */}
        <StageActions
          stage={stage}
          completed={completedSet.has(stage.stage_type)}
          onComplete={handleAdvance}
        />
      </Card>
    </div>
  );
}

function StageBody({ stage, lang }: { stage: Stage; lang: TtsLang }) {
  const { tr } = useI18n();
  const slides = stage.slides ?? [];
  return (
    <div className="space-y-3">
      {stage.image_url && (
        <img src={stage.image_url} alt="" loading="lazy" className="rounded-xl max-h-72 object-contain mx-auto" />
      )}
      <p className="text-base sm:text-lg leading-relaxed no-clip font-indic" lang={lang}>
        {tr(stage.explanation)}
      </p>
      {slides.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {slides.map((s, i) => (
            <Card key={i} className="p-4 bg-muted/40 min-h-[120px]">
              {s.title && <div className="font-extrabold mb-1 no-clip">{s.title}</div>}
              {s.image && <img src={s.image} alt="" loading="lazy" className="my-2 max-h-32 mx-auto" />}
              {s.body && <p className="text-sm no-clip" lang={lang}>{s.body}</p>}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function StageActions({
  stage, completed, onComplete,
}: {
  stage: Stage;
  completed: boolean;
  onComplete: (score: number | null) => void;
}) {
  const isExplanation = ["welcome", "concept", "example1", "example2", "revision"].includes(stage.stage_type);
  if (isExplanation) {
    return (
      <div className="mt-5 flex flex-wrap gap-2 justify-end">
        <Button onClick={() => onComplete(null)} className="gap-2">
          <ThumbsUp className="h-4 w-4" /> {completed ? "Continue" : "I Understood"}
        </Button>
      </div>
    );
  }
  return <QuestionRunner stage={stage} onDone={onComplete} />;
}

function QuestionRunner({ stage, onDone }: { stage: Stage; onDone: (score: number) => void }) {
  const [idx, setIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<null | "right" | "wrong">(null);
  const [showHint, setShowHint] = useState(false);
  const startedAt = useRef(Date.now());

  const questions = stage.questions ?? [];
  if (questions.length === 0) {
    return (
      <div className="mt-5 flex justify-end">
        <Button onClick={() => onDone(100)}>Mark complete</Button>
      </div>
    );
  }
  const q = questions[idx];
  const isGuided = stage.stage_type === "guided";

  const check = () => {
    if (picked == null) return;
    const ok = picked === Number(q.answer);
    setFeedback(ok ? "right" : "wrong");
    if (ok) setCorrect((c) => c + 1);
  };
  const next = () => {
    if (idx + 1 < questions.length) {
      setIdx(idx + 1); setPicked(null); setFeedback(null); setShowHint(false);
    } else {
      const score = Math.round(((correct + (feedback === "right" ? 0 : 0)) / questions.length) * 100);
      // correct already counted; recompute
      const final = Math.round((correct / questions.length) * 100);
      onDone(final);
    }
  };

  return (
    <div className="mt-5 space-y-3">
      <div className="text-xs text-muted-foreground">Question {idx + 1} of {questions.length}</div>
      <p className="text-lg font-extrabold no-clip">{q.prompt}</p>
      <div className="grid sm:grid-cols-2 gap-2">
        {(q.options ?? []).map((opt, i) => (
          <button
            key={i}
            onClick={() => { setPicked(i); setFeedback(null); }}
            disabled={feedback === "right"}
            className={`text-left rounded-xl border-2 px-4 py-3 font-bold transition no-clip ${
              picked === i ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>

      {isGuided && q.hint && (
        <div>
          <Button variant="outline" size="sm" onClick={() => setShowHint(true)}><Sparkles className="h-4 w-4 mr-1" />Teacher's hint</Button>
          {showHint && <p className="mt-2 text-sm bg-accent/40 rounded-lg p-3 no-clip">👩‍🏫 {q.hint}</p>}
        </div>
      )}

      {feedback === "right" && (
        <p className="text-sm text-success font-bold">👩‍🏫 {["Great job!", "Excellent!", "Well done!"][Math.floor(Math.random() * 3)]}</p>
      )}
      {feedback === "wrong" && (
        <p className="text-sm text-destructive font-bold">
          👩‍🏫 Let me explain again. {isGuided && q.hint ? q.hint : "Try once more."}
        </p>
      )}

      <div className="flex flex-wrap gap-2 justify-end">
        {feedback !== "right" && <Button onClick={check} disabled={picked == null}>Check answer</Button>}
        {feedback === "right" && <Button onClick={next}>{idx + 1 < questions.length ? "Next question" : "Finish step"}</Button>}
      </div>
    </div>
  );
}