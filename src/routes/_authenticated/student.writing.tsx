import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useStudents } from "@/lib/student-context";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ReadAloud } from "@/components/app/ReadAloud";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PencilLine, RotateCcw, CheckCircle2, Trophy } from "lucide-react";
import type { TtsLang } from "@/hooks/use-tts";

export const Route = createFileRoute("/_authenticated/student/writing")({
  component: WritingPracticePage,
});

type Script = "english" | "telugu" | "hindi" | "number";

const SETS: Record<Script, { glyphs: string[]; lang: TtsLang; label: string; flag: string }> = {
  english: { glyphs: "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""), lang: "en", label: "English Letters", flag: "🔤" },
  number: { glyphs: "0123456789".split(""), lang: "en", label: "Numbers", flag: "🔢" },
  telugu: { glyphs: "అఆఇఈఉఊఎఏఐఒఓఔఅంఅః".split(""), lang: "te", label: "Telugu Letters", flag: "🌼" },
  hindi: { glyphs: "अआइईउऊएऐओऔअंअः".split(""), lang: "hi", label: "Hindi Letters", flag: "🪷" },
};

function WritingPracticePage() {
  const { activeStudent } = useStudents();
  const qc = useQueryClient();
  const [script, setScript] = useState<Script>("english");
  const [index, setIndex] = useState(0);
  const set = SETS[script];
  const glyph = set.glyphs[index];

  const completedQ = useQuery({
    queryKey: ["writing-completed", activeStudent?.id],
    enabled: !!activeStudent,
    queryFn: async () => {
      const { data } = await supabase
        .from("writing_practice_completions")
        .select("script, glyph, completed_at")
        .eq("student_profile_id", activeStudent!.id);
      return data ?? [];
    },
  });
  const completedSet = new Set((completedQ.data ?? []).map((r) => `${r.script}:${r.glyph}`));

  const save = useMutation({
    mutationFn: async (strokes: number) => {
      if (!activeStudent) return;
      await supabase.from("writing_practice_completions").insert({
        student_profile_id: activeStudent.id,
        script,
        glyph,
        strokes,
        accuracy: Math.min(100, 50 + strokes * 5),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["writing-completed"] }),
  });

  function next() { setIndex((i) => (i + 1) % set.glyphs.length); }

  return (
    <div className="space-y-4">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold flex items-center gap-2"><PencilLine className="h-6 w-6 text-primary" /> Writing Practice</h1>
          <p className="text-sm text-muted-foreground">Trace the letter with your finger or mouse.</p>
        </div>
        <Trophy className="h-6 w-6 text-yellow-500 shrink-0" />
      </header>

      <Tabs value={script} onValueChange={(v) => { setScript(v as Script); setIndex(0); }}>
        <TabsList className="grid grid-cols-4 w-full">
          {(Object.keys(SETS) as Script[]).map((s) => (
            <TabsTrigger key={s} value={s} className="text-xs sm:text-sm">{SETS[s].flag} <span className="hidden sm:inline ml-1">{SETS[s].label}</span></TabsTrigger>
          ))}
        </TabsList>
        {(Object.keys(SETS) as Script[]).map((s) => (
          <TabsContent key={s} value={s} className="space-y-3">
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3 gap-3">
                <div className="font-bold">{set.label}</div>
                <ReadAloud text={glyph} lang={set.lang} variant="controls" label={`Hear "${glyph}"`} />
              </div>
              <TraceCanvas glyph={glyph} onComplete={(strokes) => save.mutate(strokes)} key={glyph + script} />
              <div className="flex justify-between items-center mt-3">
                <Button variant="ghost" onClick={() => setIndex((i) => (i - 1 + set.glyphs.length) % set.glyphs.length)}>← Prev</Button>
                <span className="text-sm text-muted-foreground">{index + 1} / {set.glyphs.length}</span>
                <Button onClick={next} className="rounded-2xl"><CheckCircle2 className="h-4 w-4 mr-1" />Next</Button>
              </div>
            </Card>

            <Card className="p-3">
              <div className="text-xs font-bold mb-2 text-muted-foreground">Your progress</div>
              <div className="flex flex-wrap gap-1.5">
                {set.glyphs.map((g, i) => {
                  const done = completedSet.has(`${script}:${g}`);
                  return (
                    <button
                      key={g}
                      onClick={() => setIndex(i)}
                      className={`h-10 w-10 rounded-xl text-xl font-bold border-2 transition ${
                        i === index ? "border-primary bg-primary/10" : done ? "border-success/40 bg-success/10" : "border-border bg-card"
                      }`}
                    >{g}</button>
                  );
                })}
              </div>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function TraceCanvas({ glyph, onComplete }: { glyph: string; onComplete: (strokes: number) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [strokes, setStrokes] = useState(0);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = c.clientWidth, h = c.clientHeight;
    c.width = w * dpr; c.height = h * dpr;
    ctx.scale(dpr, dpr);
    redraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [glyph]);

  function redraw() {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    const w = c.clientWidth, h = c.clientHeight;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, w, h);
    // dashed guides
    ctx.strokeStyle = "#cbd5e1"; ctx.setLineDash([6, 6]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h); ctx.stroke();
    ctx.setLineDash([]);
    // ghost glyph
    ctx.fillStyle = "rgba(99,102,241,0.18)";
    ctx.font = `${Math.floor(h * 0.85)}px "Noto Sans Telugu","Noto Sans Devanagari",system-ui,sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(glyph, w / 2, h / 2);
    // pen
    ctx.strokeStyle = "#4f46e5"; ctx.lineWidth = 6; ctx.lineCap = "round"; ctx.lineJoin = "round";
  }

  function reset() { setStrokes(0); setSaved(false); redraw(); }

  function getPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const c = ref.current!; const r = c.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function down(e: React.PointerEvent<HTMLCanvasElement>) {
    drawing.current = true;
    const ctx = ref.current!.getContext("2d")!;
    const { x, y } = getPos(e);
    ctx.beginPath(); ctx.moveTo(x, y);
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = ref.current!.getContext("2d")!;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y); ctx.stroke();
  }
  function up() {
    if (!drawing.current) return;
    drawing.current = false;
    setStrokes((s) => s + 1);
  }

  function markDone() {
    if (saved) return;
    onComplete(Math.max(1, strokes));
    setSaved(true);
  }

  return (
    <div>
      <canvas
        ref={ref}
        className="w-full h-64 rounded-2xl border-2 border-border touch-none bg-slate-50"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
      />
      <div className="flex justify-between items-center mt-2">
        <span className="text-xs text-muted-foreground">{strokes} stroke{strokes === 1 ? "" : "s"}</span>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={reset}><RotateCcw className="h-4 w-4 mr-1" />Clear</Button>
          <Button size="sm" onClick={markDone} disabled={saved || strokes === 0} className="rounded-2xl">
            {saved ? "Saved ✓" : "I traced it!"}
          </Button>
        </div>
      </div>
    </div>
  );
}