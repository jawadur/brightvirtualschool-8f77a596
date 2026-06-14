import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { I18nField } from "@/components/admin/I18nField";
import { ChevronRight, Plus, Pencil, Trash2, BookOpen } from "lucide-react";
import { toast } from "sonner";

// vals are loose; entity inserts cast as needed
type Vals = Record<string, any>;

export const Route = createFileRoute("/_authenticated/admin/")({
  component: CurriculumPage,
});

type Board = { id: string; code: string; name: Record<string, string>; sort_order: number; is_active: boolean };
type Klass = { id: string; board_id: string; code: string; name: Record<string, string>; sort_order: number };
type Subject = { id: string; class_id: string; code: string; name: Record<string, string>; icon: string | null; color: string | null; sort_order: number };
type Unit = { id: string; subject_id: string; code: string; title: Record<string, string>; sort_order: number };
type Lesson = { id: string; unit_id: string; code: string; title: Record<string, string>; lesson_type: string; estimated_minutes: number; sort_order: number };
type LessonRow = Lesson & { is_published: boolean };

function CurriculumPage() {
  const { tr } = useI18n();
  const qc = useQueryClient();
  const [openBoardId, setOpenBoardId] = useState<string | null>(null);
  const [openClassId, setOpenClassId] = useState<string | null>(null);
  const [openSubjectId, setOpenSubjectId] = useState<string | null>(null);
  const [openUnitId, setOpenUnitId] = useState<string | null>(null);

  const boardsQ = useQuery({
    queryKey: ["admin-boards"],
    queryFn: async () => {
      const { data, error } = await supabase.from("boards").select("*").order("sort_order");
      if (error) throw error; return (data ?? []) as Board[];
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">Curriculum</h1>
          <p className="text-sm text-muted-foreground">Boards → Classes → Subjects → Units → Lessons. All multilingual.</p>
        </div>
        <EditEntity
          title="New board"
          fields={[{ key: "code", label: "Code (e.g. CBSE)", placeholder: "CBSE" }]}
          i18nFields={[{ key: "name", label: "Name" }]}
          onSubmit={async (vals) => {
            const { error } = await supabase.from("boards").insert({
              code: vals.code, name: vals.name, sort_order: 0,
            });
            if (error) throw error;
            qc.invalidateQueries({ queryKey: ["admin-boards"] });
          }}
        >
          <Button><Plus className="h-4 w-4 mr-1" /> Board</Button>
        </EditEntity>
      </div>

      {boardsQ.isLoading && <p className="text-muted-foreground">Loading…</p>}
      {boardsQ.data?.length === 0 && <Card className="p-6 text-center text-muted-foreground">No boards yet. Add your first one above.</Card>}

      <div className="space-y-2">
        {(boardsQ.data ?? []).map((b) => (
          <Card key={b.id} className="p-3">
            <Row
              open={openBoardId === b.id}
              onToggle={() => setOpenBoardId(openBoardId === b.id ? null : b.id)}
              label={`${b.code} · ${tr(b.name)}${b.is_active ? "" : " · (inactive)"}`}
              extra={
                <label className="flex items-center gap-1 text-xs font-bold">
                  <input
                    type="checkbox"
                    checked={b.is_active}
                    onChange={async (e) => {
                      const { error } = await supabase.from("boards").update({ is_active: e.target.checked }).eq("id", b.id);
                      if (error) { toast.error(error.message); return; }
                      qc.invalidateQueries({ queryKey: ["admin-boards"] });
                    }}
                  />
                  Active
                </label>
              }
              edit={
                <EditEntity
                  title="Edit board"
                  initial={{ code: b.code, name: b.name }}
                  fields={[{ key: "code", label: "Code" }]}
                  i18nFields={[{ key: "name", label: "Name" }]}
                  onSubmit={async (vals) => {
                    const { error } = await supabase.from("boards").update({ code: vals.code, name: vals.name }).eq("id", b.id);
                    if (error) throw error;
                    qc.invalidateQueries({ queryKey: ["admin-boards"] });
                  }}
                />
              }
              onDelete={async () => {
                if (!confirm("Delete board and all its classes?")) return;
                const { error } = await supabase.from("boards").delete().eq("id", b.id);
                if (error) { toast.error(error.message); return; }
                qc.invalidateQueries({ queryKey: ["admin-boards"] });
              }}
            />
            {openBoardId === b.id && (
              <ClassesPanel
                boardId={b.id}
                openClassId={openClassId}
                setOpenClassId={setOpenClassId}
                openSubjectId={openSubjectId}
                setOpenSubjectId={setOpenSubjectId}
                openUnitId={openUnitId}
                setOpenUnitId={setOpenUnitId}
              />
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

function Row({ open, onToggle, label, edit, onDelete, extra }: {
  open: boolean; onToggle: () => void; label: string; edit?: React.ReactNode; onDelete?: () => void; extra?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <button onClick={onToggle} className="flex items-center gap-2 flex-1 text-left font-bold py-1.5 hover:text-primary">
        <ChevronRight className={`h-4 w-4 transition ${open ? "rotate-90" : ""}`} />
        {label}
      </button>
      {extra}
      {edit}
      {onDelete && (
        <Button size="icon" variant="ghost" onClick={onDelete} aria-label="Delete">
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      )}
    </div>
  );
}

function ClassesPanel({ boardId, openClassId, setOpenClassId, openSubjectId, setOpenSubjectId, openUnitId, setOpenUnitId }: {
  boardId: string;
  openClassId: string | null; setOpenClassId: (v: string | null) => void;
  openSubjectId: string | null; setOpenSubjectId: (v: string | null) => void;
  openUnitId: string | null; setOpenUnitId: (v: string | null) => void;
}) {
  const { tr } = useI18n();
  const qc = useQueryClient();
  const key = ["admin-classes", boardId];
  const q = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase.from("classes").select("*").eq("board_id", boardId).order("sort_order");
      if (error) throw error; return (data ?? []) as Klass[];
    },
  });

  return (
    <div className="ml-6 mt-2 space-y-2 border-l-2 border-border pl-4">
      <div className="flex justify-between items-center">
        <p className="text-xs font-bold uppercase text-muted-foreground">Classes</p>
        <EditEntity
          title="New class"
          fields={[{ key: "code", label: "Code (e.g. KG2)" }, { key: "sort_order", label: "Sort order", type: "number" }]}
          i18nFields={[{ key: "name", label: "Name" }]}
          onSubmit={async (vals) => {
            const { error } = await supabase.from("classes").insert({
              board_id: boardId, code: vals.code, name: vals.name, sort_order: Number(vals.sort_order) || 0,
            });
            if (error) throw error;
            qc.invalidateQueries({ queryKey: key });
          }}
        >
          <Button size="sm" variant="outline"><Plus className="h-3 w-3 mr-1" /> Class</Button>
        </EditEntity>
      </div>
      {(q.data ?? []).map((c) => (
        <div key={c.id}>
          <Row
            open={openClassId === c.id}
            onToggle={() => setOpenClassId(openClassId === c.id ? null : c.id)}
            label={`${c.code} · ${tr(c.name)}`}
            edit={
              <EditEntity
                title="Edit class"
                initial={{ code: c.code, name: c.name, sort_order: c.sort_order }}
                fields={[{ key: "code", label: "Code" }, { key: "sort_order", label: "Sort", type: "number" }]}
                i18nFields={[{ key: "name", label: "Name" }]}
                onSubmit={async (vals) => {
                  const { error } = await supabase.from("classes").update({ code: vals.code, name: vals.name, sort_order: Number(vals.sort_order) || 0 }).eq("id", c.id);
                  if (error) throw error;
                  qc.invalidateQueries({ queryKey: key });
                }}
              />
            }
            onDelete={async () => {
              if (!confirm("Delete class and all subjects/lessons under it?")) return;
              const { error } = await supabase.from("classes").delete().eq("id", c.id);
              if (error) { toast.error(error.message); return; }
              qc.invalidateQueries({ queryKey: key });
            }}
          />
          {openClassId === c.id && (
            <SubjectsPanel classId={c.id} openSubjectId={openSubjectId} setOpenSubjectId={setOpenSubjectId} openUnitId={openUnitId} setOpenUnitId={setOpenUnitId} />
          )}
        </div>
      ))}
    </div>
  );
}

function SubjectsPanel({ classId, openSubjectId, setOpenSubjectId, openUnitId, setOpenUnitId }: {
  classId: string;
  openSubjectId: string | null; setOpenSubjectId: (v: string | null) => void;
  openUnitId: string | null; setOpenUnitId: (v: string | null) => void;
}) {
  const { tr } = useI18n();
  const qc = useQueryClient();
  const key = ["admin-subjects", classId];
  const q = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase.from("subjects").select("*").eq("class_id", classId).order("sort_order");
      if (error) throw error; return (data ?? []) as Subject[];
    },
  });

  return (
    <div className="ml-6 mt-2 space-y-2 border-l-2 border-border pl-4">
      <div className="flex justify-between items-center">
        <p className="text-xs font-bold uppercase text-muted-foreground">Subjects</p>
        <EditEntity
          title="New subject"
          fields={[
            { key: "code", label: "Code (e.g. en, math)" },
            { key: "icon", label: "Icon (emoji)", placeholder: "📚" },
            { key: "color", label: "Color (hex)", placeholder: "#FFB347" },
            { key: "sort_order", label: "Sort", type: "number" },
          ]}
          i18nFields={[{ key: "name", label: "Name" }]}
          onSubmit={async (vals) => {
            const { error } = await supabase.from("subjects").insert({
              class_id: classId, code: vals.code, name: vals.name, icon: vals.icon || null, color: vals.color || null,
              sort_order: Number(vals.sort_order) || 0,
            });
            if (error) throw error;
            qc.invalidateQueries({ queryKey: key });
          }}
        >
          <Button size="sm" variant="outline"><Plus className="h-3 w-3 mr-1" /> Subject</Button>
        </EditEntity>
      </div>
      {(q.data ?? []).map((s) => (
        <div key={s.id}>
          <Row
            open={openSubjectId === s.id}
            onToggle={() => setOpenSubjectId(openSubjectId === s.id ? null : s.id)}
            label={`${s.icon ?? "📘"} ${s.code} · ${tr(s.name)}`}
            edit={
              <EditEntity
                title="Edit subject"
                initial={{ code: s.code, name: s.name, icon: s.icon ?? "", color: s.color ?? "", sort_order: s.sort_order }}
                fields={[
                  { key: "code", label: "Code" },
                  { key: "icon", label: "Icon" },
                  { key: "color", label: "Color" },
                  { key: "sort_order", label: "Sort", type: "number" },
                ]}
                i18nFields={[{ key: "name", label: "Name" }]}
                onSubmit={async (vals) => {
                  const { error } = await supabase.from("subjects").update({
                    code: vals.code, name: vals.name, icon: vals.icon || null, color: vals.color || null,
                    sort_order: Number(vals.sort_order) || 0,
                  }).eq("id", s.id);
                  if (error) throw error;
                  qc.invalidateQueries({ queryKey: key });
                }}
              />
            }
            onDelete={async () => {
              if (!confirm("Delete subject and its units/lessons?")) return;
              const { error } = await supabase.from("subjects").delete().eq("id", s.id);
              if (error) { toast.error(error.message); return; }
              qc.invalidateQueries({ queryKey: key });
            }}
          />
          {openSubjectId === s.id && (
            <UnitsPanel subjectId={s.id} openUnitId={openUnitId} setOpenUnitId={setOpenUnitId} />
          )}
        </div>
      ))}
    </div>
  );
}

function UnitsPanel({ subjectId, openUnitId, setOpenUnitId }: {
  subjectId: string;
  openUnitId: string | null; setOpenUnitId: (v: string | null) => void;
}) {
  const { tr } = useI18n();
  const qc = useQueryClient();
  const key = ["admin-units", subjectId];
  const q = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase.from("units").select("*").eq("subject_id", subjectId).order("sort_order");
      if (error) throw error; return (data ?? []) as Unit[];
    },
  });

  return (
    <div className="ml-6 mt-2 space-y-2 border-l-2 border-border pl-4">
      <div className="flex justify-between items-center">
        <p className="text-xs font-bold uppercase text-muted-foreground">Units</p>
        <EditEntity
          title="New unit"
          fields={[{ key: "code", label: "Code (e.g. u1)" }, { key: "sort_order", label: "Sort", type: "number" }]}
          i18nFields={[{ key: "title", label: "Title" }]}
          onSubmit={async (vals) => {
            const { error } = await supabase.from("units").insert({
              subject_id: subjectId, code: vals.code, title: vals.title, sort_order: Number(vals.sort_order) || 0,
            });
            if (error) throw error;
            qc.invalidateQueries({ queryKey: key });
          }}
        >
          <Button size="sm" variant="outline"><Plus className="h-3 w-3 mr-1" /> Unit</Button>
        </EditEntity>
      </div>
      {(q.data ?? []).map((u) => (
        <div key={u.id}>
          <Row
            open={openUnitId === u.id}
            onToggle={() => setOpenUnitId(openUnitId === u.id ? null : u.id)}
            label={`${u.code} · ${tr(u.title)}`}
            edit={
              <EditEntity
                title="Edit unit"
                initial={{ code: u.code, title: u.title, sort_order: u.sort_order }}
                fields={[{ key: "code", label: "Code" }, { key: "sort_order", label: "Sort", type: "number" }]}
                i18nFields={[{ key: "title", label: "Title" }]}
                onSubmit={async (vals) => {
                  const { error } = await supabase.from("units").update({ code: vals.code, title: vals.title, sort_order: Number(vals.sort_order) || 0 }).eq("id", u.id);
                  if (error) throw error;
                  qc.invalidateQueries({ queryKey: key });
                }}
              />
            }
            onDelete={async () => {
              if (!confirm("Delete unit and its lessons?")) return;
              const { error } = await supabase.from("units").delete().eq("id", u.id);
              if (error) { toast.error(error.message); return; }
              qc.invalidateQueries({ queryKey: key });
            }}
          />
          {openUnitId === u.id && <LessonsPanel unitId={u.id} />}
        </div>
      ))}
    </div>
  );
}

