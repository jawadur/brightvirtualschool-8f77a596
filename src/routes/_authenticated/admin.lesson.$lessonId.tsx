import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { I18nField } from "@/components/admin/I18nField";
import type { LessonStep } from "@/lib/data";
import { ArrowLeft, Plus, Trash2, ArrowUp, ArrowDown, Save } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/lesson/$lessonId")({
  component: LessonEditor,
});

const LESSON_TYPES = [
  "video", "teacher_explanation", "interactive_story", "multiple_choice",
  "match_pairs", "drag_drop", "fill_blank", "audio_activity",
  "speaking_activity", "tracing_activity", "mixed",
];

const STEP_TYPES: { value: LessonStep["type"]; label: string }[] = [
  { value: "introduction", label: "Introduction" },
  { value: "teacher_explanation", label: "Teacher explanation" },
  { value: "multiple_choice", label: "Multiple choice" },
  { value: "fill_blank", label: "Fill the blank" },
  { value: "match_pairs", label: "Match pairs" },
  { value: "tracing_activity", label: "Tracing" },
  { value: "drag_drop", label: "Drag & drop" },
  { value: "picture_question", label: "Picture question" },
  { value: "audio_placeholder", label: "Audio (placeholder)" },
  { value: "speaking_placeholder", label: "Speaking (placeholder)" },
];

