import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Download, Plus, Users, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";
import {
  createTeacherAssignment,
  deleteTeacherAssignment,
  exportTargetsCsv,
  fetchTargetsForAssignment,
  fetchTeacherAssignments,
  type TeacherAssignmentKind,
  type TeacherAssignmentScope,
  type TeacherAssignmentRow,
} from "@/lib/teacher-assignments";
import { getText as trText } from "@/lib/text";

export const Route = createFileRoute("/_authenticated/admin/teacher-assignments")({
  head: () => ({ meta: [{ title: "Teacher Assignments — Admin" }] }),
  component: TeacherAssignmentsPage,
});

function TeacherAssignmentsPage() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const { data: assignments = [], refetch } = useQuery({
    queryKey: ["teacher-assignments"],
    queryFn: fetchTeacherAssignments,
  });

  return (
    <div className="grid lg:grid-cols-5 gap-4">
      <div className="lg:col-span-2">
        <NewAssignmentForm
          onCreated={() => {
            qc.invalidateQueries({ queryKey: ["teacher-assignments"] });
            refetch();
          }}
          createdBy={user?.id ?? null}
        />
      </div>
      <div className="lg:col-span-3 space-y-3">
        <h2 className="font-extrabold text-lg">Assignments ({assignments.length})</h2>
        {assignments.length === 0 && (
          <Card className="p-8 text-center text-muted-foreground">No assignments yet.</Card>
        )}
        {assignments.map((a) => (
          <AssignmentCard key={a.id} a={a} onDeleted={() => refetch()} />
        ))}
      </div>
    </div>
  );
}

