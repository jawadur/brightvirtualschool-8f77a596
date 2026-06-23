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

export const Route = createFileRoute("/_authenticated/admin/assignment/$assignmentId")({
  component: AssignmentEditor,
});

function AssignmentEditor() {
  const { assignmentId } = Route.useParams();
  const navigate = useNavigate();
  const [title, setTitle] = useState<Record<string, string>>({});
  const [instructions, setInstructions] = useState<Record<string, string>>({});
  const [passThreshold, setPassThreshold] = useState(60);
  const [dueInDays, setDueInDays] = useState<number | "">("");
  const [retryAllowed, setRetryAllowed] = useState(true);
  const [published, setPublished] = useState(true);
  const [questions, setQuestions] = useState<LearningQuestion[]>([]);
  const [saving, setSaving] = useState(false);

  const q = useQuery({
    queryKey: ["admin-assignment", assignmentId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_assignment_admin", { _assignment_id: assignmentId } as any);
      if (error) throw error;
      return data as any;
    },
  });

  useEffect(() => {
    if (!q.data) return;
    const d: any = q.data;
    setTitle(d.title || {});
    setInstructions(d.instructions || {});
    setPassThreshold(d.pass_threshold);
    setDueInDays(d.due_in_days ?? "");
    setQuestions(Array.isArray(d.questions) ? d.questions : []);
    setRetryAllowed(d.metadata?.retry_allowed ?? true);
    setPublished(d.metadata?.published ?? true);
  }, [q.data]);

  const save = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from("assignments").update({
        title, instructions, pass_threshold: Number(passThreshold) || 60,
        due_in_days: dueInDays === "" ? null : Number(dueInDays),
        questions: questions as any,
        metadata: { retry_allowed: retryAllowed, published } as any,
      }).eq("id", assignmentId);
      if (error) throw error;
      toast.success("Assignment saved");
    } catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
  };

  const addQ = (type: LearningQuestion["type"]) => setQuestions([...questions, emptyQuestion(type)]);
  const updateQ = (i: number, nq: LearningQuestion) => setQuestions(questions.map((qq, k) => (k === i ? nq : qq)));
  const removeQ = (i: number) => setQuestions(questions.filter((_, k) => k !== i));

  if (q.isLoading) return <p className="text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" onClick={() => navigate({ to: "/admin/assignments" })}><ArrowLeft className="h-4 w-4 mr-1" />Back</Button>
        <div className="flex-1" />
        <Button onClick={save} disabled={saving}><Save className="h-4 w-4 mr-1" />{saving ? "Saving…" : "Save"}</Button>
      </div>
      <Card className="p-4 space-y-3">
        <I18nField label="Title" value={title} onChange={setTitle} required />
        <I18nField label="Instructions" value={instructions} onChange={setInstructions} textarea />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <Label>Pass threshold (%)</Label>
            <Input type="number" min={0} max={100} value={passThreshold} onChange={(e) => setPassThreshold(Number(e.target.value))} />
          </div>
          <div>
            <Label>Due in days (optional)</Label>
            <Input type="number" min={0} value={dueInDays} onChange={(e) => setDueInDays(e.target.value === "" ? "" : Number(e.target.value))} />
          </div>
          <label className="flex items-center gap-2 mt-6 font-bold">
            <input type="checkbox" checked={retryAllowed} onChange={(e) => setRetryAllowed(e.target.checked)} className="h-4 w-4" />
            Retry allowed
          </label>
          <label className="flex items-center gap-2 mt-6 font-bold">
            <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} className="h-4 w-4" />
            Published
          </label>
        </div>
      </Card>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="font-extrabold text-lg">Questions ({questions.length})</h2>
        <div className="flex flex-wrap gap-1">
          <QuestionBankPicker
            defaultSubjectId={(q.data as any)?.subject_id}
            defaultLessonId={(q.data as any)?.lesson_id}
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
          <Card className="p-8 text-center text-muted-foreground">No questions yet. Add from the bank or create new.</Card>
        )}
      </div>
    </div>
  );
}