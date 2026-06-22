import { supabase } from "@/integrations/supabase/client";

export type TeacherAssignmentKind = "lesson" | "practice" | "homework" | "test";
export type TeacherAssignmentScope = "class" | "section" | "students";

export interface TeacherAssignmentRow {
  id: string;
  kind: TeacherAssignmentKind;
  scope: TeacherAssignmentScope;
  class_id: string | null;
  section: string | null;
  subject_id: string | null;
  unit_id: string | null;
  lesson_id: string | null;
  title: string;
  notes: string | null;
  assigned_date: string;
  due_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TeacherAssignmentTarget {
  id: string;
  teacher_assignment_id: string;
  student_profile_id: string;
  completed_at: string | null;
  score: number | null;
}

export interface CreateTeacherAssignmentInput {
  kind: TeacherAssignmentKind;
  scope: TeacherAssignmentScope;
  class_id?: string | null;
  section?: string | null;
  student_ids?: string[];
  subject_id?: string | null;
  unit_id?: string | null;
  lesson_id?: string | null;
  title: string;
  notes?: string | null;
  due_date?: string | null;
}

async function resolveStudents(input: CreateTeacherAssignmentInput): Promise<string[]> {
  if (input.scope === "students") return input.student_ids ?? [];
  if (!input.class_id) return [];
  let q = supabase.from("student_profiles").select("id, section").eq("class_id", input.class_id);
  if (input.scope === "section" && input.section) q = q.eq("section", input.section);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((r: any) => r.id as string);
}

export async function createTeacherAssignment(input: CreateTeacherAssignmentInput, createdBy: string | null) {
  const studentIds = await resolveStudents(input);
  const { data: ta, error } = await supabase
    .from("teacher_assignments")
    .insert({
      kind: input.kind,
      scope: input.scope,
      class_id: input.class_id ?? null,
      section: input.section ?? null,
      subject_id: input.subject_id ?? null,
      unit_id: input.unit_id ?? null,
      lesson_id: input.lesson_id ?? null,
      title: input.title,
      notes: input.notes ?? null,
      due_date: input.due_date ?? null,
      created_by: createdBy,
    })
    .select("*")
    .single();
  if (error) throw error;
  if (studentIds.length) {
    const rows = studentIds.map((sid) => ({ teacher_assignment_id: (ta as any).id, student_profile_id: sid }));
    const { error: tErr } = await supabase.from("teacher_assignment_targets").insert(rows);
    if (tErr) throw tErr;
  }
  return ta as TeacherAssignmentRow;
}

export async function deleteTeacherAssignment(id: string) {
  const { error } = await supabase.from("teacher_assignments").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchTeacherAssignments(): Promise<TeacherAssignmentRow[]> {
  const { data, error } = await supabase
    .from("teacher_assignments")
    .select("*")
    .order("assigned_date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as TeacherAssignmentRow[];
}

export async function fetchTargetsForAssignment(taId: string) {
  const { data, error } = await supabase
    .from("teacher_assignment_targets")
    .select("id, teacher_assignment_id, student_profile_id, completed_at, score, student_profiles(id, display_name, class_id, section)")
    .eq("teacher_assignment_id", taId);
  if (error) throw error;
  return data ?? [];
}

export async function fetchStudentTeacherAssignments(studentId: string) {
  const { data, error } = await supabase
    .from("teacher_assignment_targets")
    .select("id, completed_at, score, teacher_assignment:teacher_assignments(*)")
    .eq("student_profile_id", studentId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function markTargetComplete(targetId: string, score?: number | null) {
  const { error } = await supabase
    .from("teacher_assignment_targets")
    .update({ completed_at: new Date().toISOString(), score: score ?? null })
    .eq("id", targetId);
  if (error) throw error;
}

export function exportTargetsCsv(rows: any[], assignment: TeacherAssignmentRow): string {
  const header = ["assignment", "kind", "scope", "student", "section", "completed_at", "score"];
  const lines = [header.join(",")];
  for (const r of rows) {
    const sp = r.student_profiles ?? {};
    const vals = [
      assignment.title,
      assignment.kind,
      assignment.scope,
      sp.display_name ?? "",
      sp.section ?? "",
      r.completed_at ?? "",
      r.score ?? "",
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`);
    lines.push(vals.join(","));
  }
  return lines.join("\n");
}