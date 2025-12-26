import type { Artifact as DBartifact, ArtifactState } from '@/shared/types/database.types'

export type Artifact = DBartifact

export interface ArtifactDescription {
  texto: string
  publico_objetivo: string
  beneficios: string
  estructura_general: string
  diferenciador: string
}

export interface ValidationResult {
  code: string
  passed: boolean
  message: string
  observed?: number | string
}

export interface ValidationReport {
  all_passed: boolean
  results: ValidationResult[]
  errors?: ValidationResult[]
}

export interface SemanticResult {
  passed: boolean
  confidence: number
  rationale: string
  objective_scores?: Array<{
    objective: string
    score: number
    feedback: string
  }>
}

export interface ArtifactFilters {
  state?: ArtifactState
  search?: string
}
