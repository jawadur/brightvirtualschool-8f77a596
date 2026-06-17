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
import { Badge } from "@/components/ui/badge";
import { Lock, CheckCircle2, RotateCcw, Square, ThumbsUp, Sparkles, Volume2, BookOpen, Presentation, Lightbulb, PartyPopper, Clock3 } from "lucide-react";
import teacherAvatar from "@/assets/teacher.png";
import { toast } from "sonner";
import { Blackboard, coerceBlackboardSteps } from "@/components/lesson/Blackboard";

export const STAGE_ORDER = [
  "welcome", "blackboard", "concept", "example1", "example2", "guided", "independent", "assignment", "test", "revision",
] as const;

export type StageType = (typeof STAGE_ORDER)[number];

const STAGE_META: Record<StageType, { label: string; emoji: string; encouragement: string }> = {
  welcome:     { label: "Teacher Welcome",       emoji: "👋", encouragement: "Let's begin like a real classroom." },
  blackboard:  { label: "Blackboard Session",    emoji: "🖍️", encouragement: "Watch slowly. The teacher will write and explain." },
  concept:     { label: "Concept Explanation",   emoji: "📖", encouragement: "Listen carefully and repeat with the teacher." },
  example1:    { label: "Example 1",             emoji: "✨", encouragement: "Watch the first example." },
  example2:    { label: "Example 2",             emoji: "🌟", encouragement: "One more example helps us understand." },
  guided:      { label: "Guided Practice",       emoji: "🤝", encouragement: "Let's do it together with hints." },
  independent: { label: "Independent Practice",  emoji: "🧠", encouragement: "Now you try it by yourself." },
  assignment:  { label: "Homework",              emoji: "📝", encouragement: "Small homework, like school." },
  test:        { label: "Quick Check",           emoji: "🏁", encouragement: "Show what you learned." },
  revision:    { label: "Revision",              emoji: "🎓", encouragement: "Let's remember the main points." },
};

