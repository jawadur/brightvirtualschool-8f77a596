import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useStudents } from "@/lib/student-context";
import { useI18n } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { fetchActivePrograms } from "@/lib/data";
import {
  fetchHierarchyProgress,
  pickContinueLesson,
  type LessonNode,
  type SubjectNode,
  type UnitNode,
  type ClassNode,
} from "@/lib/progress-tracking";
import { CheckCircle2, Circle, PlayCircle, Clock, BookOpen, PencilLine, ClipboardCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/student/progress")({
  component: ProgressPage,
});

function formatWhen(iso: string | null) {
  if (!iso) return "Not started yet";
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.round(diff / 86400)}d ago`;
  return d.toLocaleDateString();
}

function ProgressPage() {
  const { activeStudent } = useStudents();
  const { tr } = useI18n();

  const { data: programs = [] } = useQuery({
    queryKey: ["active-programs"],
    queryFn: fetchActivePrograms,
  });
  const classIds = useMemo(
    () => programs.flatMap((b: any) => (b.classes ?? []).map((c: any) => c.id)),
    [programs],
  );

  const { data: tree = [], isLoading } = useQuery({
    queryKey: ["progress-tree", activeStudent?.id, classIds.join(",")],
    enabled: !!activeStudent && classIds.length > 0,
    queryFn: () => fetchHierarchyProgress(activeStudent!.id, classIds),
  });

  const cont = useMemo(() => pickContinueLesson(tree as ClassNode[]), [tree]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-extrabold">My Progress</h1>
        <p className="text-sm text-muted-foreground">Class → Subject → Unit → Lesson · stages, practice, homework & tests</p>
      </header>

      {cont && (
        <Link to="/student/lesson/$lessonId" params={{ lessonId: cont.lesson.id }}>
          <Card className="p-5 hover:shadow-pop transition cursor-pointer bg-gradient-to-r from-primary/15 to-accent">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-primary/20 flex items-center justify-center">
                <PlayCircle className="h-8 w-8 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold uppercase text-primary">Continue Learning · {tr(cont.subject.name)}</div>
                <div className="truncate text-lg font-extrabold">{tr(cont.lesson.title)}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <Clock className="h-3 w-3" /> {formatWhen(cont.lastAccessed)} · {cont.pct}% done
                </div>
              </div>
              <Button size="sm" className="rounded-2xl">Resume</Button>
            </div>
          </Card>
        </Link>
      )}

      {isLoading && <Card className="p-6 text-center text-muted-foreground">Loading progress…</Card>}

      {(tree as ClassNode[]).map((c) => (
        <ClassBlock key={c.id} node={c} tr={tr} />
      ))}

      {!isLoading && tree.length === 0 && (
        <Card className="p-6 text-center text-muted-foreground">No classes enrolled yet.</Card>
      )}
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-background/60 px-3 py-2 text-center">
      <div className="text-base font-extrabold">{value}</div>
      <div className="text-[11px] uppercase text-muted-foreground">{label}</div>
    </div>
  );
}

function ClassBlock({ node, tr }: { node: ClassNode; tr: (v: any) => string }) {
  return (
    <Card className="p-5 space-y-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <div className="text-xs font-bold uppercase text-primary">{tr(node.boardName)}</div>
          <h2 className="text-xl font-extrabold truncate">{tr(node.name)}</h2>
          <div className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> {formatWhen(node.lastAccessed)}</div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-extrabold">{node.pct}%</div>
          <div className="text-[11px] uppercase text-muted-foreground">Complete</div>
        </div>
      </div>
      <Progress value={node.pct} />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatPill label="Lessons" value={`${node.totals.lessonsDone}/${node.totals.lessons}`} />
        <StatPill label="Practice" value={node.totals.practiceDone} />
        <StatPill label="Homework" value={node.totals.homeworkDone} />
        <StatPill label="Tests Passed" value={`${node.totals.testsPassed}/${node.totals.testsTotal}`} />
      </div>
      <div className="space-y-2">
        {node.subjects.map((s) => (
          <SubjectBlock key={s.id} node={s} tr={tr} />
        ))}
        {node.subjects.length === 0 && (
          <div className="text-sm text-muted-foreground">No subjects yet.</div>
        )}
      </div>
    </Card>
  );
}

function SubjectBlock({ node, tr }: { node: SubjectNode; tr: (v: any) => string }) {
  const color = node.color || "#FDE68A";
  return (
    <Accordion type="single" collapsible className="border rounded-2xl">
      <AccordionItem value={node.id} className="border-0">
        <AccordionTrigger className="px-4 hover:no-underline">
          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 w-full">
            <div className="h-10 w-10 rounded-2xl flex items-center justify-center text-lg" style={{ backgroundColor: color + "33" }}>
              {node.icon || "📘"}
            </div>
            <div className="min-w-0 text-left">
              <div className="font-extrabold truncate">{tr(node.name)}</div>
              <div className="text-xs text-muted-foreground">
                {node.totals.lessonsDone}/{node.totals.lessons} lessons · {node.totals.testsPassed}/{node.totals.testsTotal} tests passed · {formatWhen(node.lastAccessed)}
              </div>
            </div>
            <div className="text-right pr-2">
              <div className="text-lg font-extrabold">{node.pct}%</div>
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4 space-y-3">
          <Progress value={node.pct} />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <StatPill label="Lessons" value={`${node.totals.lessonsDone}/${node.totals.lessons}`} />
            <StatPill label="Practice" value={node.totals.practiceDone} />
            <StatPill label="Homework" value={node.totals.homeworkDone} />
            <StatPill label="Tests Passed" value={`${node.totals.testsPassed}/${node.totals.testsTotal}`} />
          </div>
          {node.units.map((u) => (
            <UnitBlock key={u.id} node={u} tr={tr} />
          ))}
          {node.units.length === 0 && (
            <div className="text-sm text-muted-foreground">No units yet.</div>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

function UnitBlock({ node, tr }: { node: UnitNode; tr: (v: any) => string }) {
  return (
    <div className="rounded-xl border bg-muted/20 p-3 space-y-2">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
        <div className="min-w-0">
          <div className="font-bold truncate">{tr(node.title)}</div>
          <div className="text-[11px] text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> {formatWhen(node.lastAccessed)}</div>
        </div>
        <div className="text-sm font-extrabold">{node.pct}%</div>
      </div>
      <Progress value={node.pct} />
      <div className="space-y-1.5">
        {node.lessons.map((l) => (
          <LessonRow key={l.id} node={l} tr={tr} />
        ))}
      </div>
    </div>
  );
}

function LessonRow({ node, tr }: { node: LessonNode; tr: (v: any) => string }) {
  const Icon = node.status === "completed" ? CheckCircle2 : node.status === "in_progress" ? PlayCircle : Circle;
  const tone = node.status === "completed" ? "text-success" : node.status === "in_progress" ? "text-primary" : "text-muted-foreground";
  return (
    <Link to="/student/lesson/$lessonId" params={{ lessonId: node.id }}>
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-lg bg-background p-2 hover:bg-accent/40 transition">
        <Icon className={`h-5 w-5 shrink-0 ${tone}`} />
        <div className="min-w-0">
          <div className="text-sm font-bold truncate">{tr(node.title)}</div>
          <div className="text-[11px] text-muted-foreground flex items-center gap-2 flex-wrap">
            <span>{node.stagesDone}/{node.stagesTotal || "?"} stages</span>
            <BadgeIcon ok={node.practiceDone} icon={BookOpen} label="Practice" />
            <BadgeIcon ok={node.homeworkDone} icon={PencilLine} label="Homework" />
            {node.testPassed !== null && (
              <BadgeIcon ok={!!node.testPassed} icon={ClipboardCheck} label="Test" />
            )}
            <span>· {formatWhen(node.lastAccessed)}</span>
          </div>
        </div>
        <div className="text-xs font-extrabold w-10 text-right">{node.pct}%</div>
      </div>
    </Link>
  );
}

function BadgeIcon({ ok, icon: Icon, label }: { ok: boolean; icon: any; label: string }) {
  return (
    <span className={`inline-flex items-center gap-0.5 ${ok ? "text-success" : "text-muted-foreground/60"}`}>
      <Icon className="h-3 w-3" /> {label}
    </span>
  );
}