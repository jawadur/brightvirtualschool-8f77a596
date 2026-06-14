import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useStudents } from "@/lib/student-context";
import { Card } from "@/components/ui/card";
import { fetchJourney } from "@/lib/journey";
import { fetchStreaks } from "@/lib/streaks";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, BookOpen, Sparkles, Flame, ClipboardList, PencilLine } from "lucide-react";

export const Route = createFileRoute("/_authenticated/student/portfolio")({
  component: PortfolioPage,
});

function PortfolioPage() {
  const { activeStudent } = useStudents();
  const sid = activeStudent?.id;

  const journeyQ = useQuery({ queryKey: ["journey", sid], enabled: !!sid, queryFn: () => fetchJourney(sid!) });
  const streaksQ = useQuery({ queryKey: ["streaks", sid], enabled: !!sid, queryFn: () => fetchStreaks(sid!) });
  const statsQ = useQuery({
    queryKey: ["portfolio-stats", sid],
    enabled: !!sid,
    queryFn: async () => {
      const [lessons, badges, homework, reading] = await Promise.all([
        supabase.from("progress").select("id", { count: "exact", head: true }).eq("student_profile_id", sid!).eq("status", "completed"),
        supabase.from("student_badges").select("id", { count: "exact", head: true }).eq("student_profile_id", sid!),
        supabase.from("homework").select("id", { count: "exact", head: true }).eq("student_profile_id", sid!).not("completed_at", "is", null),
        supabase.from("reading_sessions").select("id", { count: "exact", head: true }).eq("student_profile_id", sid!),
      ]);
      return {
        lessons: lessons.count ?? 0,
        badges: badges.count ?? 0,
        homework: homework.count ?? 0,
        reading: reading.count ?? 0,
      };
    },
  });

  const events = journeyQ.data ?? [];
  const streaks = streaksQ.data;
  const stats = statsQ.data;

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-2">
        <Sparkles className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-extrabold">My Learning Journey</h1>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile icon={BookOpen} label="Lessons" value={stats?.lessons ?? 0} />
        <StatTile icon={Trophy} label="Badges" value={stats?.badges ?? 0} />
        <StatTile icon={ClipboardList} label="Homework" value={stats?.homework ?? 0} />
        <StatTile icon={PencilLine} label="Reading" value={stats?.reading ?? 0} />
      </div>

      {streaks && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Flame className="h-5 w-5 text-orange-500" />
            <h2 className="font-extrabold">My Streaks</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StreakTile label="Learning" value={streaks.learning} />
            <StreakTile label="Homework" value={streaks.homework} />
            <StreakTile label="Reading" value={streaks.reading} />
            <StreakTile label="Revision" value={streaks.revision} />
          </div>
        </Card>
      )}

      <section>
        <h2 className="font-extrabold mb-2">Timeline</h2>
        {events.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground">Your journey starts here. Complete lessons and reading to fill your timeline.</Card>
        ) : (
          <ol className="relative border-l-2 border-primary/20 ml-3 space-y-3 pl-5">
            {events.map((e) => (
              <li key={e.id} className="relative">
                <span className="absolute -left-[30px] top-1 h-6 w-6 rounded-full bg-primary/10 grid place-items-center text-sm">
                  {e.icon || "✨"}
                </span>
                <Card className="p-3">
                  <div className="text-xs text-muted-foreground">{new Date(e.occurred_at).toLocaleString()}</div>
                  <div className="font-bold">{e.title}</div>
                  {e.description && <div className="text-sm text-muted-foreground">{e.description}</div>}
                </Card>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function StatTile({ icon: Icon, label, value }: { icon: typeof BookOpen; label: string; value: number }) {
  return (
    <Card className="p-4">
      <Icon className="h-5 w-5 text-primary" />
      <div className="mt-1 text-2xl font-extrabold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </Card>
  );
}
function StreakTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-orange-500/10 p-3 text-center">
      <div className="text-2xl font-extrabold text-orange-600">🔥 {value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}