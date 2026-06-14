import { createFileRoute, Outlet, useNavigate, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppHeader } from "@/components/app/AppHeader";
import { useStudents } from "@/lib/student-context";
import { useI18n } from "@/lib/i18n";
import { StudentPrefsProvider } from "@/lib/student-prefs";
import { Home, Trophy, BarChart3, ClipboardCheck, Sparkles, Settings as SettingsIcon, GraduationCap, RefreshCcw, ClipboardList, PencilLine, BookOpen, BookHeart } from "lucide-react";

export const Route = createFileRoute("/_authenticated/student")({
  component: StudentShell,
});

function StudentShell() {
  const { activeStudent, isLoading } = useStudents();
  const { t } = useI18n();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !activeStudent) navigate({ to: "/profiles" });
  }, [isLoading, activeStudent, navigate]);

  if (!activeStudent) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        {t("loading")}
      </div>
    );
  }

  const tabs = [
    { to: "/student", icon: Home, label: t("todays_school"), exact: true },
    { to: "/student/classroom", icon: GraduationCap, label: "Classroom" },
    { to: "/student/homework", icon: ClipboardList, label: "Homework" },
    { to: "/student/brush-up", icon: Sparkles, label: "Brush-Up" },
    { to: "/student/read-along", icon: BookOpen, label: "Read Along" },
    { to: "/student/writing", icon: PencilLine, label: "Writing" },
    { to: "/student/readiness", icon: BookHeart, label: "Readiness" },
    { to: "/student/revision-center", icon: RefreshCcw, label: "Revision" },
    { to: "/student/tests", icon: ClipboardCheck, label: t("tests") },
    { to: "/student/portfolio", icon: BarChart3, label: "Journey" },
    { to: "/student/rewards", icon: Trophy, label: t("trophy_room") },
    { to: "/student/settings", icon: SettingsIcon, label: "Settings" },
  ];

  return (
    <StudentPrefsProvider>
      <div className="min-h-screen pb-20 sm:pb-0">
      <AppHeader showStudent />
      <main className="max-w-5xl mx-auto px-4 py-4">
        <Outlet />
      </main>
      {/* Bottom nav for mobile / sticky nav for desktop */}
      <nav className="fixed bottom-0 inset-x-0 sm:static sm:max-w-5xl sm:mx-auto sm:mt-4 bg-card border-t sm:border border-border sm:rounded-2xl sm:px-4 px-2 py-2 flex justify-around sm:justify-center sm:gap-4 overflow-x-auto">
        {tabs.map(({ to, icon: Icon, label, exact }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact }}
            activeProps={{ className: "text-primary" }}
            inactiveProps={{ className: "text-muted-foreground" }}
            className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 text-[11px] sm:text-sm font-bold shrink-0"
          >
            <Icon className="h-5 w-5" />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
      </div>
    </StudentPrefsProvider>
  );
}