// GO-ESP-02: Tipos para generacion de temario

export type Esp02Route = 'A_WITH_SOURCE' | 'B_NO_SOURCE'

export type Esp02StepState =
  | 'STEP_DRAFT'
  | 'STEP_GENERATING'
  | 'STEP_VALIDATING'
  | 'STEP_READY_FOR_QA'
  | 'STEP_APPROVED'
  | 'STEP_REJECTED'
  | 'STEP_ESCALATED'

export interface SyllabusLesson {
  id: string
  title: string
  objective_specific: string
}

export interface SyllabusModule {
  id: string
  objective_general_ref: string
  title: string
  lessons: SyllabusLesson[]
}

export interface SourceFile {
  file_id: string
  filename: string
  mime: string
  size?: number
}

export interface SourceSummary {
  files: SourceFile[]
  notes?: string
  utilizable?: boolean
}

export interface ValidationCheck {
  code: string
  pass: boolean
  message: string
  observed?: string | number
}

export interface TemarioValidation {
  automatic_pass: boolean
  checks: ValidationCheck[]
  route_specific?: ValidationCheck[]
  ran_at?: string
}

export interface TemarioQA {
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  reviewed_by?: string
  reviewed_at?: string
  notes?: string
}

export interface TemarioEsp02 {
  route: Esp02Route
  source_summary?: SourceSummary
  modules: SyllabusModule[]
  validation: TemarioValidation
  qa: TemarioQA
}

export interface Esp02GenerationInput {
  artifactId: string
  route: Esp02Route
  sourceFiles?: File[]
}

export interface Esp02GenerationResult {
  success: boolean
  temarioId?: string
  state: Esp02StepState
  error?: string
}

// Estados del pipeline para UI
export const ESP02_STATES = {
  STEP_DRAFT: { label: 'Borrador', progress: 0 },
  STEP_GENERATING: { label: 'Generando temario...', progress: 30 },
  STEP_VALIDATING: { label: 'Validando estructura...', progress: 60 },
  STEP_READY_FOR_QA: { label: 'Listo para revision', progress: 80 },
  STEP_APPROVED: { label: 'Aprobado', progress: 100 },
  STEP_REJECTED: { label: 'Rechazado', progress: 100 },
  STEP_ESCALATED: { label: 'Requiere intervencion', progress: 100 },
} as const

// Codigos de validacion
export const VALIDATION_CODES = {
  V01_MODULES_MATCH_OBJECTIVES: 'V01',
  V02_LESSONS_RANGE: 'V02',
  V03_OBJECTIVES_PRESENT: 'V03',
  V04_NO_DUPLICATES: 'V04',
  V05_STRUCTURE_COMPLETE: 'V05',
} as const
