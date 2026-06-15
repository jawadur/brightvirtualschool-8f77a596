import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PROGRAMS, type ProgramCode } from "@/lib/program";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";
import { CalendarRange, Copy, Save } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/weekly-planner")({
  component: WeeklyPlanner,
});

function WeeklyPlanner() {
  const { tr } = useI18n();
  const qc = useQueryClient();
  const [program, setProgram] = useState<ProgramCode>("class1");
  const [week, setWeek] = useState<number>(1);
  const [subjectId, setSubjectId] = useState<string>("");

  const { data: subjects = [] } = useQuery({
    queryKey: ["all-subjects"],
    queryFn: async () => {
      const { data } = await supabase
        .from("subjects")
        .select("id, name, classes(name, boards(code))")
        .order("sort_order");
      return (data ?? []) as any[];
    },
  });

  const filteredSubjects = useMemo(() => {
    return subjects.filter((s: any) => {
      const boardCode = s.classes?.boards?.code ?? "";
      const className = typeof s.classes?.name === "object" ? s.classes.name.en ?? "" : "";
      const isKg2 = boardCode === "kg2-bridge" || className.toLowerCase().includes("kg2");
      return program === "kg2_brushup" ? isKg2 : !isKg2;
    });
  }, [subjects, program]);

  const { data: plan } = useQuery({
    queryKey: ["weekly-plan", program, week, subjectId],
    enabled: !!subjectId,
    queryFn: async () => {
      const { data } = await supabase
        .from("weekly_plans")
        .select("*")
        .eq("program_code", program)
        .eq("week_number", week)
        .eq("subject_id", subjectId)
        .maybeSingle();
      return data;
    },
  });

  const { data: lessons = [] } = useQuery({
    queryKey: ["subject-lessons-admin", subjectId],
    enabled: !!subjectId,
    queryFn: async () => {
      const { data } = await supabase
        .from("lessons")
        .select("id, title, sort_order, units!inner(subject_id)")
        .eq("units.subject_id", subjectId)
        .order("sort_order");
      return (data ?? []) as any[];
    },
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["subject-assignments", subjectId],
    enabled: !!subjectId,
    queryFn: async () => {
      const { data } = await supabase.from("assignments").select("id, title").eq("subject_id", subjectId);
      return (data ?? []) as any[];
    },
  });
  const { data: tests = [] } = useQuery({
    queryKey: ["subject-tests", subjectId],
    enabled: !!subjectId,
    queryFn: async () => {
      const { data } = await supabase.from("tests").select("id, title").eq("subject_id", subjectId);
      return (data ?? []) as any[];
    },
  });

  const [selectedLessons, setSelectedLessons] = useState<string[]>([]);
  const [homeworkTitles, setHomeworkTitles] = useState<string>("");
  const [assignmentId, setAssignmentId] = useState<string>("");
  const [testId, setTestId] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  // Sync form with loaded plan
  useMemo(() => {
    setSelectedLessons(plan?.lesson_ids ?? []);
    setHomeworkTitles((plan?.homework_titles ?? []).join("\n"));
    setAssignmentId(plan?.assignment_id ?? "");
    setTestId(plan?.test_id ?? "");
    setNotes(plan?.notes ?? "");
  }, [plan?.id]);

  async function save() {
    if (!subjectId) return toast.error("Pick a subject");
    const row = {
      program_code: program,
      subject_id: subjectId,
      week_number: week,
      lesson_ids: selectedLessons,
      homework_titles: homeworkTitles.split("\n").map((s) => s.trim()).filter(Boolean),
      assignment_id: assignmentId || null,
      test_id: testId || null,
      notes: notes || null,
    };
    const { error } = await supabase.from("weekly_plans").upsert(row, { onConflict: "program_code,subject_id,week_number" });
    if (error) return toast.error(error.message);
    toast.success(`Saved Week ${week}`);
    qc.invalidateQueries({ queryKey: ["weekly-plan", program, week, subjectId] });
  }

  async function copyPrevious() {
    if (week <= 1 || !subjectId) return;
    const { data } = await supabase
      .from("weekly_plans")
      .select("*")
      .eq("program_code", program)
      .eq("week_number", week - 1)
      .eq("subject_id", subjectId)
      .maybeSingle();
    if (!data) return toast.error(`No Week ${week - 1} plan to copy`);
    setSelectedLessons(data.lesson_ids ?? []);
    setHomeworkTitles((data.homework_titles ?? []).join("\n"));
    setAssignmentId(data.assignment_id ?? "");
    setTestId(data.test_id ?? "");
    setNotes(data.notes ?? "");
    toast.success(`Copied from Week ${week - 1}`);
  }

  function toggleLesson(id: string) {
    setSelectedLessons((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  return (
    <div className="space-y-5">
      <header className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
        <CalendarRange className="h-8 w-8 text-primary shrink-0" />
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold truncate">Weekly Planner</h1>
          <p className="text-sm text-muted-foreground">Plan each week of teaching for both programs.</p>
        </div>
      </header>

      <Card className="p-4">
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <Label>Program</Label>
            <Select value={program} onValueChange={(v) => { setProgram(v as ProgramCode); setSubjectId(""); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PROGRAMS.map((p) => <SelectItem key={p.code} value={p.code}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Week #</Label>
            <Input type="number" min={1} max={52} value={week} onChange={(e) => setWeek(parseInt(e.target.value || "1"))} />
          </div>
          <div>
            <Label>Subject</Label>
            <Select value={subjectId} onValueChange={setSubjectId}>
              <SelectTrigger><SelectValue placeholder="Pick subject" /></SelectTrigger>
              <SelectContent>
                {filteredSubjects.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>{tr(s.name)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {subjectId && (
        <>
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-extrabold">Lessons covered</h2>
              <Badge variant="secondary">{selectedLessons.length} selected</Badge>
            </div>
            {lessons.length === 0 ? (
              <p className="text-sm text-muted-foreground">No lessons published for this subject.</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-2 max-h-72 overflow-auto">
                {lessons.map((l: any) => (
                  <label key={l.id} className="flex items-center gap-2 rounded-xl border p-2 cursor-pointer hover:bg-muted/40">
                    <input type="checkbox" checked={selectedLessons.includes(l.id)} onChange={() => toggleLesson(l.id)} />
                    <span className="text-sm truncate">{tr(l.title)}</span>
                  </label>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-4 grid gap-3">
            <div>
              <Label>Homework (one per line)</Label>
              <Textarea rows={4} value={homeworkTitles} onChange={(e) => setHomeworkTitles(e.target.value)} placeholder="e.g.\nWrite letter A 10 times\nRead lesson aloud" />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>Weekly Assignment</Label>
                <Select value={assignmentId || "none"} onValueChange={(v) => setAssignmentId(v === "none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— None —</SelectItem>
                    {assignments.map((a: any) => <SelectItem key={a.id} value={a.id}>{tr(a.title)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Weekly Test {program === "kg2_brushup" && <span className="text-xs text-muted-foreground">(optional)</span>}</Label>
                <Select value={testId || "none"} onValueChange={(v) => setTestId(v === "none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— None —</SelectItem>
                    {tests.map((t: any) => <SelectItem key={t.id} value={t.id}>{tr(t.title)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={save} className="rounded-2xl"><Save className="h-4 w-4 mr-1" /> Save Week {week}</Button>
              <Button variant="outline" onClick={copyPrevious} disabled={week <= 1} className="rounded-2xl"><Copy className="h-4 w-4 mr-1" /> Copy from Week {week - 1}</Button>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}