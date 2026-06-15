import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useStudents } from "@/lib/student-context";
import { PROGRAMS, fetchActiveProgram, setActiveProgram, type ProgramCode } from "@/lib/program";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/student/program-select")({
  component: ProgramSelect,
});

function ProgramSelect() {
  const { activeStudent } = useStudents();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: active } = useQuery({
    queryKey: ["active-program", activeStudent?.id],
    enabled: !!activeStudent,
    queryFn: () => fetchActiveProgram(activeStudent!.id),
  });

  async function choose(code: ProgramCode) {
    if (!activeStudent) return;
    try {
      await setActiveProgram(activeStudent.id, code);
      await qc.invalidateQueries({ queryKey: ["active-program", activeStudent.id] });
      toast.success("Program selected");
      navigate({ to: "/student/today" });
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save");
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-extrabold">Choose Learning Program</h1>
        <p className="text-muted-foreground mt-1">Pick which program {activeStudent?.display_name} is using today. You can switch any time.</p>
      </header>
      <div className="grid md:grid-cols-2 gap-5">
        {PROGRAMS.map((p) => {
          const isActive = active === p.code;
          return (
            <Card key={p.code} className="p-6 flex flex-col gap-4 h-auto">
              <div className="flex items-start gap-3">
                <div className="text-5xl">{p.emoji}</div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold uppercase text-primary">{p.tagline}</div>
                  <h2 className="text-2xl font-extrabold leading-tight">{p.name}</h2>
                </div>
                {isActive && <CheckCircle2 className="h-6 w-6 text-success shrink-0" />}
              </div>
              <p className="text-sm text-foreground/80 leading-relaxed">{p.description}</p>
              <Button
                onClick={() => choose(p.code)}
                variant={isActive ? "secondary" : "default"}
                className="rounded-2xl mt-auto"
              >
                {isActive ? "Continue with this program" : `Start ${p.name}`}
              </Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}