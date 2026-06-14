import { Button } from "@/components/ui/button";
import { useTts, TtsLang } from "@/hooks/use-tts";
import { useStudentPrefs } from "@/lib/student-prefs";
import { Volume2, Pause, Play, Square } from "lucide-react";
import { useEffect } from "react";

interface ReadAloudProps {
  text: string | string[];
  lang?: TtsLang;
  /** Compact icon-only button (default), or full controls (play / pause / stop). */
  variant?: "icon" | "controls";
  autoStart?: boolean;
  label?: string;
  className?: string;
}

/** Speaker button wired to browser SpeechSynthesis + per-student preferences. */
export function ReadAloud({ text, lang = "en", variant = "icon", autoStart = false, label, className }: ReadAloudProps) {
  const { prefs } = useStudentPrefs();
  const { supported, speak, pause, resume, stop, speaking, paused } = useTts(lang, prefs.speech_rate);
  const full = Array.isArray(text) ? text.filter(Boolean).join(". ") : text;

  useEffect(() => {
    if (autoStart && prefs.voice_reader && supported && full) speak(full, lang);
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, full, lang]);

  if (!prefs.voice_reader || !supported) return null;

  if (variant === "icon") {
    return (
      <Button
        type="button"
        size="icon"
        variant="ghost"
        aria-label={speaking ? "Stop reading" : "Read aloud"}
        className={`min-h-11 min-w-11 rounded-2xl ${className ?? ""}`}
        onClick={() => (speaking ? stop() : speak(full, lang))}
      >
        <Volume2 className={`h-5 w-5 ${speaking ? "text-primary animate-pulse" : ""}`} />
      </Button>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      {!speaking && (
        <Button type="button" size="sm" variant="secondary" className="rounded-2xl gap-1" onClick={() => speak(full, lang)}>
          <Volume2 className="h-4 w-4" /> {label ?? "Read Aloud"}
        </Button>
      )}
      {speaking && !paused && (
        <Button type="button" size="sm" variant="secondary" className="rounded-2xl gap-1" onClick={pause} aria-label="Pause reading">
          <Pause className="h-4 w-4" /> Pause
        </Button>
      )}
      {speaking && paused && (
        <Button type="button" size="sm" variant="secondary" className="rounded-2xl gap-1" onClick={resume} aria-label="Resume reading">
          <Play className="h-4 w-4" /> Resume
        </Button>
      )}
      {speaking && (
        <Button type="button" size="sm" variant="ghost" className="rounded-2xl gap-1" onClick={stop} aria-label="Stop reading">
          <Square className="h-4 w-4" /> Stop
        </Button>
      )}
    </div>
  );
}