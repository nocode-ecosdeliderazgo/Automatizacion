// GO-ESP-04: Servicio de Curaduria de Fuentes

import type {
  Esp04StepState,
  CurationPayload,
  CurationResult,
  CurationRow,
  BitacoraEntry,
  CurationBlocker,
  RequiredComponent,
  LessonSources
} from '../types/curation.types'
import {
  runAllValidations,
  generateDodChecklist,
  detectGaps,
  generateAutoBlockers
} from '../validators/curation.validators'
import { instructionalPlanService } from '@/domains/instructionalPlan/services/instructionalPlan.service'
import { artifactsService } from '@/domains/artifacts/services/artifacts.service'

// Estado en memoria para desarrollo
const curationStore = new Map<string, CurationPayload>()

const generateId = () => Math.random().toString(36).substring(2, 11)

export const curationService = {
  // Iniciar curaduria (desde Paso 3 aprobado)
  async startCuration(artifactId: string): Promise<CurationResult> {
    // Verificar que ESP-03 este aprobado
    const plan = await instructionalPlanService.getPlan(artifactId)
    if (!plan) {
      return { success: false, state: 'PHASE2_DRAFT', error: 'Plan instruccional no encontrado' }
    }

    if (plan.state !== 'STEP_APPROVED') {
      return { success: false, state: 'PHASE2_DRAFT', error: 'El Paso 3 debe estar aprobado' }
    }

    // Obtener artefacto para datos adicionales
    const artifact = await artifactsService.getById(artifactId)
    if (!artifact) {
      return { success: false, state: 'PHASE2_DRAFT', error: 'Artefacto no encontrado' }
    }

    // Crear payload inicial
    const payload: CurationPayload = {
      artifact_id: artifactId,
      attempt_number: 1,
      rows: [],
      bitacora: [],
      blockers: [],
      dod: {
        checklist: [],
        automatic_checks: []
      },
      state: 'PHASE2_GENERATING'
    }

    curationStore.set(artifactId, payload)

    // Iniciar pipeline
    const courseName = (artifact.nombres as string[])?.[0] || artifact.idea_central
    this.runPipeline(artifactId, plan.lesson_plans, artifact.idea_central, courseName)

    return { success: true, state: 'PHASE2_GENERATING' }
  },

  async runPipeline(
    artifactId: string,
    lessonPlans: any[],
    ideaCentral: string,
    courseName: string
  ): Promise<void> {
    const stored = curationStore.get(artifactId)
    if (!stored) return

    try {
      console.log('[ESP-04] Iniciando generacion de fuentes')

      // Preparar componentes requeridos
      const components: RequiredComponent[] = []
      for (const lp of lessonPlans) {
        for (const comp of lp.components || []) {
          components.push({
            lesson_id: lp.lesson_id,
            lesson_title: lp.lesson_title,
            component: comp.type,
            is_critical: comp.type === 'DIALOGUE' || comp.type === 'READING' || comp.type === 'QUIZ'
          })
        }
      }

      console.log(`[ESP-04] Componentes a procesar: ${components.length}`)

      // Llamar a la API
      const response = await fetch('/api/curation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          components,
          courseName,
          ideaCentral,
          attemptNumber: stored.attempt_number
        })
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const content = await response.json()
      console.log(`[ESP-04] Fuentes generadas para ${content.sources_by_lesson?.length} lecciones`)

      // Convertir output de API a filas de curaduria
      const rows: CurationRow[] = []
      for (const lesson of content.sources_by_lesson || []) {
        for (const comp of lesson.components || []) {
          for (const source of comp.candidate_sources || []) {
            rows.push({
              id: generateId(),
              lesson_id: lesson.lesson_id,
              lesson_title: lesson.lesson_title,
              component: comp.component_name,
              is_critical: comp.is_critical,
              source_ref: source.url || source.title,
              source_title: source.title,
              source_rationale: source.rationale,
              apta: null, // Pendiente evaluacion HITL
              cobertura_completa: null,
              notes: ''
            })
          }
        }
      }

      stored.rows = rows
      stored.state = 'PHASE2_GENERATED'
      curationStore.set(artifactId, { ...stored })

      console.log(`[ESP-04] ${rows.length} filas de fuentes creadas`)
      console.log(`[ESP-04] Estado: PHASE2_GENERATED`)

    } catch (error) {
      console.error('[ESP-04] Error en pipeline:', error)
      stored.state = 'PHASE2_BLOCKED'
      curationStore.set(artifactId, { ...stored })
    }
  },

  async getCuration(artifactId: string): Promise<CurationPayload | null> {
    return curationStore.get(artifactId) || null
  },

  async getState(artifactId: string): Promise<Esp04StepState> {
    const curation = curationStore.get(artifactId)
    return curation?.state || 'PHASE2_DRAFT'
  },

  // HITL: Marcar fila como apta/no apta
  async updateRow(
    artifactId: string,
    rowId: string,
    updates: Partial<CurationRow>
  ): Promise<void> {
    const curation = curationStore.get(artifactId)
    if (!curation) return

    const rowIndex = curation.rows.findIndex(r => r.id === rowId)
    if (rowIndex >= 0) {
      curation.rows[rowIndex] = { ...curation.rows[rowIndex], ...updates }

      // Si cambia a HITL_REVIEW cuando empieza a editar
      if (curation.state === 'PHASE2_GENERATED') {
        curation.state = 'PHASE2_HITL_REVIEW'
      }

      curationStore.set(artifactId, curation)
    }
  },

  // HITL: Agregar entrada a bitacora
  async addBitacoraEntry(
    artifactId: string,
    entry: Omit<BitacoraEntry, 'id' | 'created_at'>
  ): Promise<void> {
    const curation = curationStore.get(artifactId)
    if (!curation) return

    curation.bitacora.push({
      ...entry,
      id: generateId(),
      created_at: new Date().toISOString()
    })

    curationStore.set(artifactId, curation)
  },

  // Obtener componentes requeridos del plan
  async getRequiredComponents(artifactId: string): Promise<RequiredComponent[]> {
    const plan = await instructionalPlanService.getPlan(artifactId)
    if (!plan) return []

    const components: RequiredComponent[] = []
    for (const lp of plan.lesson_plans) {
      for (const comp of lp.components || []) {
        components.push({
          lesson_id: lp.lesson_id,
          lesson_title: lp.lesson_title,
          component: comp.type,
          is_critical: comp.type === 'DIALOGUE' || comp.type === 'READING' || comp.type === 'QUIZ'
        })
      }
    }
    return components
  },

  // Ejecutar validaciones y actualizar DoD
  async runValidations(artifactId: string): Promise<{ hasErrors: boolean; canSubmitToQA: boolean }> {
    const curation = curationStore.get(artifactId)
    if (!curation) return { hasErrors: true, canSubmitToQA: false }

    const requiredComponents = await this.getRequiredComponents(artifactId)
    const validation = runAllValidations(curation.rows, requiredComponents, curation.attempt_number)

    curation.dod.automatic_checks = validation.automaticChecks
    curation.dod.checklist = generateDodChecklist(
      curation.rows,
      requiredComponents,
      curation.blockers,
      curation.bitacora.length
    )

    curationStore.set(artifactId, curation)

    return {
      hasErrors: validation.hasErrors,
      canSubmitToQA: !validation.hasErrors || curation.blockers.length > 0
    }
  },

  // Enviar a QA
  async submitToQA(artifactId: string): Promise<CurationResult> {
    const curation = curationStore.get(artifactId)
    if (!curation) {
      return { success: false, state: 'PHASE2_DRAFT', error: 'Curaduria no encontrada' }
    }

    // Ejecutar validaciones finales
    const { canSubmitToQA } = await this.runValidations(artifactId)

    if (!canSubmitToQA) {
      return { success: false, state: curation.state, error: 'Hay errores de validacion sin resolver' }
    }

    curation.state = 'PHASE2_READY_FOR_QA'
    curationStore.set(artifactId, curation)

    return { success: true, state: 'PHASE2_READY_FOR_QA' }
  },

  // Ejecutar Intento 2 (iteracion dirigida)
  async runAttempt2(artifactId: string): Promise<CurationResult> {
    const curation = curationStore.get(artifactId)
    if (!curation) {
      return { success: false, state: 'PHASE2_DRAFT', error: 'Curaduria no encontrada' }
    }

    if (curation.attempt_number >= 2) {
      return { success: false, state: curation.state, error: 'Maximo de intentos alcanzado' }
    }

    const requiredComponents = await this.getRequiredComponents(artifactId)
    const gaps = detectGaps(curation.rows, requiredComponents)

    if (gaps.length === 0) {
      return { success: false, state: curation.state, error: 'No hay gaps que resolver' }
    }

    curation.attempt_number = 2
    curation.state = 'PHASE2_GENERATING'
    curationStore.set(artifactId, curation)

    // Obtener datos para regenerar
    const artifact = await artifactsService.getById(artifactId)
    const plan = await instructionalPlanService.getPlan(artifactId)

    if (!artifact || !plan) {
      curation.state = 'PHASE2_BLOCKED'
      curationStore.set(artifactId, curation)
      return { success: false, state: 'PHASE2_BLOCKED', error: 'Datos no encontrados' }
    }

    // Llamar API con contexto de gaps
    try {
      const response = await fetch('/api/curation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          components: requiredComponents,
          courseName: (artifact.nombres as string[])?.[0] || artifact.idea_central,
          ideaCentral: artifact.idea_central,
          attemptNumber: 2,
          gaps: gaps.map(g => `${g.lesson_title}: ${g.component}`)
        })
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const content = await response.json()

      // Agregar nuevas fuentes
      for (const lesson of content.sources_by_lesson || []) {
        for (const comp of lesson.components || []) {
          for (const source of comp.candidate_sources || []) {
            curation.rows.push({
              id: generateId(),
              lesson_id: lesson.lesson_id,
              lesson_title: lesson.lesson_title,
              component: comp.component_name,
              is_critical: comp.is_critical,
              source_ref: source.url || source.title,
              source_title: source.title,
              source_rationale: source.rationale,
              apta: null,
              cobertura_completa: null,
              notes: '(Intento 2)'
            })
          }
        }
      }

      // Agregar entrada a bitacora
      curation.bitacora.push({
        id: generateId(),
        entry_type: 'NEXT_STEP',
        message: `Intento 2 ejecutado. ${gaps.length} gaps identificados. Nuevas fuentes agregadas.`,
        created_at: new Date().toISOString()
      })

      curation.state = 'PHASE2_HITL_REVIEW'
      curationStore.set(artifactId, curation)

      return { success: true, state: 'PHASE2_HITL_REVIEW' }

    } catch (error: any) {
      curation.state = 'PHASE2_BLOCKED'
      curationStore.set(artifactId, curation)
      return { success: false, state: 'PHASE2_BLOCKED', error: error.message }
    }
  },

  // QA: Aplicar decision
  async applyQADecision(
    artifactId: string,
    decision: 'APPROVED' | 'CORRECTABLE' | 'BLOCKED',
    notes?: string
  ): Promise<void> {
    const curation = curationStore.get(artifactId)
    if (!curation) return

    curation.qa_decision = {
      decision,
      reviewed_by: 'qa-user',
      reviewed_at: new Date().toISOString(),
      notes
    }

    // Transicion de estado segun decision
    switch (decision) {
      case 'APPROVED':
        curation.state = 'PHASE2_APPROVED'
        break
      case 'CORRECTABLE':
        curation.state = 'PHASE2_CORRECTABLE'
        break
      case 'BLOCKED':
        // Generar bloqueadores automaticos si hay gaps
        const requiredComponents = await this.getRequiredComponents(artifactId)
        const gaps = detectGaps(curation.rows, requiredComponents)
        const autoBlockers = generateAutoBlockers(gaps, curation.attempt_number)

        for (const blocker of autoBlockers) {
          curation.blockers.push({
            ...blocker,
            id: generateId(),
            created_at: new Date().toISOString()
          })
        }

        curation.state = 'PHASE2_BLOCKED'
        break
    }

    curationStore.set(artifactId, curation)
  },

  // Agregar bloqueador manual
  async addBlocker(
    artifactId: string,
    blocker: Omit<CurationBlocker, 'id' | 'created_at'>
  ): Promise<void> {
    const curation = curationStore.get(artifactId)
    if (!curation) return

    curation.blockers.push({
      ...blocker,
      id: generateId(),
      created_at: new Date().toISOString()
    })

    curationStore.set(artifactId, curation)
  },

  // Actualizar bloqueador
  async updateBlocker(
    artifactId: string,
    blockerId: string,
    updates: Partial<CurationBlocker>
  ): Promise<void> {
    const curation = curationStore.get(artifactId)
    if (!curation) return

    const blockerIndex = curation.blockers.findIndex(b => b.id === blockerId)
    if (blockerIndex >= 0) {
      curation.blockers[blockerIndex] = { ...curation.blockers[blockerIndex], ...updates }
      curationStore.set(artifactId, curation)
    }
  },

  // Remover bloqueador
  async removeBlocker(artifactId: string, blockerId: string): Promise<void> {
    const curation = curationStore.get(artifactId)
    if (!curation) return

    curation.blockers = curation.blockers.filter(b => b.id !== blockerId)
    curationStore.set(artifactId, curation)
  },

  // Limpiar store (para testing)
  clearStore(): void {
    curationStore.clear()
  }
}
