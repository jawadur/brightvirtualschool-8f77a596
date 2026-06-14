import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Save, Library } from "lucide-react";
import { toast } from "sonner";
import { QuestionEditor, QUESTION_TYPES, emptyQuestion } from "@/components/admin/QuestionEditor";
import type { LearningQuestion } from "@/components/learning/QuestionRenderer";

export const Route = createFileRoute("/_authenticated/admin/questions")({
  component: QuestionBank,
});

function QuestionBank() {
  const qc = useQueryClient();
  const { tr } = useI18n();
  const [subjectId, setSubjectId] = useState("");
  const [lessonId, setLessonId] = useState("");
  const [filterSubject, setFilterSubject] = useState("");
  const [difficulty, setDifficulty] = useState("easy");
  const [outcome, setOutcome] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [question, setQuestion] = useState<LearningQuestion>(emptyQuestion("multiple_choice"));

  const subjects = useQuery({
    queryKey: ["all-subjects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subjects")
        .select("id, code, name, classes(code, boards(code, is_active))")
        .order("sort_order");
      if (error) throw error;
      return (data ?? []).filter((s: any) => s.classes?.boards?.is_active !== false);
    },
  });

  const lessons = useQuery({
    queryKey: ["qb-lessons", subjectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("id, code, title, units!inner(subject_id)")
        .eq("units.subject_id", subjectId)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!subjectId,
  });

  const list = useQuery({
    queryKey: ["question-bank", filterSubject],
    queryFn: async () => {
      let q = supabase
        .from("question_bank")
        .select("id, payload, question_type, difficulty, learning_outcome, subject_id, lesson_id, subjects(name)");
      if (filterSubject) q = q.eq("subject_id", filterSubject);
      const { data, error } = await q.order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const add = async () => {
    if (!subjectId) { toast.error("Pick a subject"); return; }
    const { type, ...payload } = question as any;
    const meta: Record<string, string> = {};
    if (audioUrl) meta.audio_url = audioUrl;
    const { error } = await supabase.from("question_bank").insert({
      subject_id: subjectId,
      lesson_id: lessonId || null,
      difficulty,
      question_type: type,
      learning_outcome: outcome || null,
      payload,
      metadata: meta as any,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Question added");
    setQuestion(emptyQuestion(type));
    setOutcome("");
    setAudioUrl("");
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
            <select value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setLessonId(""); }} className="w-full rounded-md border border-input bg-card px-3 py-2">
              <option value="">Select…</option>
              {(subjects.data ?? []).map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.classes?.boards?.code} · {s.classes?.code} · {s.code} ({tr(s.name)})
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Lesson (optional)</Label>
            <select value={lessonId} onChange={(e) => setLessonId(e.target.value)} className="w-full rounded-md border border-input bg-card px-3 py-2" disabled={!subjectId}>
              <option value="">— Subject-wide —</option>
              {(lessons.data ?? []).map((l: any) => (
                <option key={l.id} value={l.id}>{l.code} · {(l.title as any)?.en}</option>
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
            <Label>Type</Label>
            <select
              value={question.type}
              onChange={(e) => setQuestion(emptyQuestion(e.target.value as LearningQuestion["type"]))}
              className="w-full rounded-md border border-input bg-card px-3 py-2"
            >
              {QUESTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <Label>Learning outcome (optional)</Label>
            <Input value={outcome} onChange={(e) => setOutcome(e.target.value)} placeholder="LO-1.2" />
          </div>
          <div>
            <Label>Audio URL (optional)</Label>
            <Input value={audioUrl} onChange={(e) => setAudioUrl(e.target.value)} placeholder="https://..." />
          </div>
        </div>
        <QuestionEditor question={question} onChange={setQuestion} />
        <div className="flex justify-end">
          <Button onClick={add}><Save className="h-4 w-4 mr-1" />Add to bank</Button>
        </div>
      </Card>

      <div className="flex items-end gap-3">
        <div className="flex-1">
          <Label>Filter by subject</Label>
          <select value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)} className="w-full rounded-md border border-input bg-card px-3 py-2">
            <option value="">All subjects</option>
            {(subjects.data ?? []).map((s: any) => (
              <option key={s.id} value={s.id}>{s.classes?.boards?.code} · {s.classes?.code} · {tr(s.name)}</option>
            ))}
          </select>
        </div>
        <div className="text-sm text-muted-foreground">{list.data?.length ?? 0} questions</div>
      </div>

      <div className="grid gap-2">
        {(list.data ?? []).map((row: any) => (
          <Card key={row.id} className="p-3 flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="font-bold truncate">{row.payload?.question?.en ?? "(no en)"}</div>
              <div className="text-xs text-muted-foreground">
                {tr(row.subjects?.name)} · {row.question_type} · {row.difficulty}{row.learning_outcome ? ` · ${row.learning_outcome}` : ""}
              </div>
            </div>
            <Button size="icon" variant="ghost" onClick={async () => {
              if (!confirm("Delete question?")) return;
              const { error } = await supabase.from("question_bank").delete().eq("id", row.id);
              if (error) { toast.error(error.message); return; }
              qc.invalidateQueries({ queryKey: ["question-bank"] });
            }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </Card>
        ))}
      </div>
    </div>
  );
}