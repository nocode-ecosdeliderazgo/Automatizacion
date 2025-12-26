export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type ArtifactState =
  | 'DRAFT'
  | 'GENERATING'
  | 'VALIDATING'
  | 'READY_FOR_QA'
  | 'APPROVED'
  | 'REJECTED'
  | 'ESCALATED'

export type QADecision = 'APPROVED' | 'REJECTED' | 'NEEDS_REVISION'

export type UserRole = 'operator' | 'qa_reviewer' | 'admin'

export interface Database {
  public: {
    Tables: {
      artifacts: {
        Row: {
          id: string
          run_id: string | null
          course_id: string | null
          idea_central: string
          nombres: Json
          objetivos: Json
          descripcion: Json
          state: ArtifactState
          validation_report: Json | null
          semantic_result: Json | null
          auto_retry_count: number
          iteration_count: number
          generation_metadata: Json
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          run_id?: string | null
          course_id?: string | null
          idea_central: string
          nombres?: Json
          objetivos?: Json
          descripcion?: Json
          state?: ArtifactState
          validation_report?: Json | null
          semantic_result?: Json | null
          auto_retry_count?: number
          iteration_count?: number
          generation_metadata?: Json
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          run_id?: string | null
          course_id?: string | null
          idea_central?: string
          nombres?: Json
          objetivos?: Json
          descripcion?: Json
          state?: ArtifactState
          validation_report?: Json | null
          semantic_result?: Json | null
          auto_retry_count?: number
          iteration_count?: number
          generation_metadata?: Json
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      qa_sessions: {
        Row: {
          id: string
          artifact_id: string
          reviewer_id: string | null
          decision: QADecision | null
          feedback: string | null
          suggestions: Json
          started_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          artifact_id: string
          reviewer_id?: string | null
          decision?: QADecision | null
          feedback?: string | null
          suggestions?: Json
          started_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          artifact_id?: string
          reviewer_id?: string | null
          decision?: QADecision | null
          feedback?: string | null
          suggestions?: Json
          started_at?: string
          completed_at?: string | null
        }
      }
      pipeline_events: {
        Row: {
          id: string
          artifact_id: string
          event_type: string
          event_data: Json
          created_at: string
        }
        Insert: {
          id?: string
          artifact_id: string
          event_type: string
          event_data?: Json
          created_at?: string
        }
        Update: {
          id?: string
          artifact_id?: string
          event_type?: string
          event_data?: Json
          created_at?: string
        }
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          role: UserRole
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role?: UserRole
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          role?: UserRole
          created_at?: string
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
      artifact_state: ArtifactState
      qa_decision: QADecision
      user_role: UserRole
    }
  }
}

// Helper types
export type Artifact = Database['public']['Tables']['artifacts']['Row']
export type ArtifactInsert = Database['public']['Tables']['artifacts']['Insert']
export type ArtifactUpdate = Database['public']['Tables']['artifacts']['Update']

export type QASession = Database['public']['Tables']['qa_sessions']['Row']
export type PipelineEvent = Database['public']['Tables']['pipeline_events']['Row']
