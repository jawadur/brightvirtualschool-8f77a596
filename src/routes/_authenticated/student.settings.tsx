import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useStudentPrefs } from "@/lib/student-prefs";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Settings as SettingsIcon, Accessibility, Volume2, Loader2, Square } from "lucide-react";
import { useTts, TtsLang } from "@/hooks/use-tts";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/student/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { prefs, update } = useStudentPrefs();
  const [testLang, setTestLang] = useState<TtsLang>("en");
  const { speak, stop, speaking, voices, voicesReady, supported } = useTts(testLang, {
    rate: prefs.speech_rate,
    pitch: prefs.speech_pitch,
    volume: prefs.speech_volume,
    voiceURI: prefs.preferred_voice_uri,
  });

  const langVoices = voices.filter((v) =>
    v.lang?.toLowerCase().startsWith(testLang === "en" ? "en" : testLang),
  );

  const sample: Record<TtsLang, string> = {
    en: "Hello! I am your teacher. Let us learn something fun today.",
    hi: "नमस्ते बच्चों! मैं आपकी टीचर हूँ। आज हम कुछ नया सीखेंगे।",
    te: "నమస్తే పిల్లలు! నేను మీ టీచర్‌ని. ఈ రోజు మనం కొత్తది నేర్చుకుందాం.",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <SettingsIcon className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-extrabold">Settings</h1>
      </div>

      <Card className="p-5 space-y-5">
        <div className="flex items-center gap-2">
          <Accessibility className="h-5 w-5 text-primary" />
          <h2 className="font-extrabold">Accessibility</h2>
        </div>

        <SettingRow
          title="Voice Reader"
          description="Show speaker buttons across the app to read content aloud."
          checked={prefs.voice_reader}
          onChange={(v) => update({ voice_reader: v })}
        />
        <SettingRow
          title="Auto-read lessons"
          description="Start reading the lesson aloud when it opens."
          checked={prefs.auto_read_lesson}
          onChange={(v) => update({ auto_read_lesson: v })}
        />
        <SettingRow
          title="Larger text"
          description="Bigger font sizes across the whole app."
          checked={prefs.larger_text}
          onChange={(v) => update({ larger_text: v })}
        />
        <SettingRow
          title="High contrast"
          description="Strong colors for easier reading."
          checked={prefs.high_contrast}
          onChange={(v) => update({ high_contrast: v })}
        />

      </Card>

      <Card className="p-5 space-y-5">
        <div className="flex items-center gap-2">
          <Volume2 className="h-5 w-5 text-primary" />
          <h2 className="font-extrabold">Teacher Voice</h2>
          {!voicesReady && (
            <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Loading voices…
            </span>
          )}
        </div>

        {!supported && (
          <div className="rounded-2xl border-2 border-destructive/30 bg-destructive/5 p-3 text-sm">
            Your browser doesn't support voice. Try the latest Chrome, Edge, or Safari.
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label className="font-bold">Test language</Label>
            <Select value={testLang} onValueChange={(v) => setTestLang(v as TtsLang)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="hi">हिन्दी (Hindi)</SelectItem>
                <SelectItem value="te">తెలుగు (Telugu)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="font-bold">Preferred voice</Label>
            <Select
              value={prefs.preferred_voice_uri ?? "__auto"}
              onValueChange={(v) => update({ preferred_voice_uri: v === "__auto" ? null : v })}
            >
              <SelectTrigger className="mt-1"><SelectValue placeholder="Auto (best female voice)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__auto">Auto (best female voice)</SelectItem>
                {langVoices.map((v) => (
                  <SelectItem key={v.voiceURI} value={v.voiceURI}>
                    {v.name} — {v.lang}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {voicesReady && langVoices.length === 0 && (
              <p className="mt-1 text-xs text-muted-foreground">No {testLang.toUpperCase()} voices installed on this device. We'll use the best fallback.</p>
            )}
          </div>
        </div>

        <SliderRow label="Speed" value={prefs.speech_rate} min={0.6} max={1.4} step={0.1} onChange={(v) => update({ speech_rate: v })} />
        <SliderRow label="Pitch" value={prefs.speech_pitch} min={0.7} max={1.5} step={0.1} onChange={(v) => update({ speech_pitch: v })} />
        <SliderRow label="Volume" value={prefs.speech_volume} min={0.2} max={1} step={0.1} onChange={(v) => update({ speech_volume: v })} />

        <div className="flex gap-2">
          <Button onClick={() => speak(sample[testLang], testLang)} className="rounded-2xl gap-2">
            <Volume2 className="h-4 w-4" /> {speaking ? "Speaking…" : "Test voice"}
          </Button>
          {speaking && (
            <Button variant="ghost" onClick={stop} className="rounded-2xl gap-2">
              <Square className="h-4 w-4" /> Stop
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}

function SliderRow({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <Label className="font-bold">{label}</Label>
        <span className="text-xs text-muted-foreground">{value.toFixed(1)}×</span>
      </div>
      <Slider min={min} max={max} step={step} value={[value]} onValueChange={(v) => onChange(v[0])} />
    </div>
  );
}

function SettingRow({ title, description, checked, onChange }: { title: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b last:border-0">
      <div className="min-w-0">
        <div className="font-bold">{title}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}