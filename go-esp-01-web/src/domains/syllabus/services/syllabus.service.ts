// GO-ESP-02: Servicio de Syllabus (Mock)

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

// Estado en memoria para mocks (global para persistir entre renders)
const temarioStore = new Map<string, TemarioEsp02 & { state: Esp02StepState; iteration_count: number }>()

// Generar UUID simple
const generateId = () => Math.random().toString(36).substring(2, 11)

// Generar temario mock basado en objetivos
function generateMockTemario(
  objetivos: string[],
  ideaCentral: string
): SyllabusModule[] {
  return objetivos.map((objetivo, index) => {
    const moduleNum = index + 1
    const lessonsCount = Math.floor(Math.random() * 4) + 3 // 3-6 lecciones

    const lessons = Array.from({ length: lessonsCount }, (_, lessonIndex) => ({
      id: generateId(),
      title: `Leccion ${moduleNum}.${lessonIndex + 1}: ${getRandomLessonTitle(objetivo)}`,
      objective_specific: generateSpecificObjective(objetivo)
    }))

    return {
      id: generateId(),
      objective_general_ref: objetivo,
      title: `Modulo ${moduleNum}: ${extractModuleTitle(objetivo)}`,
      lessons
    }
  })
}

function getRandomLessonTitle(objetivo: string): string {
  const templates = [
    'Fundamentos y conceptos clave',
    'Aplicacion practica',
    'Herramientas y tecnicas',
    'Casos de estudio',
    'Ejercicios de consolidacion',
    'Evaluacion y retroalimentacion'
  ]
  return templates[Math.floor(Math.random() * templates.length)]
}

function extractModuleTitle(objetivo: string): string {
  const words = objetivo.split(' ')
  const skipWords = ['comprender', 'aplicar', 'desarrollar', 'identificar', 'analizar']
  const start = skipWords.includes(words[0].toLowerCase()) ? 1 : 0
  return words.slice(start, start + 4).join(' ')
}

function generateSpecificObjective(objetivoGeneral: string): string {
  const verbs = ['Identificar', 'Describir', 'Explicar', 'Aplicar', 'Analizar', 'Demostrar', 'Evaluar']
  const verb = verbs[Math.floor(Math.random() * verbs.length)]
  const context = objetivoGeneral.toLowerCase().split(' ').slice(1, 5).join(' ')
  return `${verb} los elementos clave de ${context} mediante ejercicios practicos y casos de estudio.`
}

// Simulacion de pipeline con estados progresivos
async function simulatePipeline(artifactId: string, objetivos: string[], ideaCentral: string, route: Esp02Route) {
  const stored = temarioStore.get(artifactId)
  if (!stored) return

  // Paso 1: Generar (despues de 2 segundos)
  await new Promise(resolve => setTimeout(resolve, 2000))

  const modules = generateMockTemario(objetivos, ideaCentral)
  stored.modules = modules
  stored.state = 'STEP_VALIDATING'
  temarioStore.set(artifactId, { ...stored })

  // Paso 2: Validar (despues de 1.5 segundos)
  await new Promise(resolve => setTimeout(resolve, 1500))

  const validation = runAllValidations(modules, objetivos)
  stored.validation = validation
  stored.state = validation.automatic_pass ? 'STEP_READY_FOR_QA' : 'STEP_ESCALATED'
  temarioStore.set(artifactId, { ...stored })
}

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
    simulatePipeline(artifactId, objetivos, artifact.idea_central, route)

    return {
      success: true,
      state: 'STEP_GENERATING'
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
    simulatePipeline(artifactId, objetivos, artifact.idea_central, temario.route)

    return { success: true, state: 'STEP_GENERATING' }
  },

  clearStore(): void {
    temarioStore.clear()
  }
}