function LessonsPanel({ unitId }: { unitId: string }) {
  const { tr } = useI18n();
  const qc = useQueryClient();
  const key = ["admin-lessons", unitId];
  const q = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase.from("lessons").select("id, unit_id, code, title, lesson_type, estimated_minutes, sort_order").eq("unit_id", unitId).order("sort_order");
      if (error) throw error; return (data ?? []) as Lesson[];
    },
  });

  const createLesson = useMutation({
    mutationFn: async () => {
      const code = `l${(q.data?.length ?? 0) + 1}`;
      const { data, error } = await supabase.from("lessons").insert({
        unit_id: unitId, code, title: { en: "New lesson" }, lesson_type: "mixed",
        sort_order: (q.data?.length ?? 0), content: { steps: [] },
      }).select("id").single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: key });
      if (d?.id) window.location.assign(`/admin/lesson/${d.id}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="ml-6 mt-2 space-y-2 border-l-2 border-border pl-4">
      <div className="flex justify-between items-center">
        <p className="text-xs font-bold uppercase text-muted-foreground">Lessons</p>
        <Button size="sm" variant="outline" onClick={() => createLesson.mutate()} disabled={createLesson.isPending}>
          <Plus className="h-3 w-3 mr-1" /> Lesson
        </Button>
      </div>
      {(q.data ?? []).map((l) => (
        <div key={l.id} className="flex items-center gap-2 py-1.5">
          <BookOpen className="h-4 w-4 text-muted-foreground" />
          <span className="flex-1 font-bold">{l.code} · {tr(l.title)}</span>
          <span className="text-xs text-muted-foreground">{l.lesson_type} · {l.estimated_minutes}m</span>
          <Link to="/admin/lesson/$lessonId" params={{ lessonId: l.id }}>
            <Button size="sm" variant="outline"><Pencil className="h-3 w-3 mr-1" />Edit</Button>
          </Link>
          <Button size="icon" variant="ghost" onClick={async () => {
            if (!confirm("Delete lesson?")) return;
            const { error } = await supabase.from("lessons").delete().eq("id", l.id);
            if (error) { toast.error(error.message); return; }
            qc.invalidateQueries({ queryKey: key });
          }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </div>
      ))}
    </div>
  );
}

// Reusable inline editor dialog
function EditEntity({
  title, fields = [], i18nFields = [], initial = {}, onSubmit, children,
}: {
  title: string;
  fields?: { key: string; label: string; type?: string; placeholder?: string }[];
  i18nFields?: { key: string; label: string }[];
  initial?: Record<string, unknown>;
  onSubmit: (vals: Vals) => Promise<void>;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [vals, setVals] = useState<Vals>(initial);
  const [busy, setBusy] = useState(false);

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setVals(initial); }}>
      <DialogTrigger asChild>
        {children ?? <Button size="icon" variant="ghost" aria-label="Edit"><Pencil className="h-4 w-4" /></Button>}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try { await onSubmit(vals); setOpen(false); toast.success("Saved"); }
            catch (err) { toast.error((err as Error).message); }
            finally { setBusy(false); }
          }}
        >
          {fields.map((f) => (
            <div key={f.key}>
              <Label>{f.label}</Label>
              <Input
                type={f.type ?? "text"}
                value={(vals[f.key] as string | number | undefined) ?? ""}
                placeholder={f.placeholder}
                onChange={(e) => setVals({ ...vals, [f.key]: e.target.value })}
                required={f.key === "code"}
              />
            </div>
          ))}
          {i18nFields.map((f) => (
            <I18nField
              key={f.key}
              label={f.label}
              value={(vals[f.key] as Record<string, string>) ?? {}}
              onChange={(v) => setVals({ ...vals, [f.key]: v })}
              required
            />
          ))}
          <DialogFooter>
            <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}