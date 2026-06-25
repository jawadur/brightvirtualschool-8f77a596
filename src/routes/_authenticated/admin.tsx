import { createFileRoute, Outlet, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppHeader } from "@/components/app/AppHeader";
import { useAuth } from "@/hooks/use-auth";
import { LayoutGrid, BookOpen, ClipboardList, ClipboardCheck, Library, Wand2, ShieldAlert, CalendarCheck, BarChart3, Sparkles, CalendarRange, UserCheck, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — Sunrise Virtual School" }] }),
  component: AdminShell,
});

function AdminShell() {
  const { isAdmin, loading, user, refreshRole } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;

  if (!isAdmin) {
    return (
      <div className="min-h-screen">
        <AppHeader />
        <main className="max-w-md mx-auto px-4 py-16 text-center">
          <ShieldAlert className="h-12 w-12 text-primary mx-auto" />
          <h1 className="mt-4 text-2xl font-extrabold">Admin access required</h1>
          <p className="mt-2 text-muted-foreground">
            Your account doesn't have an admin role yet. Ask an existing admin to grant you access.
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            For initial setup, ask the platform owner to assign you the admin role from the database.
          </p>
        </main>
      </div>
    );
  }

  const tabs = [
    { to: "/admin", icon: LayoutGrid, label: "Curriculum", exact: true },
    { to: "/admin/curriculum-progress", icon: BarChart3, label: "Coverage" },
    { to: "/admin/weekly-planner", icon: CalendarRange, label: "Weekly Planner" },
    { to: "/admin/lesson-wizard", icon: Sparkles, label: "New Lesson" },
    { to: "/admin/schedule", icon: CalendarCheck, label: "Schedule" },
    { to: "/admin/assignments", icon: ClipboardList, label: "Assignments" },
    { to: "/admin/teacher-assignments", icon: UserCheck, label: "Teacher Assign" },
    { to: "/admin/tests", icon: ClipboardCheck, label: "Tests" },
    { to: "/admin/questions", icon: Library, label: "Question Bank" },
    { to: "/admin/ai-questions", icon: Brain, label: "AI Questions" },
    { to: "/admin/badges", icon: BookOpen, label: "Badges" },
    { to: "/admin/homework", icon: Wand2, label: "Homework Gen" },
  ];

  return (
    <div className="min-h-screen pb-20 sm:pb-0">
      <AppHeader />
      <div className="max-w-6xl mx-auto px-4 py-4">
        <nav className="flex gap-2 mb-4 border-b overflow-x-auto">
          {tabs.map(({ to, icon: Icon, label, exact }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact }}
              activeProps={{ className: "border-primary text-primary" }}
              inactiveProps={{ className: "border-transparent text-muted-foreground" }}
              className="flex items-center gap-2 px-4 py-2 font-bold text-sm border-b-2 -mb-px shrink-0 whitespace-nowrap"
            >
              <Icon className="h-4 w-4" /> {label}
            </Link>
          ))}
        </nav>
        <Outlet />
      </div>
    </div>
  );
}