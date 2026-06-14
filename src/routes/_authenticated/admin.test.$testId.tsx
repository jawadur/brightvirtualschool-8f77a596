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

type Question = {
  type: "multiple_choice";
  question: Record<string, string>;
  options: Record<string, string>[];
  answer: number;
};

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
  const [questions, setQuestions] = useState<Question[]>([]);
  const [saving, setSaving] = useState(false);

  const q = useQuery({
    queryKey: ["admin-test", testId],
    queryFn: async () => {
      const { data, error } = await supabase.from("tests").select("*").eq("id", testId).single();
      if (error) throw error; return data;
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
      }).eq("id", testId);
      if (error) throw error;
      toast.success("Test saved");
    } catch (e) { toast.error((e as Error).message); } finally { setSaving(false); }
  };

  const addQ = () => setQuestions([...questions, { type: "multiple_choice", question: { en: "" }, options: [{ en: "" }, { en: "" }], answer: 0 }]);
  const updateQ = (i: number, p: Partial<Question>) => setQuestions(questions.map((qq, k) => (k === i ? { ...qq, ...p } : qq)));
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
        <div className="grid sm:grid-cols-3 gap-3">
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
              <option value="unit">unit</option>
              <option value="term">term</option>
              <option value="annual">annual</option>
            </select>
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
          <Card className="p-8 text-center text-muted-foreground">No questions yet.</Card>
        )}
      </div>
    </div>
  );
}