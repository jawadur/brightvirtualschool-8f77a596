export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          created_at: string
          id: string
          lesson_id: string
          metadata: Json
          payload: Json
          sort_order: number
          title: Json
        }
        Insert: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          created_at?: string
          id?: string
          lesson_id: string
          metadata?: Json
          payload?: Json
          sort_order?: number
          title?: Json
        }
        Update: {
          activity_type?: Database["public"]["Enums"]["activity_type"]
          created_at?: string
          id?: string
          lesson_id?: string
          metadata?: Json
          payload?: Json
          sort_order?: number
          title?: Json
        }
        Relationships: [
          {
            foreignKeyName: "activities_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_submissions: {
        Row: {
          answers: Json
          assignment_id: string
          completed_at: string | null
          id: string
          max_score: number
          metadata: Json
          score: number
          started_at: string
          status: string
          student_profile_id: string
        }
        Insert: {
          answers?: Json
          assignment_id: string
          completed_at?: string | null
          id?: string
          max_score?: number
          metadata?: Json
          score?: number
          started_at?: string
          status?: string
          student_profile_id: string
        }
        Update: {
          answers?: Json
          assignment_id?: string
          completed_at?: string | null
          id?: string
          max_score?: number
          metadata?: Json
          score?: number
          started_at?: string
          status?: string
          student_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_submissions_student_profile_id_fkey"
            columns: ["student_profile_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          created_at: string
          due_in_days: number | null
          id: string
          instructions: Json
          lesson_id: string | null
          metadata: Json
          pass_threshold: number
          questions: Json
          subject_id: string | null
          title: Json
        }
        Insert: {
          created_at?: string
          due_in_days?: number | null
          id?: string
          instructions?: Json
          lesson_id?: string | null
          metadata?: Json
          pass_threshold?: number
          questions?: Json
          subject_id?: string | null
          title: Json
        }
        Update: {
          created_at?: string
          due_in_days?: number | null
          id?: string
          instructions?: Json
          lesson_id?: string | null
          metadata?: Json
          pass_threshold?: number
          questions?: Json
          subject_id?: string | null
          title?: Json
        }
        Relationships: [
          {
            foreignKeyName: "assignments_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          date: string
          first_lesson_at: string | null
          id: string
          metadata: Json
          present: boolean
          student_profile_id: string
        }
        Insert: {
          date?: string
          first_lesson_at?: string | null
          id?: string
          metadata?: Json
          present?: boolean
          student_profile_id: string
        }
        Update: {
          date?: string
          first_lesson_at?: string | null
          id?: string
          metadata?: Json
          present?: boolean
          student_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_student_profile_id_fkey"
            columns: ["student_profile_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      badges: {
        Row: {
          code: string
          criteria: Json
          description: Json
          icon: string | null
          id: string
          metadata: Json
          name: Json
        }
        Insert: {
          code: string
          criteria?: Json
          description?: Json
          icon?: string | null
          id?: string
          metadata?: Json
          name: Json
        }
        Update: {
          code?: string
          criteria?: Json
          description?: Json
          icon?: string | null
          id?: string
          metadata?: Json
          name?: Json
        }
        Relationships: []
      }
      boards: {
        Row: {
          code: string
          created_at: string
          description: Json
          id: string
          is_active: boolean
          metadata: Json
          name: Json
          sort_order: number
        }
        Insert: {
          code: string
          created_at?: string
          description?: Json
          id?: string
          is_active?: boolean
          metadata?: Json
          name: Json
          sort_order?: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: Json
          id?: string
          is_active?: boolean
          metadata?: Json
          name?: Json
          sort_order?: number
        }
        Relationships: []
      }
      classes: {
        Row: {
          board_id: string
          code: string
          created_at: string
          description: Json
          id: string
          metadata: Json
          name: Json
          sort_order: number
        }
        Insert: {
          board_id: string
          code: string
          created_at?: string
          description?: Json
          id?: string
          metadata?: Json
          name: Json
          sort_order?: number
        }
        Update: {
          board_id?: string
          code?: string
          created_at?: string
          description?: Json
          id?: string
          metadata?: Json
          name?: Json
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "classes_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
        ]
      }
      curriculum_outcomes: {
        Row: {
          code: string
          description: Json
          id: string
          metadata: Json
          subject_id: string
        }
        Insert: {
          code: string
          description: Json
          id?: string
          metadata?: Json
          subject_id: string
        }
        Update: {
          code?: string
          description?: Json
          id?: string
          metadata?: Json
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_outcomes_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_objectives: {
        Row: {
          id: string
          lesson_id: string
          outcome: Json
        }
        Insert: {
          id?: string
          lesson_id: string
          outcome: Json
        }
        Update: {
          id?: string
          lesson_id?: string
          outcome?: Json
        }
        Relationships: [
          {
            foreignKeyName: "lesson_objectives_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_prerequisites: {
        Row: {
          id: string
          lesson_id: string
          prerequisite_lesson_id: string
        }
        Insert: {
          id?: string
          lesson_id: string
          prerequisite_lesson_id: string
        }
        Update: {
          id?: string
          lesson_id?: string
          prerequisite_lesson_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_prerequisites_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_prerequisites_prerequisite_lesson_id_fkey"
            columns: ["prerequisite_lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          code: string
          content: Json
          created_at: string
          description: Json
          estimated_minutes: number
          id: string
          lesson_type: Database["public"]["Enums"]["lesson_type"]
          metadata: Json
          sort_order: number
          title: Json
          unit_id: string
        }
        Insert: {
          code: string
          content?: Json
          created_at?: string
          description?: Json
          estimated_minutes?: number
          id?: string
          lesson_type?: Database["public"]["Enums"]["lesson_type"]
          metadata?: Json
          sort_order?: number
          title: Json
          unit_id: string
        }
        Update: {
          code?: string
          content?: Json
          created_at?: string
          description?: Json
          estimated_minutes?: number
          id?: string
          lesson_type?: Database["public"]["Enums"]["lesson_type"]
          metadata?: Json
          sort_order?: number
          title?: Json
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: Json
          created_at: string
          id: string
          notif_type: string
          read_at: string | null
          student_profile_id: string | null
          title: Json
          user_id: string
        }
        Insert: {
          body?: Json
          created_at?: string
          id?: string
          notif_type: string
          read_at?: string | null
          student_profile_id?: string | null
          title: Json
          user_id: string
        }
        Update: {
          body?: Json
          created_at?: string
          id?: string
          notif_type?: string
          read_at?: string | null
          student_profile_id?: string | null
          title?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_student_profile_id_fkey"
            columns: ["student_profile_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          metadata: Json
          preferred_language: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          metadata?: Json
          preferred_language?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          metadata?: Json
          preferred_language?: string
          updated_at?: string
        }
        Relationships: []
      }
      progress: {
        Row: {
          completed_at: string | null
          id: string
          lesson_id: string
          metadata: Json
          score: number | null
          started_at: string | null
          status: Database["public"]["Enums"]["progress_status"]
          student_profile_id: string
          time_spent_seconds: number
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          id?: string
          lesson_id: string
          metadata?: Json
          score?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["progress_status"]
          student_profile_id: string
          time_spent_seconds?: number
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          id?: string
          lesson_id?: string
          metadata?: Json
          score?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["progress_status"]
          student_profile_id?: string
          time_spent_seconds?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progress_student_profile_id_fkey"
            columns: ["student_profile_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      question_bank: {
        Row: {
          created_at: string
          difficulty: string
          id: string
          learning_outcome: string | null
          lesson_id: string | null
          metadata: Json
          payload: Json
          question_type: string
          subject_id: string | null
          unit_id: string | null
        }
        Insert: {
          created_at?: string
          difficulty?: string
          id?: string
          learning_outcome?: string | null
          lesson_id?: string | null
          metadata?: Json
          payload?: Json
          question_type: string
          subject_id?: string | null
          unit_id?: string | null
        }
        Update: {
          created_at?: string
          difficulty?: string
          id?: string
          learning_outcome?: string | null
          lesson_id?: string | null
          metadata?: Json
          payload?: Json
          question_type?: string
          subject_id?: string | null
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "question_bank_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_bank_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_bank_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      rewards: {
        Row: {
          amount: number
          created_at: string
          id: string
          reason: Json
          ref_id: string | null
          ref_type: string | null
          reward_type: Database["public"]["Enums"]["reward_type"]
          student_profile_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          reason?: Json
          ref_id?: string | null
          ref_type?: string | null
          reward_type: Database["public"]["Enums"]["reward_type"]
          student_profile_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          reason?: Json
          ref_id?: string | null
          ref_type?: string | null
          reward_type?: Database["public"]["Enums"]["reward_type"]
          student_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rewards_student_profile_id_fkey"
            columns: ["student_profile_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      school_calendar: {
        Row: {
          board_id: string | null
          class_id: string | null
          date: string
          description: Json
          event_type: Database["public"]["Enums"]["calendar_event_type"]
          id: string
          metadata: Json
          title: Json
        }
        Insert: {
          board_id?: string | null
          class_id?: string | null
          date: string
          description?: Json
          event_type: Database["public"]["Enums"]["calendar_event_type"]
          id?: string
          metadata?: Json
          title: Json
        }
        Update: {
          board_id?: string | null
          class_id?: string | null
          date?: string
          description?: Json
          event_type?: Database["public"]["Enums"]["calendar_event_type"]
          id?: string
          metadata?: Json
          title?: Json
        }
        Relationships: [
          {
            foreignKeyName: "school_calendar_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_calendar_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      student_badges: {
        Row: {
          badge_id: string
          earned_at: string
          id: string
          student_profile_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          id?: string
          student_profile_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          id?: string
          student_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_badges_student_profile_id_fkey"
            columns: ["student_profile_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_profiles: {
        Row: {
          auth_user_id: string | null
          avatar_url: string | null
          board_id: string | null
          class_id: string | null
          coins: number
          created_at: string
          current_streak: number
          date_of_birth: string | null
          display_name: string
          id: string
          last_attendance_date: string | null
          longest_streak: number
          metadata: Json
          owner_user_id: string | null
          pin: string | null
          preferred_language: string
          stars: number
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          avatar_url?: string | null
          board_id?: string | null
          class_id?: string | null
          coins?: number
          created_at?: string
          current_streak?: number
          date_of_birth?: string | null
          display_name: string
          id?: string
          last_attendance_date?: string | null
          longest_streak?: number
          metadata?: Json
          owner_user_id?: string | null
          pin?: string | null
          preferred_language?: string
          stars?: number
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          avatar_url?: string | null
          board_id?: string | null
          class_id?: string | null
          coins?: number
          created_at?: string
          current_streak?: number
          date_of_birth?: string | null
          display_name?: string
          id?: string
          last_attendance_date?: string | null
          longest_streak?: number
          metadata?: Json
          owner_user_id?: string | null
          pin?: string | null
          preferred_language?: string
          stars?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_profiles_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_profiles_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          class_id: string
          code: string
          color: string | null
          created_at: string
          icon: string | null
          id: string
          metadata: Json
          name: Json
          sort_order: number
        }
        Insert: {
          class_id: string
          code: string
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          metadata?: Json
          name: Json
          sort_order?: number
        }
        Update: {
          class_id?: string
          code?: string
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          metadata?: Json
          name?: Json
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "subjects_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      test_attempts: {
        Row: {
          answers: Json
          completed_at: string | null
          id: string
          max_score: number
          metadata: Json
          score: number
          started_at: string
          status: string
          student_profile_id: string
          test_id: string
        }
        Insert: {
          answers?: Json
          completed_at?: string | null
          id?: string
          max_score?: number
          metadata?: Json
          score?: number
          started_at?: string
          status?: string
          student_profile_id: string
          test_id: string
        }
        Update: {
          answers?: Json
          completed_at?: string | null
          id?: string
          max_score?: number
          metadata?: Json
          score?: number
          started_at?: string
          status?: string
          student_profile_id?: string
          test_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_attempts_student_profile_id_fkey"
            columns: ["student_profile_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_attempts_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      tests: {
        Row: {
          created_at: string
          description: Json
          duration_minutes: number
          id: string
          metadata: Json
          pass_threshold: number
          questions: Json
          scope: Database["public"]["Enums"]["test_scope"]
          subject_id: string | null
          title: Json
          unit_id: string | null
        }
        Insert: {
          created_at?: string
          description?: Json
          duration_minutes?: number
          id?: string
          metadata?: Json
          pass_threshold?: number
          questions?: Json
          scope?: Database["public"]["Enums"]["test_scope"]
          subject_id?: string | null
          title: Json
          unit_id?: string | null
        }
        Update: {
          created_at?: string
          description?: Json
          duration_minutes?: number
          id?: string
          metadata?: Json
          pass_threshold?: number
          questions?: Json
          scope?: Database["public"]["Enums"]["test_scope"]
          subject_id?: string | null
          title?: Json
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tests_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tests_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          code: string
          created_at: string
          description: Json
          id: string
          metadata: Json
          sort_order: number
          subject_id: string
          title: Json
        }
        Insert: {
          code: string
          created_at?: string
          description?: Json
          id?: string
          metadata?: Json
          sort_order?: number
          subject_id: string
          title: Json
        }
        Update: {
          code?: string
          created_at?: string
          description?: Json
          id?: string
          metadata?: Json
          sort_order?: number
          subject_id?: string
          title?: Json
        }
        Relationships: [
          {
            foreignKeyName: "units_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_student: { Args: { _student_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      activity_type:
        | "video"
        | "teacher_explanation"
        | "interactive_story"
        | "multiple_choice"
        | "match_pairs"
        | "drag_drop"
        | "fill_blank"
        | "audio_activity"
        | "speaking_activity"
        | "tracing_activity"
        | "reading"
      app_role: "admin" | "teacher" | "parent" | "student"
      calendar_event_type: "holiday" | "event" | "exam" | "break"
      lesson_type:
        | "video"
        | "teacher_explanation"
        | "interactive_story"
        | "multiple_choice"
        | "match_pairs"
        | "drag_drop"
        | "fill_blank"
        | "audio_activity"
        | "speaking_activity"
        | "tracing_activity"
        | "mixed"
      progress_status: "not_started" | "in_progress" | "completed"
      reward_type: "coin" | "star" | "badge" | "certificate"
      test_scope: "daily" | "weekly" | "monthly" | "unit" | "custom"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      activity_type: [
        "video",
        "teacher_explanation",
        "interactive_story",
        "multiple_choice",
        "match_pairs",
        "drag_drop",
        "fill_blank",
        "audio_activity",
        "speaking_activity",
        "tracing_activity",
        "reading",
      ],
      app_role: ["admin", "teacher", "parent", "student"],
      calendar_event_type: ["holiday", "event", "exam", "break"],
      lesson_type: [
        "video",
        "teacher_explanation",
        "interactive_story",
        "multiple_choice",
        "match_pairs",
        "drag_drop",
        "fill_blank",
        "audio_activity",
        "speaking_activity",
        "tracing_activity",
        "mixed",
      ],
      progress_status: ["not_started", "in_progress", "completed"],
      reward_type: ["coin", "star", "badge", "certificate"],
      test_scope: ["daily", "weekly", "monthly", "unit", "custom"],
    },
  },
} as const
