import { supabase } from "@/integrations/supabase/client";

export type ProgramCode = "kg2_brushup" | "class1";

export const PROGRAMS: { code: ProgramCode; name: string; emoji: string; tagline: string; description: string }[] = [
  {
    code: "kg2_brushup",
    name: "KG2 Brush-Up",
    emoji: "🌱",
    tagline: "Revision & Readiness",
    description: "Quick daily revision of KG2 concepts to keep memory strong before Class 1.",
  },
  {
    code: "class1",
    name: "Telangana Class 1",
    emoji: "🎒",
    tagline: "Full School Learning",
    description: "Regular Telangana Class 1 — teacher lessons, practice, homework, weekly tests.",
  },
];

// Board.code → program mapping. Any board not listed defaults to class1.
const BOARD_TO_PROGRAM: Record<string, ProgramCode> = {
  "kg2-bridge": "kg2_brushup",
  // KG2 Bridge Course class on the TSB board is also KG2 revision; subjects
  // there are tagged via class.name when board doesn't disambiguate. We treat
  // any class whose name contains "KG2" as kg2_brushup at query time.
};

export function programForBoardCode(code: string | null | undefined): ProgramCode {
  if (!code) return "class1";
  return BOARD_TO_PROGRAM[code] ?? "class1";
}

export function classBelongsToProgram(program: ProgramCode, boardCode: string | null, className: string | null): boolean {
  const isKg2 = (boardCode && BOARD_TO_PROGRAM[boardCode] === "kg2_brushup") ||
    (className?.toLowerCase().includes("kg2") ?? false);
  return program === "kg2_brushup" ? !!isKg2 : !isKg2;
}

export async function fetchActiveProgram(studentId: string): Promise<ProgramCode | null> {
  const { data } = await supabase
    .from("student_program")
    .select("active_program_code")
    .eq("student_profile_id", studentId)
    .maybeSingle();
  return (data?.active_program_code as ProgramCode | undefined) ?? null;
}

export async function setActiveProgram(studentId: string, code: ProgramCode) {
  const { error } = await supabase
    .from("student_program")
    .upsert(
      { student_profile_id: studentId, active_program_code: code, updated_at: new Date().toISOString() },
      { onConflict: "student_profile_id" },
    );
  if (error) throw error;
}

/** Returns subjects for the given program from any board/class the student has access to. */
export async function fetchSubjectsForProgram(program: ProgramCode) {
  const { data, error } = await supabase
    .from("subjects")
    .select("id, code, name, icon, color, sort_order, class_id, classes!inner(id, name, board_id, boards!inner(code, name))")
    .order("sort_order");
  if (error) throw error;
  const rows = (data ?? []) as any[];
  const filtered = rows.filter((s) =>
    classBelongsToProgram(
      program,
      s.classes?.boards?.code ?? null,
      typeof s.classes?.name === "object" ? s.classes.name.en ?? "" : s.classes?.name ?? "",
    ),
  );
  // Deduplicate by subject code (multiple boards may have the same subject)
  const seen = new Set<string>();
  const out: any[] = [];
  for (const s of filtered) {
    const key = String(s.code).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

export async function fetchClassIdsForProgram(program: ProgramCode): Promise<string[]> {
  const { data, error } = await supabase
    .from("classes")
    .select("id, name, boards!inner(code)");
  if (error) throw error;
  return (data ?? [])
    .filter((c: any) =>
      classBelongsToProgram(
        program,
        c.boards?.code ?? null,
        typeof c.name === "object" ? c.name.en ?? "" : c.name ?? "",
      ),
    )
    .map((c: any) => c.id as string);
}