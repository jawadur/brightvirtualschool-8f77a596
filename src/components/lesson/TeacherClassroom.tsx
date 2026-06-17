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
import { Lock, CheckCircle2, Play, Pause, RotateCcw, Square, ThumbsUp, Sparkles, Clock, Volume2 } from "lucide-react";
import teacherAvatar from "@/assets/teacher.png";
import { toast } from "sonner";
import { Blackboard, coerceBlackboardSteps } from "@/components/lesson/Blackboard";
import { LessonScriptPlayer } from "@/components/lesson/LessonScriptPlayer";
import type { LessonScriptStep } from "@/types/lesson-script";

export const STAGE_ORDER = [
  "welcome", "blackboard", "concept", "example1", "example2", "guided", "independent", "assignment", "test", "revision",
] as const;

export type StageType = (typeof STAGE_ORDER)[number];

const TEACHER_STAGE_TYPES = new Set<StageType>(["welcome", "blackboard", "concept", "example1", "example2"]);

const MIN_STAGE_SECONDS: Record<StageType, number> = {
  // Manual lesson mode: do not stretch stages with artificial timers.
  welcome: 0,
  blackboard: 0,
  concept: 0,
  example1: 0,
  example2: 0,
  guided: 0,
  independent: 0,
  assignment: 0,
  test: 0,
  revision: 0,
};

