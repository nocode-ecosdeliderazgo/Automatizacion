export interface GenerationInput {
  ideaCentral: string
  courseId?: string
}

export interface PipelineProgress {
  state: string
  message: string
  progress: number
  artifactId?: string
}

export interface GenerationResult {
  success: boolean
  artifactId: string
  state: string
  error?: string
}

export const PIPELINE_STATES = {
  DRAFT: { label: 'Borrador', progress: 0 },
  GENERATING: { label: 'Generando con IA...', progress: 30 },
  VALIDATING: { label: 'Validando estructura...', progress: 60 },
  READY_FOR_QA: { label: 'Listo para revisión', progress: 100 },
  APPROVED: { label: 'Aprobado', progress: 100 },
  REJECTED: { label: 'Rechazado', progress: 100 },
  ESCALATED: { label: 'Requiere intervención', progress: 100 },
} as const
