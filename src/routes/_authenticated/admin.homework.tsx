import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { assignHomework, fetchHomeworkForChildren, summarizeHomework, HomeworkKind } from "@/lib/homework";
import { ClipboardList, Plus, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/homework")({
  component: AdminHomeworkPage,
});

function AdminHomeworkPage() {
  const qc = useQueryClient();
  const studentsQ = useQuery({
    queryKey: ["all-students"],
    queryFn: async () => {
      const { data } = await supabase.from("student_profiles").select("id, display_name").order("display_name");
      return data ?? [];
    },
  });
  const studentIds = (studentsQ.data ?? []).map((s) => s.id);
  const hwQ = useQuery({
    queryKey: ["admin-homework", studentIds.join(",")],
    enabled: studentIds.length > 0,
    queryFn: () => fetchHomeworkForChildren(studentIds),
  });

  const [studentId, setStudentId] = useState("");
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<HomeworkKind>("practice");
  const [due, setDue] = useState(new Date().toISOString().slice(0, 10));

  const create = useMutation({
    mutationFn: () => assignHomework({ student_profile_id: studentId, title, kind, due_date: due }),
    onSuccess: () => {
      toast.success("Homework assigned");
      setTitle("");
      qc.invalidateQueries({ queryKey: ["admin-homework"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const summary = summarizeHomework(hwQ.data ?? []);
  const nameMap = new Map((studentsQ.data ?? []).map((s) => [s.id, s.display_name]));

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-2">
        <ClipboardList className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-extrabold">Homework</h1>
      </header>

      <Card className="p-5 space-y-3">
        <h2 className="font-extrabold">Assign new homework</h2>
        <div className="grid sm:grid-cols-4 gap-3">
          <div>
            <Label>Student</Label>
            <Select value={studentId} onValueChange={setStudentId}>
              <SelectTrigger><SelectValue placeholder="Pick a student" /></SelectTrigger>
              <SelectContent>
                {(studentsQ.data ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.display_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Type</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as HomeworkKind)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="practice">Practice</SelectItem>
                <SelectItem value="reading">Reading</SelectItem>
                <SelectItem value="writing">Writing</SelectItem>
                <SelectItem value="revision">Revision</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Trace letters A–F" />
          </div>
          <div>
            <Label>Due date</Label>
            <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          </div>
        </div>
        <Button onClick={() => create.mutate()} disabled={!studentId || !title || create.isPending} className="rounded-2xl gap-2">
          <Plus className="h-4 w-4" /> Assign
        </Button>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <Tile icon={Clock} label="Pending" value={summary.pending.length} tone="primary" />
        <Tile icon={CheckCircle2} label="Completed" value={summary.completed.length} tone="success" />
        <Tile icon={AlertTriangle} label="Overdue" value={summary.overdue.length} tone="destructive" />
      </div>

      <Card className="p-4">
        <h2 className="font-extrabold mb-2">All homework</h2>
        <div className="space-y-2 max-h-[480px] overflow-auto">
          {(hwQ.data ?? []).map((r) => (
            <div key={r.id} className="rounded-2xl border p-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
              <div className="min-w-0">
                <div className="font-bold truncate">{r.title}</div>
                <div className="text-xs text-muted-foreground">{nameMap.get(r.student_profile_id)} · {r.kind} · due {r.due_date}</div>
              </div>
              <span className={`text-xs font-bold rounded-full px-2 py-1 ${
                r.status === "completed" ? "bg-success/15 text-success" :
                r.status === "overdue" ? "bg-destructive/15 text-destructive" : "bg-primary/10 text-primary"
              }`}>{r.status}</span>
            </div>
          ))}
          {(hwQ.data ?? []).length === 0 && <div className="text-sm text-muted-foreground text-center py-6">No homework yet.</div>}
        </div>
      </Card>
    </div>
  );
}

function Tile({ icon: Icon, label, value, tone }: { icon: typeof Clock; label: string; value: number; tone: "primary" | "success" | "destructive" }) {
  const cls = tone === "primary" ? "bg-primary/10 text-primary" : tone === "success" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive";
  return (
    <Card className="p-4">
      <div className={`inline-flex items-center justify-center h-9 w-9 rounded-2xl ${cls}`}><Icon className="h-5 w-5" /></div>
      <div className="mt-2 text-2xl font-extrabold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </Card>
  );
}