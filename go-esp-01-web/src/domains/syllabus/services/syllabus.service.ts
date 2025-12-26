// GO-ESP-02: Servicio de Syllabus con Gemini AI via API

import type {
  Esp02Route,
  Esp02StepState,
  TemarioEsp02,
  SyllabusModule,
  Esp02GenerationInput,
  Esp02GenerationResult
} from '../types/syllabus.types'
import { runAllValidations } from '../validators/syllabus.validators'
import { artifactsService } from '@/domains/artifacts/services/artifacts.service'

// Estado en memoria para desarrollo (global para persistir entre renders)
const temarioStore = new Map<string, TemarioEsp02 & { state: Esp02StepState; iteration_count: number }>()

// Generar UUID simple
const generateId = () => Math.random().toString(36).substring(2, 11)

export const syllabusService = {
  async startGeneration(input: Esp02GenerationInput): Promise<Esp02GenerationResult> {
    const { artifactId, route } = input

    // Obtener artefacto del Paso 1
    const artifact = await artifactsService.getById(artifactId)
    if (!artifact) {
      return { success: false, state: 'STEP_DRAFT', error: 'Artefacto no encontrado' }
    }

    if (artifact.state !== 'APPROVED') {
      return { success: false, state: 'STEP_DRAFT', error: 'El Paso 1 debe estar aprobado' }
    }

    const objetivos = artifact.objetivos as string[]
    if (!objetivos || objetivos.length < 3) {
      return { success: false, state: 'STEP_DRAFT', error: 'Se requieren al menos 3 objetivos generales' }
    }

    // Crear temario inicial en estado GENERATING
    const temarioData: TemarioEsp02 & { state: Esp02StepState; iteration_count: number } = {
      route,
      modules: [],
      validation: { automatic_pass: false, checks: [] },
      qa: { status: 'PENDING' },
      state: 'STEP_GENERATING',
      iteration_count: 0
    }

    temarioStore.set(artifactId, temarioData)

    // Iniciar pipeline en background (no bloqueante)
    this.runPipeline(artifactId, objetivos, artifact.idea_central, route)

    return {
      success: true,
      state: 'STEP_GENERATING'
    }
  },

  async runPipeline(
    artifactId: string,
    objetivos: string[],
    ideaCentral: string,
    route: Esp02Route
  ): Promise<void> {
    const stored = temarioStore.get(artifactId)
    if (!stored) return

    try {
      console.log(`[ESP-02] Iniciando generacion de temario`)
      console.log(`[ESP-02] Ruta: ${route}`)
      console.log(`[ESP-02] Objetivos: ${objetivos.length}`)

      // Paso 1: Generar temario via API (server-side con Gemini)
      const response = await fetch('/api/syllabus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ objetivos, ideaCentral, route })
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const content = await response.json()
      console.log(`[ESP-02] Módulos generados: ${content.modules?.length}`)

      // Convertir a formato con IDs
      const modules: SyllabusModule[] = content.modules.map((mod: any) => ({
        id: generateId(),
        objective_general_ref: mod.objective_general_ref,
        title: mod.title,
        lessons: mod.lessons.map((lesson: any) => ({
          id: generateId(),
          title: lesson.title,
          objective_specific: lesson.objective_specific
        }))
      }))

      stored.modules = modules
      stored.state = 'STEP_VALIDATING'
      temarioStore.set(artifactId, { ...stored })
      console.log('[ESP-02] Estado: STEP_VALIDATING')

      // Paso 2: Validar temario
      const validation = runAllValidations(modules, objetivos)
      stored.validation = validation
      stored.state = validation.automatic_pass ? 'STEP_READY_FOR_QA' : 'STEP_ESCALATED'
      temarioStore.set(artifactId, { ...stored })

      console.log(`[ESP-02] Validacion: ${validation.automatic_pass ? 'PASSED' : 'FAILED'}`)
      console.log(`[ESP-02] Estado final: ${stored.state}`)

    } catch (error) {
      console.error('[ESP-02] Error en pipeline:', error)
      stored.state = 'STEP_ESCALATED'
      temarioStore.set(artifactId, { ...stored })
    }
  },

  async getTemario(artifactId: string): Promise<(TemarioEsp02 & { state: Esp02StepState; iteration_count: number }) | null> {
    return temarioStore.get(artifactId) || null
  },

  async getState(artifactId: string): Promise<Esp02StepState> {
    const temario = temarioStore.get(artifactId)
    return temario?.state || 'STEP_DRAFT'
  },

  async submitToQa(artifactId: string): Promise<void> {
    const temario = temarioStore.get(artifactId)
    if (temario && temario.validation.automatic_pass) {
      temario.state = 'STEP_READY_FOR_QA'
      temarioStore.set(artifactId, temario)
    }
  },

  async applyQaDecision(
    artifactId: string,
    decision: 'APPROVED' | 'REJECTED',
    notes?: string,
    reviewerId?: string
  ): Promise<void> {
    const temario = temarioStore.get(artifactId)
    if (!temario) return

    temario.qa = {
      status: decision,
      reviewed_by: reviewerId || 'qa-user',
      reviewed_at: new Date().toISOString(),
      notes
    }

    temario.state = decision === 'APPROVED' ? 'STEP_APPROVED' : 'STEP_REJECTED'
    temarioStore.set(artifactId, temario)
  },

  async regenerate(artifactId: string): Promise<Esp02GenerationResult> {
    const temario = temarioStore.get(artifactId)
    if (!temario) {
      return { success: false, state: 'STEP_DRAFT', error: 'Temario no encontrado' }
    }

    if (temario.iteration_count >= 2) {
      temario.state = 'STEP_ESCALATED'
      temarioStore.set(artifactId, temario)
      return { success: false, state: 'STEP_ESCALATED', error: 'Maximo de iteraciones alcanzado' }
    }

    const artifact = await artifactsService.getById(artifactId)
    if (!artifact) {
      return { success: false, state: 'STEP_DRAFT', error: 'Artefacto no encontrado' }
    }

    temario.iteration_count++
    temario.state = 'STEP_GENERATING'
    temario.modules = []
    temarioStore.set(artifactId, temario)

    const objetivos = artifact.objetivos as string[]
    this.runPipeline(artifactId, objetivos, artifact.idea_central, temario.route)

    return { success: true, state: 'STEP_GENERATING' }
  },

  clearStore(): void {
    temarioStore.clear()
  }
}
