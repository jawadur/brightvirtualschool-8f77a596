import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { generateAiQuestions } from "@/lib/ai-question-bank.functions";

export const Route = createFileRoute("/_authenticated/admin/ai-questions")({
  head: () => ({ meta: [{ title: "AI Question Bank — Admin" }] }),
  component: AdminAiQuestions,
});

function AdminAiQuestions() {
  const qc = useQueryClient();
  const { tr } = useI18n();
  const generate = useServerFn(generateAiQuestions);

  const [subjectId, setSubjectId] = useState("");
  const [lessonId, setLessonId] = useState("");
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState<number>(20);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("easy");
  const [language, setLanguage] = useState<"en" | "hi" | "te">("en");
  const [busy, setBusy] = useState(false);

  const subjects = useQuery({
    queryKey: ["aiqb-subjects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subjects")
        .select("id, code, name, class_id, classes(code, label)")
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const lessons = useQuery({
    queryKey: ["aiqb-lessons", subjectId],
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

  const pool = useQuery({
    queryKey: ["aiqb-pool", subjectId, lessonId],
    queryFn: async () => {
      let q = supabase
        .from("ai_question_pool")
        .select("id, topic, difficulty, question_type, language, payload, created_at, lesson_id, subject_id")
        .order("created_at", { ascending: false })
        .limit(200);
      if (subjectId) q = q.eq("subject_id", subjectId);
      if (lessonId) q = q.eq("lesson_id", lessonId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!subjectId,
  });

  const analytics = useQuery({
    queryKey: ["aiqb-analytics", subjectId],
    queryFn: async () => {
      let q = supabase.from("ai_question_analytics").select("*").limit(50);
      if (subjectId) q = q.eq("subject_id", subjectId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!subjectId,
  });

  const subj = (subjects.data ?? []).find((s: any) => s.id === subjectId);

  const runGenerate = async () => {
    if (!subjectId) return toast.error("Pick a subject");
    if (!topic.trim()) return toast.error("Enter a topic");
    setBusy(true);
    try {
      const res = await generate({
        data: {
          subject_id: subjectId,
          lesson_id: lessonId || undefined,
          class_id: (subj as any)?.class_id ?? undefined,
          topic: topic.trim(),
          subject_name: typeof subj?.name === "object" ? tr(subj?.name as any) : String(subj?.code ?? "Subject"),
          class_label: (subj as any)?.classes?.label ? tr((subj as any).classes.label) : (subj as any)?.classes?.code,
          difficulty,
          language,
          count,
          types: ["multiple_choice", "fill_blank"],
        },
      });
      toast.success(`Generated ${res.inserted} questions`);
      qc.invalidateQueries({ queryKey: ["aiqb-pool"] });
      qc.invalidateQueries({ queryKey: ["aiqb-analytics"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Generation failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-extrabold">AI Question Bank</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Generate curriculum-aligned questions on demand. Questions are cached and reused for Practice, Homework, and Tests when their source is set to AI or Mixed.
      </p>

      <Card className="p-4 space-y-3">
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <Label>Subject</Label>
            <select
              value={subjectId}
              onChange={(e) => { setSubjectId(e.target.value); setLessonId(""); }}
              className="w-full rounded-md border border-input bg-card px-3 py-2"
            >
              <option value="">Select…</option>
              {(subjects.data ?? []).map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.classes?.code} · {s.code} ({tr(s.name)})
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Lesson (optional)</Label>
            <select
              value={lessonId}
              onChange={(e) => setLessonId(e.target.value)}
              disabled={!subjectId}
              className="w-full rounded-md border border-input bg-card px-3 py-2"
            >
              <option value="">— Subject-wide pool —</option>
              {(lessons.data ?? []).map((l: any) => (
                <option key={l.id} value={l.id}>
                  {l.code} · {tr(l.title)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Topic</Label>
            <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Before & After numbers, Vowels, Achulu" />
          </div>
          <div>
            <Label>Difficulty</Label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as any)}
              className="w-full rounded-md border border-input bg-card px-3 py-2"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          <div>
            <Label>Language</Label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as any)}
              className="w-full rounded-md border border-input bg-card px-3 py-2"
            >
              <option value="en">English</option>
              <option value="hi">Hindi</option>
              <option value="te">Telugu</option>
            </select>
          </div>
          <div>
            <Label>How many?</Label>
            <select
              value={String(count)}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-full rounded-md border border-input bg-card px-3 py-2"
            >
              {[10, 20, 50].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={runGenerate} disabled={busy}>
            <Sparkles className="h-4 w-4 mr-1" />
            {busy ? "Generating…" : "Generate"}
          </Button>
        </div>
      </Card>

      {subjectId && (
        <>
          <h2 className="text-lg font-extrabold mt-6">Pool ({pool.data?.length ?? 0})</h2>
          <div className="grid gap-2">
            {(pool.data ?? []).map((row: any) => (
              <Card key={row.id} className="p-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-bold truncate">
                    {(row.payload as any)?.question?.en ?? "(no en)"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {row.topic ?? "—"} · {row.question_type} · {row.difficulty} · {row.language}
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={async () => {
                    if (!confirm("Delete this AI question?")) return;
                    const { error } = await supabase.from("ai_question_pool").delete().eq("id", row.id);
                    if (error) return toast.error(error.message);
                    qc.invalidateQueries({ queryKey: ["aiqb-pool"] });
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </Card>
            ))}
            {pool.data?.length === 0 && (
              <div className="text-sm text-muted-foreground">No AI questions yet for this subject. Generate some above.</div>
            )}
          </div>

          <h2 className="text-lg font-extrabold mt-6">Topic accuracy</h2>
          <Card className="p-3">
            {(analytics.data ?? []).length === 0 ? (
              <div className="text-sm text-muted-foreground">No attempts yet.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="py-1">Topic</th><th>Difficulty</th><th>Pool</th><th>Shown</th><th>Correct</th><th>Incorrect</th><th>Accuracy</th>
                  </tr>
                </thead>
                <tbody>
                  {(analytics.data ?? []).map((a: any, i: number) => (
                    <tr key={i} className="border-t">
                      <td className="py-1">{a.topic ?? "—"}</td>
                      <td>{a.difficulty}</td>
                      <td>{a.questions_in_pool}</td>
                      <td>{a.total_shown}</td>
                      <td>{a.total_correct}</td>
                      <td>{a.total_incorrect}</td>
                      <td>{a.accuracy == null ? "—" : `${Math.round(Number(a.accuracy) * 100)}%`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </>
      )}
    </div>
  );
}