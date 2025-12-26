import { createClient } from '@/shared/lib/supabase/client'
import type { GenerationInput, GenerationResult } from '../types/generation.types'
import type { ArtifactState } from '@/shared/types/database.types'

export const generationService = {
  async startGeneration(input: GenerationInput): Promise<GenerationResult> {
    const supabase = createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      throw new Error('Usuario no autenticado')
    }

    // Create artifact in GENERATING state
    const { data: artifact, error: insertError } = await supabase
      .from('artifacts')
      .insert({
        idea_central: input.ideaCentral,
        course_id: input.courseId || null,
        state: 'GENERATING' as ArtifactState,
        created_by: user.id,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Insert error:', insertError)
      throw new Error(insertError.message)
    }

    // For now, simulate pipeline by updating state after a delay
    // In production, this would invoke a Supabase Edge Function
    setTimeout(async () => {
      try {
        // Simulate generation
        await supabase
          .from('artifacts')
          .update({
            state: 'VALIDATING' as ArtifactState,
            nombres: [
              'Liderazgo Transformacional: De Gerente a Líder',
              'El Arte del Liderazgo que Inspira',
              'Masterclass en Liderazgo Efectivo'
            ],
            objetivos: [
              'Identificar los componentes clave del liderazgo transformacional',
              'Aplicar técnicas de comunicación efectiva en equipos',
              'Diseñar un plan de desarrollo personal como líder',
              'Demostrar habilidades de coaching para colaboradores'
            ],
            descripcion: {
              texto: 'Este programa está diseñado para gerentes y líderes de equipo que buscan evolucionar de un estilo de gestión tradicional hacia un liderazgo que inspire y transforme. A través de metodologías experienciales y casos de estudio reales, los participantes desarrollarán competencias clave para motivar equipos, gestionar el cambio y crear culturas de alto rendimiento. El curso se estructura en cuatro módulos progresivos que cubren fundamentos del liderazgo, comunicación, desarrollo de equipos y gestión del cambio organizacional.',
              publico_objetivo: 'Gerentes y líderes de equipo',
              beneficios: 'Habilidades de comunicación y coaching',
              estructura_general: '4 módulos progresivos',
              diferenciador: 'Enfoque basado en neurociencia'
            }
          })
          .eq('id', artifact.id)

        // Simulate validation complete
        await new Promise(resolve => setTimeout(resolve, 2000))

        await supabase
          .from('artifacts')
          .update({
            state: 'READY_FOR_QA' as ArtifactState,
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
          .eq('id', artifact.id)

      } catch (error) {
        console.error('Pipeline error:', error)
        await supabase
          .from('artifacts')
          .update({ state: 'ESCALATED' as ArtifactState })
          .eq('id', artifact.id)
      }
    }, 3000)

    return {
      success: true,
      artifactId: artifact.id,
      state: 'GENERATING'
    }
  },

  async invokeEdgeFunction(artifactId: string): Promise<void> {
    const supabase = createClient()

    const { error } = await supabase.functions.invoke('generate-artifact', {
      body: { artifactId }
    })

    if (error) {
      throw error
    }
  }
}
