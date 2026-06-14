import { supabase } from "@/integrations/supabase/client";

export type SubjectCode = "telugu" | "hindi" | "english" | "math";
export type Mastery = "new" | "learning" | "familiar" | "mastered";

/** SM-2 inspired intervals (days) by mastery. */
const INTERVALS_BY_MASTERY: Record<Mastery, number[]> = {
  new: [1, 1, 3, 3, 7],
  learning: [1, 3, 3, 7, 14],
  familiar: [3, 7, 7, 14, 30],
  mastered: [7, 14, 14, 30, 30],
};

export interface RevisionItem {
  id: string;
  subject_code: SubjectCode;
  category: string;
  value: any;
  language: string;
  sort_order: number;
}

export interface RevisionItemWithProgress extends RevisionItem {
  mastery: Mastery;
  repetitions: number;
  next_due_at: string | null;
  last_seen_at: string | null;
  attempts: number;
}

/**
 * Returns up to `perSubject` items per subject for today's brush-up:
 *  1. Items whose next_due_at <= today (due for revision)
 *  2. Items the student has never seen yet (new), in sort_order
 * Rotates so previously-mastered content still reappears periodically.
 */
export async function fetchTodayRevision(studentId: string, perSubject = 5): Promise<Record<SubjectCode, RevisionItemWithProgress[]>> {
  const today = new Date().toISOString().slice(0, 10);
  const { data: items, error } = await supabase
    .from("revision_items")
    .select("id, subject_code, category, value, language, sort_order")
    .order("sort_order");
  if (error) throw error;
  const { data: progress } = await supabase
    .from("revision_progress")
    .select("revision_item_id, mastery, repetitions, next_due_at, last_seen_at, attempts")
    .eq("student_profile_id", studentId);

  const progMap = new Map<string, any>();
  (progress ?? []).forEach((p: any) => progMap.set(p.revision_item_id, p));

  const bySubject: Record<string, RevisionItemWithProgress[]> = { telugu: [], hindi: [], english: [], math: [] };

  // Group items by subject
  const grouped: Record<string, RevisionItem[]> = { telugu: [], hindi: [], english: [], math: [] };
  (items ?? []).forEach((it: any) => { if (grouped[it.subject_code]) grouped[it.subject_code].push(it); });

  for (const subj of Object.keys(grouped) as SubjectCode[]) {
    const all = grouped[subj];
    const enriched: RevisionItemWithProgress[] = all.map((it) => {
      const p = progMap.get(it.id);
      return {
        ...(it as RevisionItem),
        mastery: (p?.mastery ?? "new") as Mastery,
        repetitions: p?.repetitions ?? 0,
        next_due_at: p?.next_due_at ?? null,
        last_seen_at: p?.last_seen_at ?? null,
        attempts: p?.attempts ?? 0,
      };
    });
    const due = enriched.filter((e) => e.next_due_at && e.next_due_at <= today && e.mastery !== "mastered");
    const fresh = enriched.filter((e) => !e.next_due_at);
    const overlearn = enriched.filter((e) => e.mastery === "mastered" && (!e.next_due_at || e.next_due_at <= today));
    const picks = [...due, ...fresh, ...overlearn].slice(0, perSubject);
    bySubject[subj] = picks;
  }
  return bySubject as Record<SubjectCode, RevisionItemWithProgress[]>;
}

function nextMastery(prev: Mastery, correct: boolean): Mastery {
  const order: Mastery[] = ["new", "learning", "familiar", "mastered"];
  const idx = order.indexOf(prev);
  if (correct) return order[Math.min(idx + 1, order.length - 1)];
  return order[Math.max(idx - 1, 0)];
}

/** Record an attempt and schedule the next due date. */
export async function recordRevisionAttempt(studentId: string, itemId: string, correct: boolean) {
  const { data: existing } = await supabase
    .from("revision_progress")
    .select("id, mastery, repetitions, correct_count, attempts")
    .eq("student_profile_id", studentId)
    .eq("revision_item_id", itemId)
    .maybeSingle();

  const prev = (existing?.mastery ?? "new") as Mastery;
  const reps = (existing?.repetitions ?? 0) + 1;
  const m = nextMastery(prev, correct);
  const intervals = INTERVALS_BY_MASTERY[m];
  const dayOffset = intervals[Math.min(reps - 1, intervals.length - 1)];
  const next = new Date();
  next.setDate(next.getDate() + dayOffset);
  const next_due_at = next.toISOString().slice(0, 10);

  await supabase.from("revision_progress").upsert(
    {
      student_profile_id: studentId,
      revision_item_id: itemId,
      mastery: m,
      repetitions: reps,
      attempts: (existing?.attempts ?? 0) + 1,
      correct_count: (existing?.correct_count ?? 0) + (correct ? 1 : 0),
      last_seen_at: new Date().toISOString(),
      next_due_at,
    },
    { onConflict: "student_profile_id,revision_item_id" },
  );
}

export async function fetchRevisionStats(studentId: string) {
  const { data, error } = await supabase
    .from("revision_progress")
    .select("mastery, revision_items!inner(subject_code)")
    .eq("student_profile_id", studentId);
  if (error) throw error;
  const stats: Record<string, Record<Mastery, number>> = {};
  (data ?? []).forEach((r: any) => {
    const subj = r.revision_items?.subject_code;
    if (!subj) return;
    stats[subj] = stats[subj] ?? { new: 0, learning: 0, familiar: 0, mastered: 0 };
    stats[subj][r.mastery as Mastery]++;
  });
  return stats;
}