type Stage = {
  id: string;
  lesson_id: string;
  stage_type: StageType;
  title: Record<string, string> | string | null;
  explanation: Record<string, string> | string | null;
  narration_en: string | null;
  narration_hi: string | null;
  narration_te: string | null;
  image_url: string | null;
  slides: { title?: string; body?: string; image?: string; narration?: string }[];
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
  const tts = useTts(lang, {
    rate: Math.min(prefs.speech_rate || 0.9, 0.88),
    pitch: prefs.speech_pitch,
    volume: prefs.speech_volume,
    voiceURI: prefs.preferred_voice_uri,
  });
  const [showCelebration, setShowCelebration] = useState(false);

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
    for (const p of progressQ.data ?? []) if (p.score != null) m[p.stage_type] = Number(p.score);
    return m;
  }, [progressQ.data]);

  const stages = useMemo(() => {
    const byType: Record<string, Stage> = {};
    for (const s of stagesQ.data ?? []) byType[s.stage_type] = s;
    return STAGE_ORDER.map((t) => byType[t]).filter(Boolean) as Stage[];
  }, [stagesQ.data]);

  const firstIncompleteIdx = useMemo(() => {
    for (let i = 0; i < stages.length; i++) if (!completedSet.has(stages[i].stage_type)) return i;
    return Math.max(0, stages.length - 1);
  }, [stages, completedSet]);

  const [activeIdx, setActiveIdx] = useState(firstIncompleteIdx);
  useEffect(() => { setActiveIdx(firstIncompleteIdx); }, [firstIncompleteIdx]);

  const stage = stages[activeIdx];
  const isStageUnlocked = (idx: number) => idx === 0 || completedSet.has(stages[idx - 1]?.stage_type);

  function isAllowed(idx: number) {
    const target = stages[idx];
    if (!target) return false;
    if (!isStageUnlocked(idx)) return false;
    if (target.stage_type === "test") {
      const assignScore = scoreByStage["assignment"] ?? -1;
      const assignStage = stages.find((s) => s.stage_type === "assignment");
      if (assignStage && assignScore < (assignStage.pass_threshold ?? 60)) return false;
    }
    return true;
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
  const narration = getStageNarration(stage, lang, tr);

  const handleAdvance = async (score: number | null) => {
    tts.stop();
    await completeStage.mutateAsync({ score });
    if (activeIdx + 1 < stages.length) {
      setActiveIdx(activeIdx + 1);
    } else {
      setShowCelebration(true);
      onAllComplete?.();
    }
  };

  if (showCelebration) {
    return <CelebrationCard onBack={() => setShowCelebration(false)} />;
  }

  return (
    <div className="space-y-4">
      <ol className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-1.5">
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
                  toast.info(s.stage_type === "test" ? "Complete homework with a passing score first." : "Please complete the previous step first.");
                  return;
                }
                setActiveIdx(i);
              }}
              className={`relative rounded-lg border px-2 py-2 text-[10px] sm:text-xs font-bold text-center min-w-0 min-h-[48px] ${
                isActive
                  ? "bg-primary text-primary-foreground border-primary"
                  : done
                    ? "bg-success/20 text-foreground border-success/40"
                    : unlocked
                      ? "bg-card border-border hover:border-primary/40"
                      : "bg-muted text-muted-foreground border-transparent"
              }`}
              title={STAGE_META[s.stage_type].label}
            >
              <span className="block leading-tight no-clip">{i + 1}. {STAGE_META[s.stage_type].label}</span>
              {done && <CheckCircle2 className="absolute -top-1 -right-1 h-4 w-4 text-success bg-background rounded-full" />}
              {!unlocked && <Lock className="absolute -top-1 -right-1 h-4 w-4 text-muted-foreground bg-background rounded-full p-0.5" />}
            </button>
          );
        })}
      </ol>

      <Card className="p-5 sm:p-6">
        <header className="flex flex-wrap items-start gap-4 mb-4">
          <img src={teacherAvatar} alt="Teacher" width={96} height={96} loading="lazy" className="h-24 w-24 sm:h-28 sm:w-28 rounded-2xl bg-accent shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold uppercase text-primary">Step {activeIdx + 1} of {stages.length} · {meta.emoji} {meta.label}</div>
            <h2 className="text-xl sm:text-3xl font-extrabold no-clip mt-1 font-indic" lang={lang}>{tr(stage.title) || meta.label}</h2>
            <p className="text-sm text-muted-foreground italic mt-0.5">{meta.encouragement}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="secondary">Teacher-led</Badge>
              <Badge variant="outline">Slow classroom pace</Badge>
              <Badge variant="outline">Voice + Visual</Badge>
            </div>
          </div>
        </header>

        <Progress value={Math.round(((activeIdx + 1) / stages.length) * 100)} className="mb-4" />

        <TeacherHelpPanel
          stage={stage}
          lang={lang}
          narration={narration}
          onSpeak={(text) => tts.speak(text, lang, { rate: 0.85 })}
          onShowBlackboard={() => {
            const boardIdx = stages.findIndex((s) => s.stage_type === "blackboard");
            if (boardIdx >= 0) setActiveIdx(boardIdx);
          }}
        />

        {stage.stage_type === "blackboard" ? (
          <Blackboard steps={coerceBlackboardSteps(stage.slides as any)} lang={lang} onComplete={() => handleAdvance(null)} />
        ) : (
          <StageBody stage={stage} lang={lang} narration={narration} />
        )}

        {stage.stage_type !== "blackboard" && prefs.voice_reader !== false && narration && (
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl bg-accent/40 p-3">
            <Button size="sm" variant="outline" onClick={() => tts.speak(narration, lang, { rate: 0.85 })}>
              <Volume2 className="h-4 w-4 mr-1" /> Teacher reads
            </Button>
            <Button size="sm" variant="outline" onClick={() => tts.speak(narration, lang, { rate: 0.85 })}>
              <RotateCcw className="h-4 w-4 mr-1" /> Replay
            </Button>
            <Button size="sm" variant="outline" onClick={tts.stop} disabled={!tts.speaking}>
              <Square className="h-4 w-4 mr-1" /> Stop
            </Button>
            <span className="text-xs text-muted-foreground ml-auto">{tts.supported ? "Female teacher voice" : "Voice unavailable on this device"}</span>
          </div>
        )}

        {stage.stage_type !== "blackboard" && (
          <StageActions stage={stage} completed={completedSet.has(stage.stage_type)} onComplete={handleAdvance} />
        )}
      </Card>
    </div>
  );
}

