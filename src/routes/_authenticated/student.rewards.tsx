import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStudents } from "@/lib/student-context";
import { useI18n } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Coins, Star, Trophy } from "lucide-react";

export const Route = createFileRoute("/_authenticated/student/rewards")({
  component: RewardsPage,
});

function RewardsPage() {
  const { activeStudent } = useStudents();
  const { t, tr } = useI18n();

  const { data: badges = [] } = useQuery({
    queryKey: ["badges"],
    queryFn: async () => {
      const { data, error } = await supabase.from("badges").select("id, code, name, description, icon");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: earned = [] } = useQuery({
    queryKey: ["student-badges", activeStudent?.id],
    enabled: !!activeStudent,
    queryFn: async () => {
      const { data, error } = await supabase.from("student_badges").select("badge_id, earned_at").eq("student_profile_id", activeStudent!.id);
      if (error) throw error;
      return data ?? [];
    },
  });

  const earnedIds = new Set(earned.map((e) => e.badge_id));

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold">{t("trophy_room")}</h1>
      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="p-5 flex items-center gap-3">
          <Coins className="h-10 w-10 text-coin" />
          <div><div className="text-sm text-muted-foreground">{t("coins")}</div><div className="text-3xl font-extrabold">{activeStudent?.coins ?? 0}</div></div>
        </Card>
        <Card className="p-5 flex items-center gap-3">
          <Star className="h-10 w-10 text-primary" />
          <div><div className="text-sm text-muted-foreground">{t("stars")}</div><div className="text-3xl font-extrabold">{activeStudent?.stars ?? 0}</div></div>
        </Card>
        <Card className="p-5 flex items-center gap-3">
          <Trophy className="h-10 w-10 text-primary" />
          <div><div className="text-sm text-muted-foreground">Badges</div><div className="text-3xl font-extrabold">{earnedIds.size}/{badges.length}</div></div>
        </Card>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {badges.map((b: any) => {
          const has = earnedIds.has(b.id);
          return (
            <Card key={b.id} className={`p-4 text-center ${has ? "" : "opacity-40 grayscale"}`}>
              <div className="text-5xl">{has ? "🏅" : "🔒"}</div>
              <div className="mt-2 font-extrabold">{tr(b.name)}</div>
              <div className="text-xs text-muted-foreground">{tr(b.description)}</div>
            </Card>
          );
        })}
      </div>
      {earnedIds.size === 0 && <p className="text-center text-muted-foreground">{t("no_rewards_yet")}</p>}
    </div>
  );
}