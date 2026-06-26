import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type AIConfig = {
  question_source: "manual" | "ai" | "mixed";
  ai_topics: string[];
  ai_question_count: number | "";
  ai_difficulty: "easy" | "medium" | "hard" | "adaptive";
  ai_randomize: boolean;
  ai_adaptive: boolean;
  ai_weak_area_practice: boolean;
  ai_show_explanation: boolean;
  ai_auto_topup: boolean;
};

export const DEFAULT_AI: AIConfig = {
  question_source: "manual",
  ai_topics: [],
  ai_question_count: 10,
  ai_difficulty: "medium",
  ai_randomize: true,
  ai_adaptive: false,
  ai_weak_area_practice: false,
  ai_show_explanation: true,
  ai_auto_topup: false,
};

export function aiFromRow(d: any): AIConfig {
  if (!d) return DEFAULT_AI;
  const topics = Array.isArray(d.ai_topics) ? d.ai_topics.map(String) : [];
  return {
    question_source: (d.question_source ?? "manual") as AIConfig["question_source"],
    ai_topics: topics,
    ai_question_count: d.ai_question_count ?? 10,
    ai_difficulty: (d.ai_difficulty ?? "medium") as AIConfig["ai_difficulty"],
    ai_randomize: d.ai_randomize ?? true,
    ai_adaptive: d.ai_adaptive ?? false,
    ai_weak_area_practice: d.ai_weak_area_practice ?? false,
    ai_show_explanation: d.ai_show_explanation ?? true,
    ai_auto_topup: d.ai_auto_topup ?? false,
  };
}

export function aiToRow(cfg: AIConfig) {
  return {
    question_source: cfg.question_source,
    ai_topics: cfg.ai_topics,
    ai_question_count: cfg.ai_question_count === "" ? null : Number(cfg.ai_question_count),
    ai_difficulty: cfg.ai_difficulty,
    ai_randomize: cfg.ai_randomize,
    ai_adaptive: cfg.ai_adaptive,
    ai_weak_area_practice: cfg.ai_weak_area_practice,
    ai_show_explanation: cfg.ai_show_explanation,
    ai_auto_topup: cfg.ai_auto_topup,
  };
}

export function AIConfigFields({
  value,
  onChange,
  compact = false,
}: {
  value: AIConfig;
  onChange: (next: AIConfig) => void;
  compact?: boolean;
}) {
  const set = (patch: Partial<AIConfig>) => onChange({ ...value, ...patch });
  const aiOn = value.question_source !== "manual";
  const topicsText = (value.ai_topics ?? []).join(", ");
  return (
    <div className="rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-extrabold text-sm">✨ AI Question Bank</div>
        <div className="text-[11px] text-muted-foreground">manual · ai · mixed</div>
      </div>
      <div className={`grid gap-3 ${compact ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
        <div>
          <Label>Question source</Label>
          <select
            value={value.question_source}
            onChange={(e) => set({ question_source: e.target.value as AIConfig["question_source"] })}
            className="w-full rounded-md border border-input bg-card px-3 py-2"
          >
            <option value="manual">Manual only</option>
            <option value="ai">AI only</option>
            <option value="mixed">Mixed (manual + AI)</option>
          </select>
        </div>
        <div>
          <Label>AI difficulty</Label>
          <select
            value={value.ai_difficulty}
            disabled={!aiOn}
            onChange={(e) => set({ ai_difficulty: e.target.value as AIConfig["ai_difficulty"] })}
            className="w-full rounded-md border border-input bg-card px-3 py-2 disabled:opacity-50"
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
            <option value="adaptive">Adaptive</option>
          </select>
        </div>
        <div>
          <Label>AI question count</Label>
          <Input
            type="number"
            min={1}
            disabled={!aiOn}
            value={value.ai_question_count}
            onChange={(e) =>
              set({ ai_question_count: e.target.value === "" ? "" : Number(e.target.value) })
            }
          />
        </div>
      </div>
      <div>
        <Label>AI topics (comma separated)</Label>
        <Input
          disabled={!aiOn}
          value={topicsText}
          onChange={(e) =>
            set({
              ai_topics: e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
          placeholder="e.g. addition, subtraction, place value"
        />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
        {[
          ["ai_randomize", "Randomize"],
          ["ai_adaptive", "Adaptive difficulty"],
          ["ai_weak_area_practice", "Prioritize weak areas"],
          ["ai_show_explanation", "Show explanation after answer"],
          ["ai_auto_topup", "Auto top-up low pool"],
        ].map(([k, label]) => (
          <label key={k} className="flex items-center gap-2 font-bold">
            <input
              type="checkbox"
              disabled={!aiOn}
              checked={(value as any)[k]}
              onChange={(e) => set({ [k]: e.target.checked } as any)}
              className="h-4 w-4"
            />
            {label}
          </label>
        ))}
      </div>
    </div>
  );
}