function getStageNarration(stage: Stage, lang: TtsLang, tr: (val: unknown) => string) {
  return (
    (lang === "hi" && stage.narration_hi) ||
    (lang === "te" && stage.narration_te) ||
    stage.narration_en ||
    tr(stage.explanation) ||
    tr(stage.title) ||
    ""
  );
}

function splitSentences(text: string) {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?।])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function TeacherHelpPanel({
  stage, lang, narration, onSpeak, onShowBlackboard,
}: {
  stage: Stage;
  lang: TtsLang;
  narration: string;
  onSpeak: (text: string) => void;
  onShowBlackboard: () => void;
}) {
  const explanationAgain = narration || "Let's learn this again slowly.";
  const anotherExample = stage.stage_type.includes("example")
    ? "Let's look at another example slowly. Count each object one by one."
    : "I will give another simple example. Use your fingers or objects near you and count with me.";
  return (
    <div className="mb-4 rounded-2xl border bg-card p-3">
      <div className="text-xs font-extrabold uppercase text-muted-foreground mb-2">Need help? Ask teacher</div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => onSpeak(explanationAgain)}><BookOpen className="h-4 w-4 mr-1" />Explain again</Button>
        <Button size="sm" variant="outline" onClick={onShowBlackboard} disabled={stage.stage_type === "blackboard"}><Presentation className="h-4 w-4 mr-1" />Show board</Button>
        <Button size="sm" variant="outline" onClick={() => onSpeak(anotherExample)}><Lightbulb className="h-4 w-4 mr-1" />Another example</Button>
        <Button size="sm" variant="outline" onClick={() => onSpeak(narration)}><Volume2 className="h-4 w-4 mr-1" />Read aloud</Button>
      </div>
    </div>
  );
}

