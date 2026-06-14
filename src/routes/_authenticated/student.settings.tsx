import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useStudentPrefs } from "@/lib/student-prefs";
import { ReadAloud } from "@/components/app/ReadAloud";
import { Slider } from "@/components/ui/slider";
import { Settings as SettingsIcon, Accessibility } from "lucide-react";

export const Route = createFileRoute("/_authenticated/student/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { prefs, update } = useStudentPrefs();

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

        <div>
          <Label className="font-bold">Reading speed</Label>
          <div className="text-xs text-muted-foreground mb-2">Slower {prefs.speech_rate.toFixed(1)}× Faster</div>
          <Slider
            min={0.6}
            max={1.2}
            step={0.1}
            value={[prefs.speech_rate]}
            onValueChange={(v) => update({ speech_rate: v[0] })}
          />
          <div className="mt-3">
            <ReadAloud
              text="Hello! This is how I sound when reading lessons to you."
              lang="en"
              variant="controls"
              label="Test voice"
            />
          </div>
        </div>
      </Card>
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