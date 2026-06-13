import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useI18n, LANGS } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { BookOpen, Sparkles, Trophy, CalendarCheck } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { user, loading } = useAuth();
  const { t, lang, setLang } = useI18n();
  return (
    <div className="min-h-screen bg-hero">
      <header className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2 text-2xl font-extrabold">
          <Sparkles className="h-7 w-7 text-primary" /> {t("app_name")}
        </div>
        <div className="flex items-center gap-2">
          <select
            aria-label={t("language")}
            value={lang}
            onChange={(e) => setLang(e.target.value as typeof lang)}
            className="rounded-full border border-border bg-card px-3 py-1.5 text-sm font-semibold"
          >
            {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
          {!loading && (user ? (
            <Link to="/profiles"><Button>{t("start_learning")}</Button></Link>
          ) : (
            <Link to="/auth"><Button>{t("sign_in")}</Button></Link>
          ))}
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 pt-10 pb-20">
        <section className="grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <h1 className="text-5xl sm:text-6xl font-extrabold leading-tight text-foreground">
              A friendly school <span className="text-primary">from home.</span>
            </h1>
            <p className="mt-5 text-lg text-muted-foreground max-w-lg">
              Daily classes, fun lessons, and rewards for children aged 5–7 who can't attend school regularly.
              Keep learning, build streaks, and never fall behind.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={user ? "/profiles" : "/auth"}>
                <Button size="lg" className="shadow-pop text-base">
                  {user ? t("start_learning") : t("sign_up")}
                </Button>
              </Link>
            </div>
            <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-xl">
              {[
                { i: BookOpen, k: "lessons" as const },
                { i: Trophy, k: "rewards" as const },
                { i: CalendarCheck, k: "attendance" as const },
                { i: Sparkles, k: "progress" as const },
              ].map(({ i: Icon, k }) => (
                <div key={k} className="rounded-2xl bg-card/70 backdrop-blur p-4 border border-border">
                  <Icon className="h-6 w-6 text-primary" />
                  <div className="mt-2 font-bold text-sm">{t(k)}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl bg-card border border-border shadow-pop p-8 aspect-square flex items-center justify-center text-center">
            <div>
              <div className="text-7xl mb-4">🎒</div>
              <h2 className="text-2xl font-extrabold">{t("todays_school")}</h2>
              <p className="text-muted-foreground mt-2">English → Math → Hindi → Telugu → EVS</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
