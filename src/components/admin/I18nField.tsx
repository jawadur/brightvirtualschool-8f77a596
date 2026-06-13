import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { LANGS } from "@/lib/i18n";

type Val = Record<string, string> | null | undefined;

export function I18nField({
  label,
  value,
  onChange,
  textarea = false,
  required = false,
}: {
  label: string;
  value: Val;
  onChange: (v: Record<string, string>) => void;
  textarea?: boolean;
  required?: boolean;
}) {
  const v = (value ?? {}) as Record<string, string>;
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="grid gap-2">
        {LANGS.map((l) => (
          <div key={l.code} className="flex items-start gap-2">
            <span className="mt-2 w-12 shrink-0 text-xs font-bold uppercase text-muted-foreground">{l.code}</span>
            {textarea ? (
              <Textarea
                value={v[l.code] ?? ""}
                onChange={(e) => onChange({ ...v, [l.code]: e.target.value })}
                required={required && l.code === "en"}
                placeholder={l.code === "en" ? "Required" : "Optional"}
                rows={2}
              />
            ) : (
              <Input
                value={v[l.code] ?? ""}
                onChange={(e) => onChange({ ...v, [l.code]: e.target.value })}
                required={required && l.code === "en"}
                placeholder={l.code === "en" ? "Required" : "Optional"}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}