import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Library, Plus } from "lucide-react";
import type { LearningQuestion } from "@/components/learning/QuestionRenderer";

export function QuestionBankPicker({
  defaultSubjectId,
  defaultLessonId,
  onPick,
}: {
  defaultSubjectId?: string | null;
  defaultLessonId?: string | null;
  onPick: (questions: LearningQuestion[]) => void;
}) {
  const { tr } = useI18n();
  const [open, setOpen] = useState(false);
  const [subjectId, setSubjectId] = useState(defaultSubjectId ?? "");
  const [lessonId, setLessonId] = useState(defaultLessonId ?? "");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const subjects = useQuery({
    queryKey: ["picker-subjects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subjects")
        .select("id, code, name, classes(code, boards(code, is_active))")
        .order("sort_order");
      if (error) throw error;
      return (data ?? []).filter((s: any) => s.classes?.boards?.is_active !== false);
    },
    enabled: open,
  });

  const lessons = useQuery({
    queryKey: ["picker-lessons", subjectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("id, code, title, units!inner(subject_id)")
        .eq("units.subject_id", subjectId)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
    enabled: open && !!subjectId,
  });

  const list = useQuery({
    queryKey: ["picker-qb", subjectId, lessonId],
    queryFn: async () => {
      let q = supabase
        .from("question_bank")
        .select("id, payload, question_type, difficulty, learning_outcome, subject_id, lesson_id, subjects(name)");
      if (subjectId) q = q.eq("subject_id", subjectId);
      if (lessonId) q = q.eq("lesson_id", lessonId);
      const { data, error } = await q.order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data ?? [];
    },
    enabled: open,
  });

  const filtered = (list.data ?? []).filter((row: any) => {
    if (!search) return true;
    const txt = (row.payload?.question?.en ?? "").toLowerCase();
    return txt.includes(search.toLowerCase());
  });

  const addSelected = () => {
    const items: LearningQuestion[] = filtered
      .filter((r: any) => selected[r.id])
      .map((r: any) => ({ type: r.question_type, ...r.payload }));
    if (items.length === 0) return;
    onPick(items);
    setSelected({});
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary"><Library className="h-3 w-3 mr-1" /> From Question Bank</Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader><DialogTitle>Pick questions from bank</DialogTitle></DialogHeader>
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <Label>Subject</Label>
            <select value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setLessonId(""); }} className="w-full rounded-md border border-input bg-card px-3 py-2">
              <option value="">All</option>
              {(subjects.data ?? []).map((s: any) => (
                <option key={s.id} value={s.id}>{s.classes?.boards?.code} · {s.classes?.code} · {tr(s.name)}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Lesson</Label>
            <select value={lessonId} onChange={(e) => setLessonId(e.target.value)} className="w-full rounded-md border border-input bg-card px-3 py-2" disabled={!subjectId}>
              <option value="">All in subject</option>
              {(lessons.data ?? []).map((l: any) => (
                <option key={l.id} value={l.id}>{l.code} · {(l.title as any)?.en}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Search</Label>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="text…" />
          </div>
        </div>
        <div className="max-h-80 overflow-y-auto space-y-2">
          {filtered.map((row: any) => (
            <Card key={row.id} className="p-3 flex items-start gap-3">
              <input type="checkbox" checked={!!selected[row.id]} onChange={(e) => setSelected({ ...selected, [row.id]: e.target.checked })} className="mt-1" />
              <div className="flex-1 min-w-0">
                <div className="font-bold truncate">{row.payload?.question?.en ?? "(no en)"}</div>
                <div className="text-xs text-muted-foreground">{row.question_type} · {row.difficulty}</div>
              </div>
            </Card>
          ))}
          {filtered.length === 0 && <p className="text-center text-sm text-muted-foreground py-6">No matching questions.</p>}
        </div>
        <DialogFooter>
          <Button onClick={addSelected} disabled={Object.values(selected).filter(Boolean).length === 0}>
            <Plus className="h-4 w-4 mr-1" /> Add {Object.values(selected).filter(Boolean).length} question(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}