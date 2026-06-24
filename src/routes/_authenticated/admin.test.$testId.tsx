import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { I18nField } from "@/components/admin/I18nField";
import { ArrowLeft, Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";
import { QuestionEditor, QUESTION_TYPES, emptyQuestion } from "@/components/admin/QuestionEditor";
import { QuestionBankPicker } from "@/components/admin/QuestionBankPicker";
import type { LearningQuestion } from "@/components/learning/QuestionRenderer";

export const Route = createFileRoute("/_authenticated/admin/test/$testId")({
  component: TestEditor,
});

function TestEditor() {
  const { testId } = Route.useParams();
  const navigate = useNavigate();
  const [title, setTitle] = useState<Record<string, string>>({});
  const [duration, setDuration] = useState(15);
  const [pass, setPass] = useState(60);
  const [scope, setScope] = useState<string>("daily");
  const [randomize, setRandomize] = useState(false);
  const [published, setPublished] = useState(true);
  const [allowRetake, setAllowRetake] = useState(false);
  const [retakeMode, setRetakeMode] = useState<"none"|"same_questions"|"random_questions">("none");
  const [maxAttempts, setMaxAttempts] = useState<number | "">(1);
  const [questionsPerAttempt, setQuestionsPerAttempt] = useState<number | "">("");
  const [questions, setQuestions] = useState<LearningQuestion[]>([]);
  const [saving, setSaving] = useState(false);

  const q = useQuery({
    queryKey: ["admin-test", testId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_test_admin", { _test_id: testId } as any);
      if (error) throw error;
      return data as any;
    },
  });

  useEffect(() => {
    if (!q.data) return;
    const d: any = q.data;
    setTitle(d.title || {});
    setDuration(d.duration_minutes ?? 15);
    setPass(d.pass_threshold ?? 60);
    setScope(d.scope ?? "daily");
    setQuestions(Array.isArray(d.questions) ? d.questions : []);
    setRandomize(d.metadata?.randomize ?? false);
    setPublished(d.metadata?.published ?? true);
    setAllowRetake(!!d.allow_retake);
    setRetakeMode((d.retake_mode ?? "none") as any);
    setMaxAttempts(d.max_attempts ?? "");
    setQuestionsPerAttempt(d.questions_per_attempt ?? "");
  }, [q.data]);

  const save = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from("tests").update({
        title,
        duration_minutes: Number(duration) || 15,
        pass_threshold: Number(pass) || 60,
        scope: scope as any,
        questions: questions as any,
        metadata: { randomize, published } as any,
        allow_retake: allowRetake,
        retake_mode: retakeMode,
        max_attempts: maxAttempts === "" ? null as any : Number(maxAttempts),
        questions_per_attempt: questionsPerAttempt === "" ? null as any : Number(questionsPerAttempt),
      }).eq("id", testId);
      if (error) throw error;
      toast.success("Test saved");
    } catch (e) { toast.error((e as Error).message); } finally { setSaving(false); }
  };

  const addQ = (type: LearningQuestion["type"]) => setQuestions([...questions, emptyQuestion(type)]);
  const updateQ = (i: number, nq: LearningQuestion) => setQuestions(questions.map((qq, k) => (k === i ? nq : qq)));
  const removeQ = (i: number) => setQuestions(questions.filter((_, k) => k !== i));

  if (q.isLoading) return <p className="text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" onClick={() => navigate({ to: "/admin/tests" })}><ArrowLeft className="h-4 w-4 mr-1" />Back</Button>
        <div className="flex-1" />
        <Button onClick={save} disabled={saving}><Save className="h-4 w-4 mr-1" />{saving ? "Saving…" : "Save"}</Button>
      </div>
      <Card className="p-4 space-y-3">
        <I18nField label="Title" value={title} onChange={setTitle} required />
        <div className="grid sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div>
            <Label>Duration (min)</Label>
            <Input type="number" min={1} value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
          </div>
          <div>
            <Label>Pass threshold (%)</Label>
            <Input type="number" min={0} max={100} value={pass} onChange={(e) => setPass(Number(e.target.value))} />
          </div>
          <div>
            <Label>Scope</Label>
            <select value={scope} onChange={(e) => setScope(e.target.value)} className="w-full rounded-md border border-input bg-card px-3 py-2">
              <option value="daily">daily</option>
              <option value="weekly">weekly</option>
              <option value="monthly">monthly</option>
              <option value="unit">unit</option>
              <option value="custom">custom</option>
            </select>
          </div>
          <label className="flex items-center gap-2 mt-6 font-bold">
            <input type="checkbox" checked={randomize} onChange={(e) => setRandomize(e.target.checked)} className="h-4 w-4" />
            Randomize
          </label>
          <label className="flex items-center gap-2 mt-6 font-bold">
            <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} className="h-4 w-4" />
            Published
          </label>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 border-t pt-3">
          <label className="flex items-center gap-2 font-bold">
            <input type="checkbox" checked={allowRetake} onChange={(e)=>setAllowRetake(e.target.checked)} className="h-4 w-4" />
            Allow Retake
          </label>
          <div>
            <Label>Retake Type</Label>
            <select value={retakeMode} onChange={(e)=>setRetakeMode(e.target.value as any)} disabled={!allowRetake}
              className="w-full rounded-md border border-input bg-card px-3 py-2 disabled:opacity-50">
              <option value="none">none</option>
              <option value="same_questions">same questions</option>
              <option value="random_questions">random questions</option>
            </select>
          </div>
          <div>
            <Label>Maximum Attempts (blank = unlimited)</Label>
            <Input type="number" min={1} value={maxAttempts}
              onChange={(e)=>setMaxAttempts(e.target.value===""?"":Number(e.target.value))} />
          </div>
          <div>
            <Label>Questions Per Attempt (blank = all)</Label>
            <Input type="number" min={1} value={questionsPerAttempt}
              onChange={(e)=>setQuestionsPerAttempt(e.target.value===""?"":Number(e.target.value))} />
          </div>
        </div>
      </Card>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="font-extrabold text-lg">Questions ({questions.length})</h2>
        <div className="flex flex-wrap gap-1">
          <QuestionBankPicker
            defaultSubjectId={(q.data as any)?.subject_id}
            onPick={(items) => setQuestions([...questions, ...items])}
          />
          {QUESTION_TYPES.map((t) => (
            <Button key={t.value} size="sm" variant="outline" onClick={() => addQ(t.value)}>
              <Plus className="h-3 w-3 mr-1" />{t.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {questions.map((qq, i) => (
          <Card key={i} className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase text-muted-foreground">Q{i + 1} · {qq.type}</span>
              <div className="flex-1" />
              <Button size="icon" variant="ghost" onClick={() => removeQ(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
            <QuestionEditor question={qq} onChange={(nq) => updateQ(i, nq)} />
          </Card>
        ))}
        {questions.length === 0 && (
          <Card className="p-8 text-center text-muted-foreground">No questions yet.</Card>
        )}
      </div>
    </div>
  );
}