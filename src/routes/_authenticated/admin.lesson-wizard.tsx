import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n";
import { LESSON_TEMPLATES, getTemplate, type LessonTemplateId } from "@/lib/lesson-templates";
import { Check, ChevronLeft, ChevronRight, Wand2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/lesson-wizard")({
  component: LessonWizard,
});

const STEPS = ["Scope", "Info", "Content", "Voice Reader", "Preview", "Publish"];

function LessonWizard() {
  const { tr } = useI18n();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [templateId, setTemplateId] = useState<LessonTemplateId | "">("");
  const [vars, setVars] = useState<Record<string, string>>({});

  const [title, setTitle] = useState({ en: "", hi: "", te: "" });
  const [description, setDescription] = useState("");
  const [objective, setObjective] = useState("");
  const [difficulty, setDifficulty] = useState("easy");
  const [duration, setDuration] = useState(10);

  const [voiceEn, setVoiceEn] = useState("");
  const [voiceHi, setVoiceHi] = useState("");
  const [voiceTe, setVoiceTe] = useState("");

  const [publish, setPublish] = useState(true);
  const [saving, setSaving] = useState(false);

  const classesQ = useQuery({
    queryKey: ["wiz-classes"],
    queryFn: async () => (await supabase.from("classes").select("id, name").order("sort_order")).data ?? [],
  });
  const subjectsQ = useQuery({
    queryKey: ["wiz-subjects", classId],
    enabled: !!classId,
    queryFn: async () => (await supabase.from("subjects").select("id, name").eq("class_id", classId).order("sort_order")).data ?? [],
  });
  const unitsQ = useQuery({
    queryKey: ["wiz-units", subjectId],
    enabled: !!subjectId,
    queryFn: async () => (await supabase.from("units").select("id, title").eq("subject_id", subjectId).order("sort_order")).data ?? [],
  });

  const template = useMemo(() => getTemplate(templateId || null), [templateId]);

  const steps = template ? template.buildSteps(vars) : [];
  const practice = template ? template.buildPractice(vars) : [];

  const canNext = () => {
    if (step === 0) return classId && subjectId && unitId;
    if (step === 1) return title.en.trim().length > 0;
    return true;
  };

  async function save() {
    if (!unitId) return;
    setSaving(true);
    try {
      const code = (title.en || "lesson").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60);
      const content = {
        steps,
        voice: { en: voiceEn, hi: voiceHi, te: voiceTe },
        meta: { objective, difficulty, template: templateId, vars },
      };
      const { data: lesson, error } = await supabase
        .from("lessons")
        .insert({
          unit_id: unitId,
          code: `${code}-${Date.now().toString(36)}`,
          title,
          description,
          lesson_type: "interactive",
          estimated_minutes: duration,
          content,
          is_published: publish,
          sort_order: 0,
        } as any)
        .select("id")
        .single();
      if (error) throw error;

      if (practice.length) {
        await supabase.from("question_bank").insert(
          practice.map((q, i) => ({
            lesson_id: lesson!.id,
            question_type: "short_text",
            prompt: { en: q },
            difficulty,
            sort_order: i,
          })) as any
        );
      }

      toast.success("Lesson created");
      navigate({ to: "/admin" });
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <header className="flex flex-wrap items-center gap-3">
        <Wand2 className="h-6 w-6 text-primary shrink-0" />
        <h1 className="text-2xl font-extrabold">Lesson Creation Wizard</h1>
      </header>

      {/* Step bar */}
      <ol className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {STEPS.map((label, i) => (
          <li
            key={label}
            className={`text-[10px] sm:text-xs font-bold uppercase rounded-full px-3 py-1.5 text-center truncate border ${
              i === step ? "bg-primary text-primary-foreground border-primary" : i < step ? "bg-success/20 text-foreground border-success/40" : "bg-muted text-muted-foreground border-transparent"
            }`}
          >
            {i + 1}. {label}
          </li>
        ))}
      </ol>

      <Card className="p-5 space-y-4">
        {step === 0 && (
          <div className="space-y-3">
            <h2 className="font-extrabold">Choose where this lesson lives</h2>
            <Field label="Program / Class">
              <select className="w-full border rounded-md px-3 py-2 bg-background" value={classId} onChange={(e) => { setClassId(e.target.value); setSubjectId(""); setUnitId(""); }}>
                <option value="">Select…</option>
                {(classesQ.data ?? []).map((c: any) => <option key={c.id} value={c.id}>{tr(c.name)}</option>)}
              </select>
            </Field>
            <Field label="Subject">
              <select className="w-full border rounded-md px-3 py-2 bg-background" value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setUnitId(""); }} disabled={!classId}>
                <option value="">Select…</option>
                {(subjectsQ.data ?? []).map((s: any) => <option key={s.id} value={s.id}>{tr(s.name)}</option>)}
              </select>
            </Field>
            <Field label="Unit">
              <select className="w-full border rounded-md px-3 py-2 bg-background" value={unitId} onChange={(e) => setUnitId(e.target.value)} disabled={!subjectId}>
                <option value="">Select…</option>
                {(unitsQ.data ?? []).map((u: any) => <option key={u.id} value={u.id}>{tr(u.title)}</option>)}
              </select>
            </Field>
            <Field label="Template (optional)">
              <select className="w-full border rounded-md px-3 py-2 bg-background" value={templateId} onChange={(e) => { const id = e.target.value as LessonTemplateId; setTemplateId(id); const t = getTemplate(id); if (t) setDuration(t.defaultMinutes); }}>
                <option value="">— No template —</option>
                {LESSON_TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
              {template && <p className="text-xs text-muted-foreground mt-1">{template.description}</p>}
            </Field>
            {template && (
              <Field label="Template variables (comma values where listed)">
                <Input placeholder="e.g. letter=A, sound=a, words=apple, ant, axe" onChange={(e) => {
                  const out: Record<string, string> = {};
                  e.target.value.split(/,\s*(?=[a-z_]+=)/i).forEach((part) => {
                    const [k, ...rest] = part.split("=");
                    if (k && rest.length) out[k.trim()] = rest.join("=").trim();
                  });
                  setVars(out);
                }} />
              </Field>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            <h2 className="font-extrabold">Lesson information</h2>
            <div className="grid sm:grid-cols-3 gap-3">
              <Field label="Title (English)"><Input value={title.en} onChange={(e) => setTitle({ ...title, en: e.target.value })} /></Field>
              <Field label="शीर्षक (Hindi)"><Input className="font-indic" value={title.hi} onChange={(e) => setTitle({ ...title, hi: e.target.value })} /></Field>
              <Field label="శీర్షిక (Telugu)"><Input className="font-indic" value={title.te} onChange={(e) => setTitle({ ...title, te: e.target.value })} /></Field>
            </div>
            <Field label="Description"><Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
            <Field label="Learning objective"><Textarea rows={2} value={objective} onChange={(e) => setObjective(e.target.value)} /></Field>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Difficulty">
                <select className="w-full border rounded-md px-3 py-2 bg-background" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </Field>
              <Field label="Estimated minutes"><Input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value) || 10)} /></Field>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <h2 className="font-extrabold">Lesson content (auto-generated from template)</h2>
            <Block title="Learn — steps">
              {steps.length ? steps.map((s, i) => (
                <div key={i} className="text-sm"><b>{s.type}</b>: <span className="text-muted-foreground break-words">{JSON.stringify(s.payload)}</span></div>
              )) : <p className="text-sm text-muted-foreground">Pick a template in step 1 to populate.</p>}
            </Block>
            <Block title="Practice questions">
              {practice.length ? practice.map((q, i) => <div key={i} className="text-sm">{i + 1}. {q}</div>) : <p className="text-sm text-muted-foreground">None yet.</p>}
            </Block>
            <p className="text-xs text-muted-foreground">Assignment and Test stubs are created from the Question Bank after publish.</p>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <h2 className="font-extrabold">Voice Reader content</h2>
            <Field label="English narration"><Textarea rows={3} value={voiceEn} onChange={(e) => setVoiceEn(e.target.value)} /></Field>
            <Field label="Hindi narration (हिन्दी)"><Textarea rows={3} className="font-indic" value={voiceHi} onChange={(e) => setVoiceHi(e.target.value)} /></Field>
            <Field label="Telugu narration (తెలుగు)"><Textarea rows={3} className="font-indic" value={voiceTe} onChange={(e) => setVoiceTe(e.target.value)} /></Field>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-3">
            <h2 className="font-extrabold">Preview</h2>
            <Card className="p-4 bg-muted/40">
              <div className="text-xl font-extrabold no-clip">{title.en || "Untitled"}</div>
              {title.hi && <div className="text-sm font-bold font-indic no-clip">{title.hi}</div>}
              {title.te && <div className="text-sm font-bold font-indic no-clip">{title.te}</div>}
              <p className="text-sm text-muted-foreground mt-2 break-words">{description}</p>
              <p className="text-xs mt-2"><b>Objective:</b> {objective || "—"}</p>
              <p className="text-xs"><b>Difficulty:</b> {difficulty} · <b>Duration:</b> {duration} min</p>
              <p className="text-xs mt-2"><b>{steps.length}</b> steps · <b>{practice.length}</b> practice questions</p>
            </Card>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-3">
            <h2 className="font-extrabold">Publish</h2>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} />
              Publish immediately (students can see it)
            </label>
            <Button onClick={save} disabled={saving}>
              <Check className="h-4 w-4 mr-1" />{saving ? "Saving…" : "Create lesson"}
            </Button>
          </div>
        )}
      </Card>

      <div className="flex justify-between gap-2">
        <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>
        {step < STEPS.length - 1 && (
          <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext()}>
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase font-bold text-muted-foreground no-clip">{label}</Label>
      {children}
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs font-extrabold uppercase text-muted-foreground mb-1.5">{title}</div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}