function NewAssignmentForm({ onCreated, createdBy }: { onCreated: () => void; createdBy: string | null }) {
  const [kind, setKind] = useState<TeacherAssignmentKind>("lesson");
  const [scope, setScope] = useState<TeacherAssignmentScope>("class");
  const [classId, setClassId] = useState<string>("");
  const [section, setSection] = useState<string>("");
  const [subjectId, setSubjectId] = useState<string>("");
  const [unitId, setUnitId] = useState<string>("");
  const [lessonId, setLessonId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [studentIds, setStudentIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const { data: classes = [] } = useQuery({
    queryKey: ["classes-all"],
    queryFn: async () => {
      const { data } = await supabase.from("classes").select("id, name, sort_order").order("sort_order");
      return data ?? [];
    },
  });
  const { data: subjects = [] } = useQuery({
    queryKey: ["subjects-by-class", classId],
    enabled: !!classId,
    queryFn: async () => {
      const { data } = await supabase.from("subjects").select("id, name, sort_order").eq("class_id", classId).order("sort_order");
      return data ?? [];
    },
  });
  const { data: units = [] } = useQuery({
    queryKey: ["units-by-subject", subjectId],
    enabled: !!subjectId,
    queryFn: async () => {
      const { data } = await supabase.from("units").select("id, title, sort_order").eq("subject_id", subjectId).order("sort_order");
      return data ?? [];
    },
  });
  const { data: lessons = [] } = useQuery({
    queryKey: ["lessons-by-unit", unitId],
    enabled: !!unitId,
    queryFn: async () => {
      const { data } = await supabase.from("lessons").select("id, title, sort_order").eq("unit_id", unitId).order("sort_order");
      return data ?? [];
    },
  });
  const { data: students = [] } = useQuery({
    queryKey: ["students-by-class", classId],
    enabled: !!classId && scope !== "class",
    queryFn: async () => {
      const { data } = await supabase
        .from("student_profiles")
        .select("id, display_name, section")
        .eq("class_id", classId)
        .order("display_name");
      return data ?? [];
    },
  });

  const sections = useMemo(() => {
    const s = new Set<string>();
    (students as any[]).forEach((st) => st.section && s.add(st.section));
    return Array.from(s);
  }, [students]);

  const submit = async () => {
    if (!title.trim()) return toast.error("Title required");
    if (!classId) return toast.error("Pick a class");
    if (scope === "section" && !section) return toast.error("Pick a section");
    if (scope === "students" && studentIds.length === 0) return toast.error("Pick at least one student");
    setSaving(true);
    try {
      await createTeacherAssignment(
        {
          kind,
          scope,
          class_id: classId,
          section: scope === "section" ? section : null,
          student_ids: scope === "students" ? studentIds : undefined,
          subject_id: subjectId || null,
          unit_id: unitId || null,
          lesson_id: lessonId || null,
          title: title.trim(),
          notes: notes.trim() || null,
          due_date: dueDate || null,
        },
        createdBy,
      );
      toast.success("Assignment created");
      setTitle("");
      setNotes("");
      setDueDate("");
      setStudentIds([]);
      onCreated();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-4 space-y-3 sticky top-4">
      <h2 className="font-extrabold text-lg flex items-center gap-2"><Plus className="h-4 w-4" /> New Assignment</h2>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Kind</Label>
          <Select value={kind} onValueChange={(v) => setKind(v as TeacherAssignmentKind)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="lesson">Lesson</SelectItem>
              <SelectItem value="practice">Practice</SelectItem>
              <SelectItem value="homework">Homework</SelectItem>
              <SelectItem value="test">Test</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Scope</Label>
          <Select value={scope} onValueChange={(v) => setScope(v as TeacherAssignmentScope)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="class">Whole class</SelectItem>
              <SelectItem value="section">Section</SelectItem>
              <SelectItem value="students">Selected students</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label>Class</Label>
        <Select value={classId} onValueChange={(v) => { setClassId(v); setSubjectId(""); setUnitId(""); setLessonId(""); setStudentIds([]); }}>
          <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
          <SelectContent>
            {(classes as any[]).map((c) => (
              <SelectItem key={c.id} value={c.id}>{trText(c.name)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {scope === "section" && (
        <div>
          <Label>Section</Label>
          {sections.length ? (
            <Select value={section} onValueChange={setSection}>
              <SelectTrigger><SelectValue placeholder="Select section" /></SelectTrigger>
              <SelectContent>
                {sections.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          ) : (
            <Input placeholder="Section label (e.g. A)" value={section} onChange={(e) => setSection(e.target.value)} />
          )}
        </div>
      )}

      {scope === "students" && (
        <div>
          <Label>Students ({studentIds.length} selected)</Label>
          <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
            {(students as any[]).map((s) => (
              <label key={s.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={studentIds.includes(s.id)}
                  onCheckedChange={(c) => {
                    setStudentIds(c ? [...studentIds, s.id] : studentIds.filter((x) => x !== s.id));
                  }}
                />
                <span>{s.display_name}{s.section ? ` · ${s.section}` : ""}</span>
              </label>
            ))}
            {students.length === 0 && classId && <div className="text-xs text-muted-foreground">No students in this class</div>}
          </div>
        </div>
      )}

      <div>
        <Label>Subject (optional)</Label>
        <Select value={subjectId || "__none"} onValueChange={(v) => { const x = v === "__none" ? "" : v; setSubjectId(x); setUnitId(""); setLessonId(""); }}>
          <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none">— none —</SelectItem>
            {(subjects as any[]).map((s) => <SelectItem key={s.id} value={s.id}>{trText(s.name)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {subjectId && (
        <div>
          <Label>Unit (optional)</Label>
          <Select value={unitId || "__none"} onValueChange={(v) => { const x = v === "__none" ? "" : v; setUnitId(x); setLessonId(""); }}>
            <SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">— none —</SelectItem>
              {(units as any[]).map((u) => <SelectItem key={u.id} value={u.id}>{trText(u.title)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {unitId && (
        <div>
          <Label>Lesson (optional)</Label>
          <Select value={lessonId || "__none"} onValueChange={(v) => setLessonId(v === "__none" ? "" : v)}>
            <SelectTrigger><SelectValue placeholder="Select lesson" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">— none —</SelectItem>
              {(lessons as any[]).map((l) => <SelectItem key={l.id} value={l.id}>{trText(l.title)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      <div>
        <Label>Title</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Complete COMMON_PLANTS practice" />
      </div>
      <div>
        <Label>Notes (optional)</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </div>
      <div>
        <Label>Due date (optional)</Label>
        <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      </div>
      <Button onClick={submit} disabled={saving} className="w-full">
        {saving ? "Assigning…" : "Assign"}
      </Button>
    </Card>
  );
}

const KIND_LABEL: Record<TeacherAssignmentKind, string> = {
  lesson: "Lesson",
  practice: "Practice",
  homework: "Homework",
  test: "Test",
};

function AssignmentCard({ a, onDeleted }: { a: TeacherAssignmentRow; onDeleted: () => void }) {
  const [open, setOpen] = useState(false);
  const { data: targets = [], refetch } = useQuery({
    queryKey: ["teacher-assignment-targets", a.id],
    enabled: open,
    queryFn: () => fetchTargetsForAssignment(a.id),
  });

  const completed = (targets as any[]).filter((t) => !!t.completed_at).length;
  const total = targets.length;
  const pct = total ? Math.round((completed / total) * 100) : 0;

  const onExport = () => {
    const csv = exportTargetsCsv(targets as any[], a);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${a.title.replace(/[^a-z0-9]+/gi, "_")}_report.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const onDelete = async () => {
    if (!confirm("Delete this assignment for all students?")) return;
    try {
      await deleteTeacherAssignment(a.id);
      toast.success("Deleted");
      onDeleted();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline">{KIND_LABEL[a.kind]}</Badge>
            <Badge variant="secondary">{a.scope}</Badge>
            {a.due_date && <Badge>Due {a.due_date}</Badge>}
          </div>
          <div className="font-extrabold mt-1 truncate">{a.title}</div>
          {a.notes && <div className="text-xs text-muted-foreground line-clamp-2">{a.notes}</div>}
          <div className="text-xs text-muted-foreground mt-1">Assigned {a.assigned_date}</div>
        </div>
        <Button size="sm" variant="outline" onClick={() => setOpen(!open)}>
          <Users className="h-4 w-4 mr-1" /> {open ? "Hide" : "Students"}
        </Button>
        <Button size="icon" variant="ghost" onClick={onDelete}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
      {open && (
        <div className="mt-3 border-t pt-3 space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="text-sm">
              <span className="font-bold">{completed}/{total}</span> completed · <span className="font-bold">{pct}%</span>
            </div>
            <Button size="sm" variant="outline" onClick={onExport} disabled={!targets.length}>
              <Download className="h-4 w-4 mr-1" /> Export CSV
            </Button>
          </div>
          <div className="max-h-72 overflow-y-auto divide-y">
            {(targets as any[]).map((t) => (
              <div key={t.id} className="py-2 flex items-center gap-2 text-sm">
                {t.completed_at ? (
                  <CheckCircle2 className="h-4 w-4 text-success" />
                ) : (
                  <Clock className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="flex-1 truncate">
                  {t.student_profiles?.display_name ?? t.student_profile_id}
                  {t.student_profiles?.section ? ` · ${t.student_profiles.section}` : ""}
                </span>
                <span className="text-xs text-muted-foreground">
                  {t.completed_at ? `Done${t.score != null ? ` · ${t.score}%` : ""}` : "Pending"}
                </span>
              </div>
            ))}
            {targets.length === 0 && <div className="text-xs text-muted-foreground py-2">No targets.</div>}
          </div>
          <Button size="sm" variant="ghost" onClick={() => refetch()}>Refresh</Button>
        </div>
      )}
    </Card>
  );
}