import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStudents } from "@/lib/student-context";
import { useI18n } from "@/lib/i18n";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/student/attendance")({
  component: AttendancePage,
});

function AttendancePage() {
  const { activeStudent } = useStudents();
  const { t } = useI18n();

  const { data: rows = [] } = useQuery({
    queryKey: ["attendance", activeStudent?.id],
    enabled: !!activeStudent,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance").select("date, present")
        .eq("student_profile_id", activeStudent!.id)
        .gte("date", new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString().slice(0, 10));
      if (error) throw error;
      return data ?? [];
    },
  });

  const presentSet = new Set(rows.filter((r) => r.present).map((r) => r.date));
  const today = new Date();
  const days: { date: string; inMonth: boolean }[] = [];
  const first = new Date(today.getFullYear(), today.getMonth(), 1);
  const startWeekday = first.getDay();
  for (let i = 0; i < startWeekday; i++) days.push({ date: "", inMonth: false });
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const dd = new Date(today.getFullYear(), today.getMonth(), d).toISOString().slice(0, 10);
    days.push({ date: dd, inMonth: true });
  }

  const monthPresent = days.filter((d) => d.inMonth && presentSet.has(d.date)).length;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold">{t("attendance")}</h1>
      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="text-sm text-muted-foreground">{t("this_month")}</div>
          <div className="text-3xl font-extrabold">{monthPresent} days</div>
        </Card>
        <Card className="p-5">
          <div className="text-sm text-muted-foreground">{t("streak")}</div>
          <div className="text-3xl font-extrabold">🔥 {activeStudent?.current_streak ?? 0}</div>
        </Card>
        <Card className="p-5">
          <div className="text-sm text-muted-foreground">Longest streak</div>
          <div className="text-3xl font-extrabold">{activeStudent?.longest_streak ?? 0}</div>
        </Card>
      </div>

      <Card className="p-5">
        <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-muted-foreground">
          {["S","M","T","W","T","F","S"].map((d, i) => <div key={i}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-2 mt-2">
          {days.map((d, i) => {
            const present = d.inMonth && presentSet.has(d.date);
            return (
              <div
                key={i}
                className={`aspect-square rounded-xl flex items-center justify-center text-sm font-bold ${
                  !d.inMonth ? "" : present ? "bg-success text-white" : "bg-muted text-muted-foreground"
                }`}
              >
                {d.inMonth ? Number(d.date.slice(-2)) : ""}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}