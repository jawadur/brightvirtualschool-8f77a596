import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { I18nField } from "@/components/admin/I18nField";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/badges")({
  component: BadgesPage,
});

type Badge = { id: string; code: string; name: Record<string, string>; description: Record<string, string>; icon: string | null; criteria: any };

function BadgesPage() {
  const { tr } = useI18n();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin-badges"],
    queryFn: async () => {
      const { data, error } = await supabase.from("badges").select("*").order("code");
      if (error) throw error; return (data ?? []) as Badge[];
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-extrabold">Badges</h1>
          <p className="text-sm text-muted-foreground">Awarded to students based on rules you define.</p>
        </div>
        <BadgeDialog onSaved={() => qc.invalidateQueries({ queryKey: ["admin-badges"] })}>
          <Button><Plus className="h-4 w-4 mr-1" />New badge</Button>
        </BadgeDialog>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {(q.data ?? []).map((b) => (
          <Card key={b.id} className="p-4">
            <div className="flex items-start gap-3">
              <div className="text-3xl">{b.icon ?? "🏅"}</div>
              <div className="flex-1">
                <h3 className="font-extrabold">{tr(b.name)}</h3>
                <p className="text-xs text-muted-foreground">{b.code}</p>
                <p className="text-sm mt-1">{tr(b.description)}</p>
              </div>
              <BadgeDialog initial={b} onSaved={() => qc.invalidateQueries({ queryKey: ["admin-badges"] })}>
                <Button size="icon" variant="ghost"><Pencil className="h-4 w-4" /></Button>
              </BadgeDialog>
              <Button size="icon" variant="ghost" onClick={async () => {
                if (!confirm("Delete badge?")) return;
                const { error } = await supabase.from("badges").delete().eq("id", b.id);
                if (error) { toast.error(error.message); return; }
                qc.invalidateQueries({ queryKey: ["admin-badges"] });
              }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          </Card>
        ))}
        {q.data && q.data.length === 0 && (
          <Card className="p-6 text-center text-muted-foreground sm:col-span-2">No badges yet.</Card>
        )}
      </div>
    </div>
  );
}

function BadgeDialog({ initial, children, onSaved }: { initial?: Badge; children: React.ReactNode; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState(initial?.code ?? "");
  const [name, setName] = useState<Record<string, string>>(initial?.name ?? {});
  const [description, setDescription] = useState<Record<string, string>>(initial?.description ?? {});
  const [icon, setIcon] = useState(initial?.icon ?? "🏅");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = { code, name, description, icon, criteria: {} };
      if (initial) {
        const { error } = await supabase.from("badges").update(payload).eq("id", initial.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("badges").insert(payload);
        if (error) throw error;
      }
      toast.success("Saved");
      setOpen(false);
      onSaved();
    } catch (err) { toast.error((err as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{initial ? "Edit badge" : "New badge"}</DialogTitle></DialogHeader>
        <form className="space-y-3" onSubmit={submit}>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Label>Code</Label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} required />
            </div>
            <div>
              <Label>Icon</Label>
              <Input value={icon} onChange={(e) => setIcon(e.target.value)} maxLength={4} />
            </div>
          </div>
          <I18nField label="Name" value={name} onChange={setName} required />
          <I18nField label="Description" value={description} onChange={setDescription} textarea />
          <DialogFooter><Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}