import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStudents } from "@/lib/student-context";
import { useI18n } from "@/lib/i18n";
import { AppHeader } from "@/components/app/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, ShieldCheck, Users } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/profiles")({
  head: () => ({ meta: [{ title: "Choose a learner" }] }),
  component: ProfilesPage,
});

function ProfilesPage() {
  const { t, tr } = useI18n();
  const { students, setActiveStudentId, refresh, isLoading } = useStudents();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const pick = (id: string) => {
    setActiveStudentId(id);
    navigate({ to: "/student" });
  };

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-4xl font-extrabold text-center">{t("students")}</h1>
        <p className="text-center text-muted-foreground mt-2">Pick a learner to begin today's school.</p>
        {isAdmin && (
          <div className="mt-4 text-center">
            <Link to="/admin" className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-4 py-2 font-bold hover:bg-primary/20">
              <ShieldCheck className="h-4 w-4" /> Open Admin
            </Link>
          </div>
        )}
        <div className="mt-2 text-center">
          <Link to="/parent" className="inline-flex items-center gap-2 rounded-full bg-secondary/40 text-foreground px-4 py-2 font-bold hover:bg-secondary/60">
            <Users className="h-4 w-4" /> Parent Portal
          </Link>
        </div>

        <div className="mt-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
          {isLoading && <div className="col-span-full text-center text-muted-foreground">{t("loading")}</div>}
          {students.map((s) => (
            <button
              key={s.id}
              onClick={() => pick(s.id)}
              className="group rounded-3xl bg-card border border-border p-5 hover:shadow-pop hover:-translate-y-0.5 transition-all"
            >
              <div className="aspect-square rounded-2xl bg-accent flex items-center justify-center text-5xl">
                {s.avatar_url ? <img src={s.avatar_url} alt="" className="h-full w-full rounded-2xl object-cover" /> : "🦊"}
              </div>
              <div className="mt-3 font-extrabold text-lg">{s.display_name}</div>
              <div className="text-xs text-muted-foreground">⭐ {s.stars} · 🪙 {s.coins}</div>
            </button>
          ))}
          <AddStudentDialog onCreated={() => refresh()} />
        </div>
      </main>
    </div>
  );
}

function AddStudentDialog({ onCreated }: { onCreated: () => void }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [pin, setPin] = useState("");
  const [boardId, setBoardId] = useState<string>("");
  const [classId, setClassId] = useState<string>("");
  const qc = useQueryClient();

  const { data: boards = [] } = useQuery({
    queryKey: ["boards"],
    queryFn: async () => {
      const { data, error } = await supabase.from("boards").select("id, name").order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: classes = [] } = useQuery({
    queryKey: ["classes", boardId],
    enabled: !!boardId,
    queryFn: async () => {
      const { data, error } = await supabase.from("classes").select("id, name").eq("board_id", boardId).order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { data: created, error } = await supabase.from("student_profiles").insert({
        owner_user_id: u.user.id,
        display_name: name.trim(),
        date_of_birth: dob || null,
        board_id: boardId || null,
        class_id: classId || null,
      }).select("id").single();
      if (error) throw error;
      if (pin && pin.length > 0 && created?.id) {
        const { error: pinErr } = await supabase.rpc("set_student_pin", {
          _student_id: created.id,
          _pin: pin,
        } as any);
        if (pinErr) throw pinErr;
      }
    },
    onSuccess: () => {
      toast.success("Learner added!");
      qc.invalidateQueries({ queryKey: ["students"] });
      onCreated();
      setOpen(false);
      setName(""); setDob(""); setPin(""); setBoardId(""); setClassId("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="rounded-3xl border-2 border-dashed border-border p-5 flex flex-col items-center justify-center text-muted-foreground hover:text-primary hover:border-primary transition">
          <Plus className="h-10 w-10" />
          <div className="mt-2 font-bold">{t("add_student")}</div>
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{t("add_student")}</DialogTitle></DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => { e.preventDefault(); if (!boardId || !classId || !name) return; create.mutate(); }}
        >
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <Label>Date of birth (optional)</Label>
            <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
          </div>
          <div>
            <Label>Board</Label>
            <select required value={boardId} onChange={(e) => { setBoardId(e.target.value); setClassId(""); }} className="w-full rounded-md border border-input bg-card px-3 py-2">
              <option value="">Select…</option>
              {boards.map((b) => <option key={b.id} value={b.id}>{(b.name as Record<string,string>).en}</option>)}
            </select>
          </div>
          {boardId && (
            <div>
              <Label>Class</Label>
              <select required value={classId} onChange={(e) => setClassId(e.target.value)} className="w-full rounded-md border border-input bg-card px-3 py-2">
                <option value="">Select…</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{(c.name as Record<string,string>).en}</option>)}
              </select>
            </div>
          )}
          <div>
            <Label>Student PIN (for kid-only login, optional)</Label>
            <Input value={pin} onChange={(e) => setPin(e.target.value)} maxLength={6} inputMode="numeric" placeholder="1234" />
          </div>
          <Button type="submit" className="w-full" disabled={create.isPending}>Create</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}