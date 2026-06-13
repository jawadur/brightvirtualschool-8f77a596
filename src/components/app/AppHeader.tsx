import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut, Sparkles, Coins, Flame } from "lucide-react";
import { useI18n, LANGS } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import { useStudents } from "@/lib/student-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export function AppHeader({ showStudent = false }: { showStudent?: boolean }) {
  const { t, lang, setLang } = useI18n();
  const { user } = useAuth();
  const { activeStudent, setActiveStudentId } = useStudents();
  const navigate = useNavigate();

  const signOut = async () => {
    await supabase.auth.signOut();
    setActiveStudentId(null);
    navigate({ to: "/auth" });
  };

  return (
    <header className="sticky top-0 z-30 bg-card/90 backdrop-blur border-b border-border">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
        <Link to="/profiles" className="flex items-center gap-2 font-extrabold">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="hidden sm:inline">{t("app_name")}</span>
        </Link>
        <div className="flex-1" />
        {showStudent && activeStudent && (
          <div className="flex items-center gap-3 mr-2">
            <div className="flex items-center gap-1 rounded-full bg-accent px-3 py-1 font-bold">
              <Coins className="h-4 w-4 text-coin" /> {activeStudent.coins}
            </div>
            <div className="hidden sm:flex items-center gap-1 rounded-full bg-secondary px-3 py-1 font-bold">
              <Flame className="h-4 w-4 text-primary" /> {activeStudent.current_streak}
            </div>
          </div>
        )}
        <select
          aria-label={t("language")}
          value={lang}
          onChange={(e) => setLang(e.target.value as typeof lang)}
          className="rounded-full border border-border bg-card px-3 py-1.5 text-sm font-semibold"
        >
          {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
        </select>
        {user && (
          <Button variant="ghost" size="icon" onClick={signOut} aria-label={t("sign_out")}>
            <LogOut className="h-4 w-4" />
          </Button>
        )}
      </div>
    </header>
  );
}