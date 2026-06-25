import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

const QUESTION_TYPES = [
  "multiple_choice",
  "fill_blank",
  "match_pairs",
  "picture_question",
] as const;

const Input = z.object({
  subject_id: z.string().uuid(),
  lesson_id: z.string().uuid().optional().nullable(),
  stage_id: z.string().uuid().optional().nullable(),
  unit_id: z.string().uuid().optional().nullable(),
  class_id: z.string().uuid().optional().nullable(),
  topic: z.string().min(1).max(120),
  subject_name: z.string().min(1).max(120),
  class_label: z.string().max(60).optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).default("easy"),
  language: z.enum(["en", "hi", "te"]).default("en"),
  count: z.number().int().min(1).max(50).default(10),
  types: z.array(z.enum(QUESTION_TYPES)).min(1).default(["multiple_choice"]),
});

type GeneratedQuestion = {
  type: (typeof QUESTION_TYPES)[number];
  question: { en: string; hi?: string; te?: string };
  options?: { en: string; hi?: string; te?: string }[];
  answer?: number | string;
  pairs?: { left: { en: string }; right: { en: string } }[];
  image_url?: string;
  explanation?: string;
};

function buildPrompt(p: z.infer<typeof Input>) {
  const langName = { en: "English", hi: "Hindi", te: "Telugu" }[p.language];
  return `You are an expert curriculum question writer for young children (ages 5-7) at a virtual school.
Generate EXACTLY ${p.count} age-appropriate questions for:
- Subject: ${p.subject_name}
- Class: ${p.class_label ?? "Early primary"}
- Topic: ${p.topic}
- Difficulty: ${p.difficulty}
- Language: ${langName}
- Allowed question types: ${p.types.join(", ")}

Return ONLY a JSON array, no prose, no markdown, no code fences. Each item must match one of these shapes:

multiple_choice:
{"type":"multiple_choice","question":{"en":"..."},"options":[{"en":"..."},{"en":"..."},{"en":"..."},{"en":"..."}],"answer":0,"explanation":"short kid-friendly reason"}

fill_blank:
{"type":"fill_blank","question":{"en":"... ___ ..."},"answer":"word","explanation":"..."}

match_pairs:
{"type":"match_pairs","question":{"en":"Match the pairs"},"pairs":[{"left":{"en":"A"},"right":{"en":"Apple"}}, ...],"explanation":"..."}

picture_question (use only if you can describe a real public image URL, otherwise prefer multiple_choice):
{"type":"picture_question","question":{"en":"..."},"image_url":"https://...","options":[...],"answer":1,"explanation":"..."}

Rules:
- Use simple words, short sentences, encouraging tone.
- "answer" for multiple_choice/picture_question is the 0-based index of the correct option.
- For fill_blank, "answer" is a single lowercase word matching what the child should type.
- Always include "explanation": one short sentence a child can understand.
- Always include "question.en". Optionally include "question.hi" or "question.te" if asked language is Hindi/Telugu.
- Cover the topic from multiple angles; avoid repeating identical questions.
- No unsafe, scary, or off-topic content.`;
}

async function callGateway(body: unknown) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("AI is not configured (missing LOVABLE_API_KEY).");
  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: { "content-type": "application/json", "Lovable-API-Key": key },
    body: JSON.stringify(body),
  });
  if (res.status === 429) throw new Error("AI is rate-limited. Wait a moment and try again.");
  if (res.status === 402) throw new Error("AI credits exhausted. Add credits in workspace settings.");
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`AI error ${res.status}: ${t.slice(0, 200)}`);
  }
  return res.json() as Promise<{ choices: { message: { content: string } }[] }>;
}

function extractJsonArray(raw: string): GeneratedQuestion[] {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : raw;
  const m = candidate.match(/\[[\s\S]*\]/);
  if (!m) return [];
  try {
    const arr = JSON.parse(m[0]);
    if (!Array.isArray(arr)) return [];
    return arr.filter((q: any) => q && typeof q.type === "string" && q.question);
  } catch {
    return [];
  }
}

export const generateAiQuestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Authorize: admin or teacher only
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    const { data: isTeacher } = await supabase.rpc("has_role", { _user_id: userId, _role: "teacher" });
    if (!isAdmin && !isTeacher) throw new Error("Forbidden");

    const prompt = buildPrompt(data);
    const json = await callGateway({
      model: MODEL,
      messages: [
        { role: "system", content: "You produce strict JSON arrays only." },
        { role: "user", content: prompt },
      ],
    });
    const raw = json.choices[0]?.message?.content ?? "";
    const questions = extractJsonArray(raw);
    if (questions.length === 0) {
      throw new Error("AI returned no parseable questions. Try again or reduce count.");
    }

    const rows = questions.map((q) => ({
      subject_id: data.subject_id,
      class_id: data.class_id ?? null,
      unit_id: data.unit_id ?? null,
      lesson_id: data.lesson_id ?? null,
      stage_id: data.stage_id ?? null,
      topic: data.topic,
      difficulty: data.difficulty,
      language: data.language,
      question_type: q.type,
      payload: q as unknown as Record<string, unknown>,
      source: "ai" as const,
      generated_by: userId,
      generation_model: MODEL,
    }));

    const { error, count } = await supabase
      .from("ai_question_pool")
      .insert(rows, { count: "exact" });
    if (error) throw new Error(error.message);

    return { inserted: count ?? rows.length, requested: data.count };
  });