import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useStudents } from "@/lib/student-context";
import { fetchActivePrograms, fetchTodaySchedule, fetchScheduleStatuses } from "@/lib/data";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ReadAloud } from "@/components/app/ReadAloud";
import { GraduationCap, PlayCircle, CheckCircle2, Clock } from "lucide-react";
import teacherImg from "@/assets/teacher.png";
import { fetchActiveProgram, fetchSubjectsForProgram, PROGRAMS } from "@/lib/program";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/student/classroom")({
  component: ClassroomHub,
});

function ClassroomHub() {
  const { activeStudent } = useStudents();
  const { tr } = useI18n();
  const { data: programs = [] } = useQuery({ queryKey: ["active-programs"], queryFn: fetchActivePrograms });
  const classIds = useMemo(
    () => programs.flatMap((b: any) => (b.classes ?? []).map((c: any) => c.id)),
    [programs],
  );
  const { data: schedule = [] } = useQuery({
    queryKey: ["today-schedule", classIds.join(",")],
    enabled: classIds.length > 0,
    queryFn: () => fetchTodaySchedule(classIds),
  });
  const { data: statuses } = useQuery({
    queryKey: ["schedule-statuses", activeStudent?.id, schedule.map((s: any) => s.id).join(",")],
    enabled: !!activeStudent && schedule.length > 0,
    queryFn: () => fetchScheduleStatuses(activeStudent!.id, schedule),
  });
  const lessonMap = statuses?.lessonMap ?? new Map();

  // Auto-derived "Today's Learning Plan" — used when no manual schedule exists.
  const { data: activeProgram } = useQuery({
    queryKey: ["active-program", activeStudent?.id],
    enabled: !!activeStudent,
    queryFn: () => fetchActiveProgram(activeStudent!.id),
  });
  const programCode = (activeProgram ?? "class1") as "kg2_brushup" | "class1";
  const programInfo = PROGRAMS.find((p) => p.code === programCode)!;
  const { data: autoSubjects = [] } = useQuery({
    queryKey: ["program-subjects", programCode],
    enabled: schedule.length === 0,
    queryFn: () => fetchSubjectsForProgram(programCode),
  });

  return (
    <div className="space-y-5">
      <Card className="p-5 bg-hero shadow-pop">
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4">
          <img src={teacherImg} alt="Teacher" className="h-16 w-16 rounded-2xl shrink-0" />
          <div className="min-w-0">
            <div className="text-xs font-bold uppercase text-primary">Virtual Classroom</div>
            <h1 className="text-2xl font-extrabold flex items-center gap-2">
              <GraduationCap className="h-6 w-6" /> Today's Classes
            </h1>
            <p className="text-sm text-foreground/80">Your teacher is ready to teach you step-by-step.</p>
          </div>
        </div>
        <div className="mt-3">
          <ReadAloud
            text="Welcome to your virtual classroom! Today we will learn together. Pick a subject below to begin your class."
            variant="controls"
            label="Hear teacher"
          />
        </div>
      </Card>

      {schedule.length === 0 ? (
        <div className="space-y-3">
          <Card className="p-4 bg-accent/40">
            <div className="text-xs font-bold uppercase text-primary">{programInfo.emoji} {programInfo.name}</div>
            <div className="font-extrabold">Today's Learning Plan</div>
            <div className="text-xs text-muted-foreground">Auto-generated from your published curriculum.</div>
          </Card>
          {autoSubjects.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">No lessons available yet for this program.</Card>
          ) : (
            autoSubjects.map((s: any) => (
              <Link key={s.id} to="/student/daily/$program/$subjectId" params={{ program: programCode, subjectId: s.id }}>
                <Card className="p-4 hover:shadow-pop transition cursor-pointer">
                  <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
                    <div className="h-12 w-12 rounded-2xl grid place-items-center text-2xl shrink-0" style={{ backgroundColor: (s.color || "#FDE68A") + "33" }}>
                      {s.icon || "📘"}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold uppercase text-muted-foreground">{programCode === "kg2_brushup" ? "Revision" : "Class"}</div>
                      <div className="font-extrabold truncate">{tr(s.name)}</div>
                      <div className="text-xs text-muted-foreground">Teacher Lesson · Practice · Homework</div>
                    </div>
                    <Button size="sm" className="rounded-2xl gap-1"><PlayCircle className="h-4 w-4" /> Enter Class</Button>
                  </div>
                </Card>
              </Link>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {schedule.map((row: any) => {
            const lessonDone = row.lesson ? lessonMap.get(row.lesson.id)?.status === "completed" : false;
            return (
              <Card key={row.id} className="p-4">
                <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl grid place-items-center text-2xl" style={{ backgroundColor: (row.subject?.color || "#FDE68A") + "33" }}>
                    {row.subject?.icon || "📘"}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold uppercase text-muted-foreground">{typeof row.subject?.name === "object" ? row.subject?.name?.en : row.subject?.name}</div>
                    <div className="font-extrabold truncate">{row.lesson ? (typeof row.lesson.title === "object" ? row.lesson.title?.en : row.lesson.title) : "Free study"}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <Clock className="h-3 w-3" /> ~{row.lesson?.estimated_minutes ?? 15} min
                      {lessonDone && <span className="text-success flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Completed</span>}
                    </div>
                  </div>
                  {row.lesson ? (
                    <Link to="/student/classroom/$lessonId" params={{ lessonId: row.lesson.id }}>
                      <Button size="sm" className="rounded-2xl gap-1"><PlayCircle className="h-4 w-4" /> Enter Class</Button>
                    </Link>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}