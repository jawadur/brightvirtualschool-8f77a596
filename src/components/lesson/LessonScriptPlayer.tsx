import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Pause, Play, RotateCcw, Square, Volume2 } from "lucide-react";
import { useTts, type TtsLang } from "@/hooks/use-tts";
import { useStudentPrefs } from "@/lib/student-prefs";
import { BlackboardStep, type ChalkPrimitive } from "@/components/lesson/Blackboard";
import { coerceLessonScript, pickLocalized, type LessonScriptStep } from "@/types/lesson-script";

type LessonScriptPlayerProps = {
  script: unknown;
  lang?: TtsLang;
  title?: string;
  onComplete?: () => void;
};

function formatSeconds(seconds: number) {
  const s = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

function stepSpeech(step: LessonScriptStep, lang: TtsLang) {
  if (step.type === "count" && step.values?.length) {
    return pickLocalized(step.text, lang, `Let us count together. ${step.values.join(", ")}.`);
  }
  if (step.type === "draw") {
    return pickLocalized(step.text, lang, pickLocalized(step.caption, lang, "Watch the board carefully."));
  }
  if (step.type === "pause") return pickLocalized(step.text, lang, "Think quietly for a moment.");
  return pickLocalized(step.text, lang, pickLocalized(step.caption, lang, ""));
}

function primitiveFromStep(step: LessonScriptStep): ChalkPrimitive[] {
  if (step.type !== "draw" && step.type !== "highlight") return [];
  if (Array.isArray(step.primitives)) return step.primitives;
  if (step.primitive) return [step.primitive];
  const text = pickLocalized(step.text, "en", pickLocalized(step.caption, "en", ""));
  if (!text) return [];
  return [{ type: "text", text, x: 90, y: 150, size: 44 }];
}

function buildVisibleBoardSteps(script: LessonScriptStep[], activeIndex: number): BlackboardStep[] {
  const primitives: ChalkPrimitive[] = [];
  for (let i = 0; i <= activeIndex; i++) {
    const step = script[i];
    if (!step) continue;
    if (step.type === "clear_board") primitives.length = 0;
    primitives.push(...primitiveFromStep(step));
    if (step.type === "count" && step.values?.length) {
      primitives.push({ type: "text", text: step.values.join("   "), x: 140, y: 500, size: 42, color: "#fde68a" });
    }
  }
  return [{ primitives }];
}

export function LessonScriptPlayer({ script: rawScript, lang = "en", title, onComplete }: LessonScriptPlayerProps) {
  const { prefs } = useStudentPrefs();
  const tts = useTts(lang, {
    rate: prefs.speech_rate ?? 0.85,
    pitch: prefs.speech_pitch ?? 1,
    volume: prefs.speech_volume ?? 1,
    voiceURI: prefs.preferred_voice_uri,
  });
  const script = useMemo(() => coerceLessonScript(rawScript), [rawScript]);
  const [idx, setIdx] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);
  const [answered, setAnswered] = useState<string | number | null>(null);
  const [feedback, setFeedback] = useState<"right" | "wrong" | null>(null);
  const [pauseRemaining, setPauseRemaining] = useState(0);

  const step = script[idx];
  const speech = step ? stepSpeech(step, lang) : "";
  const progress = script.length ? Math.round(((idx + 1) / script.length) * 100) : 0;
  const boardSteps = useMemo(() => buildVisibleBoardSteps(script, idx), [script, idx]);

  useEffect(() => {
    setAnswered(null);
    setFeedback(null);
    const seconds = step?.type === "pause" ? Math.max(1, step.durationSeconds ?? 5) : 0;
    setPauseRemaining(seconds);
    if (autoPlay && speech) tts.speak(speech, lang);
    return () => tts.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  useEffect(() => {
    if (pauseRemaining <= 0) return;
    const t = window.setTimeout(() => setPauseRemaining((v) => Math.max(0, v - 1)), 1000);
    return () => window.clearTimeout(t);
  }, [pauseRemaining]);

  useEffect(() => {
    if (!autoPlay || tts.speaking || tts.paused || !step) return;
    if (step.type === "question") return;
    if (step.type === "pause" && pauseRemaining > 0) return;
    const t = window.setTimeout(() => {
      if (idx + 1 < script.length) setIdx((v) => v + 1);
      else {
        setAutoPlay(false);
        onComplete?.();
      }
    }, step.type === "pause" ? 400 : 900);
    return () => window.clearTimeout(t);
  }, [autoPlay, idx, onComplete, pauseRemaining, script.length, step, tts.paused, tts.speaking]);

  if (!script.length) {
    return (
      <Card className="p-4 text-center text-muted-foreground">
        This teacher script is not ready yet.
      </Card>
    );
  }

  const next = () => {
    tts.stop();
    if (idx + 1 < script.length) setIdx(idx + 1);
    else onComplete?.();
  };

  const previous = () => {
    tts.stop();
    setIdx((v) => Math.max(0, v - 1));
  };

  const checkAnswer = () => {
    if (!step || step.type !== "question") return;
    const isRight = String(answered) === String(step.answer);
    setFeedback(isRight ? "right" : "wrong");
    const msg = isRight
      ? pickLocalized({ en: "Excellent!", hi: "बहुत अच्छा!", te: "చాలా బాగుంది!" }, lang)
      : pickLocalized(step.hint, lang, pickLocalized({ en: "That's okay. Try again.", hi: "कोई बात नहीं. फिर से कोशिश करो.", te: "పరవాలేదు. మళ్లీ ప్రయత్నించండి." }, lang));
    tts.speak(msg, lang);
  };

  const stepKindLabel = {
    speech: "Teacher says",
    pause: "Think time",
    draw: "Blackboard",
    count: "Count with me",
    question: "Teacher asks",
    praise: "Praise",
    highlight: "Look carefully",
    clear_board: "New board",
  }[step.type];

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border bg-gradient-to-br from-sky-50 via-white to-amber-50 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <div className="text-xs font-extrabold uppercase text-primary">Scripted teacher lesson</div>
          {title && <div className="text-xs text-muted-foreground">· {title}</div>}
          <div className="ml-auto text-xs font-bold text-muted-foreground">Step {idx + 1} of {script.length}</div>
        </div>
        <Progress value={progress} />
      </div>

      {(step.type === "draw" || step.type === "count" || step.type === "highlight" || boardSteps[0]?.primitives?.length > 0) && (
        <div className="rounded-3xl overflow-hidden">
          <MiniBoard steps={boardSteps} caption={pickLocalized(step.caption, lang, stepKindLabel)} />
        </div>
      )}

      <Card className="p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="text-4xl" aria-hidden="true">👩‍🏫</div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-extrabold uppercase text-primary mb-1">{stepKindLabel}</div>
            <p className="text-xl sm:text-2xl font-extrabold leading-relaxed no-clip font-indic" lang={lang}>
              {speech || pickLocalized(step.caption, lang, "Watch carefully.")}
            </p>
            {step.type === "count" && step.values?.length && (
              <div className="mt-4 flex flex-wrap gap-3">
                {step.values.map((v, i) => (
                  <span key={i} className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground text-xl font-extrabold">
                    {v}
                  </span>
                ))}
              </div>
            )}
            {step.type === "pause" && pauseRemaining > 0 && (
              <div className="mt-4 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 text-amber-900 font-bold">
                Think quietly: {formatSeconds(pauseRemaining)}
              </div>
            )}
            {step.type === "question" && (
              <div className="mt-4 space-y-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  {(step.options ?? []).map((opt) => (
                    <button
                      key={opt}
                      onClick={() => { setAnswered(opt); setFeedback(null); }}
                      className={`rounded-2xl border-2 px-4 py-3 text-left font-extrabold ${answered === opt ? "border-primary bg-primary/10" : "border-border bg-card"}`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
                {feedback === "right" && <p className="font-bold text-success">✅ Correct! Very good.</p>}
                {feedback === "wrong" && <p className="font-bold text-destructive">👩‍🏫 {pickLocalized(step.hint, lang, "Try again.")}</p>}
                <Button onClick={checkAnswer} disabled={answered == null || feedback === "right"}>Check answer</Button>
              </div>
            )}
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={() => tts.speak(speech, lang)} disabled={!speech}>
          <Volume2 className="h-4 w-4 mr-1" /> Listen
        </Button>
        <Button variant="outline" onClick={() => tts.speak(speech, lang)} disabled={!speech}>
          <RotateCcw className="h-4 w-4 mr-1" /> Replay
        </Button>
        <Button variant="outline" onClick={tts.pause} disabled={!tts.speaking || tts.paused}>
          <Pause className="h-4 w-4 mr-1" /> Pause
        </Button>
        <Button variant="outline" onClick={tts.stop} disabled={!tts.speaking}>
          <Square className="h-4 w-4 mr-1" /> Stop
        </Button>
        {!autoPlay ? (
          <Button onClick={() => { setAutoPlay(true); if (speech) tts.speak(speech, lang); }} className="ml-auto">
            <Play className="h-4 w-4 mr-1" /> Play teacher lesson
          </Button>
        ) : (
          <Button variant="secondary" onClick={() => { setAutoPlay(false); tts.stop(); }} className="ml-auto">
            Pause auto lesson
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 justify-end">
        <Button variant="outline" onClick={previous} disabled={idx === 0}>Previous</Button>
        <Button onClick={next} disabled={step.type === "pause" && pauseRemaining > 0}>
          {idx + 1 < script.length ? "Next" : "I understood ✓"}
        </Button>
      </div>
    </div>
  );
}

function MiniBoard({ steps, caption }: { steps: BlackboardStep[]; caption?: string }) {
  const primitives = steps[0]?.primitives ?? [];
  return (
    <div className="rounded-3xl shadow-pop overflow-hidden border-[6px] border-amber-900/80">
      <div className="bg-gradient-to-b from-emerald-950 to-emerald-900 p-3 sm:p-5">
        <svg viewBox="0 0 1000 600" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto rounded-xl bg-[radial-gradient(ellipse_at_center,#0f5132_0%,#0b3d27_70%,#072a1c_100%)]">
          <defs>
            <filter id="scriptChalk" x="-10%" y="-10%" width="120%" height="120%">
              <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="5" />
              <feDisplacementMap in="SourceGraphic" scale="2.1" />
            </filter>
            <marker id="scriptArrowhead" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
              <path d="M0,0 L0,6 L9,3 z" fill="#fef9c3" />
            </marker>
          </defs>
          <g filter="url(#scriptChalk)">
            {primitives.map((p, i) => renderPrimitive(p, i))}
          </g>
          <rect x="0" y="585" width="1000" height="15" fill="#7c4a1e" />
        </svg>
      </div>
      {caption && <div className="bg-emerald-950/90 text-emerald-50 px-4 py-2 text-sm sm:text-base font-bold no-clip">👩‍🏫 {caption}</div>}
    </div>
  );
}

function renderPrimitive(p: ChalkPrimitive, key: number) {
  const color = (p as any).color ?? "#fef9c3";
  switch (p.type) {
    case "text":
    case "equation":
      return (
        <text
          key={key}
          x={p.x}
          y={p.y}
          fill={color}
          fontSize={p.size ?? (p.type === "equation" ? 60 : 44)}
          fontWeight={800}
          className="font-indic"
          style={{ fontFamily: "'Caveat','Patrick Hand','Comic Sans MS','Noto Sans Telugu','Noto Sans Devanagari',cursive" }}
        >
          {p.text}
        </text>
      );
    case "shape":
      return <text key={key} x={p.x} y={p.y} fontSize={p.size ?? 60}>{p.emoji}</text>;
    case "underline":
      return <line key={key} x1={p.x} y1={p.y} x2={p.x + p.w} y2={p.y} stroke={color} strokeWidth={5} strokeLinecap="round" />;
    case "circle":
      return <circle key={key} cx={p.cx} cy={p.cy} r={p.r} fill="none" stroke={color} strokeWidth={5} />;
    case "line":
      return <line key={key} x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2} stroke={color} strokeWidth={5} strokeLinecap="round" />;
    case "arrow":
      return <line key={key} x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2} stroke={color} strokeWidth={5} strokeLinecap="round" markerEnd="url(#scriptArrowhead)" />;
    case "rect":
      return <rect key={key} x={p.x} y={p.y} width={p.w} height={p.h} fill="none" stroke={color} strokeWidth={5} rx={8} />;
    default:
      return null;
  }
}
