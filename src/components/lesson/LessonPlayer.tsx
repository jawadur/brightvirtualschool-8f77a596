import { useState, useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { ReadAloud } from "@/components/app/ReadAloud";
import { useStudentPrefs } from "@/lib/student-prefs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { CheckCircle2, XCircle, Coins } from "lucide-react";
import type { LessonStep } from "@/lib/data";

export function LessonPlayer({
  steps,
  onFinished,
  lang = "en",
  lessonId,
}: {
  steps: LessonStep[];
  onFinished: (result: { score: number; coinsEarned: number }) => void;
  lang?: "en" | "hi" | "te";
  lessonId?: string;
}) {
  const { t, tr } = useI18n();
  const { prefs } = useStudentPrefs();
  const [idx, setIdx] = useState(0);
  const [coins, setCoins] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [interactiveCount, setInteractiveCount] = useState(
    (steps ?? []).filter((s) => s && ["multiple_choice", "match_pairs", "fill_blank"].includes((s as any).type)).length || 1,
  );
  const [feedback, setFeedback] = useState<null | "correct" | "wrong">(null);
  const [canAdvance, setCanAdvance] = useState(false);
  // form state
  const [selected, setSelected] = useState<number | null>(null);
  const [text, setText] = useState("");
  const [matches, setMatches] = useState<Record<number, number>>({});

  const safeSteps = Array.isArray(steps) ? steps.filter((s) => s && (s as any).type) : [];
  const step = safeSteps[idx];
  const pct = safeSteps.length ? Math.round(((idx + 1) / safeSteps.length) * 100) : 0;

  const readableText = useMemo(() => (step ? extractReadableText(step, tr) : ""), [step, tr]);

  if (!step) {
    console.warn("[LessonPlayer] No content available", { lessonId, stepIndex: idx, rawSteps: steps });
    return (
      <Card className="p-8 text-center">
        <p className="text-lg font-bold">No content available for this stage</p>
        <p className="mt-2 text-sm text-muted-foreground">This lesson is being prepared. Please try another lesson or come back soon.</p>
        <Button className="mt-4" onClick={() => onFinished({ score: 0, coinsEarned: 0 })}>Back</Button>
      </Card>
    );
  }

  const reset = () => {
    setFeedback(null); setCanAdvance(false); setSelected(null); setText(""); setMatches({});
  };

  const next = () => {
    if (idx + 1 >= safeSteps.length) {
      const score = Math.round((correctCount / Math.max(1, interactiveCount)) * 100);
      onFinished({ score, coinsEarned: coins });
      return;
    }
    setIdx(idx + 1);
    reset();
  };

  const handleCheck = () => {
    if (step.type === "multiple_choice") {
      const ok = selected === step.answer;
      setFeedback(ok ? "correct" : "wrong");
      if (ok) {
        setCorrectCount((c) => c + 1);
        if (step.coins) setCoins((c) => c + step.coins!);
        setCanAdvance(true);
      }
    } else if (step.type === "fill_blank") {
      const ok = text.trim().toUpperCase() === step.answer.trim().toUpperCase();
      setFeedback(ok ? "correct" : "wrong");
      if (ok) {
        setCorrectCount((c) => c + 1);
        const reward = step.coins ?? 0;
        if (reward) setCoins((c) => c + reward);
        setCanAdvance(true);
      }
    } else if (step.type === "match_pairs") {
      const ok = step.pairs.every((_, i) => matches[i] === i);
      setFeedback(ok ? "correct" : "wrong");
      if (ok) {
        setCorrectCount((c) => c + 1);
        const reward = step.coins ?? 0;
        if (reward) setCoins((c) => c + reward);
        setCanAdvance(true);
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Progress value={pct} className="flex-1" />
        <div className="flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-sm font-bold">
          <Coins className="h-4 w-4 text-coin" /> {coins}
        </div>
      </div>

      <Card className="p-6 min-h-[280px]">
        {readableText && (
          <div className="flex justify-end mb-2">
            <ReadAloud
              text={readableText}
              lang={lang}
              variant="controls"
              label="🔊 Read Aloud"
              autoStart={idx === 0 && prefs.auto_read_lesson}
            />
          </div>
        )}
        {step.type === "introduction" && (
          <div className="text-center py-6">
            <div className="text-6xl mb-4">👋</div>
            <p className="text-xl font-bold">{tr(step.text)}</p>
            <Button className="mt-6" onClick={() => { setCanAdvance(true); next(); }}>{t("next")}</Button>
          </div>
        )}
        {step.type === "teacher_explanation" && (
          <div className="text-center py-6">
            <div className="text-6xl mb-4">👩‍🏫</div>
            <p className="text-lg">{tr(step.text)}</p>
            <Button className="mt-6" onClick={() => { setCanAdvance(true); next(); }}>{t("next")}</Button>
          </div>
        )}
        {step.type === "multiple_choice" && (
          <div>
            <p className="text-lg font-bold mb-4">{tr(step.question)}</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {step.options.map((opt, i) => (
                <button
                  key={i}
                  disabled={feedback === "correct"}
                  onClick={() => setSelected(i)}
                  className={`rounded-2xl border-2 p-4 text-left font-bold transition ${
                    selected === i ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"
                  }`}
                >
                  {tr(opt)}
                </button>
              ))}
            </div>
            <ActionRow feedback={feedback} canAdvance={canAdvance} disabled={selected == null} onCheck={handleCheck} onNext={next} />
          </div>
        )}
        {step.type === "fill_blank" && (
          <div>
            <p className="text-lg font-bold mb-4">{tr(step.question)}</p>
            <Input value={text} onChange={(e) => setText(e.target.value)} className="text-center text-2xl font-bold h-14" maxLength={20} />
            <ActionRow feedback={feedback} canAdvance={canAdvance} disabled={!text} onCheck={handleCheck} onNext={next} />
          </div>
        )}
        {step.type === "match_pairs" && (
          <MatchPairs step={step} matches={matches} setMatches={setMatches} feedback={feedback} canAdvance={canAdvance} onCheck={handleCheck} onNext={next} />
        )}
        {step.type === "tracing_activity" && (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground">{tr(step.instructions)}</p>
            <div className="my-6 text-[160px] leading-none font-extrabold text-primary/30 select-none">
              {step.letter}
            </div>
            <Button onClick={() => { setCorrectCount((c) => c + 1); next(); }}>{t("done")}</Button>
          </div>
        )}
        {step.type === "drag_drop" && (
          <DragDrop step={step} matches={matches} setMatches={setMatches} feedback={feedback} canAdvance={canAdvance}
            onCheck={() => {
              const ok = step.mapping.every((targetIdx, itemIdx) => matches[itemIdx] === targetIdx);
              setFeedback(ok ? "correct" : "wrong");
              if (ok) {
                setCorrectCount((c) => c + 1);
                if (step.coins) setCoins((c) => c + step.coins!);
                setCanAdvance(true);
              }
            }}
            onNext={next}
          />
        )}
        {step.type === "picture_question" && (
          <div>
            <img src={step.image_url} alt="" className="rounded-2xl mx-auto max-h-56 object-contain mb-4" />
            <p className="text-lg font-bold mb-4">{tr(step.question)}</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {step.options.map((opt, i) => (
                <button
                  key={i}
                  disabled={feedback === "correct"}
                  onClick={() => setSelected(i)}
                  className={`rounded-2xl border-2 p-4 text-left font-bold transition ${
                    selected === i ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"
                  }`}
                >
                  {tr(opt)}
                </button>
              ))}
            </div>
            <ActionRow feedback={feedback} canAdvance={canAdvance} disabled={selected == null}
              onCheck={() => {
                const ok = selected === step.answer;
                setFeedback(ok ? "correct" : "wrong");
                if (ok) {
                  setCorrectCount((c) => c + 1);
                  if (step.coins) setCoins((c) => c + step.coins!);
                  setCanAdvance(true);
                }
              }}
              onNext={next} />
          </div>
        )}
        {step.type === "audio_placeholder" && (
          <div className="text-center py-6">
            <div className="text-6xl mb-4">🔊</div>
            <p className="text-sm text-muted-foreground">{tr(step.instructions)}</p>
            <p className="mt-3 inline-block rounded-full bg-accent px-3 py-1 text-xs font-bold">Audio activity — coming soon</p>
            <div className="mt-6"><Button onClick={() => { setCanAdvance(true); next(); }}>{t("next")}</Button></div>
          </div>
        )}
        {step.type === "speaking_placeholder" && (
          <div className="text-center py-6">
            <div className="text-6xl mb-4">🎤</div>
            <p className="text-lg font-bold">{tr(step.prompt)}</p>
            <p className="mt-3 inline-block rounded-full bg-accent px-3 py-1 text-xs font-bold">Speaking activity — coming soon</p>
            <div className="mt-6"><Button onClick={() => { setCanAdvance(true); next(); }}>{t("next")}</Button></div>
          </div>
        )}
      </Card>
    </div>
  );
}

function DragDrop({
  step, matches, setMatches, feedback, canAdvance, onCheck, onNext,
}: {
  step: Extract<LessonStep, { type: "drag_drop" }>;
  matches: Record<number, number>;
  setMatches: (m: Record<number, number>) => void;
  feedback: null | "correct" | "wrong";
  canAdvance: boolean;
  onCheck: () => void;
  onNext: () => void;
}) {
  const { tr } = useI18n();
  return (
    <div>
      <p className="text-lg font-bold mb-4">{tr(step.question)}</p>
      <div className="space-y-3">
        {step.items.map((it, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="flex-1 rounded-2xl bg-accent px-4 py-3 font-bold">{tr(it)}</div>
            <span className="text-muted-foreground">→</span>
            <select
              value={matches[i] ?? ""}
              onChange={(e) => setMatches({ ...matches, [i]: Number(e.target.value) })}
              className="flex-1 rounded-2xl border-2 border-border bg-card px-4 py-3 font-bold"
            >
              <option value="">Drop here…</option>
              {step.targets.map((t, idx) => <option key={idx} value={idx}>{tr(t)}</option>)}
            </select>
          </div>
        ))}
      </div>
      <ActionRow feedback={feedback} canAdvance={canAdvance} disabled={Object.keys(matches).length !== step.items.length} onCheck={onCheck} onNext={onNext} />
    </div>
  );
}

function ActionRow({
  feedback, canAdvance, disabled, onCheck, onNext,
}: { feedback: null | "correct" | "wrong"; canAdvance: boolean; disabled: boolean; onCheck: () => void; onNext: () => void }) {
  const { t } = useI18n();
  return (
    <div className="mt-6 flex items-center justify-between gap-3">
      {feedback === "correct" && <Badge className="bg-success text-white"><CheckCircle2 className="h-4 w-4 mr-1" />{t("correct")}</Badge>}
      {feedback === "wrong" && <Badge className="bg-destructive text-white"><XCircle className="h-4 w-4 mr-1" />{t("try_again")}</Badge>}
      <div className="flex-1" />
      {!canAdvance ? (
        <Button onClick={onCheck} disabled={disabled}>{t("check")}</Button>
      ) : (
        <Button onClick={onNext}>{t("next")}</Button>
      )}
    </div>
  );
}

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-bold ${className ?? ""}`}>{children}</span>;
}

function extractReadableText(step: LessonStep, tr: (v: any) => string): string {
  switch (step.type) {
    case "introduction":
    case "teacher_explanation":
      return tr((step as any).text);
    case "multiple_choice":
    case "fill_blank":
    case "picture_question": {
      const parts: string[] = [tr((step as any).question)];
      const opts = (step as any).options as any[] | undefined;
      if (opts?.length) parts.push("Options: " + opts.map((o) => tr(o)).join(", "));
      return parts.join(". ");
    }
    case "match_pairs":
      return "Match the pairs. " + (step as any).pairs.map((p: any) => `${tr(p.left)} with ${tr(p.right)}`).join(", ");
    case "drag_drop":
      return tr((step as any).question);
    case "audio_placeholder":
    case "speaking_placeholder":
      return tr((step as any).instructions ?? (step as any).prompt);
    case "tracing_activity":
      return `Trace the letter ${(step as any).letter}. ${tr((step as any).instructions)}`;
    default:
      return "";
  }
}

function MatchPairs({
  step, matches, setMatches, feedback, canAdvance, onCheck, onNext,
}: {
  step: Extract<LessonStep, { type: "match_pairs" }>;
  matches: Record<number, number>;
  setMatches: (m: Record<number, number>) => void;
  feedback: null | "correct" | "wrong";
  canAdvance: boolean;
  onCheck: () => void;
  onNext: () => void;
}) {
  const { tr } = useI18n();
  const rightOptions = step.pairs.map((p, i) => ({ ...p.right, idx: i }));
  return (
    <div>
      <p className="text-lg font-bold mb-4">Match the pairs</p>
      <div className="space-y-3">
        {step.pairs.map((p, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="flex-1 rounded-2xl bg-accent px-4 py-3 font-bold">{tr(p.left)}</div>
            <select
              value={matches[i] ?? ""}
              onChange={(e) => setMatches({ ...matches, [i]: Number(e.target.value) })}
              className="flex-1 rounded-2xl border-2 border-border bg-card px-4 py-3 font-bold"
            >
              <option value="">Choose…</option>
              {rightOptions.map((r) => <option key={r.idx} value={r.idx}>{tr(r)}</option>)}
            </select>
          </div>
        ))}
      </div>
      <ActionRow feedback={feedback} canAdvance={canAdvance} disabled={Object.keys(matches).length !== step.pairs.length} onCheck={onCheck} onNext={onNext} />
    </div>
  );
}