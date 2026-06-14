import { supabase } from "@/integrations/supabase/client";

export interface JourneyEvent {
  id: string;
  student_profile_id: string;
  event_type: string;
  title: string;
  description: string | null;
  icon: string | null;
  payload: Record<string, unknown>;
  occurred_at: string;
}

export async function logJourney(input: Omit<JourneyEvent, "id" | "occurred_at" | "payload"> & { payload?: Record<string, unknown> }) {
  await supabase.from("student_journey_events").insert({
    student_profile_id: input.student_profile_id,
    event_type: input.event_type,
    title: input.title,
    description: input.description ?? null,
    icon: input.icon ?? null,
    payload: (input.payload ?? {}) as never,
  });
}

export async function fetchJourney(studentId: string, limit = 100): Promise<JourneyEvent[]> {
  const { data, error } = await supabase
    .from("student_journey_events")
    .select("*")
    .eq("student_profile_id", studentId)
    .order("occurred_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as JourneyEvent[];
}