import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mic, Square, Star, Loader2, RotateCcw } from "lucide-react";
import { readingCheck } from "@/lib/ai.functions";

const PASSAGES = [
  { id: 1, text: "The cat sat on the mat. The bat is fat. I see a red hat." },
  { id: 2, text: "Sun is up. The bird sings. A pup runs in the park." },
  { id: 3, text: "I have a big red ball. I can run and jump. School is fun!" },
];

// Minimal typing for the Web Speech API
type SR = {
  start: () => void;
  stop: () => void;
  abort: () => void;
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function ReadingCheckPage() {
  const check = useServerFn(readingCheck);
  const [pIdx, setPIdx] = useState(0);
  const passage = PASSAGES[pIdx];
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [supported, setSupported] = useState(true);
  const recRef = useRef<SR | null>(null);

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) { setSupported(false); return; }
    const r = new Ctor();
    r.continuous = true;
    r.interimResults = true;
    r.lang = "en-US";
    r.onresult = (e) => {
      let t = "";
      for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript + " ";
      setTranscript(t.trim());
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    recRef.current = r;
    return () => { try { r.abort(); } catch { /* noop */ } };
  }, []);

  const mut = useMutation({
    mutationFn: () => check({ data: { passage: passage.text, spoken: transcript, language: "en" } }),
  });

  function toggle() {
    const r = recRef.current; if (!r) return;
    if (listening) { r.stop(); setListening(false); }
    else { setTranscript(""); mut.reset(); r.start(); setListening(true); }
  }

  function nextPassage() {
    setPIdx((i) => (i + 1) % PASSAGES.length);
    setTranscript(""); mut.reset();
  }

  const result = mut.data;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-primary/10 p-3"><Mic className="h-6 w-6 text-primary" /></div>
        <div>
          <h1 className="text-2xl font-extrabold">Reading Check</h1>
          <p className="text-sm text-muted-foreground">Read aloud and earn stars! 🌟</p>
        </div>
      </div>

      <Card className="p-6">
        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Read this</p>
        <p className="text-2xl font-bold leading-relaxed">{passage.text}</p>
      </Card>

      {!supported ? (
        <Card className="p-4 text-sm">Your browser doesn't support voice. Try Chrome or Edge on a computer.</Card>
      ) : (
        <div className="flex gap-2">
          <Button size="lg" onClick={toggle} variant={listening ? "destructive" : "default"} className="flex-1">
            {listening ? <><Square className="h-4 w-4 mr-2" /> Stop</> : <><Mic className="h-4 w-4 mr-2" /> Start Reading</>}
          </Button>
          <Button size="lg" variant="outline" onClick={nextPassage}><RotateCcw className="h-4 w-4 mr-2" />New</Button>
        </div>
      )}

      {transcript && (
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">You said</p>
          <p className="text-base">{transcript}</p>
          <Button className="mt-3" disabled={mut.isPending || listening} onClick={() => mut.mutate()}>
            {mut.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Checking…</> : "Check my reading"}
          </Button>
        </Card>
      )}

      {result && (
        <Card className="p-6 text-center">
          <div className="flex justify-center gap-1 mb-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Star key={i} className={`h-8 w-8 ${i < result.stars ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`} />
            ))}
          </div>
          <p className="text-3xl font-extrabold">{result.score}%</p>
          <p className="mt-2">{result.feedback}</p>
          {result.missed.length > 0 && (
            <p className="mt-3 text-sm text-muted-foreground">Practice: {result.missed.join(", ")}</p>
          )}
        </Card>
      )}

      {mut.error && <Card className="p-3 text-sm text-destructive">{(mut.error as Error).message}</Card>}
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/student/reading")({
  component: ReadingCheckPage,
});