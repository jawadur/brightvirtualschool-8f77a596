import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

async function callGateway(body: unknown) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("AI is not configured (missing LOVABLE_API_KEY).");
  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "Lovable-API-Key": key,
    },
    body: JSON.stringify(body),
  });
  if (res.status === 429) throw new Error("Too many requests — please wait a moment and try again.");
  if (res.status === 402) throw new Error("AI credits exhausted. Please add credits in workspace settings.");
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`AI error ${res.status}: ${t.slice(0, 200)}`);
  }
  return res.json() as Promise<{ choices: { message: { content: string } }[] }>;
}

const ChatInput = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(2000) }))
    .min(1)
    .max(20),
  subject: z.string().max(60).optional(),
  language: z.enum(["en", "hi", "te"]).default("en"),
});

export const aiTeacherChat = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ChatInput.parse(d))
  .handler(async ({ data }) => {
    const langName = { en: "English", hi: "Hindi", te: "Telugu" }[data.language];
    const system = `You are "Miss Bright", a cheerful virtual teacher for children ages 5-7 at Bright Virtual School.
Reply in ${langName}. Keep answers VERY short (1-3 sentences), simple words, warm and encouraging.
Use occasional friendly emojis (✨🌟📚). Never discuss anything unsafe or off-topic — gently redirect to learning.
${data.subject ? `Current subject: ${data.subject}.` : ""}`;
    const json = await callGateway({
      model: MODEL,
      messages: [{ role: "system", content: system }, ...data.messages],
    });
    return { reply: json.choices[0]?.message?.content?.trim() ?? "..." };
  });

const ReadingInput = z.object({
  passage: z.string().min(1).max(1000),
  spoken: z.string().min(1).max(2000),
  language: z.enum(["en", "hi", "te"]).default("en"),
});

export const readingCheck = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ReadingInput.parse(d))
  .handler(async ({ data }) => {
    const langName = { en: "English", hi: "Hindi", te: "Telugu" }[data.language];
    const system = `You score a young child's reading attempt. Compare what they SAID to the target passage.
Return STRICT JSON only, no prose: {"score": 0-100, "stars": 1-3, "feedback": "<one short kid-friendly sentence in ${langName}>", "missed": ["word1","word2"]}.
Be generous and encouraging — minor mispronunciations are fine. 3 stars >=85, 2 stars >=60, else 1.`;
    const user = `Target:\n${data.passage}\n\nChild said:\n${data.spoken}`;
    const json = await callGateway({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    const raw = json.choices[0]?.message?.content ?? "{}";
    const m = raw.match(/\{[\s\S]*\}/);
    try {
      const parsed = JSON.parse(m ? m[0] : raw);
      return {
        score: Math.max(0, Math.min(100, Number(parsed.score) || 0)),
        stars: Math.max(1, Math.min(3, Number(parsed.stars) || 1)),
        feedback: String(parsed.feedback ?? "Great try!").slice(0, 200),
        missed: Array.isArray(parsed.missed) ? parsed.missed.slice(0, 10).map(String) : [],
      };
    } catch {
      return { score: 70, stars: 2, feedback: "Nice try! Keep practicing. 🌟", missed: [] };
    }
  });