function LessonEditor() {
  const { lessonId } = Route.useParams();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [title, setTitle] = useState<Record<string, string>>({});
  const [description, setDescription] = useState<Record<string, string>>({});
  const [lessonType, setLessonType] = useState("mixed");
  const [estimated, setEstimated] = useState(15);
  const [sortOrder, setSortOrder] = useState(0);
  const [isPublished, setIsPublished] = useState(true);
  const [prereqIds, setPrereqIds] = useState<string[]>([]);
  const [steps, setSteps] = useState<LessonStep[]>([]);
  const [saving, setSaving] = useState(false);

  const q = useQuery({
    queryKey: ["admin-lesson", lessonId],
    queryFn: async () => {
      const { data, error } = await supabase.from("lessons").select("*").eq("id", lessonId).single();
      if (error) throw error;
      return data;
    },
  });

  const siblingsQ = useQuery({
    queryKey: ["admin-lesson-siblings", lessonId, (q.data as any)?.unit_id],
    enabled: !!(q.data as any)?.unit_id,
    queryFn: async () => {
      const { data: unit } = await supabase.from("units").select("subject_id").eq("id", (q.data as any).unit_id).single();
      if (!unit) return [];
      const { data, error } = await supabase
        .from("lessons")
        .select("id, code, title, units!inner(title, sort_order, subject_id)")
        .eq("units.subject_id", (unit as any).subject_id)
        .neq("id", lessonId)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const prereqQ = useQuery({
    queryKey: ["admin-lesson-prereqs", lessonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lesson_prerequisites")
        .select("prerequisite_lesson_id")
        .eq("lesson_id", lessonId);
      if (error) throw error;
      return (data ?? []).map((r: any) => r.prerequisite_lesson_id as string);
    },
  });

  useEffect(() => {
    if (!q.data) return;
    const d: any = q.data;
    setCode(d.code);
    setTitle(d.title || {});
    setDescription(d.description || {});
    setLessonType(d.lesson_type);
    setEstimated(d.estimated_minutes);
    setSortOrder(d.sort_order);
    setIsPublished(d.is_published ?? true);
    const content = d.content || {};
    setSteps(Array.isArray(content.steps) ? content.steps : []);
  }, [q.data]);

  useEffect(() => {
    if (prereqQ.data) setPrereqIds(prereqQ.data);
  }, [prereqQ.data]);

  const save = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from("lessons").update({
        code, title, description, lesson_type: lessonType as any,
        estimated_minutes: Number(estimated) || 0, sort_order: Number(sortOrder) || 0,
        is_published: isPublished,
        content: { steps },
      }).eq("id", lessonId);
      if (error) throw error;
      // Sync prerequisites
      await supabase.from("lesson_prerequisites").delete().eq("lesson_id", lessonId);
      if (prereqIds.length > 0) {
        await supabase.from("lesson_prerequisites").insert(
          prereqIds.map((pid) => ({ lesson_id: lessonId, prerequisite_lesson_id: pid })),
        );
      }
      toast.success("Lesson saved");
    } catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
  };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= steps.length) return;
    const copy = [...steps];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    setSteps(copy);
  };
  const removeStep = (i: number) => setSteps(steps.filter((_, k) => k !== i));
  const updateStep = (i: number, patch: Partial<LessonStep>) => {
    setSteps(steps.map((s, k) => (k === i ? ({ ...s, ...patch } as LessonStep) : s)));
  };
  const addStep = (type: LessonStep["type"]) => {
    let s: LessonStep;
    switch (type) {
      case "introduction": s = { type, text: { en: "" } }; break;
      case "teacher_explanation": s = { type, text: { en: "" } }; break;
      case "multiple_choice": s = { type, question: { en: "" }, options: [{ en: "" }, { en: "" }], answer: 0, coins: 5 }; break;
      case "fill_blank": s = { type, question: { en: "" }, answer: "", coins: 5 }; break;
      case "match_pairs": s = { type, pairs: [{ left: { en: "" }, right: { en: "" } }], coins: 5 }; break;
      case "tracing_activity": s = { type, letter: "A", instructions: { en: "Trace the letter" } }; break;
      case "drag_drop": s = { type, question: { en: "Match each item to its group" }, items: [{ en: "" }], targets: [{ en: "" }], mapping: [0], coins: 5 }; break;
      case "picture_question": s = { type, image_url: "", question: { en: "" }, options: [{ en: "" }, { en: "" }], answer: 0, coins: 5 }; break;
      case "audio_placeholder": s = { type, instructions: { en: "Listen carefully" } }; break;
      case "speaking_placeholder": s = { type, prompt: { en: "Say it aloud" } }; break;
    }
    setSteps([...steps, s!]);
  };

  if (q.isLoading) return <p className="text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" onClick={() => navigate({ to: "/admin" })}><ArrowLeft className="h-4 w-4 mr-1" />Back</Button>
        <div className="flex-1" />
        <Button onClick={save} disabled={saving}><Save className="h-4 w-4 mr-1" />{saving ? "Saving…" : "Save lesson"}</Button>
      </div>

      <Card className="p-4 space-y-3">
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <Label>Code</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} />
          </div>
          <div>
            <Label>Type</Label>
            <select value={lessonType} onChange={(e) => setLessonType(e.target.value)} className="w-full rounded-md border border-input bg-card px-3 py-2">
              {LESSON_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <Label>Estimated minutes</Label>
            <Input type="number" value={estimated} onChange={(e) => setEstimated(Number(e.target.value))} />
          </div>
          <div>
            <Label>Sort order</Label>
            <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 font-bold">
              <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} className="h-4 w-4" />
              Published (visible to students)
            </label>
          </div>
        </div>
        <I18nField label="Title" value={title} onChange={setTitle} required />
        <I18nField label="Description" value={description} onChange={setDescription} textarea />
        <div>
          <Label>Prerequisite lessons</Label>
          <p className="text-xs text-muted-foreground mb-2">Student must complete these before this lesson unlocks. Leave empty for sequential order.</p>
          <div className="max-h-44 overflow-y-auto rounded-md border p-2 space-y-1">
            {(siblingsQ.data ?? []).map((sib: any) => {
              const checked = prereqIds.includes(sib.id);
              return (
                <label key={sib.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) =>
                      setPrereqIds(e.target.checked ? [...prereqIds, sib.id] : prereqIds.filter((id) => id !== sib.id))
                    }
                  />
                  <span className="font-mono text-xs text-muted-foreground">{sib.code}</span>
                  <span>{(sib.title as any)?.en ?? sib.code}</span>
                </label>
              );
            })}
            {(siblingsQ.data ?? []).length === 0 && <p className="text-xs text-muted-foreground">No other lessons in this subject yet.</p>}
          </div>
        </div>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="font-extrabold text-lg">Activities ({steps.length})</h2>
        <div className="flex flex-wrap gap-1">
          {STEP_TYPES.map((t) => (
            <Button key={t.value} size="sm" variant="outline" onClick={() => addStep(t.value)}>
              <Plus className="h-3 w-3 mr-1" />{t.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {steps.map((step, i) => (
          <Card key={i} className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-bold uppercase text-muted-foreground">#{i + 1} · {step.type}</span>
              <div className="flex-1" />
              <Button size="icon" variant="ghost" onClick={() => move(i, -1)}><ArrowUp className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" onClick={() => move(i, 1)}><ArrowDown className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" onClick={() => removeStep(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
            <StepFields step={step} onChange={(p) => updateStep(i, p)} />
          </Card>
        ))}
        {steps.length === 0 && (
          <Card className="p-8 text-center text-muted-foreground">
            No activities yet. Add one above to start building this lesson.
          </Card>
        )}
      </div>
    </div>
  );
}

function StepFields({ step, onChange }: { step: LessonStep; onChange: (p: Partial<LessonStep>) => void }) {
  if (step.type === "introduction" || step.type === "teacher_explanation") {
    return <I18nField label="Text" value={step.text} onChange={(v) => onChange({ text: v } as any)} textarea required />;
  }
  if (step.type === "multiple_choice") {
    return (
      <div className="space-y-3">
        <I18nField label="Question" value={step.question} onChange={(v) => onChange({ question: v } as any)} required />
        <div className="space-y-2">
          <Label>Options (select the correct one)</Label>
          {step.options.map((opt, i) => (
            <div key={i} className="flex items-start gap-2 rounded-xl border p-3">
              <input
                type="radio"
                checked={step.answer === i}
                onChange={() => onChange({ answer: i } as any)}
                className="mt-3"
              />
              <div className="flex-1">
                <I18nField
                  label={`Option ${i + 1}`}
                  value={opt}
                  onChange={(v) => {
                    const options = [...step.options]; options[i] = v;
                    onChange({ options } as any);
                  }}
                  required
                />
              </div>
              <Button size="icon" variant="ghost" onClick={() => {
                const options = step.options.filter((_, k) => k !== i);
                onChange({ options, answer: Math.min(step.answer, options.length - 1) } as any);
              }}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={() => onChange({ options: [...step.options, { en: "" }] } as any)}>
            <Plus className="h-3 w-3 mr-1" />Add option
          </Button>
        </div>
        <CoinsField value={step.coins ?? 0} onChange={(v) => onChange({ coins: v } as any)} />
      </div>
    );
  }
  if (step.type === "fill_blank") {
    return (
      <div className="space-y-3">
        <I18nField label="Question (use ___ for the blank)" value={step.question} onChange={(v) => onChange({ question: v } as any)} required />
        <div>
          <Label>Correct answer</Label>
          <Input value={step.answer} onChange={(e) => onChange({ answer: e.target.value } as any)} />
        </div>
        <CoinsField value={step.coins ?? 0} onChange={(v) => onChange({ coins: v } as any)} />
      </div>
    );
  }
  if (step.type === "match_pairs") {
    return (
      <div className="space-y-3">
        <Label>Pairs</Label>
        {step.pairs.map((p, i) => (
          <div key={i} className="grid sm:grid-cols-2 gap-2 rounded-xl border p-3">
            <I18nField label={`Left ${i + 1}`} value={p.left} onChange={(v) => {
              const pairs = [...step.pairs]; pairs[i] = { ...pairs[i], left: v };
              onChange({ pairs } as any);
            }} required />
            <I18nField label={`Right ${i + 1}`} value={p.right} onChange={(v) => {
              const pairs = [...step.pairs]; pairs[i] = { ...pairs[i], right: v };
              onChange({ pairs } as any);
            }} required />
            <Button size="sm" variant="ghost" className="sm:col-span-2" onClick={() => {
              onChange({ pairs: step.pairs.filter((_, k) => k !== i) } as any);
            }}>Remove pair</Button>
          </div>
        ))}
        <Button size="sm" variant="outline" onClick={() => onChange({ pairs: [...step.pairs, { left: { en: "" }, right: { en: "" } }] } as any)}>
          <Plus className="h-3 w-3 mr-1" />Add pair
        </Button>
        <CoinsField value={step.coins ?? 0} onChange={(v) => onChange({ coins: v } as any)} />
      </div>
    );
  }
  if (step.type === "tracing_activity") {
    return (
      <div className="space-y-3">
        <div>
          <Label>Letter / character</Label>
          <Input value={step.letter} maxLength={3} onChange={(e) => onChange({ letter: e.target.value } as any)} />
        </div>
        <I18nField label="Instructions" value={step.instructions} onChange={(v) => onChange({ instructions: v } as any)} required />
      </div>
    );
  }
  if (step.type === "drag_drop") {
    return (
      <div className="space-y-3">
        <I18nField label="Question" value={step.question} onChange={(v) => onChange({ question: v } as any)} required />
        <Label>Items (each maps to a target index)</Label>
        {step.items.map((it, i) => (
          <div key={i} className="grid sm:grid-cols-[1fr,140px,auto] gap-2 items-end rounded-xl border p-3">
            <I18nField label={`Item ${i + 1}`} value={it} onChange={(v) => {
              const items = [...step.items]; items[i] = v;
              onChange({ items } as any);
            }} required />
            <div>
              <Label>Target index</Label>
              <Input type="number" min={0} max={step.targets.length - 1} value={step.mapping[i] ?? 0} onChange={(e) => {
                const mapping = [...step.mapping]; mapping[i] = Number(e.target.value) || 0;
                onChange({ mapping } as any);
              }} />
            </div>
            <Button size="icon" variant="ghost" onClick={() => {
              onChange({
                items: step.items.filter((_, k) => k !== i),
                mapping: step.mapping.filter((_, k) => k !== i),
              } as any);
            }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </div>
        ))}
        <Button size="sm" variant="outline" onClick={() => onChange({ items: [...step.items, { en: "" }], mapping: [...step.mapping, 0] } as any)}>
          <Plus className="h-3 w-3 mr-1" />Item
        </Button>
        <Label>Targets / groups</Label>
        {step.targets.map((tg, i) => (
          <div key={i} className="flex items-end gap-2 rounded-xl border p-3">
            <div className="flex-1">
              <I18nField label={`Target ${i}`} value={tg} onChange={(v) => {
                const targets = [...step.targets]; targets[i] = v;
                onChange({ targets } as any);
              }} required />
            </div>
            <Button size="icon" variant="ghost" onClick={() => {
              onChange({ targets: step.targets.filter((_, k) => k !== i) } as any);
            }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </div>
        ))}
        <Button size="sm" variant="outline" onClick={() => onChange({ targets: [...step.targets, { en: "" }] } as any)}>
          <Plus className="h-3 w-3 mr-1" />Target
        </Button>
        <CoinsField value={step.coins ?? 0} onChange={(v) => onChange({ coins: v } as any)} />
      </div>
    );
  }
  if (step.type === "picture_question") {
    return (
      <div className="space-y-3">
        <div>
          <Label>Image URL</Label>
          <Input value={step.image_url} onChange={(e) => onChange({ image_url: e.target.value } as any)} placeholder="https://…" />
        </div>
        <I18nField label="Question" value={step.question} onChange={(v) => onChange({ question: v } as any)} required />
        <Label>Options (select correct)</Label>
        {step.options.map((opt, i) => (
          <div key={i} className="flex items-start gap-2 rounded-xl border p-3">
            <input type="radio" checked={step.answer === i} onChange={() => onChange({ answer: i } as any)} className="mt-3" />
            <div className="flex-1">
              <I18nField label={`Option ${i + 1}`} value={opt} onChange={(v) => {
                const options = [...step.options]; options[i] = v;
                onChange({ options } as any);
              }} required />
            </div>
            <Button size="icon" variant="ghost" onClick={() => {
              const options = step.options.filter((_, k) => k !== i);
              onChange({ options, answer: Math.min(step.answer, options.length - 1) } as any);
            }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </div>
        ))}
        <Button size="sm" variant="outline" onClick={() => onChange({ options: [...step.options, { en: "" }] } as any)}>
          <Plus className="h-3 w-3 mr-1" />Option
        </Button>
        <CoinsField value={step.coins ?? 0} onChange={(v) => onChange({ coins: v } as any)} />
      </div>
    );
  }
  if (step.type === "audio_placeholder") {
    return <I18nField label="Instructions" value={step.instructions} onChange={(v) => onChange({ instructions: v } as any)} required />;
  }
  if (step.type === "speaking_placeholder") {
    return <I18nField label="Prompt" value={step.prompt} onChange={(v) => onChange({ prompt: v } as any)} required />;
  }
  return null;
}

function CoinsField({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="max-w-xs">
      <Label>Coins reward (correct answer)</Label>
      <Input type="number" min={0} value={value} onChange={(e) => onChange(Number(e.target.value) || 0)} />
    </div>
  );
}