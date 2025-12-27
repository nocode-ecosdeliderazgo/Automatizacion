// GO-ESP-03: Servicio de Plan Instruccional

import type {
  Esp03StepState,
  Esp03PlanPayload,
  Esp03GenerationResult,
  LessonPlan,
  Blocker,
  LessonInput
} from '../types/instructionalPlan.types'
import { runAllValidations, generateDodChecklist } from '../validators/instructionalPlan.validators'
import { artifactsService } from '@/domains/artifacts/services/artifacts.service'
import { syllabusService } from '@/domains/syllabus/services/syllabus.service'

// Estado en memoria para desarrollo
const planStore = new Map<string, Esp03PlanPayload>()

const generateId = () => Math.random().toString(36).substring(2, 11)

export const instructionalPlanService = {
  async startGeneration(artifactId: string): Promise<Esp03GenerationResult> {
    // Verificar que ESP-02 esté aprobado
    const temario = await syllabusService.getTemario(artifactId)
    if (!temario) {
      return { success: false, state: 'STEP_DRAFT', error: 'Temario no encontrado' }
    }

    if (temario.state !== 'STEP_APPROVED') {
      return { success: false, state: 'STEP_DRAFT', error: 'El Paso 2 debe estar aprobado' }
    }

    // Obtener artefacto para datos adicionales
    const artifact = await artifactsService.getById(artifactId)
    if (!artifact) {
      return { success: false, state: 'STEP_DRAFT', error: 'Artefacto no encontrado' }
    }

    // Crear payload inicial
    const payload: Esp03PlanPayload = {
      source: { artifact_id: artifactId },
      lesson_plans: [],
      blockers: [],
      dod: {
        checklist: [],
        automatic_checks: [],
        semantic_checks: []
      },
      iteration_count: 0,
      approvals: { architect_status: 'PENDING' },
      state: 'STEP_GENERATING'
    }

    planStore.set(artifactId, payload)

    // Iniciar pipeline
    this.runPipeline(artifactId, temario.modules, artifact.idea_central, (artifact.nombres as string[])?.[0] || artifact.idea_central)

    return { success: true, state: 'STEP_GENERATING' }
  },

  async runPipeline(
    artifactId: string,
    modules: any[],
    ideaCentral: string,
    courseName: string
  ): Promise<void> {
    const stored = planStore.get(artifactId)
    if (!stored) return

    try {
      console.log('[ESP-03] Iniciando generación de plan instruccional')

      // Preparar lecciones para la API
      const lessons: LessonInput[] = []
      for (const mod of modules) {
        for (const lesson of mod.lessons || []) {
          lessons.push({
            id: lesson.id,
            title: lesson.title,
            objective_specific: lesson.objective_specific,
            module_title: mod.title
          })
        }
      }

      console.log(`[ESP-03] Lecciones a procesar: ${lessons.length}`)

      // Llamar a la API
      const response = await fetch('/api/instructional-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessons, ideaCentral, courseName })
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const content = await response.json()
      console.log(`[ESP-03] Planes generados: ${content.lesson_plans?.length}`)

      // Actualizar payload
      stored.lesson_plans = content.lesson_plans || []
      stored.blockers = content.blockers || []
      stored.state = 'STEP_VALIDATING'
      planStore.set(artifactId, { ...stored })

      // Ejecutar validaciones
      const lessonIds = lessons.map(l => l.id)
      const validation = runAllValidations(
        stored.lesson_plans,
        lessonIds,
        stored.blockers,
        stored.iteration_count,
        false
      )

      stored.dod.automatic_checks = validation.automaticChecks
      stored.dod.semantic_checks = validation.semanticChecks
      stored.dod.checklist = generateDodChecklist(
        stored.lesson_plans,
        lessonIds,
        stored.blockers,
        false
      )

      // Determinar estado final
      if (validation.allPassed) {
        stored.state = 'STEP_READY_FOR_REVIEW'
      } else if (stored.iteration_count >= 2) {
        stored.state = 'STEP_ESCALATED'
      } else {
        stored.state = 'STEP_READY_FOR_REVIEW' // Permitir revisión con warnings
      }

      planStore.set(artifactId, { ...stored })
      console.log(`[ESP-03] Estado final: ${stored.state}`)

    } catch (error) {
      console.error('[ESP-03] Error en pipeline:', error)
      stored.state = 'STEP_ESCALATED'
      planStore.set(artifactId, { ...stored })
    }
  },

  async getPlan(artifactId: string): Promise<Esp03PlanPayload | null> {
    return planStore.get(artifactId) || null
  },

  async getState(artifactId: string): Promise<Esp03StepState> {
    const plan = planStore.get(artifactId)
    return plan?.state || 'STEP_DRAFT'
  },

  async submitForArchitectReview(artifactId: string): Promise<void> {
    const plan = planStore.get(artifactId)
    if (plan) {
      plan.state = 'STEP_READY_FOR_REVIEW'
      planStore.set(artifactId, plan)
    }
  },

  async applyArchitectDecision(
    artifactId: string,
    decision: 'APPROVED' | 'WITH_BLOCKERS',
    notes?: string,
    newBlockers?: Omit<Blocker, 'id' | 'created_at'>[]
  ): Promise<void> {
    const plan = planStore.get(artifactId)
    if (!plan) return

    // Agregar nuevos bloqueadores si los hay
    if (newBlockers && newBlockers.length > 0) {
      for (const blocker of newBlockers) {
        plan.blockers.push({
          ...blocker,
          id: generateId(),
          created_at: new Date().toISOString()
        })
      }
    }

    plan.approvals = {
      architect_status: decision,
      reviewed_by: 'architect-user',
      reviewed_at: new Date().toISOString(),
      notes
    }

    plan.final_status = decision === 'APPROVED' ? 'APPROVED_PHASE_1' : 'WITH_BLOCKERS'
    plan.state = decision === 'APPROVED' ? 'STEP_APPROVED' : 'STEP_WITH_BLOCKERS'

    // Actualizar DoD_D
    const dodD = plan.dod.checklist.find(c => c.code === 'DOD_D')
    if (dodD) {
      dodD.pass = plan.blockers.length > 0 || decision === 'APPROVED'
      dodD.evidence = plan.blockers.length > 0
        ? `${plan.blockers.length} bloqueador(es)`
        : 'Sin bloqueadores'
    }

    planStore.set(artifactId, plan)
  },

  async addBlocker(artifactId: string, blocker: Omit<Blocker, 'id' | 'created_at'>): Promise<void> {
    const plan = planStore.get(artifactId)
    if (!plan) return

    plan.blockers.push({
      ...blocker,
      id: generateId(),
      created_at: new Date().toISOString()
    })

    planStore.set(artifactId, plan)
  },

  async updateBlocker(artifactId: string, blockerId: string, updates: Partial<Blocker>): Promise<void> {
    const plan = planStore.get(artifactId)
    if (!plan) return

    const blockerIndex = plan.blockers.findIndex(b => b.id === blockerId)
    if (blockerIndex >= 0) {
      plan.blockers[blockerIndex] = { ...plan.blockers[blockerIndex], ...updates }
      planStore.set(artifactId, plan)
    }
  },

  async removeBlocker(artifactId: string, blockerId: string): Promise<void> {
    const plan = planStore.get(artifactId)
    if (!plan) return

    plan.blockers = plan.blockers.filter(b => b.id !== blockerId)
    planStore.set(artifactId, plan)
  },

  async regenerate(artifactId: string): Promise<Esp03GenerationResult> {
    const plan = planStore.get(artifactId)
    if (!plan) {
      return { success: false, state: 'STEP_DRAFT', error: 'Plan no encontrado' }
    }

    if (plan.iteration_count >= 2) {
      plan.state = 'STEP_ESCALATED'
      planStore.set(artifactId, plan)
      return { success: false, state: 'STEP_ESCALATED', error: 'Máximo de iteraciones alcanzado' }
    }

    const temario = await syllabusService.getTemario(artifactId)
    const artifact = await artifactsService.getById(artifactId)

    if (!temario || !artifact) {
      return { success: false, state: 'STEP_DRAFT', error: 'Datos no encontrados' }
    }

    plan.iteration_count++
    plan.state = 'STEP_GENERATING'
    plan.lesson_plans = []
    planStore.set(artifactId, plan)

    this.runPipeline(
      artifactId,
      temario.modules,
      artifact.idea_central,
      (artifact.nombres as string[])?.[0] || artifact.idea_central
    )

    return { success: true, state: 'STEP_GENERATING' }
  },

  async escalate(artifactId: string, reason: string): Promise<void> {
    const plan = planStore.get(artifactId)
    if (plan) {
      plan.state = 'STEP_ESCALATED'
      plan.approvals.notes = reason
      planStore.set(artifactId, plan)
    }
  },

  async markNoBlockers(artifactId: string): Promise<void> {
    const plan = planStore.get(artifactId)
    if (!plan) return

    // Actualizar DoD_D
    const dodD = plan.dod.checklist.find(c => c.code === 'DOD_D')
    if (dodD) {
      dodD.pass = true
      dodD.evidence = 'Sin bloqueadores (confirmado)'
    }

    planStore.set(artifactId, plan)
  },

  clearStore(): void {
    planStore.clear()
  }
}
