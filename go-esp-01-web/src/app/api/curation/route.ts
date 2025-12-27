// API Route para generacion ESP-04: Curaduria de Fuentes (server-side)
import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const MAX_RETRIES = 3

interface RequiredComponent {
  lesson_id: string
  lesson_title: string
  component: string
  is_critical: boolean
}

interface CandidateSource {
  title: string
  url: string
  rationale: string
}

interface ComponentSources {
  component_name: string
  is_critical: boolean
  candidate_sources: CandidateSource[]
}

interface LessonSources {
  lesson_id: string
  lesson_title: string
  components: ComponentSources[]
}

interface CurationApiOutput {
  sources_by_lesson: LessonSources[]
}

export async function POST(request: NextRequest) {
  try {
    const { components, courseName, ideaCentral, attemptNumber, gaps } = await request.json()

    if (!components || !Array.isArray(components) || components.length === 0) {
      return NextResponse.json(
        { error: 'Se requiere un array de componentes' },
        { status: 400 }
      )
    }

    const apiKey = process.env.GOOGLE_API_KEY

    if (!apiKey) {
      console.error('[API/ESP-04] GOOGLE_API_KEY no configurada')
      return NextResponse.json(
        { error: 'API key no configurada' },
        { status: 500 }
      )
    }

    console.log('[API/ESP-04] Generando fuentes con Gemini...')
    console.log('[API/ESP-04] Componentes:', components.length)
    console.log('[API/ESP-04] Intento:', attemptNumber || 1)

    const genAI = new GoogleGenerativeAI(apiKey)
    const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash'
    const model = genAI.getGenerativeModel({ model: modelName })

    // Generar fuentes
    let content = await generateSources(model, components, courseName, ideaCentral, attemptNumber, gaps)
    console.log('[API/ESP-04] Fuentes generadas para', content.sources_by_lesson?.length, 'lecciones')

    // Validar que todas las lecciones tienen fuentes
    const validation = validateOutput(content, components)

    if (!validation.passed) {
      console.log('[API/ESP-04] Validacion fallo, reintentando lecciones faltantes...')
      content = await retryMissingSources(model, content, components, courseName, ideaCentral)
    }

    console.log('[API/ESP-04] Generado exitosamente')
    return NextResponse.json(content)

  } catch (error: any) {
    console.error('[API/ESP-04] Error:', error.message)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

async function generateSources(
  model: any,
  components: RequiredComponent[],
  courseName: string,
  ideaCentral: string,
  attemptNumber?: number,
  gaps?: string[]
): Promise<CurationApiOutput> {
  // Agrupar componentes por leccion
  const lessonMap = new Map<string, RequiredComponent[]>()
  for (const comp of components) {
    const existing = lessonMap.get(comp.lesson_id) || []
    existing.push(comp)
    lessonMap.set(comp.lesson_id, existing)
  }

  const lessonsText = Array.from(lessonMap.entries()).map(([lessonId, comps]) => {
    const lesson = comps[0]
    const componentsList = comps.map(c =>
      `  - ${c.component}${c.is_critical ? ' (CRITICO)' : ''}`
    ).join('\n')
    return `Leccion: ${lesson.lesson_title} (ID: ${lessonId})\nComponentes:\n${componentsList}`
  }).join('\n\n')

  let gapsContext = ''
  if (attemptNumber === 2 && gaps && gaps.length > 0) {
    gapsContext = `

**INTENTO 2 - ITERACION DIRIGIDA**
En el intento anterior, los siguientes componentes quedaron sin fuentes adecuadas:
${gaps.join('\n')}

Por favor, enfocate especialmente en encontrar fuentes de calidad para estos componentes.`
  }

  const prompt = `Eres un experto en curaduria de contenido educativo. Para cada componente de cada leccion, sugiere 2-3 fuentes candidatas de alta calidad.

**CURSO:** ${courseName}
**IDEA CENTRAL:** ${ideaCentral}

**LECCIONES Y COMPONENTES A CUBRIR:**
${lessonsText}
${gapsContext}

**TIPOS DE FUENTES RECOMENDADAS:**
- DIALOGUE: Articulos, videos, podcasts sobre el tema
- READING: Libros, papers, guias, documentacion oficial
- QUIZ: Bancos de preguntas, ejercicios de evaluacion
- DEMO_GUIDE: Tutoriales paso a paso, videos demostrativos
- EXERCISE: Ejercicios practicos, casos de estudio

**REGLAS:**
1. Sugiere fuentes REALES y verificables cuando sea posible
2. Para cada fuente, incluye una breve justificacion de por que es relevante
3. Prioriza fuentes en espanol cuando existan
4. Para componentes CRITICOS, sugiere al menos 3 fuentes de alta calidad
5. Incluye variedad: libros, articulos web, videos, recursos interactivos

**FORMATO JSON (sin markdown, solo JSON):**
{
  "sources_by_lesson": [
    {
      "lesson_id": "ID exacto de la leccion",
      "lesson_title": "Titulo de la leccion",
      "components": [
        {
          "component_name": "DIALOGUE",
          "is_critical": true,
          "candidate_sources": [
            {
              "title": "Nombre del recurso",
              "url": "URL o referencia",
              "rationale": "Por que esta fuente es relevante para este componente"
            }
          ]
        }
      ]
    }
  ]
}

Responde SOLO con JSON valido.`

  const result = await model.generateContent(prompt)
  const response = result.response.text()
  const cleanJson = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  return JSON.parse(cleanJson)
}

async function retryMissingSources(
  model: any,
  currentOutput: CurationApiOutput,
  allComponents: RequiredComponent[],
  courseName: string,
  ideaCentral: string
): Promise<CurationApiOutput> {
  // Encontrar componentes sin fuentes
  const coveredComponents = new Set<string>()
  for (const lesson of currentOutput.sources_by_lesson || []) {
    for (const comp of lesson.components || []) {
      if (comp.candidate_sources && comp.candidate_sources.length > 0) {
        coveredComponents.add(`${lesson.lesson_id}:${comp.component_name}`)
      }
    }
  }

  const missingComponents = allComponents.filter(
    c => !coveredComponents.has(`${c.lesson_id}:${c.component}`)
  )

  if (missingComponents.length === 0) return currentOutput

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    console.log(`[API/ESP-04] Reintento ${attempt}/${MAX_RETRIES} para ${missingComponents.length} componentes faltantes`)

    const prompt = `Faltan fuentes para los siguientes componentes:

${missingComponents.map(c => `- Leccion "${c.lesson_title}", Componente: ${c.component}${c.is_critical ? ' (CRITICO)' : ''}`).join('\n')}

Curso: ${courseName}
Idea central: ${ideaCentral}

Genera fuentes SOLO para estos componentes faltantes:

{
  "sources_by_lesson": [
    {
      "lesson_id": "id",
      "lesson_title": "titulo",
      "components": [
        {
          "component_name": "TIPO",
          "is_critical": false,
          "candidate_sources": [
            {"title": "...", "url": "...", "rationale": "..."}
          ]
        }
      ]
    }
  ]
}

Responde SOLO con JSON valido.`

    try {
      const result = await model.generateContent(prompt)
      const response = result.response.text()
      const cleanJson = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const newSources = JSON.parse(cleanJson) as CurationApiOutput

      // Merge con output existente
      for (const newLesson of newSources.sources_by_lesson || []) {
        const existingLesson = currentOutput.sources_by_lesson.find(
          l => l.lesson_id === newLesson.lesson_id
        )
        if (existingLesson) {
          for (const newComp of newLesson.components || []) {
            const existingComp = existingLesson.components.find(
              c => c.component_name === newComp.component_name
            )
            if (existingComp) {
              existingComp.candidate_sources = [
                ...(existingComp.candidate_sources || []),
                ...(newComp.candidate_sources || [])
              ]
            } else {
              existingLesson.components.push(newComp)
            }
          }
        } else {
          currentOutput.sources_by_lesson.push(newLesson)
        }
      }

      // Verificar si ya estan todos
      const stillMissing = missingComponents.filter(c => {
        const lesson = currentOutput.sources_by_lesson.find(l => l.lesson_id === c.lesson_id)
        if (!lesson) return true
        const comp = lesson.components.find(co => co.component_name === c.component)
        return !comp || !comp.candidate_sources || comp.candidate_sources.length === 0
      })

      if (stillMissing.length === 0) {
        console.log(`[API/ESP-04] Componentes completados en intento ${attempt}`)
        return currentOutput
      }
    } catch (e) {
      console.error(`[API/ESP-04] Error en reintento ${attempt}:`, e)
    }
  }

  return currentOutput
}

function validateOutput(output: CurationApiOutput, components: RequiredComponent[]): { passed: boolean; missing: string[] } {
  const missing: string[] = []

  for (const comp of components) {
    const lesson = output.sources_by_lesson?.find(l => l.lesson_id === comp.lesson_id)
    if (!lesson) {
      missing.push(`${comp.lesson_title}: ${comp.component}`)
      continue
    }
    const component = lesson.components?.find(c => c.component_name === comp.component)
    if (!component || !component.candidate_sources || component.candidate_sources.length === 0) {
      missing.push(`${comp.lesson_title}: ${comp.component}`)
    }
  }

  return { passed: missing.length === 0, missing }
}
