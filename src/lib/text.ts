// Safe text resolver: returns a string for any value that may be a
// multilingual object like { en, hi, te }. Prevents React Error #31
// ("Objects are not valid as a React child") when seeded content stores
// translations as objects.
export function getText(value: unknown, lang: string = "en"): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map((v) => getText(v, lang)).join(" ");
  if (typeof value === "object") {
    const o = value as Record<string, unknown>;
    const pick = o[lang] ?? o.en ?? o.hi ?? o.te;
    if (pick != null) return getText(pick, lang);
    const first = Object.values(o).find((v) => v != null);
    return first == null ? "" : getText(first, lang);
  }
  return String(value);
}