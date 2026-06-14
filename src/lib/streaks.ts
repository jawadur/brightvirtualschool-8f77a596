import { supabase } from "@/integrations/supabase/client";

export interface StreakSet {
  learning: number;
  homework: number;
  reading: number;
  revision: number;
  longest: number;
}

export async function fetchStreaks(studentId: string): Promise<StreakSet> {
  const { data } = await supabase
    .from("student_profiles")
    .select("current_streak, longest_streak, homework_streak, reading_streak, revision_streak")
    .eq("id", studentId)
    .maybeSingle();
  return {
    learning: data?.current_streak ?? 0,
    homework: (data as { homework_streak?: number } | null)?.homework_streak ?? 0,
    reading: (data as { reading_streak?: number } | null)?.reading_streak ?? 0,
    revision: (data as { revision_streak?: number } | null)?.revision_streak ?? 0,
    longest: data?.longest_streak ?? 0,
  };
}

/** Bump a streak counter on student_profiles by 1, idempotent per call. */
export async function bumpStreak(
  studentId: string,
  kind: "homework_streak" | "reading_streak" | "revision_streak",
) {
  const { data } = await supabase
    .from("student_profiles")
    .select(kind)
    .eq("id", studentId)
    .maybeSingle();
  const current = (data as Record<string, number> | null)?.[kind] ?? 0;
  const patch = { [kind]: current + 1 } as never;
  await supabase.from("student_profiles").update(patch).eq("id", studentId);
}