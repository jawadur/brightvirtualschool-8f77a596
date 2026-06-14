import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useStudents } from "@/lib/student-context";
import { fetchTodayRevision, recordRevisionAttempt, RevisionItemWithProgress, SubjectCode } from "@/lib/revision";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ReadAloud } from "@/components/app/ReadAloud";
import { Sparkles, CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import { TtsLang } from "@/hooks/use-tts";

export const Route = createFileRoute("/_authenticated/student/brush-up")({
  component: BrushUp,
});

const SUBJECT_META: Record<SubjectCode, { label: string; emoji: string; lang: TtsLang; color: string }> = {
  telugu: { label: "Telugu", emoji: "🌼", lang: "te", color: "#FDE68A" },
  hindi: { label: "Hindi", emoji: "🪷", lang: "hi", color: "#FCA5A5" },
  english: { label: "English", emoji: "📚", lang: "en", color: "#A7F3D0" },
  math: { label: "Maths", emoji: "🔢", lang: "en", color: "#BFDBFE" },
};

function BrushUp() {
  const { activeStudent } = useStudents();
  const qc = useQueryClient();
  const { data: groups = {} as Record<SubjectCode, RevisionItemWithProgress[]>, isLoading } = useQuery({
    queryKey: ["today-revision", activeStudent?.id],
    enabled: !!activeStudent,
    queryFn: () => fetchTodayRevision(activeStudent!.id, 5),
  });

  const subjects: SubjectCode[] = ["telugu", "hindi", "english", "math"];
  const totalItems = subjects.reduce((n, s) => n + (groups[s]?.length ?? 0), 0);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-hero p-6 shadow-pop">
        <div className="flex items-center gap-2 text-primary font-bold uppercase text-xs">
          <Sparkles className="h-4 w-4" /> Daily Brush-Up
        </div>
        <h1 className="text-3xl font-extrabold">Keep what you learned ✨</h1>
        <p className="mt-1 text-foreground/80 text-sm">
          About 10 minutes · {totalItems} quick items today. Practice before new lessons.
        </p>
      </section>

      {isLoading && <Card className="p-6 text-muted-foreground">Loading…</Card>}

      {!isLoading && totalItems === 0 && (
        <Card className="p-8 text-center">
          <div className="text-3xl">🎉</div>
          <div className="mt-2 font-extrabold">All caught up!</div>
          <p className="text-sm text-muted-foreground">No revision due right now. Come back tomorrow.</p>
        </Card>
      )}

      {subjects.map((subj) => {
        const items = groups[subj] ?? [];
        if (items.length === 0) return null;
        return (
          <SubjectBrushUp
            key={subj}
            subject={subj}
            items={items}
            studentId={activeStudent!.id}
            onAttempt={() => qc.invalidateQueries({ queryKey: ["today-revision", activeStudent?.id] })}
          />
        );
      })}
    </div>
  );
}

function SubjectBrushUp({
  subject, items, studentId, onAttempt,
}: { subject: SubjectCode; items: RevisionItemWithProgress[]; studentId: string; onAttempt: () => void }) {
  const meta = SUBJECT_META[subject];
  const [idx, setIdx] = useState(0);
  const [done, setDone] = useState<Set<string>>(new Set());
  const current = items[idx];

  const pct = Math.round((done.size / items.length) * 100);

  async function answer(correct: boolean) {
    if (!current) return;
    await recordRevisionAttempt(studentId, current.id, correct);
    setDone((s) => new Set(s).add(current.id));
    if (idx < items.length - 1) setIdx(idx + 1);
    else onAttempt();
  }

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-2xl flex items-center justify-center text-2xl" style={{ backgroundColor: meta.color + "66" }}>{meta.emoji}</div>
        <div className="flex-1">
          <div className="font-extrabold">{meta.label} Revision</div>
          <div className="text-xs text-muted-foreground">{done.size}/{items.length} done · {items.length} items today</div>
        </div>
        <ReadAloud text={renderItemText(current, subject)} lang={meta.lang} />
      </div>
      <Progress value={pct} />
      {current ? (
        <RevisionCard item={current} subject={subject} onAnswer={answer} />
      ) : (
        <div className="text-center text-success font-bold">✓ Section complete</div>
      )}
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Item {Math.min(idx + 1, items.length)} of {items.length}</span>
        <button className="underline" onClick={() => { setIdx(Math.min(idx + 1, items.length - 1)); }}>Skip <ArrowRight className="inline h-3 w-3" /></button>
      </div>
    </Card>
  );
}

function renderItemText(item: RevisionItemWithProgress | undefined, subject: SubjectCode): string {
  if (!item) return "";
  const v = item.value || {};
  if (subject === "telugu" || subject === "hindi") return v.char ?? v.word ?? "";
  if (subject === "english") {
    if (item.category === "phonics") return `${v.char}, ${v.sound}`;
    return v.word ?? "";
  }
  if (subject === "math") return v.prompt ?? "";
  return "";
}

function RevisionCard({ item, subject, onAnswer }: { item: RevisionItemWithProgress; subject: SubjectCode; onAnswer: (c: boolean) => void }) {
  const v = item.value || {};
  const meta = SUBJECT_META[subject];

  // Letter / sight-word style cards: tap "I knew it" or "Practice more"
  if (subject === "telugu" || subject === "hindi" || (subject === "english" && item.category !== "sight_word" ? item.category === "phonics" : item.category === "sight_word")) {
    const display = v.char ?? v.word ?? "";
    const hint = v.translit ?? v.sound ?? "";
    return (
      <div className="text-center py-6">
        <div className="text-7xl sm:text-8xl font-extrabold" lang={meta.lang}>{display}</div>
        {hint && <div className="mt-2 text-muted-foreground">{hint}</div>}
        <div className="mt-6 flex justify-center gap-3">
          <Button variant="outline" className="rounded-2xl gap-1" onClick={() => onAnswer(false)}>
            <XCircle className="h-4 w-4" /> Practice more
          </Button>
          <Button className="rounded-2xl gap-1" onClick={() => onAnswer(true)}>
            <CheckCircle2 className="h-4 w-4" /> I knew it
          </Button>
        </div>
      </div>
    );
  }

  // Math (or any) MCQ style
  const options: string[] = v.options ?? [];
  const correct: string = v.answer ?? "";
  return (
    <MCQ prompt={v.prompt ?? ""} options={options} answer={correct} onAnswer={onAnswer} lang={meta.lang} />
  );
}

function MCQ({ prompt, options, answer, onAnswer, lang }: { prompt: string; options: string[]; answer: string; onAnswer: (c: boolean) => void; lang: TtsLang }) {
  const [picked, setPicked] = useState<string | null>(null);
  const correct = picked !== null && picked === answer;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2">
        <div className="flex-1 text-lg font-bold">{prompt}</div>
        <ReadAloud text={prompt} lang={lang} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {options.map((opt) => {
          const isPicked = picked === opt;
          const state = picked === null ? "" : opt === answer ? "border-success bg-success/10" : isPicked ? "border-destructive bg-destructive/10" : "opacity-60";
          return (
            <button
              key={opt}
              disabled={picked !== null}
              onClick={() => setPicked(opt)}
              className={`p-3 rounded-2xl border-2 font-bold transition ${state || "border-primary/30 hover:bg-primary/10"}`}
            >
              {opt}
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <div className="text-center">
          <Button className="rounded-2xl" onClick={() => { onAnswer(correct); setPicked(null); }}>
            {correct ? "✓ Next" : "Got it — Next"}
          </Button>
        </div>
      )}
    </div>
  );
}