function formatTime(totalSeconds: number) {
  const s = Math.max(0, Math.ceil(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

function splitTeachingText(text: string) {
  return (text || "")
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?।])\s+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

const TEACHER_FILLER_LINES: Record<string, string[]> = {
  en: [
    "Look carefully at the board.",
    "Say it with me slowly.",
    "Let us think for a moment.",
    "Can you explain it in your own words?",
    "Very good. We will try one more time.",
    "Now watch how the teacher does it step by step.",
  ],
  hi: [
    "बोर्ड को ध्यान से देखो.",
    "मेरे साथ धीरे-धीरे बोलो.",
    "थोड़ा सोचो.",
    "क्या तुम इसे अपने शब्दों में बता सकते हो?",
    "बहुत अच्छा. हम इसे एक बार फिर करेंगे.",
    "अब teacher इसे step by step दिखाएंगी.",
  ],
  te: [
    "బోర్డును జాగ్రత్తగా చూడండి.",
    "నాతో కలిసి నెమ్మదిగా చెప్పండి.",
    "ఒక్కసారి ఆలోచించండి.",
    "మీ మాటల్లో చెప్పగలరా?",
    "చాలా బాగుంది. మళ్లీ ఒకసారి చూద్దాం.",
    "ఇప్పుడు టీచర్ step by step చూపిస్తారు.",
  ],
};

function buildTeachingSegments(stage: Stage, lang: TtsLang, tr: (value: any) => string, meta: { encouragement: string }) {
  const lines: string[] = [];
  const explanation = tr(stage.explanation);
  const narration =
    (lang === "hi" && stage.narration_hi) ||
    (lang === "te" && stage.narration_te) ||
    stage.narration_en ||
    explanation;

  for (const line of splitTeachingText(narration || explanation)) lines.push(line);
  for (const slide of stage.slides ?? []) {
    for (const line of splitTeachingText([slide.title, slide.body].filter(Boolean).join(". "))) lines.push(line);
  }
  if (lines.length === 0 && explanation) lines.push(explanation);

  const unique = Array.from(new Set(lines.filter(Boolean)));
  const filler = TEACHER_FILLER_LINES[lang] ?? TEACHER_FILLER_LINES.en;

  // Thin content should not freeze on one sentence for the entire timer.
  // Add teacher-like prompts so the child sees a changing classroom flow.
  while (unique.length < 8) {
    unique.push(filler[(unique.length - 1 + filler.length) % filler.length]);
  }

  if (!unique.some((line) => line.toLowerCase().includes("good") || line.includes("अच्छ") || line.includes("బాగ"))) {
    unique.push(lang === "hi" ? "बहुत अच्छा!" : lang === "te" ? "చాలా బాగుంది!" : "Great job!");
  }

  return unique;
}

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
  script?: LessonScriptStep[] | null;
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
  const [stageElapsed, setStageElapsed] = useState(0);

  useEffect(() => {
    setStageElapsed(0);
    const timer = window.setInterval(() => setStageElapsed((v) => v + 1), 1000);
    return () => window.clearInterval(timer);
  }, [stage?.id]);

  const minSeconds = stage ? (MIN_STAGE_SECONDS[stage.stage_type] ?? 0) : 0;
  const minRemaining = Math.max(0, minSeconds - stageElapsed);
  const minMet = minRemaining <= 0;
  const teacherStages = stages.filter((s) => TEACHER_STAGE_TYPES.has(s.stage_type));
  const totalTeacherSeconds = teacherStages.reduce((sum, s) => sum + (MIN_STAGE_SECONDS[s.stage_type] ?? 0), 0);
  const teacherCompletedSeconds = stages.reduce((sum, s) => {
    if (!TEACHER_STAGE_TYPES.has(s.stage_type)) return sum;
    if (completedSet.has(s.stage_type)) return sum + (MIN_STAGE_SECONDS[s.stage_type] ?? 0);
    if (stage?.id === s.id) return sum + Math.min(stageElapsed, MIN_STAGE_SECONDS[s.stage_type] ?? 0);
    return sum;
  }, 0);
  const teacherLessonRemaining = Math.max(0, totalTeacherSeconds - teacherCompletedSeconds);

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

        {TEACHER_STAGE_TYPES.has(stage.stage_type) && (
          <div className="mb-4 rounded-2xl border bg-primary/5 px-4 py-3">
            <div className="flex flex-wrap items-center gap-2 text-sm font-bold">
              <Clock className="h-4 w-4 text-primary" />
              <span>Teacher lesson</span>
              <span className="ml-auto text-primary">Step-by-step</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Listen to each teacher step and move forward when the child understands.</p>
          </div>
        )}

        {/* Teaching content */}
        {Array.isArray(stage.script) && stage.script.length > 0 ? (
          <LessonScriptPlayer
            script={stage.script}
            lang={lang}
            onComplete={() => handleAdvance(null)}
          />
        ) : stage.stage_type === "blackboard" ? (
          <Blackboard
            steps={coerceBlackboardSteps(stage.slides as any)}
            lang={lang}
            minDurationSeconds={0}
            onComplete={() => handleAdvance(null)}
          />
        ) : (
          <StageBody stage={stage} lang={lang} onSpeakLine={(line) => tts.speak(line, lang)} />
        )}

        {/* Voice controls */}
        {!(Array.isArray(stage.script) && stage.script.length > 0) && stage.stage_type !== "blackboard" && prefs.voice_reader !== false && narration && (
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
        {!(Array.isArray(stage.script) && stage.script.length > 0) && stage.stage_type !== "blackboard" && (
          <StageActions
            stage={stage}
            completed={completedSet.has(stage.stage_type)}
            minRemaining={0}
            minMet={true}
            onComplete={handleAdvance}
          />
        )}
      </Card>
    </div>
  );
}

function StageBody({
  stage,
  lang,
  onSpeakLine,
}: {
  stage: Stage;
  lang: TtsLang;
  onSpeakLine: (line: string) => void;
}) {
  const { tr } = useI18n();
  const slides = stage.slides ?? [];
  const explanation = tr(stage.explanation);
  const narration =
    (lang === "hi" && stage.narration_hi) ||
    (lang === "te" && stage.narration_te) ||
    stage.narration_en ||
    explanation;

  return (
    <div className="space-y-3">
      {stage.image_url && (
        <img src={stage.image_url} alt="" loading="lazy" className="rounded-xl max-h-72 object-contain mx-auto" />
      )}

      {explanation && (
        <div className="rounded-3xl border bg-gradient-to-br from-amber-50 to-orange-50 p-4 sm:p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="text-3xl" aria-hidden="true">👩‍🏫</div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-extrabold uppercase text-primary mb-1">Teacher explanation</div>
              <p className="text-xl sm:text-2xl font-extrabold leading-relaxed no-clip font-indic" lang={lang}>{explanation}</p>
              {narration && (
                <Button size="sm" variant="secondary" className="mt-3" onClick={() => onSpeakLine(narration)}>
                  <Volume2 className="h-4 w-4 mr-1" /> Listen
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

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
  stage, completed, minRemaining, minMet, onComplete,
}: {
  stage: Stage;
  completed: boolean;
  minRemaining: number;
  minMet: boolean;
  onComplete: (score: number | null) => void;
}) {
  const isExplanation = ["welcome", "concept", "example1", "example2", "revision"].includes(stage.stage_type);
  if (isExplanation) {
    return (
      <div className="mt-5 flex flex-wrap items-center gap-2 justify-end">
        {!minMet && <span className="mr-auto text-xs font-semibold text-muted-foreground">Teacher is still explaining. Please listen and watch.</span>}
        <Button onClick={() => onComplete(null)} className="gap-2" disabled={!minMet}>
          <ThumbsUp className="h-4 w-4" /> {minMet ? (completed ? "Continue" : "I Understood") : `Listen first ${formatTime(minRemaining)}`}
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