// GO-ESP-04: Tipos para Curaduria de Fuentes (Paso 4 / Fase 2)

// Estados del Paso 4
export type Esp04StepState =
  | 'PHASE2_DRAFT'
  | 'PHASE2_GENERATING'
  | 'PHASE2_GENERATED'
  | 'PHASE2_HITL_REVIEW'
  | 'PHASE2_READY_FOR_QA'
  | 'PHASE2_APPROVED'
  | 'PHASE2_CORRECTABLE'
  | 'PHASE2_BLOCKED'

// Fila de la tabla de fuentes
export interface CurationRow {
  id: string
  lesson_id: string
  lesson_title: string
  component: string
  is_critical: boolean
  source_ref: string           // URL o titulo
  source_title?: string
  source_rationale?: string    // Justificacion de la IA
  apta: boolean | null         // null = pendiente evaluacion
  motivo_no_apta?: string
  cobertura_completa: boolean | null
  notes?: string
}

// Entrada de bitacora
export interface BitacoraEntry {
  id: string
  entry_type: 'DECISION' | 'DISCARD' | 'GAP' | 'NEXT_STEP' | 'NOTE'
  lesson_id?: string
  component?: string
  message: string
  created_at: string
  created_by?: string
}

// Bloqueador de curaduria
export interface CurationBlocker {
  id: string
  lesson_id: string
  lesson_title: string
  component: string
  impact: string
  owner: string
  status: 'OPEN' | 'MITIGATING' | 'ACCEPTED'
  created_at: string
}

// Check DoD
export interface CurationDodCheck {
  code: 'DOD_COVERAGE' | 'DOD_CRITICAL' | 'DOD_OPERABILITY' | 'DOD_TRACEABILITY'
  label: string
  pass: boolean
  evidence?: string
  notes?: string
}

// Resultado de validacion
export interface CurationValidationCheck {
  code: string
  pass: boolean
  message: string
  severity: 'error' | 'warning'
  lesson_id?: string
  component?: string
}

// Payload completo de curaduria
export interface CurationPayload {
  artifact_id: string
  attempt_number: 1 | 2
  rows: CurationRow[]
  bitacora: BitacoraEntry[]
  blockers: CurationBlocker[]
  dod: {
    checklist: CurationDodCheck[]
    automatic_checks: CurationValidationCheck[]
  }
  state: Esp04StepState
  qa_decision?: {
    decision: 'APPROVED' | 'CORRECTABLE' | 'BLOCKED'
    reviewed_by?: string
    reviewed_at?: string
    notes?: string
  }
}

// Resultado de operacion
export interface CurationResult {
  success: boolean
  state: Esp04StepState
  error?: string
}

// Input para la API: componente requerido por leccion
export interface RequiredComponent {
  lesson_id: string
  lesson_title: string
  component: string
  is_critical: boolean
}

// Output de la API: fuente candidata
export interface CandidateSource {
  title: string
  url: string
  rationale: string
}

// Output de la API por componente
export interface ComponentSources {
  component_name: string
  is_critical: boolean
  candidate_sources: CandidateSource[]
}

// Output de la API por leccion
export interface LessonSources {
  lesson_id: string
  lesson_title: string
  components: ComponentSources[]
}

// Output completo de la API
export interface CurationApiOutput {
  sources_by_lesson: LessonSources[]
}
