import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStudents } from "@/lib/student-context";

export interface StudentPrefs {
  voice_reader: boolean;
  auto_read_lesson: boolean;
  larger_text: boolean;
  high_contrast: boolean;
  speech_rate: number;
}

const DEFAULTS: StudentPrefs = {
  voice_reader: true,
  auto_read_lesson: false,
  larger_text: false,
  high_contrast: false,
  speech_rate: 0.9,
};

interface Ctx {
  prefs: StudentPrefs;
  update: (patch: Partial<StudentPrefs>) => Promise<void>;
  loading: boolean;
}

const PrefsContext = createContext<Ctx | null>(null);

export function StudentPrefsProvider({ children }: { children: ReactNode }) {
  const { activeStudent } = useStudents();
  const [prefs, setPrefs] = useState<StudentPrefs>(DEFAULTS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activeStudent) { setPrefs(DEFAULTS); return; }
    setLoading(true);
    supabase
      .from("student_preferences")
      .select("voice_reader, auto_read_lesson, larger_text, high_contrast, speech_rate")
      .eq("student_profile_id", activeStudent.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setPrefs({ ...DEFAULTS, ...data, speech_rate: Number(data.speech_rate) || DEFAULTS.speech_rate });
        setLoading(false);
      });
  }, [activeStudent?.id]);

  // Apply DOM classes for larger text & high contrast globally
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("text-larger", prefs.larger_text);
    root.classList.toggle("high-contrast", prefs.high_contrast);
  }, [prefs.larger_text, prefs.high_contrast]);

  const update = useCallback(async (patch: Partial<StudentPrefs>) => {
    if (!activeStudent) return;
    const next = { ...prefs, ...patch };
    setPrefs(next);
    await supabase
      .from("student_preferences")
      .upsert(
        { student_profile_id: activeStudent.id, ...next },
        { onConflict: "student_profile_id" },
      );
  }, [activeStudent?.id, prefs]);

  return <PrefsContext.Provider value={{ prefs, update, loading }}>{children}</PrefsContext.Provider>;
}

export function useStudentPrefs() {
  const ctx = useContext(PrefsContext);
  if (!ctx) {
    // Allow non-student contexts: return defaults
    return { prefs: DEFAULTS, update: async () => {}, loading: false } as Ctx;
  }
  return ctx;
}