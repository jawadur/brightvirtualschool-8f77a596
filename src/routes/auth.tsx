import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";
import { useStudents } from "@/lib/student-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — Sunrise Virtual School" }] }),
  component: AuthPage,
});

function AuthPage() {
  const { t } = useI18n();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/profiles" });
  }, [loading, user, navigate]);

  return (
    <div className="min-h-screen bg-hero flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl bg-card border border-border shadow-pop p-6">
        <Link to="/" className="flex items-center gap-2 text-xl font-extrabold mb-4">
          <Sparkles className="h-6 w-6 text-primary" /> {t("app_name")}
        </Link>
        <Tabs defaultValue="parent">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="parent">{t("parent_login")}</TabsTrigger>
            <TabsTrigger value="student">{t("student_login")}</TabsTrigger>
          </TabsList>
          <TabsContent value="parent"><ParentForm /></TabsContent>
          <TabsContent value="student"><StudentPinForm /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function ParentForm() {
  const { t } = useI18n();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
            data: { full_name: fullName, role: "parent" },
          },
        });
        if (error) throw error;
        toast.success("Account created! Check your email to verify.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const onGoogle = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/profiles",
    });
    if (result.error) toast.error(result.error.message ?? "Sign-in failed");
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4 mt-4">
      {mode === "signup" && (
        <div>
          <Label>{t("full_name")}</Label>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        </div>
      )}
      <div>
        <Label>{t("email")}</Label>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div>
        <Label>{t("password")}</Label>
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
      </div>
      <Button type="submit" className="w-full" disabled={busy}>
        {mode === "signup" ? t("sign_up") : t("sign_in")}
      </Button>
      <Button type="button" variant="outline" className="w-full" onClick={onGoogle}>
        {t("continue_with_google")}
      </Button>
      <button
        type="button"
        className="w-full text-sm text-muted-foreground hover:text-primary"
        onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
      >
        {mode === "signin" ? "Create a new account" : "Already have an account? Sign in"}
      </button>
    </form>
  );
}

function StudentPinForm() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const { refresh, setActiveStudentId } = useStudents();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data: matchId, error } = await supabase.rpc("verify_student_pin", {
        _name: name.trim(),
        _pin: pin.trim(),
      } as any);
      if (error) throw error;
      if (!matchId) {
        toast.error("Ask a parent to sign in first, then try your PIN.");
        return;
      }
      setActiveStudentId(matchId as string);
      refresh();
      navigate({ to: "/student" });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4 mt-4">
      <p className="text-sm text-muted-foreground">
        Use the name and 4-digit PIN your parent set up.
      </p>
      <div>
        <Label>Your name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div>
        <Label>{t("pin")}</Label>
        <Input value={pin} onChange={(e) => setPin(e.target.value)} required maxLength={6} inputMode="numeric" />
      </div>
      <Button type="submit" className="w-full" disabled={busy}>{t("sign_in")}</Button>
    </form>
  );
}