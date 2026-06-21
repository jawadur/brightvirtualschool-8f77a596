import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStudents } from "@/lib/student-context";
import { useI18n } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardCheck, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/student/tests")({
  component: TestsPage,
});

type StageTestRow = {
  id: string;
  lesson_id: string;
  title: any;
  questions: any;
  pass_threshold: number | null;
  lessons: {
    id: string;
    title: any;
    sort_order: number;
    is_published: boolean;
    units: {
      id: string;
      title: any;
      sort_order: number;
      subjects: {
        id: string;
        name: any;
        icon: string | null;
        color: string | null;
        class_id: string | null;
        classes: { id: string; name: any } | null;
      } | null;
    } | null;
  } | null;
};

function TestsPage() {
  const { activeStudent } = useStudents();
  const { t, tr } = useI18n();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["lesson-stage-tests", activeStudent?.class_id],
    enabled: !!activeStudent,
    queryFn: async () => {
      let q = supabase
        .from("lesson_stages")
        .select(
          "id, lesson_id, title, questions, pass_threshold, lessons!inner(id, title, sort_order, is_published, units!inner(id, title, sort_order, subjects!inner(id, name, icon, color, class_id, classes(id, name))))",
        )
        .eq("stage_type", "test")
        .eq("lessons.is_published", true);
      if (activeStudent?.class_id) {
        q = q.eq("lessons.units.subjects.class_id", activeStudent.class_id);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as StageTestRow[];
    },
  });

  const lessonIds = useMemo(() => rows.map((r) => r.lesson_id), [rows]);
  const { data: progress = [] } = useQuery({
    queryKey: ["test-stage-progress", activeStudent?.id, lessonIds.join(",")],
    enabled: !!activeStudent && lessonIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_stage_progress")
        .select("lesson_id, stage_type, score, completed_at")
        .eq("student_profile_id", activeStudent!.id)
        .eq("stage_type", "test")
        .in("lesson_id", lessonIds);
      if (error) throw error;
      return data ?? [];
    },
  });

  const scoreByLesson = useMemo(() => {
    const m = new Map<string, { score: number | null; completed: boolean }>();
    for (const p of progress) {
      const prev = m.get(p.lesson_id);
      const score = p.score ?? null;
      if (!prev || (score != null && (prev.score == null || score > (prev.score ?? -1)))) {
        m.set(p.lesson_id, { score, completed: !!p.completed_at });
      }
    }
    return m;
  }, [progress]);

  // Group: Class -> Subject -> Unit -> rows
  const grouped = useMemo(() => {
    type LessonItem = { stage: StageTestRow; lesson: NonNullable<StageTestRow["lessons"]> };
    type UnitGrp = { id: string; title: any; sort_order: number; lessons: LessonItem[] };
    type SubjGrp = { id: string; name: any; icon: string | null; color: string | null; units: Map<string, UnitGrp> };
    type ClassGrp = { id: string; name: any; subjects: Map<string, SubjGrp> };
    const classes = new Map<string, ClassGrp>();
    for (const r of rows) {
      const lesson = r.lessons;
      const unit = lesson?.units;
      const subj = unit?.subjects;
      if (!lesson || !unit || !subj) continue;
      const cls = subj.classes ?? { id: subj.class_id ?? "_", name: { en: "Class" } };
      let c = classes.get(cls.id);
      if (!c) { c = { id: cls.id, name: cls.name, subjects: new Map() }; classes.set(cls.id, c); }
      let s = c.subjects.get(subj.id);
      if (!s) { s = { id: subj.id, name: subj.name, icon: subj.icon, color: subj.color, units: new Map() }; c.subjects.set(subj.id, s); }
      let u = s.units.get(unit.id);
      if (!u) { u = { id: unit.id, title: unit.title, sort_order: unit.sort_order, lessons: [] }; s.units.set(unit.id, u); }
      u.lessons.push({ stage: r, lesson });
    }
    // Sort: units by sort_order, lessons by sort_order
    const out = Array.from(classes.values()).map((c) => ({
      ...c,
      subjects: Array.from(c.subjects.values()).map((s) => ({
        ...s,
        units: Array.from(s.units.values())
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((u) => ({ ...u, lessons: u.lessons.sort((a, b) => a.lesson.sort_order - b.lesson.sort_order) })),
      })),
    }));
    return out;
  }, [rows]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold">{t("tests")}</h1>
      {isLoading && <p className="text-muted-foreground">Loading tests…</p>}
      {!isLoading && rows.length === 0 && (
        <Card className="p-8 text-center text-muted-foreground">No tests yet. Check back soon!</Card>
      )}
      {grouped.map((cls) => (
        <section key={cls.id} className="space-y-3">
          <h2 className="text-xl font-extrabold">{tr(cls.name)}</h2>
          {cls.subjects.map((subj) => (
            <div key={subj.id} className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-extrabold">
                <span className="text-lg">{subj.icon || "📘"}</span>
                <span>{tr(subj.name)}</span>
              </div>
              {subj.units.map((u) => (
                <Card key={u.id} className="p-4">
                  <div className="text-xs font-bold uppercase text-muted-foreground mb-2">{tr(u.title)}</div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {u.lessons.map(({ stage, lesson }) => {
                      const qCount = Array.isArray(stage.questions) ? stage.questions.length : 0;
                      const pass = stage.pass_threshold ?? 70;
                      const prog = scoreByLesson.get(lesson.id);
                      const best = prog?.score ?? null;
                      const passed = best != null && best >= pass;
                      return (
                        <div key={stage.id} className="flex items-start gap-3 rounded-xl border p-3">
                          <ClipboardCheck className="h-5 w-5 text-primary shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="font-extrabold truncate">{tr(lesson.title)}</div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {qCount} questions · pass {pass}%
                            </p>
                            {best != null ? (
                              <p className={`mt-1 text-xs font-bold ${passed ? "text-success" : "text-destructive"}`}>
                                {passed && <CheckCircle2 className="inline h-3 w-3 mr-1" />}
                                Latest: {best}% {passed ? "Passed" : "Try again"}
                              </p>
                            ) : (
                              <p className="mt-1 text-xs text-muted-foreground">Not attempted</p>
                            )}
                          </div>
                          <Link
                            to="/student/classroom/$lessonId"
                            params={{ lessonId: lesson.id }}
                            search={{ stage: "test" } as any}
                          >
                            <Button size="sm">{best != null ? "Retake" : "Start"}</Button>
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              ))}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}