function StageBody({ stage, lang, narration }: { stage: Stage; lang: TtsLang; narration: string }) {
  const { tr } = useI18n();
  const slides = stage.slides ?? [];
  const sentences = splitSentences(narration || tr(stage.explanation));
  const [currentSentence, setCurrentSentence] = useState(0);
  useEffect(() => setCurrentSentence(0), [stage.id]);

  return (
    <div className="space-y-4">
      {stage.image_url && <img src={stage.image_url} alt="" loading="lazy" className="rounded-xl max-h-72 object-contain mx-auto" />}
      <div className="rounded-2xl bg-muted/50 p-4 font-indic" lang={lang}>
        <div className="text-xs font-extrabold uppercase text-primary mb-2">Teacher says</div>
        {sentences.length > 0 ? (
          <div className="space-y-2 text-base sm:text-xl leading-relaxed">
            {sentences.map((s, i) => (
              <p key={i} className={`no-clip rounded-xl px-3 py-2 ${i === currentSentence ? "bg-primary/15 ring-2 ring-primary/30 font-extrabold" : "opacity-75"}`}>{s}</p>
            ))}
            <div className="flex flex-wrap gap-2 pt-2">
              <Button size="sm" variant="outline" onClick={() => setCurrentSentence((n) => Math.max(0, n - 1))} disabled={currentSentence === 0}>Previous sentence</Button>
              <Button size="sm" onClick={() => setCurrentSentence((n) => Math.min(sentences.length - 1, n + 1))} disabled={currentSentence >= sentences.length - 1}>Next sentence</Button>
            </div>
          </div>
        ) : (
          <p className="text-base sm:text-lg leading-relaxed no-clip">{tr(stage.explanation)}</p>
        )}
      </div>

      {slides.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {slides.map((s, i) => (
            <Card key={i} className="p-4 bg-muted/40 min-h-[140px]">
              {s.title && <div className="font-extrabold mb-1 no-clip text-lg">{s.title}</div>}
              {s.image && <img src={s.image} alt="" loading="lazy" className="my-2 max-h-32 mx-auto" />}
              {s.body && <p className="text-base no-clip font-indic" lang={lang}>{s.body}</p>}
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
        <Button onClick={() => onComplete(null)} className="gap-2 rounded-2xl">
          <ThumbsUp className="h-4 w-4" /> {completed ? "Continue" : "I understood"}
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
  const [thinking, setThinking] = useState(4);
  const questions = stage.questions ?? [];

  useEffect(() => {
    setThinking(4);
    const timer = setInterval(() => setThinking((n) => Math.max(0, n - 1)), 1000);
    return () => clearInterval(timer);
  }, [stage.id, idx]);

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
    const currentWasCorrect = feedback === "right";
    if (idx + 1 < questions.length) {
      setIdx(idx + 1);
      setPicked(null);
      setFeedback(null);
      setShowHint(false);
    } else {
      const finalCorrect = correct + (currentWasCorrect ? 0 : 0);
      onDone(Math.round((finalCorrect / questions.length) * 100));
    }
  };

  return (
    <div className="mt-5 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs text-muted-foreground">Question {idx + 1} of {questions.length}</div>
        {thinking > 0 && <Badge variant="secondary" className="gap-1"><Clock3 className="h-3.5 w-3.5" />Think time: {thinking}</Badge>}
      </div>

      <Card className="p-4 bg-accent/40">
        <p className="text-lg sm:text-2xl font-extrabold no-clip font-indic">{q.prompt}</p>
        {isGuided && <p className="text-sm text-muted-foreground mt-2">👩‍🏫 Let's answer together. Count slowly before choosing.</p>}
      </Card>

      <div className="grid sm:grid-cols-2 gap-2">
        {(q.options ?? []).map((opt, i) => (
          <button
            key={i}
            onClick={() => { setPicked(i); setFeedback(null); }}
            disabled={feedback === "right" || thinking > 0}
            className={`text-left rounded-xl border-2 px-4 py-4 text-lg font-bold transition no-clip ${
              picked === i ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"
            } ${thinking > 0 ? "opacity-70" : ""}`}
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

      {feedback === "right" && <p className="text-base text-success font-extrabold">👩‍🏫 {randomPraise()}</p>}
      {feedback === "wrong" && (
        <p className="text-base text-destructive font-extrabold">👩‍🏫 That's okay. {isGuided && q.hint ? q.hint : "Let's try once more."}</p>
      )}

      <div className="flex flex-wrap gap-2 justify-end">
        {feedback !== "right" && <Button onClick={check} disabled={picked == null || thinking > 0}>Check answer</Button>}
        {feedback === "right" && <Button onClick={next}>{idx + 1 < questions.length ? "Next question" : "Finish step"}</Button>}
      </div>
    </div>
  );
}

function randomPraise() {
  const options = ["Great job!", "Excellent!", "Well done!", "You are learning fast!", "Wonderful answer!"];
  return options[Math.floor(Math.random() * options.length)];
}

function CelebrationCard({ onBack }: { onBack: () => void }) {
  return (
    <Card className="p-8 text-center space-y-4 bg-gradient-to-br from-primary/10 to-accent/40">
      <div className="mx-auto h-20 w-20 rounded-full bg-primary/20 flex items-center justify-center">
        <PartyPopper className="h-10 w-10 text-primary" />
      </div>
      <h2 className="text-3xl font-extrabold no-clip">Great job! Lesson complete 🎉</h2>
      <p className="text-muted-foreground max-w-xl mx-auto">You listened to the teacher, watched the blackboard, practiced, and completed your work.</p>
      <div className="flex justify-center gap-2 flex-wrap">
        <Badge>⭐ Star earned</Badge>
        <Badge variant="secondary">🏆 Learning progress saved</Badge>
      </div>
      <Button onClick={onBack}>Review lesson</Button>
    </Card>
  );
}
