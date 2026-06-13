import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type Student = {
  id: string;
  owner_user_id: string | null;
  auth_user_id: string | null;
  display_name: string;
  avatar_url: string | null;
  date_of_birth: string | null;
  preferred_language: string;
  board_id: string | null;
  class_id: string | null;
  coins: number;
  stars: number;
  current_streak: number;
  longest_streak: number;
  last_attendance_date: string | null;
};

type Ctx = {
  students: Student[];
  activeStudent: Student | null;
  setActiveStudentId: (id: string | null) => void;
  refresh: () => void;
  isLoading: boolean;
};
const StudentContext = createContext<Ctx | null>(null);

export function StudentProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setActiveId(localStorage.getItem("vls.activeStudent"));
  }, []);

  const setActiveStudentId = (id: string | null) => {
    setActiveId(id);
    if (typeof window !== "undefined") {
      if (id) localStorage.setItem("vls.activeStudent", id);
      else localStorage.removeItem("vls.activeStudent");
    }
  };

  const { data: students = [], isLoading, refetch } = useQuery({
    queryKey: ["students", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_profiles")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Student[];
    },
  });

  const activeStudent = students.find((s) => s.id === activeId) ?? null;

  return (
    <StudentContext.Provider
      value={{ students, activeStudent, setActiveStudentId, refresh: () => void refetch(), isLoading }}
    >
      {children}
    </StudentContext.Provider>
  );
}

export function useStudents() {
  const c = useContext(StudentContext);
  if (!c) throw new Error("useStudents outside provider");
  return c;
}