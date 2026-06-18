import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useStudents } from "@/lib/student-context";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fetchHomework, completeHomework, summarizeHomework, HomeworkRow } from "@/lib/homework";
import { ClipboardList, BookOpen, PencilLine, RefreshCcw, CheckCircle2, Clock, AlertTriangle, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/student/homework")({
  component: HomeworkPage,
});

const KIND_META: Record<string, { icon: typeof BookOpen; label: string; color: string }> = {
  practice: { icon: PencilLine, label: "Practice", color: "bg-primary/10 text-primary" },
  reading: { icon: BookOpen, label: "Reading", color: "bg-secondary/40 text-foreground" },
  writing: { icon: PencilLine, label: "Writing", color: "bg-accent/30 text-accent-foreground" },
  revision: { icon: RefreshCcw, label: "Revision", color: "bg-success/15 text-success" },
};

function HomeworkPage() {
  const { activeStudent } = useStudents();
  const { tr } = useI18n();
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["homework", activeStudent?.id],
    enabled: !!activeStudent,
    queryFn: () => fetchHomework(activeStudent!.id),
  });
  const { data: lessonHomework = [] } = useQuery({
    queryKey: ["lesson-homework", activeStudent?.id],
    enabled: !!activeStudent,
    queryFn: async () => {
      const { data: stages } = await supabase
        .from("lesson_stages")
        .select("id, lesson_id, stage_type, lessons!inner(id, title, is_published)")
        .in("stage_type", ["assignment", "homework"] as any);
      const rows = (stages ?? []).filter((s: any) => s.lessons?.is_published);
      // dedupe per lesson, prefer assignment
      const byLesson = new Map<string, any>();
      for (const r of rows) {
        const cur = byLesson.get(r.lesson_id);
        if (!cur || (cur.stage_type === "homework" && r.stage_type === "assignment")) byLesson.set(r.lesson_id, r);
      }
      const items = Array.from(byLesson.values());
      if (items.length === 0) return [];
      const { data: prog } = await supabase
        .from("student_stage_progress")
        .select("lesson_id, stage_type, completed_at, score")
        .eq("student_profile_id", activeStudent!.id)
        .in("lesson_id", items.map((i) => i.lesson_id));
      return items.map((i) => {
        const p = (prog ?? []).find((x: any) => x.lesson_id === i.lesson_id && x.stage_type === i.stage_type);
        return {
          lesson_id: i.lesson_id,
          stage_type: i.stage_type as string,
          title: i.lessons?.title,
          completed_at: p?.completed_at ?? null,
          score: p?.score ?? null,
        };
      });
    },
  });
  const done = useMutation({
    mutationFn: (id: string) => completeHomework(id, 100),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["homework"] }),
  });
  const summary = summarizeHomework(data);
  const pendingLessonHw = lessonHomework.filter((r: any) => !r.completed_at);
  const completedLessonHw = lessonHomework.filter((r: any) => !!r.completed_at);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ClipboardList className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-extrabold">My Homework</h1>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Pending" value={summary.pending.length + pendingLessonHw.length} icon={Clock} tone="primary" />
        <Stat label="Completed" value={summary.completed.length + completedLessonHw.length} icon={CheckCircle2} tone="success" />
        <Stat label="Overdue" value={summary.overdue.length} icon={AlertTriangle} tone="destructive" />
      </div>

      {pendingLessonHw.length > 0 && (
        <section>
          <h2 className="font-extrabold mb-2">From your lessons</h2>
          <div className="space-y-2">
            {pendingLessonHw.map((r: any) => (
              <Card key={r.lesson_id} className="p-4 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
                <div className="h-10 w-10 rounded-2xl grid place-items-center bg-primary/10 text-primary"><PencilLine className="h-5 w-5" /></div>
                <div className="min-w-0">
                  <div className="font-bold truncate">{tr(r.title) || "Lesson Homework"}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <Badge variant="secondary" className="rounded-full">Lesson Homework</Badge>
                  </div>
                </div>
                <Link to="/student/classroom/$lessonId" params={{ lessonId: r.lesson_id }}>
                  <Button size="sm" className="rounded-2xl">Start Homework <ArrowRight className="ml-1 h-4 w-4" /></Button>
                </Link>
              </Card>
            ))}
          </div>
        </section>
      )}

      <Section title="Pending today" rows={summary.pending} done={done.mutate} />
      <Section title="Overdue" rows={summary.overdue} done={done.mutate} />
      <Section title="Completed" rows={summary.completed} done={done.mutate} hideAction />

      {data.length === 0 && lessonHomework.length === 0 && (
        <Card className="p-8 text-center">
          <div className="text-2xl">🎒</div>
          <p className="mt-2 font-bold">No homework yet.</p>
          <p className="text-sm text-muted-foreground">Your teacher will assign homework after lessons.</p>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value, icon: Icon, tone }: { label: string; value: number; icon: typeof Clock; tone: "primary" | "success" | "destructive" }) {
  const cls = tone === "primary" ? "bg-primary/10 text-primary" : tone === "success" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive";
  return (
    <Card className="p-4">
      <div className={`inline-flex items-center justify-center h-9 w-9 rounded-2xl ${cls}`}><Icon className="h-5 w-5" /></div>
      <div className="mt-2 text-2xl font-extrabold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </Card>
  );
}

function Section({ title, rows, done, hideAction }: { title: string; rows: HomeworkRow[]; done: (id: string) => void; hideAction?: boolean }) {
  if (rows.length === 0) return null;
  return (
    <section>
      <h2 className="font-extrabold mb-2">{title}</h2>
      <div className="space-y-2">
        {rows.map((r) => (
          <HomeworkCard key={r.id} row={r} onDone={() => done(r.id)} hideAction={hideAction} />
        ))}
      </div>
    </section>
  );
}

function HomeworkCard({ row, onDone, hideAction }: { row: HomeworkRow; onDone: () => void; hideAction?: boolean }) {
  const meta = KIND_META[row.kind] ?? KIND_META.practice;
  const Icon = meta.icon;
  const target = row.lesson_id
    ? { to: "/student/lesson/$lessonId", params: { lessonId: row.lesson_id } }
    : row.assignment_id
    ? { to: "/student/assignment/$assignmentId", params: { assignmentId: row.assignment_id } }
    : row.kind === "reading"
    ? { to: "/student/read-along" }
    : row.kind === "writing"
    ? { to: "/student/writing" }
    : { to: "/student/brush-up" };
  return (
    <Card className="p-4 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
      <div className={`h-10 w-10 rounded-2xl grid place-items-center ${meta.color}`}><Icon className="h-5 w-5" /></div>
      <div className="min-w-0">
        <div className="font-bold truncate">{row.title}</div>
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <Badge variant="secondary" className="rounded-full">{meta.label}</Badge>
          <span>Due {row.due_date}</span>
          {row.status === "completed" && row.score != null && <span className="text-success font-bold">· {row.score}%</span>}
        </div>
      </div>
      <div className="flex gap-2">
        <Link {...(target as unknown as { to: string })}>
          <Button size="sm" variant="secondary" className="rounded-2xl">Open <ArrowRight className="ml-1 h-4 w-4" /></Button>
        </Link>
        {!hideAction && (
          <Button size="sm" className="rounded-2xl" onClick={onDone}><CheckCircle2 className="h-4 w-4 mr-1" />Done</Button>
        )}
      </div>
    </Card>
  );
}