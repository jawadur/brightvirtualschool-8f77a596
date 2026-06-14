import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { I18nField } from "@/components/admin/I18nField";
import { Plus, Trash2, Save, Library } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/questions")({
  component: QuestionBank,
});

type Payload = { question: Record<string, string>; options: Record<string, string>[]; answer: number };

function QuestionBank() {
  const qc = useQueryClient();
  const { tr } = useI18n();
  const [subjectId, setSubjectId] = useState("");
  const [difficulty, setDifficulty] = useState("easy");
  const [outcome, setOutcome] = useState("");
  const [payload, setPayload] = useState<Payload>({
    question: { en: "" }, options: [{ en: "" }, { en: "" }], answer: 0,
  });

  const subjects = useQuery({
    queryKey: ["all-subjects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subjects")
        .select("id, code, name, classes(code, boards(code))")
        .order("sort_order");
      if (error) throw error; return data ?? [];
    },
  });

  const list = useQuery({
    queryKey: ["question-bank", subjectId],
    queryFn: async () => {
      let q = supabase.from("question_bank").select("id, payload, difficulty, learning_outcome, subject_id, subjects(code, name)");
      if (subjectId) q = q.eq("subject_id", subjectId);
      const { data, error } = await q.order("created_at", { ascending: false }).limit(100);
      if (error) throw error; return data ?? [];
    },
  });

  const add = async () => {
    if (!subjectId) { toast.error("Pick a subject"); return; }
    const { error } = await supabase.from("question_bank").insert({
      subject_id: subjectId, difficulty, question_type: "multiple_choice",
      learning_outcome: outcome || null, payload: payload as any,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Question added");
    setPayload({ question: { en: "" }, options: [{ en: "" }, { en: "" }], answer: 0 });
    setOutcome("");
    qc.invalidateQueries({ queryKey: ["question-bank"] });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Library className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-extrabold">Question Bank</h1>
      </div>
      <Card className="p-4 space-y-3">
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <Label>Subject</Label>
            <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="w-full rounded-md border border-input bg-card px-3 py-2">
              <option value="">Select…</option>
              {(subjects.data ?? []).map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.classes?.boards?.code} · {s.classes?.code} · {s.code} ({tr(s.name)})
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Difficulty</Label>
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="w-full rounded-md border border-input bg-card px-3 py-2">
              <option value="easy">easy</option>
              <option value="medium">medium</option>
              <option value="hard">hard</option>
            </select>
          </div>
          <div>
            <Label>Learning outcome (optional)</Label>
            <Input value={outcome} onChange={(e) => setOutcome(e.target.value)} placeholder="LO-1.2" />
          </div>
        </div>
        <I18nField label="Question" value={payload.question} onChange={(v) => setPayload({ ...payload, question: v })} required />
        <Label>Options (select correct)</Label>
        {payload.options.map((opt, i) => (
          <div key={i} className="flex items-start gap-2 rounded-xl border p-3">
            <input type="radio" checked={payload.answer === i} onChange={() => setPayload({ ...payload, answer: i })} className="mt-3" />
            <div className="flex-1">
              <I18nField label={`Option ${i + 1}`} value={opt} onChange={(v) => {
                const options = [...payload.options]; options[i] = v;
                setPayload({ ...payload, options });
              }} required />
            </div>
            <Button size="icon" variant="ghost" onClick={() => {
              const options = payload.options.filter((_, k) => k !== i);
              setPayload({ ...payload, options, answer: Math.min(payload.answer, options.length - 1) });
            }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </div>
        ))}
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setPayload({ ...payload, options: [...payload.options, { en: "" }] })}>
            <Plus className="h-3 w-3 mr-1" />Option
          </Button>
          <div className="flex-1" />
          <Button onClick={add}><Save className="h-4 w-4 mr-1" />Add to bank</Button>
        </div>
      </Card>

      <h2 className="font-extrabold text-lg">Bank ({list.data?.length ?? 0})</h2>
      <div className="grid gap-2">
        {(list.data ?? []).map((row: any) => {
          const p = row.payload as Payload;
          return (
            <Card key={row.id} className="p-3 flex items-start gap-3">
              <div className="flex-1">
                <div className="font-bold">{tr(p?.question)}</div>
                <div className="text-xs text-muted-foreground">
                  {tr(row.subjects?.name)} · {row.difficulty}{row.learning_outcome ? ` · ${row.learning_outcome}` : ""}
                </div>
              </div>
              <Button size="icon" variant="ghost" onClick={async () => {
                if (!confirm("Delete question?")) return;
                const { error } = await supabase.from("question_bank").delete().eq("id", row.id);
                if (error) { toast.error(error.message); return; }
                qc.invalidateQueries({ queryKey: ["question-bank"] });
              }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}