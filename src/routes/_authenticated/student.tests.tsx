import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStudents } from "@/lib/student-context";
import { useI18n } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/student/tests")({
  component: TestsPage,
});

function TestsPage() {
  const { activeStudent } = useStudents();
  const { t, tr } = useI18n();

  const { data: tests = [] } = useQuery({
    queryKey: ["tests-for-class", activeStudent?.class_id],
    enabled: !!activeStudent?.class_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tests")
        .select("id, title, duration_minutes, pass_threshold, questions, subjects!inner(id, name, class_id)")
        .eq("subjects.class_id", activeStudent!.class_id!);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: attempts = [] } = useQuery({
    queryKey: ["attempts", activeStudent?.id],
    enabled: !!activeStudent,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("test_attempts")
        .select("test_id, score, status, completed_at")
        .eq("student_profile_id", activeStudent!.id);
      if (error) throw error;
      return data ?? [];
    },
  });

  const bestByTest = new Map<string, number>();
  attempts.forEach((a) => {
    if (a.status === "completed") {
      const prev = bestByTest.get(a.test_id) ?? -1;
      if ((a.score ?? 0) > prev) bestByTest.set(a.test_id, a.score ?? 0);
    }
  });

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-extrabold">{t("tests")}</h1>
      {tests.length === 0 && (
        <Card className="p-8 text-center text-muted-foreground">No tests yet. Check back soon!</Card>
      )}
      <div className="grid sm:grid-cols-2 gap-3">
        {tests.map((tt: any) => {
          const best = bestByTest.get(tt.id);
          const passed = best != null && best >= tt.pass_threshold;
          return (
            <Card key={tt.id} className="p-4 flex items-start gap-3">
              <ClipboardCheck className="h-6 w-6 text-primary" />
              <div className="flex-1">
                <h3 className="font-extrabold">{tr(tt.title)}</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {(tt.questions ?? []).length} questions · {tt.duration_minutes} min · pass {tt.pass_threshold}%
                </p>
                {best != null && (
                  <p className={`mt-2 text-sm font-bold ${passed ? "text-success" : "text-destructive"}`}>
                    Best: {best}% {passed ? "✓" : ""}
                  </p>
                )}
              </div>
              <Link to="/student/test/$testId" params={{ testId: tt.id }}>
                <Button size="sm">{t("start_test")}</Button>
              </Link>
            </Card>
          );
        })}
      </div>
    </div>
  );
}