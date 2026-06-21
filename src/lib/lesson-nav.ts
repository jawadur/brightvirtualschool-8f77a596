import { supabase } from "@/integrations/supabase/client";

export type NextLessonRef = { id: string; title: any; unit_id: string } | null;

/**
 * Find the next published lesson:
 *   1. Next lesson in the same unit by sort_order.
 *   2. Otherwise, first lesson of the next unit in the same subject.
 *   3. Otherwise null (caller should send the student back to Today's Learning).
 */
export async function findNextLesson(currentLessonId: string): Promise<NextLessonRef> {
  const { data: current, error } = await supabase
    .from("lessons")
    .select("id, sort_order, unit_id, units!inner(id, subject_id, sort_order)")
    .eq("id", currentLessonId)
    .maybeSingle();
  if (error || !current) return null;
  const unit = (current as any).units;

  // 1) Same unit, next sort_order
  const sameUnit = await supabase
    .from("lessons")
    .select("id, title, unit_id, sort_order")
    .eq("unit_id", current.unit_id)
    .eq("is_published", true)
    .gt("sort_order", current.sort_order)
    .order("sort_order", { ascending: true })
    .limit(1);
  if (sameUnit.data && sameUnit.data[0]) {
    const l = sameUnit.data[0];
    return { id: l.id, title: l.title, unit_id: l.unit_id };
  }

  // 2) Next unit in same subject
  const nextUnit = await supabase
    .from("units")
    .select("id, sort_order")
    .eq("subject_id", unit.subject_id)
    .gt("sort_order", unit.sort_order)
    .order("sort_order", { ascending: true })
    .limit(1);
  if (nextUnit.data && nextUnit.data[0]) {
    const u = nextUnit.data[0];
    const first = await supabase
      .from("lessons")
      .select("id, title, unit_id, sort_order")
      .eq("unit_id", u.id)
      .eq("is_published", true)
      .order("sort_order", { ascending: true })
      .limit(1);
    if (first.data && first.data[0]) {
      const l = first.data[0];
      return { id: l.id, title: l.title, unit_id: l.unit_id };
    }
  }

  return null;
}