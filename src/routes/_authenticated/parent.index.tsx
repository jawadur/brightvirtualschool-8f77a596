import { createFileRoute, Link } from "@tanstack/react-router";
import { useStudents } from "@/lib/student-context";
import { Card } from "@/components/ui/card";
import { Users, Flame, Coins, Star } from "lucide-react";

export const Route = createFileRoute("/_authenticated/parent/")({
  component: ParentHome,
});

function ParentHome() {
  const { students, isLoading } = useStudents();
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Users className="h-6 w-6 text-primary" />
        <h1 className="text-3xl font-extrabold">My Children</h1>
      </div>
      {isLoading && <p className="text-muted-foreground">Loading…</p>}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {students.map((s) => (
          <Link key={s.id} to="/parent/child/$childId" params={{ childId: s.id }}>
            <Card className="p-5 hover:shadow-pop transition cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 rounded-2xl bg-accent flex items-center justify-center text-2xl">
                  {s.avatar_url ? <img src={s.avatar_url} alt="" className="h-full w-full rounded-2xl object-cover" /> : "🦊"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-lg truncate">{s.display_name}</div>
                  <div className="text-xs text-muted-foreground">{s.preferred_language?.toUpperCase()}</div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <Stat icon={<Flame className="h-4 w-4 text-primary" />} label="Streak" value={s.current_streak} />
                <Stat icon={<Coins className="h-4 w-4 text-coin" />} label="Coins" value={s.coins} />
                <Stat icon={<Star className="h-4 w-4 text-coin" />} label="Stars" value={s.stars} />
              </div>
            </Card>
          </Link>
        ))}
        {!isLoading && students.length === 0 && (
          <Card className="p-8 text-center text-muted-foreground sm:col-span-2 lg:col-span-3">
            No children yet. Add one from the Profiles page.
          </Card>
        )}
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-xl bg-muted/50 py-2">
      <div className="flex items-center justify-center gap-1 font-extrabold">{icon}{value}</div>
      <div className="text-[10px] uppercase font-bold text-muted-foreground">{label}</div>
    </div>
  );
}