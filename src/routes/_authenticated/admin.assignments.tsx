import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil, Plus, Trash2, ClipboardList } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/assignments")({
  component: AssignmentsPage,
});

function AssignmentsPage() {
  const { tr } = useI18n();
  const qc = useQueryClient();
  const [subjectId, setSubjectId] = useState<string>("");

  const subjects = useQuery({
    queryKey: ["all-subjects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subjects")
        .select("id, code, name, classes(code, name, boards(code))")
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const list = useQuery({
    queryKey: ["assignments-all", subjectId],
    queryFn: async () => {
      let q = supabase.from("assignments").select("id, title, subject_id, lesson_id, pass_threshold, due_in_days, questions");
      if (subjectId) q = q.eq("subject_id", subjectId);
      const { data, error } = await q.order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!subjectId) throw new Error("Pick a subject first");
      const { data, error } = await supabase.from("assignments").insert({
        subject_id: subjectId, title: { en: "New assignment" }, instructions: {},
        questions: [], pass_threshold: 60,
      }).select("id").single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["assignments-all"] });
      if (d?.id) window.location.assign(`/admin/assignment/${d.id}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Assignments</h1>
          <p className="text-sm text-muted-foreground">Short practice tasks attached to a lesson or subject.</p>
        </div>
        <div className="flex-1" />
        <div>
          <label className="text-xs font-bold uppercase text-muted-foreground block mb-1">Filter by subject</label>
          <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="rounded-md border border-input bg-card px-3 py-2">
            <option value="">All subjects</option>
            {(subjects.data ?? []).map((s: any) => (
              <option key={s.id} value={s.id}>
                {s.classes?.boards?.code} · {s.classes?.code} · {s.code} ({tr(s.name)})
              </option>
            ))}
          </select>
        </div>
        <Button onClick={() => create.mutate()} disabled={!subjectId || create.isPending}>
          <Plus className="h-4 w-4 mr-1" />New assignment
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {(list.data ?? []).map((a: any) => (
          <Card key={a.id} className="p-4">
            <div className="flex items-start gap-3">
              <ClipboardList className="h-6 w-6 text-primary" />
              <div className="flex-1">
                <h3 className="font-extrabold">{tr(a.title)}</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {(a.questions ?? []).length} questions · pass {a.pass_threshold}%
                  {a.due_in_days ? ` · due in ${a.due_in_days}d` : ""}
                </p>
              </div>
              <Link to="/admin/assignment/$assignmentId" params={{ assignmentId: a.id }}>
                <Button size="sm" variant="outline"><Pencil className="h-3 w-3 mr-1" />Edit</Button>
              </Link>
              <Button size="icon" variant="ghost" onClick={async () => {
                if (!confirm("Delete assignment?")) return;
                const { error } = await supabase.from("assignments").delete().eq("id", a.id);
                if (error) { toast.error(error.message); return; }
                qc.invalidateQueries({ queryKey: ["assignments-all"] });
              }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          </Card>
        ))}
        {list.data && list.data.length === 0 && (
          <Card className="p-6 text-center text-muted-foreground sm:col-span-2">
            No assignments yet{subjectId ? " for this subject" : ""}.
          </Card>
        )}
      </div>
    </div>
  );
}