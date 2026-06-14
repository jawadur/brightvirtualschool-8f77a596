import { I18nField } from "@/components/admin/I18nField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import type { LearningQuestion } from "@/components/learning/QuestionRenderer";

export const QUESTION_TYPES: { value: LearningQuestion["type"]; label: string }[] = [
  { value: "multiple_choice", label: "Multiple choice" },
  { value: "fill_blank", label: "Fill the blank" },
  { value: "match_pairs", label: "Match pairs" },
  { value: "picture_question", label: "Picture question" },
];

export function emptyQuestion(type: LearningQuestion["type"]): LearningQuestion {
  switch (type) {
    case "multiple_choice":
      return { type, question: { en: "" }, options: [{ en: "" }, { en: "" }], answer: 0 };
    case "fill_blank":
      return { type, question: { en: "" }, answer: "" };
    case "match_pairs":
      return { type, question: { en: "Match the pairs" }, pairs: [{ left: { en: "" }, right: { en: "" } }] };
    case "picture_question":
      return { type, question: { en: "" }, image_url: "", options: [{ en: "" }, { en: "" }], answer: 0 };
    default:
      return { type: "multiple_choice", question: { en: "" }, options: [{ en: "" }, { en: "" }], answer: 0 };
  }
}

export function QuestionEditor({
  question,
  onChange,
}: {
  question: LearningQuestion;
  onChange: (q: LearningQuestion) => void;
}) {
  if (question.type === "multiple_choice" || question.type === "picture_question") {
    const q = question;
    return (
      <div className="space-y-3">
        {q.type === "picture_question" && (
          <div>
            <Label>Image URL</Label>
            <Input
              value={q.image_url ?? ""}
              onChange={(e) => onChange({ ...q, image_url: e.target.value })}
              placeholder="https://..."
            />
          </div>
        )}
        <I18nField label="Question" value={q.question as any} onChange={(v) => onChange({ ...q, question: v })} required />
        <Label>Options (select correct)</Label>
        {q.options.map((opt, i) => (
          <div key={i} className="flex items-start gap-2 rounded-xl border p-3">
            <input
              type="radio"
              checked={q.answer === i}
              onChange={() => onChange({ ...q, answer: i })}
              className="mt-3"
            />
            <div className="flex-1">
              <I18nField
                label={`Option ${i + 1}`}
                value={opt as any}
                onChange={(v) => {
                  const options = [...q.options];
                  options[i] = v;
                  onChange({ ...q, options });
                }}
                required
              />
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => {
                const options = q.options.filter((_, k) => k !== i);
                onChange({ ...q, options, answer: Math.min(q.answer, Math.max(0, options.length - 1)) });
              }}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
        <Button size="sm" variant="outline" onClick={() => onChange({ ...q, options: [...q.options, { en: "" }] })}>
          <Plus className="h-3 w-3 mr-1" /> Add option
        </Button>
      </div>
    );
  }

  if (question.type === "fill_blank") {
    const q = question;
    return (
      <div className="space-y-3">
        <I18nField label="Question" value={q.question as any} onChange={(v) => onChange({ ...q, question: v })} required />
        <div>
          <Label>Correct answer</Label>
          <Input value={q.answer} onChange={(e) => onChange({ ...q, answer: e.target.value })} />
        </div>
      </div>
    );
  }

  if (question.type === "match_pairs") {
    const q = question;
    return (
      <div className="space-y-3">
        <I18nField label="Instruction" value={(q.question ?? { en: "" }) as any} onChange={(v) => onChange({ ...q, question: v })} />
        <Label>Pairs (left ↔ right)</Label>
        {q.pairs.map((pair, i) => (
          <div key={i} className="grid sm:grid-cols-[1fr,1fr,auto] gap-2 items-start rounded-xl border p-3">
            <I18nField label={`Left ${i + 1}`} value={pair.left as any} onChange={(v) => {
              const pairs = [...q.pairs]; pairs[i] = { ...pairs[i], left: v }; onChange({ ...q, pairs });
            }} required />
            <I18nField label={`Right ${i + 1}`} value={pair.right as any} onChange={(v) => {
              const pairs = [...q.pairs]; pairs[i] = { ...pairs[i], right: v }; onChange({ ...q, pairs });
            }} required />
            <Button size="icon" variant="ghost" onClick={() => onChange({ ...q, pairs: q.pairs.filter((_, k) => k !== i) })}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
        <Button size="sm" variant="outline" onClick={() => onChange({ ...q, pairs: [...q.pairs, { left: { en: "" }, right: { en: "" } }] })}>
          <Plus className="h-3 w-3 mr-1" /> Add pair
        </Button>
      </div>
    );
  }

  return null;
}