// Database types based on Supabase schema

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string | null
          avatar_url: string | null
          created_at: string
          last_login_at: string | null
        }
        Insert: {
          id: string
          email: string
          name?: string | null
          avatar_url?: string | null
          created_at?: string
          last_login_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          avatar_url?: string | null
          created_at?: string
          last_login_at?: string | null
        }
      }
      words: {
        Row: {
          id: string
          word: string
          definition: string
          example_sentence: string | null
          pronunciation: string | null
          part_of_speech: string | null
          difficulty_level: number
          search_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          word: string
          definition: string
          example_sentence?: string | null
          pronunciation?: string | null
          part_of_speech?: string | null
          difficulty_level?: number
          search_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          word?: string
          definition?: string
          example_sentence?: string | null
          pronunciation?: string | null
          part_of_speech?: string | null
          difficulty_level?: number
          search_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      user_word_history: {
        Row: {
          id: string
          user_id: string
          word_id: string
          interaction_type: 'search' | 'quiz' | 'study' | 'chat'
          interaction_metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          word_id: string
          interaction_type: 'search' | 'quiz' | 'study' | 'chat'
          interaction_metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          word_id?: string
          interaction_type?: 'search' | 'quiz' | 'study' | 'chat'
          interaction_metadata?: Json | null
          created_at?: string
        }
      }
      user_vocabulary: {
        Row: {
          id: string
          user_id: string
          word_id: string
          memorization_level: number
          last_reviewed_at: string | null
          review_count: number
          is_favorite: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          word_id: string
          memorization_level?: number
          last_reviewed_at?: string | null
          review_count?: number
          is_favorite?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          word_id?: string
          memorization_level?: number
          last_reviewed_at?: string | null
          review_count?: number
          is_favorite?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      user_scores: {
        Row: {
          id: string
          user_id: string
          quiz_type: string
          score: number
          total_questions: number
          time_taken_seconds: number | null
          quiz_metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          quiz_type: string
          score: number
          total_questions: number
          time_taken_seconds?: number | null
          quiz_metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          quiz_type?: string
          score?: number
          total_questions?: number
          time_taken_seconds?: number | null
          quiz_metadata?: Json | null
          created_at?: string
        }
      }
      search_logs: {
        Row: {
          id: string
          user_id: string | null
          search_query: string
          result_found: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          search_query: string
          result_found: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          search_query?: string
          result_found?: boolean
          created_at?: string
        }
      }
      access_logs: {
        Row: {
          id: string
          user_id: string | null
          action: string
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          action: string
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          action?: string
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
      }
      failed_searches: {
        Row: {
          id: string
          user_id: string | null
          search_query: string
          failure_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          search_query: string
          failure_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          search_query?: string
          failure_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      word_reports: {
        Row: {
          id: string
          word_id: string
          user_id: string
          report_type: 'incorrect_definition' | 'incorrect_example' | 'other'
          description: string | null
          status: 'pending' | 'reviewed' | 'resolved'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          word_id: string
          user_id: string
          report_type: 'incorrect_definition' | 'incorrect_example' | 'other'
          description?: string | null
          status?: 'pending' | 'reviewed' | 'resolved'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          word_id?: string
          user_id?: string
          report_type?: 'incorrect_definition' | 'incorrect_example' | 'other'
          description?: string | null
          status?: 'pending' | 'reviewed' | 'resolved'
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Type helpers for easier access
export type User = Database['public']['Tables']['users']['Row']
export type Word = Database['public']['Tables']['words']['Row']
export type UserWordHistory = Database['public']['Tables']['user_word_history']['Row']
export type UserVocabulary = Database['public']['Tables']['user_vocabulary']['Row']
export type UserScore = Database['public']['Tables']['user_scores']['Row']
export type SearchLog = Database['public']['Tables']['search_logs']['Row']
export type AccessLog = Database['public']['Tables']['access_logs']['Row']
export type FailedSearch = Database['public']['Tables']['failed_searches']['Row']
export type WordReport = Database['public']['Tables']['word_reports']['Row']
