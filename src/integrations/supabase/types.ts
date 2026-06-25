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
      ai_question_pool: {
        Row: {
          class_id: string | null
          created_at: string
          difficulty: string
          generated_by: string | null
          generation_model: string | null
          id: string
          language: string
          lesson_id: string | null
          payload: Json
          question_type: string
          source: string
          stage_id: string | null
          subject_id: string
          topic: string | null
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          class_id?: string | null
          created_at?: string
          difficulty?: string
          generated_by?: string | null
          generation_model?: string | null
          id?: string
          language?: string
          lesson_id?: string | null
          payload: Json
          question_type: string
          source?: string
          stage_id?: string | null
          subject_id: string
          topic?: string | null
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          class_id?: string | null
          created_at?: string
          difficulty?: string
          generated_by?: string | null
          generation_model?: string | null
          id?: string
          language?: string
          lesson_id?: string | null
          payload?: Json
          question_type?: string
          source?: string
          stage_id?: string | null
          subject_id?: string
          topic?: string | null
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_question_pool_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_question_pool_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_question_pool_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "lesson_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_question_pool_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_question_pool_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
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
          ai_difficulty: string | null
          ai_question_count: number | null
          ai_topics: Json | null
          allow_retake: boolean
          created_at: string
          due_in_days: number | null
          id: string
          instructions: Json
          lesson_id: string | null
          max_attempts: number | null
          metadata: Json
          pass_threshold: number
          program_code: string | null
          question_source: string
          questions: Json
          questions_per_attempt: number | null
          retake_mode: string
          subject_id: string | null
          title: Json
        }
        Insert: {
          ai_difficulty?: string | null
          ai_question_count?: number | null
          ai_topics?: Json | null
          allow_retake?: boolean
          created_at?: string
          due_in_days?: number | null
          id?: string
          instructions?: Json
          lesson_id?: string | null
          max_attempts?: number | null
          metadata?: Json
          pass_threshold?: number
          program_code?: string | null
          question_source?: string
          questions?: Json
          questions_per_attempt?: number | null
          retake_mode?: string
          subject_id?: string | null
          title: Json
        }
        Update: {
          ai_difficulty?: string | null
          ai_question_count?: number | null
          ai_topics?: Json | null
          allow_retake?: boolean
          created_at?: string
          due_in_days?: number | null
          id?: string
          instructions?: Json
          lesson_id?: string | null
          max_attempts?: number | null
          metadata?: Json
          pass_threshold?: number
          program_code?: string | null
          question_source?: string
          questions?: Json
          questions_per_attempt?: number | null
          retake_mode?: string
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
            foreignKeyName: "assignments_program_code_fkey"
            columns: ["program_code"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["code"]
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
      daily_schedule: {
        Row: {
          assignment_id: string | null
          class_id: string
          created_at: string
          date: string
          id: string
          lesson_id: string | null
          metadata: Json
          sort_order: number
          subject_id: string
          test_id: string | null
          updated_at: string
        }
        Insert: {
          assignment_id?: string | null
          class_id: string
          created_at?: string
          date: string
          id?: string
          lesson_id?: string | null
          metadata?: Json
          sort_order?: number
          subject_id: string
          test_id?: string | null
          updated_at?: string
        }
        Update: {
          assignment_id?: string | null
          class_id?: string
          created_at?: string
          date?: string
          id?: string
          lesson_id?: string | null
          metadata?: Json
          sort_order?: number
          subject_id?: string
          test_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_schedule_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_schedule_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_schedule_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_schedule_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_schedule_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      homework: {
        Row: {
          assigned_date: string
          assignment_id: string | null
          completed_at: string | null
          created_at: string
          due_date: string
          id: string
          kind: string
          lesson_id: string | null
          notes: string | null
          program_code: string | null
          score: number | null
          student_profile_id: string
          subject_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_date?: string
          assignment_id?: string | null
          completed_at?: string | null
          created_at?: string
          due_date?: string
          id?: string
          kind: string
          lesson_id?: string | null
          notes?: string | null
          program_code?: string | null
          score?: number | null
          student_profile_id: string
          subject_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_date?: string
          assignment_id?: string | null
          completed_at?: string | null
          created_at?: string
          due_date?: string
          id?: string
          kind?: string
          lesson_id?: string | null
          notes?: string | null
          program_code?: string | null
          score?: number | null
          student_profile_id?: string
          subject_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "homework_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_program_code_fkey"
            columns: ["program_code"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "homework_student_profile_id_fkey"
            columns: ["student_profile_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_subject_id_fkey"
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
      lesson_stages: {
        Row: {
          ai_adaptive: boolean
          ai_difficulty: string
          ai_question_count: number
          ai_randomize: boolean
          ai_show_explanation: boolean
          ai_topics: Json | null
          ai_weak_area_practice: boolean
          allow_retake: boolean | null
          created_at: string
          explanation: Json
          id: string
          image_url: string | null
          lesson_id: string
          max_attempts: number | null
          narration_en: string | null
          narration_hi: string | null
          narration_te: string | null
          pass_threshold: number
          question_source: string
          questions: Json
          questions_per_attempt: number | null
          retake_mode: string | null
          script: Json | null
          slides: Json
          sort_order: number
          stage_type: Database["public"]["Enums"]["lesson_stage_type"]
          title: Json
          updated_at: string
        }
        Insert: {
          ai_adaptive?: boolean
          ai_difficulty?: string
          ai_question_count?: number
          ai_randomize?: boolean
          ai_show_explanation?: boolean
          ai_topics?: Json | null
          ai_weak_area_practice?: boolean
          allow_retake?: boolean | null
          created_at?: string
          explanation?: Json
          id?: string
          image_url?: string | null
          lesson_id: string
          max_attempts?: number | null
          narration_en?: string | null
          narration_hi?: string | null
          narration_te?: string | null
          pass_threshold?: number
          question_source?: string
          questions?: Json
          questions_per_attempt?: number | null
          retake_mode?: string | null
          script?: Json | null
          slides?: Json
          sort_order?: number
          stage_type: Database["public"]["Enums"]["lesson_stage_type"]
          title?: Json
          updated_at?: string
        }
        Update: {
          ai_adaptive?: boolean
          ai_difficulty?: string
          ai_question_count?: number
          ai_randomize?: boolean
          ai_show_explanation?: boolean
          ai_topics?: Json | null
          ai_weak_area_practice?: boolean
          allow_retake?: boolean | null
          created_at?: string
          explanation?: Json
          id?: string
          image_url?: string | null
          lesson_id?: string
          max_attempts?: number | null
          narration_en?: string | null
          narration_hi?: string | null
          narration_te?: string | null
          pass_threshold?: number
          question_source?: string
          questions?: Json
          questions_per_attempt?: number | null
          retake_mode?: string | null
          script?: Json | null
          slides?: Json
          sort_order?: number
          stage_type?: Database["public"]["Enums"]["lesson_stage_type"]
          title?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_stages_lesson_id_fkey"
            columns: ["lesson_id"]
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
          is_published: boolean
          lesson_type: Database["public"]["Enums"]["lesson_type"]
          metadata: Json
          program_code: string | null
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
          is_published?: boolean
          lesson_type?: Database["public"]["Enums"]["lesson_type"]
          metadata?: Json
          program_code?: string | null
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
          is_published?: boolean
          lesson_type?: Database["public"]["Enums"]["lesson_type"]
          metadata?: Json
          program_code?: string | null
          sort_order?: number
          title?: Json
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_program_code_fkey"
            columns: ["program_code"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["code"]
          },
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
      programs: {
        Row: {
          code: string
          created_at: string
          description: string | null
          name: string
          sort_order: number
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          name: string
          sort_order?: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          name?: string
          sort_order?: number
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
      reading_sessions: {
        Row: {
          completed_at: string
          duration_sec: number
          id: string
          language: string
          passage_id: string
          student_profile_id: string
          words_read: number
        }
        Insert: {
          completed_at?: string
          duration_sec?: number
          id?: string
          language?: string
          passage_id: string
          student_profile_id: string
          words_read?: number
        }
        Update: {
          completed_at?: string
          duration_sec?: number
          id?: string
          language?: string
          passage_id?: string
          student_profile_id?: string
          words_read?: number
        }
        Relationships: [
          {
            foreignKeyName: "reading_sessions_student_profile_id_fkey"
            columns: ["student_profile_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      revision_items: {
        Row: {
          category: string
          created_at: string
          id: string
          language: string
          metadata: Json
          sort_order: number
          subject_code: string
          value: Json
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          language?: string
          metadata?: Json
          sort_order?: number
          subject_code: string
          value?: Json
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          language?: string
          metadata?: Json
          sort_order?: number
          subject_code?: string
          value?: Json
        }
        Relationships: []
      }
      revision_progress: {
        Row: {
          attempts: number
          correct_count: number
          id: string
          last_seen_at: string | null
          mastery: Database["public"]["Enums"]["mastery_level"]
          metadata: Json
          next_due_at: string | null
          repetitions: number
          revision_item_id: string
          student_profile_id: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          correct_count?: number
          id?: string
          last_seen_at?: string | null
          mastery?: Database["public"]["Enums"]["mastery_level"]
          metadata?: Json
          next_due_at?: string | null
          repetitions?: number
          revision_item_id: string
          student_profile_id: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          correct_count?: number
          id?: string
          last_seen_at?: string | null
          mastery?: Database["public"]["Enums"]["mastery_level"]
          metadata?: Json
          next_due_at?: string | null
          repetitions?: number
          revision_item_id?: string
          student_profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "revision_progress_revision_item_id_fkey"
            columns: ["revision_item_id"]
            isOneToOne: false
            referencedRelation: "revision_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revision_progress_student_profile_id_fkey"
            columns: ["student_profile_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
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
      speech_assessments: {
        Row: {
          audio_url: string | null
          created_at: string
          fluency_score: number | null
          id: string
          language: string
          metadata: Json
          prompt_text: string | null
          pronunciation_score: number | null
          ref_id: string | null
          ref_type: string
          student_profile_id: string
          transcript: string | null
        }
        Insert: {
          audio_url?: string | null
          created_at?: string
          fluency_score?: number | null
          id?: string
          language?: string
          metadata?: Json
          prompt_text?: string | null
          pronunciation_score?: number | null
          ref_id?: string | null
          ref_type: string
          student_profile_id: string
          transcript?: string | null
        }
        Update: {
          audio_url?: string | null
          created_at?: string
          fluency_score?: number | null
          id?: string
          language?: string
          metadata?: Json
          prompt_text?: string | null
          pronunciation_score?: number | null
          ref_id?: string | null
          ref_type?: string
          student_profile_id?: string
          transcript?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "speech_assessments_student_profile_id_fkey"
            columns: ["student_profile_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
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
      student_journey_events: {
        Row: {
          description: string | null
          event_type: string
          icon: string | null
          id: string
          occurred_at: string
          payload: Json
          student_profile_id: string
          title: string
        }
        Insert: {
          description?: string | null
          event_type: string
          icon?: string | null
          id?: string
          occurred_at?: string
          payload?: Json
          student_profile_id: string
          title: string
        }
        Update: {
          description?: string | null
          event_type?: string
          icon?: string | null
          id?: string
          occurred_at?: string
          payload?: Json
          student_profile_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_journey_events_student_profile_id_fkey"
            columns: ["student_profile_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_preferences: {
        Row: {
          auto_read_lesson: boolean
          high_contrast: boolean
          larger_text: boolean
          metadata: Json
          preferred_voice_uri: string | null
          speech_pitch: number
          speech_rate: number
          speech_volume: number
          student_profile_id: string
          updated_at: string
          voice_reader: boolean
        }
        Insert: {
          auto_read_lesson?: boolean
          high_contrast?: boolean
          larger_text?: boolean
          metadata?: Json
          preferred_voice_uri?: string | null
          speech_pitch?: number
          speech_rate?: number
          speech_volume?: number
          student_profile_id: string
          updated_at?: string
          voice_reader?: boolean
        }
        Update: {
          auto_read_lesson?: boolean
          high_contrast?: boolean
          larger_text?: boolean
          metadata?: Json
          preferred_voice_uri?: string | null
          speech_pitch?: number
          speech_rate?: number
          speech_volume?: number
          student_profile_id?: string
          updated_at?: string
          voice_reader?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "student_preferences_student_profile_id_fkey"
            columns: ["student_profile_id"]
            isOneToOne: true
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
          homework_streak: number
          id: string
          last_attendance_date: string | null
          longest_streak: number
          metadata: Json
          owner_user_id: string | null
          pin_hash: string | null
          preferred_language: string
          reading_streak: number
          revision_streak: number
          section: string | null
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
          homework_streak?: number
          id?: string
          last_attendance_date?: string | null
          longest_streak?: number
          metadata?: Json
          owner_user_id?: string | null
          pin_hash?: string | null
          preferred_language?: string
          reading_streak?: number
          revision_streak?: number
          section?: string | null
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
          homework_streak?: number
          id?: string
          last_attendance_date?: string | null
          longest_streak?: number
          metadata?: Json
          owner_user_id?: string | null
          pin_hash?: string | null
          preferred_language?: string
          reading_streak?: number
          revision_streak?: number
          section?: string | null
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
      student_program: {
        Row: {
          active_program_code: string
          started_at: string
          student_profile_id: string
          updated_at: string
        }
        Insert: {
          active_program_code: string
          started_at?: string
          student_profile_id: string
          updated_at?: string
        }
        Update: {
          active_program_code?: string
          started_at?: string
          student_profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_program_active_program_code_fkey"
            columns: ["active_program_code"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "student_program_student_profile_id_fkey"
            columns: ["student_profile_id"]
            isOneToOne: true
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_question_history: {
        Row: {
          correct_count: number
          created_at: string
          id: string
          incorrect_count: number
          last_answered_at: string | null
          last_shown_at: string | null
          lesson_id: string | null
          question_pool_id: string
          shown_count: number
          student_profile_id: string
          topic: string | null
          updated_at: string
        }
        Insert: {
          correct_count?: number
          created_at?: string
          id?: string
          incorrect_count?: number
          last_answered_at?: string | null
          last_shown_at?: string | null
          lesson_id?: string | null
          question_pool_id: string
          shown_count?: number
          student_profile_id: string
          topic?: string | null
          updated_at?: string
        }
        Update: {
          correct_count?: number
          created_at?: string
          id?: string
          incorrect_count?: number
          last_answered_at?: string | null
          last_shown_at?: string | null
          lesson_id?: string | null
          question_pool_id?: string
          shown_count?: number
          student_profile_id?: string
          topic?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_question_history_question_pool_id_fkey"
            columns: ["question_pool_id"]
            isOneToOne: false
            referencedRelation: "ai_question_pool"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_question_history_student_profile_id_fkey"
            columns: ["student_profile_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_stage_progress: {
        Row: {
          attempts: number
          completed_at: string | null
          created_at: string
          id: string
          lesson_id: string
          score: number | null
          stage_type: Database["public"]["Enums"]["lesson_stage_type"]
          student_profile_id: string
          time_spent_seconds: number
          updated_at: string
        }
        Insert: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          lesson_id: string
          score?: number | null
          stage_type: Database["public"]["Enums"]["lesson_stage_type"]
          student_profile_id: string
          time_spent_seconds?: number
          updated_at?: string
        }
        Update: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          lesson_id?: string
          score?: number | null
          stage_type?: Database["public"]["Enums"]["lesson_stage_type"]
          student_profile_id?: string
          time_spent_seconds?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_stage_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_stage_progress_student_profile_id_fkey"
            columns: ["student_profile_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
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
          program_code: string | null
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
          program_code?: string | null
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
          program_code?: string | null
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
          {
            foreignKeyName: "subjects_program_code_fkey"
            columns: ["program_code"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["code"]
          },
        ]
      }
      teacher_assignment_targets: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          score: number | null
          student_profile_id: string
          teacher_assignment_id: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          score?: number | null
          student_profile_id: string
          teacher_assignment_id: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          score?: number | null
          student_profile_id?: string
          teacher_assignment_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_assignment_targets_student_profile_id_fkey"
            columns: ["student_profile_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_assignment_targets_teacher_assignment_id_fkey"
            columns: ["teacher_assignment_id"]
            isOneToOne: false
            referencedRelation: "teacher_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_assignments: {
        Row: {
          assigned_date: string
          class_id: string | null
          created_at: string
          created_by: string | null
          due_date: string | null
          id: string
          kind: string
          lesson_id: string | null
          notes: string | null
          scope: string
          section: string | null
          subject_id: string | null
          title: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          assigned_date?: string
          class_id?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          kind: string
          lesson_id?: string | null
          notes?: string | null
          scope: string
          section?: string | null
          subject_id?: string | null
          title: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          assigned_date?: string
          class_id?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          kind?: string
          lesson_id?: string | null
          notes?: string | null
          scope?: string
          section?: string | null
          subject_id?: string | null
          title?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_assignments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_assignments_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_assignments_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_assignments_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
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
          ai_difficulty: string | null
          ai_question_count: number | null
          ai_topics: Json | null
          allow_retake: boolean
          created_at: string
          description: Json
          duration_minutes: number
          id: string
          max_attempts: number | null
          metadata: Json
          pass_threshold: number
          program_code: string | null
          question_source: string
          questions: Json
          questions_per_attempt: number | null
          retake_mode: string
          scope: Database["public"]["Enums"]["test_scope"]
          subject_id: string | null
          title: Json
          unit_id: string | null
        }
        Insert: {
          ai_difficulty?: string | null
          ai_question_count?: number | null
          ai_topics?: Json | null
          allow_retake?: boolean
          created_at?: string
          description?: Json
          duration_minutes?: number
          id?: string
          max_attempts?: number | null
          metadata?: Json
          pass_threshold?: number
          program_code?: string | null
          question_source?: string
          questions?: Json
          questions_per_attempt?: number | null
          retake_mode?: string
          scope?: Database["public"]["Enums"]["test_scope"]
          subject_id?: string | null
          title: Json
          unit_id?: string | null
        }
        Update: {
          ai_difficulty?: string | null
          ai_question_count?: number | null
          ai_topics?: Json | null
          allow_retake?: boolean
          created_at?: string
          description?: Json
          duration_minutes?: number
          id?: string
          max_attempts?: number | null
          metadata?: Json
          pass_threshold?: number
          program_code?: string | null
          question_source?: string
          questions?: Json
          questions_per_attempt?: number | null
          retake_mode?: string
          scope?: Database["public"]["Enums"]["test_scope"]
          subject_id?: string | null
          title?: Json
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tests_program_code_fkey"
            columns: ["program_code"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["code"]
          },
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
      weekly_plans: {
        Row: {
          assignment_id: string | null
          class_id: string | null
          created_at: string
          homework_titles: string[]
          id: string
          lesson_ids: string[]
          notes: string | null
          program_code: string
          subject_id: string | null
          test_id: string | null
          updated_at: string
          week_number: number
        }
        Insert: {
          assignment_id?: string | null
          class_id?: string | null
          created_at?: string
          homework_titles?: string[]
          id?: string
          lesson_ids?: string[]
          notes?: string | null
          program_code: string
          subject_id?: string | null
          test_id?: string | null
          updated_at?: string
          week_number: number
        }
        Update: {
          assignment_id?: string | null
          class_id?: string | null
          created_at?: string
          homework_titles?: string[]
          id?: string
          lesson_ids?: string[]
          notes?: string | null
          program_code?: string
          subject_id?: string | null
          test_id?: string | null
          updated_at?: string
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "weekly_plans_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_plans_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_plans_program_code_fkey"
            columns: ["program_code"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "weekly_plans_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_plans_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      writing_practice_completions: {
        Row: {
          accuracy: number | null
          completed_at: string
          glyph: string
          id: string
          script: string
          strokes: number
          student_profile_id: string
        }
        Insert: {
          accuracy?: number | null
          completed_at?: string
          glyph: string
          id?: string
          script: string
          strokes?: number
          student_profile_id: string
        }
        Update: {
          accuracy?: number | null
          completed_at?: string
          glyph?: string
          id?: string
          script?: string
          strokes?: number
          student_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "writing_practice_completions_student_profile_id_fkey"
            columns: ["student_profile_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      ai_question_analytics: {
        Row: {
          accuracy: number | null
          difficulty: string | null
          lesson_id: string | null
          questions_in_pool: number | null
          subject_id: string | null
          topic: string | null
          total_correct: number | null
          total_incorrect: number | null
          total_shown: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_question_pool_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_question_pool_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      _fetch_ai_pool_for: {
        Args: {
          _count: number
          _difficulty: string
          _lesson_id: string
          _subject_id: string
          _topics: Json
        }
        Returns: Json
      }
      _maybe_random_subset: {
        Args: { _limit: number; _mode: string; _questions: Json }
        Returns: Json
      }
      _score_question: { Args: { _ans: Json; _q: Json }; Returns: boolean }
      _strip_answer_keys: { Args: { _questions: Json }; Returns: Json }
      _strip_payload_answer: { Args: { _p: Json }; Returns: Json }
      can_access_student: { Args: { _student_id: string }; Returns: boolean }
      get_assignment_admin: { Args: { _assignment_id: string }; Returns: Json }
      get_assignment_for_student:
        | { Args: { _assignment_id: string }; Returns: Json }
        | {
            Args: { _assignment_id: string; _student_id?: string }
            Returns: Json
          }
      get_practice_questions: {
        Args: { _count?: number; _stage_id: string; _student_id: string }
        Returns: Json
      }
      get_student_weak_topics: {
        Args: {
          _accuracy_threshold?: number
          _student_id: string
          _subject_id?: string
        }
        Returns: Json
      }
      get_test_admin: { Args: { _test_id: string }; Returns: Json }
      get_test_for_student:
        | { Args: { _test_id: string }; Returns: Json }
        | { Args: { _student_id?: string; _test_id: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      set_student_pin: {
        Args: { _pin: string; _student_id: string }
        Returns: undefined
      }
      submit_assignment: {
        Args: { _answers: Json; _assignment_id: string; _student_id: string }
        Returns: Json
      }
      submit_pool_answer: {
        Args: { _answer: Json; _pool_id: string; _student_id: string }
        Returns: Json
      }
      submit_test_attempt: {
        Args: {
          _answers: Json
          _auto?: boolean
          _started_at?: string
          _student_id: string
          _test_id: string
        }
        Returns: Json
      }
      verify_student_pin: {
        Args: { _name: string; _pin: string }
        Returns: string
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
      lesson_stage_type:
        | "welcome"
        | "blackboard"
        | "concept"
        | "example1"
        | "example2"
        | "guided"
        | "independent"
        | "assignment"
        | "test"
        | "revision"
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
      mastery_level: "new" | "learning" | "familiar" | "mastered"
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
      lesson_stage_type: [
        "welcome",
        "blackboard",
        "concept",
        "example1",
        "example2",
        "guided",
        "independent",
        "assignment",
        "test",
        "revision",
      ],
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
      mastery_level: ["new", "learning", "familiar", "mastered"],
      progress_status: ["not_started", "in_progress", "completed"],
      reward_type: ["coin", "star", "badge", "certificate"],
      test_scope: ["daily", "weekly", "monthly", "unit", "custom"],
    },
  },
} as const
