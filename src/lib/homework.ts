import { supabase } from "@/integrations/supabase/client";

export type HomeworkKind = "practice" | "reading" | "writing" | "revision";
export type HomeworkStatus = "pending" | "completed" | "overdue";

export interface HomeworkRow {
  id: string;
  student_profile_id: string;
  title: string;
  kind: HomeworkKind;
  subject_id: string | null;
  lesson_id: string | null;
  assignment_id: string | null;
  due_date: string;
  assigned_date: string;
  completed_at: string | null;
  score: number | null;
  notes: string | null;
  status?: HomeworkStatus;
}

function withStatus(row: HomeworkRow): HomeworkRow {
  if (row.completed_at) return { ...row, status: "completed" };
  const today = new Date().toISOString().slice(0, 10);
  return { ...row, status: row.due_date < today ? "overdue" : "pending" };
}

export async function fetchHomework(studentId: string): Promise<HomeworkRow[]> {
  const { data, error } = await supabase
    .from("homework")
    .select("*")
    .eq("student_profile_id", studentId)
    .order("due_date", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => withStatus(r as HomeworkRow));
}

export async function fetchHomeworkForChildren(studentIds: string[]): Promise<HomeworkRow[]> {
  if (!studentIds.length) return [];
  const { data, error } = await supabase
    .from("homework")
    .select("*")
    .in("student_profile_id", studentIds)
    .order("due_date", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => withStatus(r as HomeworkRow));
}

export async function completeHomework(id: string, score?: number) {
  const { error } = await supabase
    .from("homework")
    .update({ completed_at: new Date().toISOString(), score: score ?? null })
    .eq("id", id);
  if (error) throw error;
}

export async function assignHomework(input: {
  student_profile_id: string;
  title: string;
  kind: HomeworkKind;
  subject_id?: string | null;
  lesson_id?: string | null;
  assignment_id?: string | null;
  due_date?: string;
  notes?: string;
}) {
  const { error } = await supabase.from("homework").insert({
    ...input,
    due_date: input.due_date ?? new Date().toISOString().slice(0, 10),
  });
  if (error) throw error;
}

export function summarizeHomework(rows: HomeworkRow[]) {
  const pending = rows.filter((r) => r.status === "pending");
  const completed = rows.filter((r) => r.status === "completed");
  const overdue = rows.filter((r) => r.status === "overdue");
  const scored = completed.filter((r) => typeof r.score === "number");
  const avg = scored.length ? Math.round(scored.reduce((s, r) => s + (r.score ?? 0), 0) / scored.length) : null;
  return { pending, completed, overdue, avgScore: avg, total: rows.length };
}