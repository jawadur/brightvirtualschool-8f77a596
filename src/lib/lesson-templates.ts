// Reusable lesson templates. Each produces a starter LessonContent structure
// (steps) plus suggested practice/assignment/test question stubs.

export type LessonTemplateId =
  | "alphabet"
  | "number"
  | "word"
  | "sentence"
  | "story"
  | "math_concept"
  | "evs_concept";

export type TemplateStep = { type: string; payload: any };

export type LessonTemplate = {
  id: LessonTemplateId;
  label: string;
  description: string;
  defaultMinutes: number;
  buildSteps: (vars: Record<string, string>) => TemplateStep[];
  buildPractice: (vars: Record<string, string>) => string[];
};

export const LESSON_TEMPLATES: LessonTemplate[] = [
  {
    id: "alphabet",
    label: "Alphabet Lesson",
    description: "Introduce a single letter — sound, shape, words.",
    defaultMinutes: 10,
    buildSteps: (v) => [
      { type: "intro", payload: { text: `Meet the letter ${v.letter ?? "A"}` } },
      { type: "phonics", payload: { letter: v.letter ?? "A", sound: v.sound ?? "a" } },
      { type: "examples", payload: { words: (v.words ?? "apple, ant, axe").split(",").map((s) => s.trim()) } },
      { type: "trace", payload: { letter: v.letter ?? "A" } },
    ],
    buildPractice: (v) => [
      `What sound does "${v.letter ?? "A"}" make?`,
      `Which word starts with "${v.letter ?? "A"}"?`,
      `Find the letter "${v.letter ?? "A"}".`,
    ],
  },
  {
    id: "number",
    label: "Number Lesson",
    description: "Introduce a number — counting, writing, quantity.",
    defaultMinutes: 10,
    buildSteps: (v) => [
      { type: "intro", payload: { text: `Number ${v.number ?? "1"}` } },
      { type: "count", payload: { value: Number(v.number ?? 1) } },
      { type: "write", payload: { number: v.number ?? "1" } },
    ],
    buildPractice: (v) => [`Count to ${v.number ?? 1}.`, `Write the number ${v.number ?? 1}.`],
  },
  {
    id: "word",
    label: "Word Lesson",
    description: "Learn a new vocabulary word with picture + sound.",
    defaultMinutes: 8,
    buildSteps: (v) => [
      { type: "intro", payload: { text: `New word: ${v.word ?? "cat"}` } },
      { type: "syllables", payload: { word: v.word ?? "cat" } },
      { type: "use_in_sentence", payload: { word: v.word ?? "cat" } },
    ],
    buildPractice: (v) => [`Read the word "${v.word ?? "cat"}".`, `Use "${v.word ?? "cat"}" in a sentence.`],
  },
  {
    id: "sentence",
    label: "Sentence Lesson",
    description: "Build and read a simple sentence.",
    defaultMinutes: 10,
    buildSteps: (v) => [
      { type: "model", payload: { sentence: v.sentence ?? "The cat sits." } },
      { type: "read_aloud", payload: { sentence: v.sentence ?? "The cat sits." } },
      { type: "fill_blank", payload: { sentence: v.sentence ?? "The ___ sits." } },
    ],
    buildPractice: (v) => [`Read aloud: "${v.sentence ?? "The cat sits."}"`],
  },
  {
    id: "story",
    label: "Story Lesson",
    description: "Short story with comprehension questions.",
    defaultMinutes: 15,
    buildSteps: (v) => [
      { type: "story", payload: { title: v.title ?? "A Little Story", body: v.body ?? "Once upon a time…" } },
      { type: "comprehension", payload: { questions: ["Who is in the story?", "What happened?"] } },
    ],
    buildPractice: () => ["Who is the main character?", "What did they do at the end?"],
  },
  {
    id: "math_concept",
    label: "Math Concept Lesson",
    description: "Teach a math concept (addition, shapes, etc).",
    defaultMinutes: 12,
    buildSteps: (v) => [
      { type: "concept", payload: { name: v.concept ?? "Addition" } },
      { type: "examples", payload: { items: (v.examples ?? "1+1=2, 2+1=3").split(",") } },
      { type: "try", payload: {} },
    ],
    buildPractice: () => ["Solve 2+1", "Solve 3+2", "Solve 4+1"],
  },
  {
    id: "evs_concept",
    label: "EVS Concept Lesson",
    description: "Environment / general awareness topic.",
    defaultMinutes: 12,
    buildSteps: (v) => [
      { type: "concept", payload: { name: v.topic ?? "My Family" } },
      { type: "discussion", payload: { prompts: ["What do you see?", "Why is it important?"] } },
    ],
    buildPractice: (v) => [`Name 3 things about ${v.topic ?? "family"}.`],
  },
];

export function getTemplate(id: LessonTemplateId | string | null) {
  return LESSON_TEMPLATES.find((t) => t.id === id) ?? null;
}