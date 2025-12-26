import type { GenerationInput, GenerationResult } from '../types/generation.types'
import { artifactsService } from '@/domains/artifacts/services/artifacts.service'

export const generationService = {
  async startGeneration(input: GenerationInput): Promise<GenerationResult> {
    // Create artifact in GENERATING state
    const artifact = await artifactsService.create({
      idea_central: input.ideaCentral,
      course_id: input.courseId || null,
      state: 'GENERATING',
    })

    // Simulate pipeline with delays
    setTimeout(async () => {
      try {
        // Simulate generation (2 seconds)
        await artifactsService.update(artifact.id, {
          state: 'VALIDATING',
          nombres: [
            `${input.ideaCentral}: Guía Práctica`,
            `Masterclass: ${input.ideaCentral}`,
            `${input.ideaCentral} para Líderes`
          ],
          objetivos: [
            `Comprender los fundamentos de ${input.ideaCentral.toLowerCase()}`,
            'Aplicar técnicas y metodologías prácticas',
            'Desarrollar habilidades de implementación',
            'Evaluar resultados y mejora continua'
          ],
          descripcion: {
            texto: `Este programa integral está diseñado para profesionales que buscan dominar ${input.ideaCentral.toLowerCase()}. A través de metodologías experienciales y casos de estudio reales, los participantes desarrollarán competencias clave para aplicar estos conceptos en su entorno laboral.`,
            publico_objetivo: 'Profesionales y líderes de equipo',
            beneficios: 'Habilidades prácticas aplicables inmediatamente',
            estructura_general: '4 módulos progresivos con ejercicios',
            diferenciador: 'Enfoque práctico basado en casos reales'
          }
        })

        // Simulate validation (2 more seconds)
        await new Promise(resolve => setTimeout(resolve, 2000))

        await artifactsService.update(artifact.id, {
          state: 'READY_FOR_QA',
          validation_report: {
            all_passed: true,
            results: [
              { code: 'VAL_001', passed: true, message: '3 nombres generados' },
              { code: 'VAL_002', passed: true, message: '4 objetivos en rango' },
              { code: 'VAL_003', passed: true, message: 'Descripción válida' },
              { code: 'VAL_004', passed: true, message: 'Estructura completa' }
            ]
          },
          semantic_result: {
            passed: true,
            confidence: 0.85,
            rationale: 'Objetivos bien formulados con verbos observables'
          }
        })

      } catch (error) {
        console.error('Pipeline error:', error)
        await artifactsService.update(artifact.id, { state: 'ESCALATED' })
      }
    }, 3000)

    return {
      success: true,
      artifactId: artifact.id,
      state: 'GENERATING'
    }
  },

  async invokeEdgeFunction(artifactId: string): Promise<void> {
    // Mock - do nothing in dev mode
    console.log('Mock: invokeEdgeFunction called for', artifactId)
  }
}
