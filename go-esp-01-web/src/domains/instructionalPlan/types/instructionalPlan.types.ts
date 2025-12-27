// GO-ESP-03: Tipos para Plan Instruccional

export type Esp03StepState =
  | 'STEP_DRAFT'
  | 'STEP_GENERATING'
  | 'STEP_VALIDATING'
  | 'STEP_READY_FOR_REVIEW'
  | 'STEP_APPROVED'
  | 'STEP_WITH_BLOCKERS'
  | 'STEP_ESCALATED'

export type Esp03FinalStatus = 'APPROVED_PHASE_1' | 'WITH_BLOCKERS'

export type PlanComponentType =
  | 'DIALOGUE'
  | 'READING'
  | 'QUIZ'
  | 'DEMO_GUIDE'
  | 'EXERCISE'
  | 'RESOURCE'

export interface PlanComponent {
  type: PlanComponentType
  summary: string
  notes?: string
}

export interface LessonPlan {
  lesson_id: string
  lesson_title: string
  module_title: string
  oa_text: string
  oa_bloom_verb?: string
  measurable_criteria?: string
  components: PlanComponent[]
  alignment_notes?: string
}

export interface Blocker {
  id: string
  lesson_id?: string
  title: string
  description: string
  impact: 'LOW' | 'MEDIUM' | 'HIGH'
  owner: string
  status: 'OPEN' | 'RESOLVED' | 'WONT_FIX'
  created_at: string
}

export interface DodCheck {
  code: 'DOD_A' | 'DOD_B' | 'DOD_C' | 'DOD_D'
  label: string
  pass: boolean
  evidence?: string
  notes?: string
}

export interface ValidationCheck {
  code: string
  pass: boolean
  message: string
  severity: 'error' | 'warning'
}

export interface Esp03PlanPayload {
  source: {
    temario_version_id?: string
    artifact_id: string
  }
  lesson_plans: LessonPlan[]
  blockers: Blocker[]
  dod: {
    checklist: DodCheck[]
    automatic_checks: ValidationCheck[]
    semantic_checks: ValidationCheck[]
  }
  iteration_count: number
  final_status?: Esp03FinalStatus
  approvals: {
    architect_status: 'PENDING' | 'APPROVED' | 'WITH_BLOCKERS'
    reviewed_by?: string
    reviewed_at?: string
    notes?: string
  }
  state: Esp03StepState
}

export interface Esp03GenerationInput {
  artifactId: string
}

export interface Esp03GenerationResult {
  success: boolean
  state: Esp03StepState
  error?: string
}

// Input para la API
export interface LessonInput {
  id: string
  title: string
  objective_specific: string
  module_title: string
}

export interface InstructionalPlanApiInput {
  lessons: LessonInput[]
  ideaCentral: string
  courseName: string
}

// Output de la API
export interface InstructionalPlanApiOutput {
  lesson_plans: LessonPlan[]
  blockers: Blocker[]
}
