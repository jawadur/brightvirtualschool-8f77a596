import { useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export type I18nText = Record<string, string> | string;

export type LearningQuestion =
  | {
      type: "multiple_choice" | "picture_question";
      question: I18nText;
      image_url?: string;
      options: I18nText[];
      answer: number;
    }
  | {
      type: "fill_blank";
      question: I18nText;
      answer: string;
      options?: I18nText[];
    }
  | {
      type: "match_pairs";
      question?: I18nText;
      pairs: { left: I18nText; right: I18nText }[];
    }
  | {
      type: "drag_drop";
      question: I18nText;
      items: I18nText[];
      targets: I18nText[];
      mapping: number[];
    };

export type QuestionAnswer =
  | { type: "choice"; value: number }
  | { type: "text"; value: string }
  | { type: "mapping"; value: Record<number, number> };

export function scoreQuestion(question: LearningQuestion, answer: QuestionAnswer | undefined): boolean {
  if (!answer) return false;

  if (question.type === "multiple_choice" || question.type === "picture_question") {
    return answer.type === "choice" && answer.value === question.answer;
  }

  if (question.type === "fill_blank") {
    return answer.type === "text" && answer.value.trim().toLowerCase() === question.answer.trim().toLowerCase();
  }

  if (question.type === "match_pairs") {
    return answer.type === "mapping" && question.pairs.every((_, index) => answer.value[index] === index);
  }

  if (question.type === "drag_drop") {
    return answer.type === "mapping" && question.mapping.every((targetIndex, itemIndex) => answer.value[itemIndex] === targetIndex);
  }

  return false;
}

export function isAnswered(question: LearningQuestion, answer: QuestionAnswer | undefined): boolean {
  if (!answer) return false;

  if (question.type === "multiple_choice" || question.type === "picture_question") {
    return answer.type === "choice" && typeof answer.value === "number";
  }

  if (question.type === "fill_blank") {
    return answer.type === "text" && answer.value.trim().length > 0;
  }

  if (question.type === "match_pairs") {
    return answer.type === "mapping" && Object.keys(answer.value).length === question.pairs.length;
  }

  if (question.type === "drag_drop") {
    return answer.type === "mapping" && Object.keys(answer.value).length === question.items.length;
  }

  return false;
}

export function QuestionRenderer({
  question,
  index,
  answer,
  onAnswer,
  showFeedback = false,
}: {
  question: LearningQuestion;
  index: number;
  answer?: QuestionAnswer;
  onAnswer: (answer: QuestionAnswer) => void;
  showFeedback?: boolean;
}) {
  const { tr } = useI18n();
  const correct = useMemo(() => scoreQuestion(question, answer), [question, answer]);
  const ReadAloud = require("@/components/app/ReadAloud").ReadAloud as typeof import("@/components/app/ReadAloud").ReadAloud;

  const feedbackClass = showFeedback
    ? correct
      ? "border-success/60 bg-success/5"
      : "border-destructive/60 bg-destructive/5"
    : "";

  if (question.type === "multiple_choice" || question.type === "picture_question") {
    const selected = answer?.type === "choice" ? answer.value : undefined;
    const speechText = [
      tr(question.question),
      ...(question.options ?? []).map((o, i) => `Option ${i + 1}: ${tr(o)}`),
    ].join(". ");
    return (
      <Card className={`p-5 ${feedbackClass}`}>
        {question.type === "picture_question" && question.image_url && (
          <img src={question.image_url} alt="" className="mb-4 max-h-52 w-full rounded-2xl object-contain" />
        )}
        <div className="mb-3 flex items-start gap-2">
          <div className="flex-1 font-bold">{index + 1}. {tr(question.question)}</div>
          <ReadAloud text={speechText} lang="en" />
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {question.options.map((option, optionIndex) => (
            <button
              key={optionIndex}
              type="button"
              onClick={() => onAnswer({ type: "choice", value: optionIndex })}
              className={`rounded-2xl border-2 p-3 text-left font-bold transition ${
                selected === optionIndex ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"
              }`}
            >
              {tr(option)}
            </button>
          ))}
        </div>
      </Card>
    );
  }

  if (question.type === "fill_blank") {
    const value = answer?.type === "text" ? answer.value : "";
    return (
      <Card className={`p-5 ${feedbackClass}`}>
        <div className="mb-3 font-bold">
          {index + 1}. {tr(question.question)}
        </div>
        <Input
          value={value}
          onChange={(e) => onAnswer({ type: "text", value: e.target.value })}
          className="h-14 text-center text-2xl font-bold"
          placeholder="Type answer"
        />
      </Card>
    );
  }

  if (question.type === "match_pairs") {
    const mapping = answer?.type === "mapping" ? answer.value : {};
    const shuffledRight = question.pairs.map((pair, idx) => ({ idx, label: pair.right }));
    return (
      <Card className={`p-5 ${feedbackClass}`}>
        <div className="mb-3 font-bold">
          {index + 1}. {tr(question.question ?? { en: "Match the pairs", hi: "जोड़े मिलाएँ", te: "జతలను కలపండి" })}
        </div>
        <div className="space-y-3">
          {question.pairs.map((pair, leftIndex) => (
            <div key={leftIndex} className="grid gap-2 sm:grid-cols-[1fr,auto,1fr] sm:items-center">
              <div className="rounded-2xl bg-accent px-4 py-3 font-bold">{tr(pair.left)}</div>
              <span className="hidden text-muted-foreground sm:inline">→</span>
              <select
                value={mapping[leftIndex] ?? ""}
                onChange={(e) =>
                  onAnswer({ type: "mapping", value: { ...mapping, [leftIndex]: Number(e.target.value) } })
                }
                className="rounded-2xl border-2 border-border bg-card px-4 py-3 font-bold"
              >
                <option value="">Choose…</option>
                {shuffledRight.map((right) => (
                  <option key={right.idx} value={right.idx}>
                    {tr(right.label)}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (question.type === "drag_drop") {
    const mapping = answer?.type === "mapping" ? answer.value : {};
    return (
      <Card className={`p-5 ${feedbackClass}`}>
        <div className="mb-3 font-bold">
          {index + 1}. {tr(question.question)}
        </div>
        <div className="space-y-3">
          {question.items.map((item, itemIndex) => (
            <div key={itemIndex} className="grid gap-2 sm:grid-cols-[1fr,auto,1fr] sm:items-center">
              <div className="rounded-2xl bg-accent px-4 py-3 font-bold">{tr(item)}</div>
              <span className="hidden text-muted-foreground sm:inline">→</span>
              <select
                value={mapping[itemIndex] ?? ""}
                onChange={(e) =>
                  onAnswer({ type: "mapping", value: { ...mapping, [itemIndex]: Number(e.target.value) } })
                }
                className="rounded-2xl border-2 border-border bg-card px-4 py-3 font-bold"
              >
                <option value="">Drop here…</option>
                {question.targets.map((target, targetIndex) => (
                  <option key={targetIndex} value={targetIndex}>
                    {tr(target)}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-5 text-center text-muted-foreground">
      This question type is not supported yet.
      <Button className="mt-3" variant="outline" disabled>
        Coming soon
      </Button>
    </Card>
  );
}
