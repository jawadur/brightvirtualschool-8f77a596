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

export const Route = createFileRoute("/_authenticated/admin/assignment/$assignmentId")({
  component: AssignmentEditor,
});

type Question = {
  type: "multiple_choice";
  question: Record<string, string>;
  options: Record<string, string>[];
  answer: number;
};

function AssignmentEditor() {
  const { assignmentId } = Route.useParams();
  const navigate = useNavigate();
  const [title, setTitle] = useState<Record<string, string>>({});
  const [instructions, setInstructions] = useState<Record<string, string>>({});
  const [passThreshold, setPassThreshold] = useState(60);
  const [dueInDays, setDueInDays] = useState<number | "">("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [saving, setSaving] = useState(false);

  const q = useQuery({
    queryKey: ["admin-assignment", assignmentId],
    queryFn: async () => {
      const { data, error } = await supabase.from("assignments").select("*").eq("id", assignmentId).single();
      if (error) throw error; return data;
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
  }, [q.data]);

  const save = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from("assignments").update({
        title, instructions, pass_threshold: Number(passThreshold) || 60,
        due_in_days: dueInDays === "" ? null : Number(dueInDays),
        questions: questions as any,
      }).eq("id", assignmentId);
      if (error) throw error;
      toast.success("Assignment saved");
    } catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
  };

  const addQ = () => setQuestions([...questions, { type: "multiple_choice", question: { en: "" }, options: [{ en: "" }, { en: "" }], answer: 0 }]);
  const updateQ = (i: number, patch: Partial<Question>) => setQuestions(questions.map((qq, k) => (k === i ? { ...qq, ...patch } : qq)));
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
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label>Pass threshold (%)</Label>
            <Input type="number" min={0} max={100} value={passThreshold} onChange={(e) => setPassThreshold(Number(e.target.value))} />
          </div>
          <div>
            <Label>Due in days (optional)</Label>
            <Input type="number" min={0} value={dueInDays} onChange={(e) => setDueInDays(e.target.value === "" ? "" : Number(e.target.value))} />
          </div>
        </div>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="font-extrabold text-lg">Questions ({questions.length})</h2>
        <Button size="sm" variant="outline" onClick={addQ}><Plus className="h-3 w-3 mr-1" />Question</Button>
      </div>

      <div className="space-y-3">
        {questions.map((qq, i) => (
          <Card key={i} className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase text-muted-foreground">Q{i + 1}</span>
              <div className="flex-1" />
              <Button size="icon" variant="ghost" onClick={() => removeQ(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
            <I18nField label="Question" value={qq.question} onChange={(v) => updateQ(i, { question: v })} required />
            <Label>Options (select the correct one)</Label>
            {qq.options.map((opt, j) => (
              <div key={j} className="flex items-start gap-2 rounded-xl border p-3">
                <input type="radio" checked={qq.answer === j} onChange={() => updateQ(i, { answer: j })} className="mt-3" />
                <div className="flex-1">
                  <I18nField label={`Option ${j + 1}`} value={opt} onChange={(v) => {
                    const options = [...qq.options]; options[j] = v;
                    updateQ(i, { options });
                  }} required />
                </div>
                <Button size="icon" variant="ghost" onClick={() => {
                  const options = qq.options.filter((_, k) => k !== j);
                  updateQ(i, { options, answer: Math.min(qq.answer, options.length - 1) });
                }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            ))}
            <Button size="sm" variant="outline" onClick={() => updateQ(i, { options: [...qq.options, { en: "" }] })}>
              <Plus className="h-3 w-3 mr-1" />Add option
            </Button>
          </Card>
        ))}
        {questions.length === 0 && (
          <Card className="p-8 text-center text-muted-foreground">No questions yet. Click "Question" to add one.</Card>
        )}
      </div>
    </div>
  );
}