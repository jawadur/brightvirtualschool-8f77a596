import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useStudents } from "@/lib/student-context";
import { supabase } from "@/integrations/supabase/client";
import { useStudentPrefs } from "@/lib/student-prefs";
import { useTts, TtsLang } from "@/hooks/use-tts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Play, Square, CheckCircle2 } from "lucide-react";
import { bumpStreak } from "@/lib/streaks";
import { logJourney } from "@/lib/journey";

export const Route = createFileRoute("/_authenticated/student/read-along")({
  component: ReadAlongPage,
});

const PASSAGES: Record<TtsLang, { id: string; title: string; text: string }[]> = {
  en: [
    { id: "en-1", title: "My Cat", text: "I have a cat. The cat is black. The cat can run fast. I love my cat." },
    { id: "en-2", title: "At School", text: "I go to school. My teacher is kind. We sing songs and read books." },
    { id: "en-3", title: "The Sun", text: "The sun is big. The sun is hot. The sun helps plants grow." },
  ],
  hi: [
    { id: "hi-1", title: "मेरा परिवार", text: "मेरे परिवार में चार लोग हैं। मम्मी, पापा, भाई और मैं। हम सब साथ खाना खाते हैं।" },
    { id: "hi-2", title: "मेरा स्कूल", text: "मेरा स्कूल बहुत अच्छा है। मेरी टीचर बहुत प्यारी हैं। मुझे पढ़ना अच्छा लगता है।" },
  ],
  te: [
    { id: "te-1", title: "నా కుటుంబం", text: "మా ఇంట్లో అమ్మ, నాన్న, అన్నయ్య మరియు నేను ఉన్నాము. మేము కలిసి ఆడుకుంటాము." },
    { id: "te-2", title: "నా బడి", text: "నా బడి చాలా బాగుంది. టీచర్ మంచిగా చెబుతుంది. నేను రోజూ బడికి వెళ్తాను." },
  ],
};

function ReadAlongPage() {
  const { activeStudent } = useStudents();
  const { prefs } = useStudentPrefs();
  const [lang, setLang] = useState<TtsLang>("en");
  const [pIdx, setPIdx] = useState(0);
  const passage = PASSAGES[lang][pIdx];
  const words = passage.text.split(/\s+/);
  const { speak, stop, speaking, supported } = useTts(lang, {
    rate: prefs.speech_rate,
    pitch: prefs.speech_pitch,
    volume: prefs.speech_volume,
    voiceURI: prefs.preferred_voice_uri,
  });
  const [highlight, setHighlight] = useState(-1);
  const timerRef = useRef<number | null>(null);
  const [completed, setCompleted] = useState(false);
  const startRef = useRef<number>(0);

  function play() {
    setHighlight(0);
    setCompleted(false);
    startRef.current = Date.now();
    speak(passage.text, lang);
    // approximate karaoke timing: 380ms per word adjusted by rate
    const stepMs = 380 / Math.max(0.6, prefs.speech_rate);
    let i = 0;
    timerRef.current = window.setInterval(() => {
      i += 1;
      if (i >= words.length) {
        clearTimer();
        setHighlight(words.length - 1);
        finish();
        return;
      }
      setHighlight(i);
    }, stepMs);
  }
  function clearTimer() { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } }
  function halt() { clearTimer(); stop(); setHighlight(-1); }
  useEffect(() => () => clearTimer(), []);
  useEffect(() => { halt(); /* eslint-disable-next-line */ }, [lang, pIdx]);

  async function finish() {
    if (!activeStudent || completed) return;
    setCompleted(true);
    const duration = Math.round((Date.now() - startRef.current) / 1000);
    await supabase.from("reading_sessions").insert({
      student_profile_id: activeStudent.id,
      passage_id: passage.id,
      language: lang,
      words_read: words.length,
      duration_sec: duration,
    });
    await bumpStreak(activeStudent.id, "reading_streak");
    await logJourney({
      student_profile_id: activeStudent.id,
      event_type: "reading_completed",
      title: `Read "${passage.title}"`,
      description: `${words.length} words in ${duration}s`,
      icon: "📖",
    });
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-2">
        <BookOpen className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-extrabold">Read Along</h1>
      </header>

      <Tabs value={lang} onValueChange={(v) => { setLang(v as TtsLang); setPIdx(0); }}>
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="en">English</TabsTrigger>
          <TabsTrigger value="hi">हिन्दी</TabsTrigger>
          <TabsTrigger value="te">తెలుగు</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex gap-2 flex-wrap">
        {PASSAGES[lang].map((p, i) => (
          <Button key={p.id} size="sm" variant={i === pIdx ? "default" : "outline"} className="rounded-2xl" onClick={() => setPIdx(i)}>
            {p.title}
          </Button>
        ))}
      </div>

      <Card className="p-6">
        <p className="text-2xl leading-relaxed font-bold" style={{ fontFamily: lang === "te" ? '"Noto Sans Telugu", system-ui' : lang === "hi" ? '"Noto Sans Devanagari", system-ui' : undefined }}>
          {words.map((w, i) => (
            <span
              key={i}
              className={`transition-colors px-0.5 rounded ${i === highlight ? "bg-primary text-primary-foreground" : i < highlight ? "text-muted-foreground" : ""}`}
            >
              {w}{" "}
            </span>
          ))}
        </p>
      </Card>

      {!supported ? (
        <Card className="p-3 text-sm">Voice not supported on this browser.</Card>
      ) : (
        <div className="flex gap-2">
          {!speaking ? (
            <Button onClick={play} className="rounded-2xl gap-2"><Play className="h-4 w-4" /> Start Reading</Button>
          ) : (
            <Button onClick={halt} variant="destructive" className="rounded-2xl gap-2"><Square className="h-4 w-4" /> Stop</Button>
          )}
          {completed && (
            <span className="inline-flex items-center gap-1 text-success font-bold"><CheckCircle2 className="h-5 w-5" /> Great reading!</span>
          )}
        </div>
      )}
    </div>
  );
}