import type { TtsLang } from "@/hooks/use-tts";
import type { ChalkPrimitive } from "@/components/lesson/Blackboard";

export type LessonScriptStepType =
  | "speech"
  | "pause"
  | "draw"
  | "count"
  | "question"
  | "praise"
  | "highlight"
  | "clear_board";

export type LocalizedText = string | Partial<Record<TtsLang, string>>;

export type LessonScriptStep = {
  id?: string;
  type: LessonScriptStepType;
  text?: LocalizedText;
  caption?: LocalizedText;
  durationSeconds?: number;
  primitive?: ChalkPrimitive;
  primitives?: ChalkPrimitive[];
  values?: Array<string | number>;
  options?: string[];
  answer?: string | number;
  hint?: LocalizedText;
};

export function pickLocalized(value: LocalizedText | undefined | null, lang: TtsLang, fallback = "") {
  if (!value) return fallback;
  if (typeof value === "string") return value;
  return value[lang] || value.en || value.hi || value.te || fallback;
}

export function coerceLessonScript(input: unknown): LessonScriptStep[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((item): item is LessonScriptStep => !!item && typeof item === "object" && "type" in item)
    .map((item, index) => ({ id: item.id ?? `script-step-${index}`, ...item }));
}
