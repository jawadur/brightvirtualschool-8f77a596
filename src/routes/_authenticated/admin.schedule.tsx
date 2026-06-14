import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, Copy, CalendarCheck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/schedule")({
  component: AdminSchedule,
});

function tr(v: any) {
  if (!v) return "";
  if (typeof v === "string") return v;
  return v.en || v.te || v.hi || Object.values(v)[0] || "";
}

function AdminSchedule() {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [classId, setClassId] = useState<string>("");

  const { data: classes = [] } = useQuery({
    queryKey: ["admin-classes-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select("id, name, code, boards!inner(id, name, code, is_active)")
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!classId && classes.length) setClassId((classes as any[])[0].id);
  }, [classes, classId]);

  const { data: subjects = [] } = useQuery({
    queryKey: ["admin-subjects", classId],
    enabled: !!classId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subjects")
        .select("id, name, code, icon, color")
        .eq("class_id", classId)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const subjectIds = (subjects as any[]).map((s) => s.id);

  const { data: lessons = [] } = useQuery({
    queryKey: ["admin-lessons-for-class", classId, subjectIds.join(",")],
    enabled: subjectIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("id, title, unit_id, units!inner(subject_id)")
        .in("units.subject_id", subjectIds);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["admin-assignments-for-class", subjectIds.join(",")],
    enabled: subjectIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assignments")
        .select("id, title, subject_id, lesson_id")
        .in("subject_id", subjectIds);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: tests = [] } = useQuery({
    queryKey: ["admin-tests-for-class", subjectIds.join(",")],
    enabled: subjectIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tests")
        .select("id, title, subject_id")
        .in("subject_id", subjectIds);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: scheduleRows = [], refetch } = useQuery({
    queryKey: ["admin-schedule", date, classId],
    enabled: !!classId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_schedule")
        .select("*")
        .eq("date", date)
        .eq("class_id", classId)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const subjectBy = useMemo(() => new Map((subjects as any[]).map((s) => [s.id, s])), [subjects]);
  const lessonsBySubject = useMemo(() => {
    const m = new Map<string, any[]>();
    (lessons as any[]).forEach((l) => {
      const sid = l.units?.subject_id;
      if (!sid) return;
      if (!m.has(sid)) m.set(sid, []);
      m.get(sid)!.push(l);
    });
    return m;
  }, [lessons]);
  const assignmentsBySubject = useMemo(() => {
    const m = new Map<string, any[]>();
    (assignments as any[]).forEach((a) => {
      if (!a.subject_id) return;
      if (!m.has(a.subject_id)) m.set(a.subject_id, []);
      m.get(a.subject_id)!.push(a);
    });
    return m;
  }, [assignments]);
  const testsBySubject = useMemo(() => {
    const m = new Map<string, any[]>();
    (tests as any[]).forEach((t) => {
      if (!t.subject_id) return;
      if (!m.has(t.subject_id)) m.set(t.subject_id, []);
      m.get(t.subject_id)!.push(t);
    });
    return m;
  }, [tests]);

  async function addRow() {
    if (!classId || !subjects.length) return;
    const sort_order = (scheduleRows as any[]).length + 1;
    const { error } = await supabase.from("daily_schedule").insert({
      date,
      class_id: classId,
      subject_id: (subjects as any[])[0].id,
      sort_order,
    });
    if (error) toast.error(error.message);
    else refetch();
  }

  async function updateRow(id: string, patch: any) {
    const { error } = await supabase.from("daily_schedule").update(patch).eq("id", id);
    if (error) toast.error(error.message);
    else refetch();
  }

  async function deleteRow(id: string) {
    const { error } = await supabase.from("daily_schedule").delete().eq("id", id);
    if (error) toast.error(error.message);
    else refetch();
  }

  async function copyFromYesterday() {
    if (!classId) return;
    const y = new Date(date);
    y.setDate(y.getDate() - 1);
    const prev = y.toISOString().slice(0, 10);
    const { data: prevRows, error } = await supabase
      .from("daily_schedule")
      .select("subject_id, lesson_id, assignment_id, test_id, sort_order")
      .eq("date", prev)
      .eq("class_id", classId)
      .order("sort_order");
    if (error) { toast.error(error.message); return; }
    if (!prevRows?.length) { toast.error("No schedule for previous day"); return; }
    const startIdx = (scheduleRows as any[]).length;
    const insert = prevRows.map((r: any, i: number) => ({
      ...r,
      date,
      class_id: classId,
      sort_order: startIdx + i + 1,
    }));
    const { error: e2 } = await supabase.from("daily_schedule").insert(insert);
    if (e2) toast.error(e2.message);
    else { toast.success(`Copied ${insert.length} entries`); refetch(); qc.invalidateQueries({ queryKey: ["today-schedule"] }); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <CalendarCheck className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-extrabold">Daily Schedule Builder</h1>
      </div>

      <Card className="p-4 grid sm:grid-cols-3 gap-3">
        <div>
          <Label>Date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <Label>Class</Label>
          <Select value={classId} onValueChange={setClassId}>
            <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
            <SelectContent>
              {(classes as any[]).map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {tr(c.boards?.name)} — {tr(c.name)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end gap-2">
          <Button onClick={addRow} className="gap-1"><Plus className="h-4 w-4" /> Add subject</Button>
          <Button variant="outline" onClick={copyFromYesterday} className="gap-1"><Copy className="h-4 w-4" /> Copy prev day</Button>
        </div>
      </Card>

      {(scheduleRows as any[]).length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          No schedule for this date yet. Add a subject to begin.
        </Card>
      ) : (
        <div className="space-y-3">
          {(scheduleRows as any[]).map((row) => {
            const subj = subjectBy.get(row.subject_id);
            const subjLessons = lessonsBySubject.get(row.subject_id) ?? [];
            const subjAssigns = assignmentsBySubject.get(row.subject_id) ?? [];
            const subjTests = testsBySubject.get(row.subject_id) ?? [];
            return (
              <Card key={row.id} className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    className="w-20"
                    value={row.sort_order}
                    onChange={(e) => updateRow(row.id, { sort_order: Number(e.target.value) })}
                  />
                  <div className="font-extrabold flex-1">{tr(subj?.name) || "Subject"}</div>
                  <Button size="icon" variant="ghost" onClick={() => deleteRow(row.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid sm:grid-cols-4 gap-2">
                  <div>
                    <Label className="text-xs">Subject</Label>
                    <Select value={row.subject_id} onValueChange={(v) => updateRow(row.id, { subject_id: v, lesson_id: null, assignment_id: null, test_id: null })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(subjects as any[]).map((s) => (
                          <SelectItem key={s.id} value={s.id}>{tr(s.name)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <PickerCell label="Lesson" value={row.lesson_id} options={subjLessons.map((l) => ({ value: l.id, label: tr(l.title) }))} onChange={(v) => updateRow(row.id, { lesson_id: v })} />
                  <PickerCell label="Assignment" value={row.assignment_id} options={subjAssigns.map((a) => ({ value: a.id, label: tr(a.title) }))} onChange={(v) => updateRow(row.id, { assignment_id: v })} />
                  <PickerCell label="Test" value={row.test_id} options={subjTests.map((t) => ({ value: t.id, label: tr(t.title) }))} onChange={(v) => updateRow(row.id, { test_id: v })} />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PickerCell({ label, value, options, onChange }: { label: string; value: string | null; options: { value: string; label: string }[]; onChange: (v: string | null) => void }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Select value={value ?? "__none"} onValueChange={(v) => onChange(v === "__none" ? null : v)}>
        <SelectTrigger><SelectValue placeholder={`Pick ${label.toLowerCase()}`} /></SelectTrigger>
        <SelectContent>
          <SelectItem value="__none">— None —</SelectItem>
          {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}