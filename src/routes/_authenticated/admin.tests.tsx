import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil, Plus, Trash2, ClipboardCheck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/tests")({
  component: TestsAdminPage,
});

function TestsAdminPage() {
  const { tr } = useI18n();
  const qc = useQueryClient();
  const [subjectId, setSubjectId] = useState("");

  const subjects = useQuery({
    queryKey: ["all-subjects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subjects")
        .select("id, code, name, classes(code, boards(code))")
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const list = useQuery({
    queryKey: ["admin-tests", subjectId],
    queryFn: async () => {
      let q = supabase.from("tests").select("id, title, subject_id, duration_minutes, pass_threshold, scope");
      if (subjectId) q = q.eq("subject_id", subjectId);
      const { data, error } = await q.order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!subjectId) throw new Error("Pick a subject first");
      const { data, error } = await supabase.from("tests").insert({
        subject_id: subjectId,
        title: { en: "New test" },
        questions: [],
        duration_minutes: 15,
        pass_threshold: 60,
        scope: "daily",
      }).select("id").single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["admin-tests"] });
      if (d?.id) window.location.assign(`/admin/test/${d.id}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Tests</h1>
          <p className="text-sm text-muted-foreground">Timed assessments with pass threshold.</p>
        </div>
        <div className="flex-1" />
        <div>
          <label className="text-xs font-bold uppercase text-muted-foreground block mb-1">Subject</label>
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
          <Plus className="h-4 w-4 mr-1" />New test
        </Button>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {(list.data ?? []).map((t: any) => (
          <Card key={t.id} className="p-4 flex items-start gap-3">
            <ClipboardCheck className="h-6 w-6 text-primary" />
            <div className="flex-1">
              <h3 className="font-extrabold">{tr(t.title)}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {t.duration_minutes}m · pass {t.pass_threshold}% · {t.scope}
              </p>
            </div>
            <Link to="/admin/test/$testId" params={{ testId: t.id }}>
              <Button size="sm" variant="outline"><Pencil className="h-3 w-3 mr-1" />Edit</Button>
            </Link>
            <Button size="icon" variant="ghost" onClick={async () => {
              if (!confirm("Delete test?")) return;
              const { error } = await supabase.from("tests").delete().eq("id", t.id);
              if (error) { toast.error(error.message); return; }
              qc.invalidateQueries({ queryKey: ["admin-tests"] });
            }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </Card>
        ))}
        {list.data && list.data.length === 0 && (
          <Card className="p-6 text-center text-muted-foreground sm:col-span-2">No tests yet.</Card>
        )}
      </div>
    </div>
  );
}