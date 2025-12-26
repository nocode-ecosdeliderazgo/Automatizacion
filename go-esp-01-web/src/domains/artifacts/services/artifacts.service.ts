import type { Artifact, ArtifactFilters } from '../types/artifact.types'

// Mock data for development without Supabase
const mockArtifacts: Artifact[] = [
  {
    id: '1',
    run_id: 'run-001',
    course_id: 'course-001',
    idea_central: 'Liderazgo transformacional en tiempos de cambio',
    nombres: ['Liderazgo Transformacional', 'Liderar el Cambio', 'Transformación Organizacional'],
    objetivos: [
      'Comprender los principios del liderazgo transformacional',
      'Aplicar técnicas de gestión del cambio',
      'Desarrollar habilidades de comunicación efectiva'
    ],
    descripcion: {
      texto: 'Curso enfocado en desarrollar habilidades de liderazgo para gestionar el cambio organizacional.',
      publico_objetivo: 'Gerentes y líderes de equipo',
      beneficios: 'Mejora en la gestión de equipos y adaptación al cambio',
      estructura_general: '4 módulos con ejercicios prácticos',
      diferenciador: 'Enfoque práctico con casos reales'
    },
    state: 'APPROVED',
    validation_report: { all_passed: true, results: [] },
    semantic_result: { passed: true, confidence: 0.95, rationale: 'Cumple con todos los criterios' },
    auto_retry_count: 0,
    iteration_count: 1,
    generation_metadata: {},
    created_by: null,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: '2',
    run_id: 'run-002',
    course_id: 'course-002',
    idea_central: 'Comunicación efectiva para equipos remotos',
    nombres: ['Comunicación Remota', 'Equipos Conectados', 'Comunicación Digital'],
    objetivos: [
      'Dominar herramientas de comunicación digital',
      'Establecer rutinas de comunicación efectivas',
      'Resolver conflictos en entornos virtuales'
    ],
    descripcion: {
      texto: 'Aprende a comunicarte efectivamente en equipos distribuidos.',
      publico_objetivo: 'Equipos de trabajo remoto',
      beneficios: 'Mejor colaboración y productividad',
      estructura_general: '3 módulos interactivos',
      diferenciador: 'Simulaciones de situaciones reales'
    },
    state: 'READY_FOR_QA',
    validation_report: { all_passed: true, results: [] },
    semantic_result: null,
    auto_retry_count: 0,
    iteration_count: 1,
    generation_metadata: {},
    created_by: null,
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: '3',
    run_id: 'run-003',
    course_id: 'course-003',
    idea_central: 'Inteligencia emocional en el trabajo',
    nombres: ['IE Laboral', 'Emociones en el Trabajo', 'Liderazgo Emocional'],
    objetivos: [
      'Identificar y gestionar emociones propias',
      'Desarrollar empatía con el equipo',
      'Manejar situaciones de estrés'
    ],
    descripcion: {
      texto: 'Desarrolla tu inteligencia emocional para mejorar relaciones laborales.',
      publico_objetivo: 'Profesionales de todos los niveles',
      beneficios: 'Mejor clima laboral y bienestar',
      estructura_general: '5 módulos con autoevaluaciones',
      diferenciador: 'Basado en investigación científica'
    },
    state: 'GENERATING',
    validation_report: null,
    semantic_result: null,
    auto_retry_count: 0,
    iteration_count: 0,
    generation_metadata: {},
    created_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
]

// In-memory storage for mock data
let artifacts = [...mockArtifacts]

export const artifactsService = {
  async list(filters?: ArtifactFilters): Promise<Artifact[]> {
    let result = [...artifacts]

    if (filters?.state) {
      result = result.filter(a => a.state === filters.state)
    }

    if (filters?.search) {
      const search = filters.search.toLowerCase()
      result = result.filter(a =>
        a.idea_central.toLowerCase().includes(search)
      )
    }

    return result.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  },

  async getById(id: string): Promise<Artifact | null> {
    return artifacts.find(a => a.id === id) || null
  },

  async getHistory(artifactId: string) {
    // Mock pipeline events
    return [
      {
        id: '1',
        artifact_id: artifactId,
        event_type: 'CREATED',
        event_data: { message: 'Artefacto creado' },
        created_at: new Date(Date.now() - 7200000).toISOString()
      },
      {
        id: '2',
        artifact_id: artifactId,
        event_type: 'GENERATION_STARTED',
        event_data: { message: 'Generación iniciada' },
        created_at: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: '3',
        artifact_id: artifactId,
        event_type: 'GENERATION_COMPLETED',
        event_data: { message: 'Generación completada' },
        created_at: new Date(Date.now() - 1800000).toISOString()
      }
    ]
  },

  async delete(id: string): Promise<void> {
    artifacts = artifacts.filter(a => a.id !== id)
  },

  async getStats() {
    const stats = {
      total: artifacts.length,
      draft: 0,
      generating: 0,
      pending_qa: 0,
      approved: 0,
      rejected: 0,
      escalated: 0
    }

    artifacts.forEach(artifact => {
      switch (artifact.state) {
        case 'DRAFT':
          stats.draft++
          break
        case 'GENERATING':
        case 'VALIDATING':
          stats.generating++
          break
        case 'READY_FOR_QA':
          stats.pending_qa++
          break
        case 'APPROVED':
          stats.approved++
          break
        case 'REJECTED':
          stats.rejected++
          break
        case 'ESCALATED':
          stats.escalated++
          break
      }
    })

    return stats
  },

  // Helper to add new artifact (for generation)
  async create(data: Partial<Artifact>): Promise<Artifact> {
    const newArtifact: Artifact = {
      id: String(Date.now()),
      run_id: `run-${Date.now()}`,
      course_id: null,
      idea_central: data.idea_central || '',
      nombres: data.nombres || [],
      objetivos: data.objetivos || [],
      descripcion: data.descripcion || {},
      state: 'DRAFT',
      validation_report: null,
      semantic_result: null,
      auto_retry_count: 0,
      iteration_count: 0,
      generation_metadata: {},
      created_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    artifacts.unshift(newArtifact)
    return newArtifact
  },

  async update(id: string, data: Partial<Artifact>): Promise<Artifact | null> {
    const index = artifacts.findIndex(a => a.id === id)
    if (index === -1) return null

    artifacts[index] = {
      ...artifacts[index],
      ...data,
      updated_at: new Date().toISOString()
    }
    return artifacts[index]
  }
}
