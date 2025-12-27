// API Route para generacion ESP-03: Plan Instruccional (server-side) con reintentos
import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const MAX_RETRIES = 3
const REQUIRED_COMPONENTS = ['DIALOGUE', 'READING', 'QUIZ']
const BLOOM_VERBS = ['comprender', 'aplicar', 'analizar', 'evaluar', 'crear', 'desarrollar', 'identificar', 'describir', 'diseñar', 'implementar', 'demostrar', 'explicar']

interface LessonInput {
  id: string
  title: string
  objective_specific: string
  module_id: string
  module_title: string
  module_index: number
}

interface PlanComponent {
  type: string
  summary: string
  notes?: string
}

interface LessonPlan {
  lesson_id: string
  lesson_title: string
  module_id: string
  module_title: string
  module_index: number
  oa_text: string
  oa_bloom_verb?: string
  measurable_criteria?: string
  components: PlanComponent[]
  alignment_notes?: string
}

interface GeneratedPlan {
  lesson_plans: LessonPlan[]
  blockers: any[]
}

export async function POST(request: NextRequest) {
  try {
    const { lessons, ideaCentral, courseName } = await request.json()

    if (!lessons || !Array.isArray(lessons) || lessons.length === 0) {
      return NextResponse.json(
        { error: 'Se requiere un array de lecciones' },
        { status: 400 }
      )
    }

    const apiKey = process.env.GOOGLE_API_KEY

    if (!apiKey) {
      console.error('[API/ESP-03] GOOGLE_API_KEY no configurada')
      return NextResponse.json(
        { error: 'API key no configurada' },
        { status: 500 }
      )
    }

    console.log('[API/ESP-03] Generando plan instruccional con Gemini...')
    console.log('[API/ESP-03] Lecciones:', lessons.length)

    const genAI = new GoogleGenerativeAI(apiKey)
    const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash'
    const model = genAI.getGenerativeModel({ model: modelName })

    // Generar plan inicial
    let content = await generateInitialPlan(model, lessons, ideaCentral, courseName)
    console.log('[API/ESP-03] Plan inicial generado:', content.lesson_plans?.length, 'lecciones')

    // Validar y reintentar
    const validation = validatePlan(content, lessons)

    // V01: Todas las lecciones presentes
    if (!validation.v01.passed) {
      console.log('[API/ESP-03] V01 falló - reintentando lecciones faltantes...')
      content = await retryMissingLessons(model, content, lessons, ideaCentral, courseName)
    }

    // V02: OA definido para cada lección
    if (!validation.v02.passed) {
      console.log('[API/ESP-03] V02 falló - reintentando OA...')
      content.lesson_plans = await retryMissingOA(model, content.lesson_plans, ideaCentral)
    }

    // V03: Componentes obligatorios
    if (!validation.v03.passed) {
      console.log('[API/ESP-03] V03 falló - reintentando componentes...')
      content.lesson_plans = await retryMissingComponents(model, content.lesson_plans, ideaCentral)
    }

    // S01: OA operable (verbo Bloom + criterio medible)
    const s01Check = validateSemanticOA(content.lesson_plans)
    if (!s01Check.passed) {
      console.log('[API/ESP-03] S01 falló - mejorando OA...')
      content.lesson_plans = await improveOAOperability(model, content.lesson_plans, ideaCentral)
    }

    // S02: Coherencia OA↔componentes
    const s02Check = validateOAComponentAlignment(content.lesson_plans)
    if (!s02Check.passed) {
      console.log('[API/ESP-03] S02 falló - agregando componentes faltantes...')
      content.lesson_plans = await addMissingDemoGuides(model, content.lesson_plans, ideaCentral)
    }

    // IMPORTANTE: Inyectar module_id, module_title y module_index desde las lecciones originales
    // Esto garantiza que el agrupamiento sea correcto sin depender de la IA
    const lessonLookup = new Map<string, LessonInput>()
    for (const lesson of lessons) {
      lessonLookup.set(lesson.id, lesson)
    }

    content.lesson_plans = content.lesson_plans.map(lp => {
      const originalLesson = lessonLookup.get(lp.lesson_id)
      if (originalLesson) {
        return {
          ...lp,
          module_id: originalLesson.module_id,
          module_title: originalLesson.module_title,
          module_index: originalLesson.module_index
        }
      }
      return lp
    })

    // Ordenar por module_index y luego por lesson_id para consistencia
    content.lesson_plans.sort((a, b) => {
      if (a.module_index !== b.module_index) {
        return a.module_index - b.module_index
      }
      return a.lesson_id.localeCompare(b.lesson_id)
    })

    console.log('[API/ESP-03] Generado exitosamente:', content.lesson_plans?.length, 'planes de lección')
    return NextResponse.json(content)

  } catch (error: any) {
    console.error('[API/ESP-03] Error:', error.message)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

async function generateInitialPlan(
  model: any,
  lessons: LessonInput[],
  ideaCentral: string,
  courseName: string
): Promise<GeneratedPlan> {
  const lessonsText = lessons.map((l, i) =>
    `${i + 1}. ID: ${l.id}\n   Módulo: ${l.module_title}\n   Lección: ${l.title}\n   OA Original: ${l.objective_specific}`
  ).join('\n\n')

  const prompt = `Eres un experto en diseño instruccional. Genera un plan instruccional detallado para cada lección.

**CURSO:** ${courseName}
**IDEA CENTRAL:** ${ideaCentral}

**LECCIONES A PLANIFICAR:**
${lessonsText}

**REGLAS OBLIGATORIAS:**
1. Genera un plan para CADA una de las ${lessons.length} lecciones (sin omitir ninguna)
2. Cada lección DEBE incluir estos 3 componentes obligatorios:
   - DIALOGUE: Descripción del diálogo/conversación instructiva (qué temas se abordarán)
   - READING: Material de lectura planificado (artículos, documentos, recursos)
   - QUIZ: Evaluación/cuestionario (preguntas, tipo de evaluación)
3. Si el OA implica práctica o demostración, agregar:
   - DEMO_GUIDE: Guía de demostración práctica
4. El campo oa_text debe ser el objetivo operacionalizado (verbo Bloom + criterio medible)
5. measurable_criteria debe indicar CÓMO se evaluará el logro del objetivo

**FORMATO JSON (sin markdown, solo JSON):**
{
  "lesson_plans": [
    {
      "lesson_id": "ID exacto de la lección",
      "lesson_title": "Título exacto de la lección",
      "module_title": "Título del módulo",
      "oa_text": "El participante será capaz de [verbo Bloom] [contenido] mediante [método/criterio]",
      "oa_bloom_verb": "Verbo principal (ej: Aplicar, Analizar)",
      "measurable_criteria": "Descripción de cómo se medirá el logro (ej: completar ejercicio con 80% aciertos)",
      "components": [
        {"type": "DIALOGUE", "summary": "Descripción detallada del diálogo instructivo"},
        {"type": "READING", "summary": "Descripción del material de lectura"},
        {"type": "QUIZ", "summary": "Descripción de la evaluación"}
      ],
      "alignment_notes": "Notas sobre cómo el plan se alinea con el OA"
    }
  ],
  "blockers": []
}

Responde SOLO con JSON válido.`

  const result = await model.generateContent(prompt)
  const response = result.response.text()
  const cleanJson = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  return JSON.parse(cleanJson)
}

async function retryMissingLessons(
  model: any,
  currentPlan: GeneratedPlan,
  allLessons: LessonInput[],
  ideaCentral: string,
  courseName: string
): Promise<GeneratedPlan> {
  const existingIds = new Set(currentPlan.lesson_plans.map(lp => lp.lesson_id))
  const missingLessons = allLessons.filter(l => !existingIds.has(l.id))

  if (missingLessons.length === 0) return currentPlan

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    console.log(`[API/ESP-03] Reintento ${attempt}/${MAX_RETRIES} para lecciones faltantes`)

    const prompt = `Faltan ${missingLessons.length} lecciones en el plan instruccional.

Curso: ${courseName}
Idea central: ${ideaCentral}

Genera planes SOLO para estas lecciones faltantes:
${missingLessons.map(l => `- ID: ${l.id}, Título: ${l.title}, OA: ${l.objective_specific}`).join('\n')}

Cada plan debe incluir: DIALOGUE, READING, QUIZ (obligatorios).

Responde con JSON:
{
  "lesson_plans": [
    {
      "lesson_id": "id",
      "lesson_title": "título",
      "module_title": "módulo",
      "oa_text": "objetivo operacionalizado",
      "oa_bloom_verb": "verbo",
      "measurable_criteria": "criterio",
      "components": [
        {"type": "DIALOGUE", "summary": "..."},
        {"type": "READING", "summary": "..."},
        {"type": "QUIZ", "summary": "..."}
      ],
      "alignment_notes": "..."
    }
  ]
}`

    try {
      const result = await model.generateContent(prompt)
      const response = result.response.text()
      const cleanJson = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const newPlans = JSON.parse(cleanJson)

      // Agregar planes faltantes
      if (newPlans.lesson_plans) {
        currentPlan.lesson_plans = [...currentPlan.lesson_plans, ...newPlans.lesson_plans]
      }

      // Verificar
      const newExistingIds = new Set(currentPlan.lesson_plans.map(lp => lp.lesson_id))
      const stillMissing = allLessons.filter(l => !newExistingIds.has(l.id))

      if (stillMissing.length === 0) {
        console.log(`[API/ESP-03] Lecciones completadas en intento ${attempt}`)
        return currentPlan
      }
    } catch (e) {
      console.error(`[API/ESP-03] Error en reintento ${attempt}:`, e)
    }
  }

  return currentPlan
}

async function retryMissingOA(
  model: any,
  lessonPlans: LessonPlan[],
  ideaCentral: string
): Promise<LessonPlan[]> {
  const invalidPlans = lessonPlans.filter(lp => !lp.oa_text || lp.oa_text.length < 20)

  if (invalidPlans.length === 0) return lessonPlans

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    console.log(`[API/ESP-03] Reintento ${attempt}/${MAX_RETRIES} para OA faltantes`)

    const prompt = `Estas lecciones tienen OA incompletos o faltantes:

${invalidPlans.map(lp => `- ${lp.lesson_title}: "${lp.oa_text || 'SIN OA'}"`).join('\n')}

Curso: ${ideaCentral}

Genera OA operacionalizados para cada una:
- Formato: "El participante será capaz de [verbo Bloom] [contenido] mediante [método]"
- Mínimo 50 caracteres
- Incluir criterio medible

Responde con JSON:
{
  "corrections": [
    {
      "lesson_title": "título",
      "oa_text": "objetivo completo",
      "oa_bloom_verb": "verbo",
      "measurable_criteria": "cómo se medirá"
    }
  ]
}`

    try {
      const result = await model.generateContent(prompt)
      const response = result.response.text()
      const cleanJson = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const corrections = JSON.parse(cleanJson)

      for (const correction of corrections.corrections || []) {
        const planIndex = lessonPlans.findIndex(lp => lp.lesson_title === correction.lesson_title)
        if (planIndex >= 0) {
          lessonPlans[planIndex].oa_text = correction.oa_text
          lessonPlans[planIndex].oa_bloom_verb = correction.oa_bloom_verb
          lessonPlans[planIndex].measurable_criteria = correction.measurable_criteria
        }
      }

      const stillInvalid = lessonPlans.filter(lp => !lp.oa_text || lp.oa_text.length < 20)
      if (stillInvalid.length === 0) {
        console.log(`[API/ESP-03] OA corregidos en intento ${attempt}`)
        return lessonPlans
      }
    } catch (e) {
      console.error(`[API/ESP-03] Error en reintento ${attempt}:`, e)
    }
  }

  return lessonPlans
}

async function retryMissingComponents(
  model: any,
  lessonPlans: LessonPlan[],
  ideaCentral: string
): Promise<LessonPlan[]> {
  const invalidPlans = lessonPlans.filter(lp => {
    const types = (lp.components || []).map(c => c.type)
    return !REQUIRED_COMPONENTS.every(req => types.includes(req))
  })

  if (invalidPlans.length === 0) return lessonPlans

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    console.log(`[API/ESP-03] Reintento ${attempt}/${MAX_RETRIES} para componentes faltantes`)

    const lessonsInfo = invalidPlans.map(lp => {
      const existingTypes = (lp.components || []).map(c => c.type)
      const missing = REQUIRED_COMPONENTS.filter(req => !existingTypes.includes(req))
      return `- ${lp.lesson_title}: Falta ${missing.join(', ')}`
    }).join('\n')

    const prompt = `Estas lecciones tienen componentes obligatorios faltantes:

${lessonsInfo}

Curso: ${ideaCentral}

Genera los componentes faltantes para cada lección:
- DIALOGUE: Diálogo instructivo
- READING: Material de lectura
- QUIZ: Evaluación

Responde con JSON:
{
  "corrections": [
    {
      "lesson_title": "título",
      "new_components": [
        {"type": "DIALOGUE", "summary": "descripción detallada"},
        {"type": "READING", "summary": "descripción detallada"},
        {"type": "QUIZ", "summary": "descripción detallada"}
      ]
    }
  ]
}`

    try {
      const result = await model.generateContent(prompt)
      const response = result.response.text()
      const cleanJson = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const corrections = JSON.parse(cleanJson)

      for (const correction of corrections.corrections || []) {
        const planIndex = lessonPlans.findIndex(lp => lp.lesson_title === correction.lesson_title)
        if (planIndex >= 0) {
          const existingTypes = new Set((lessonPlans[planIndex].components || []).map(c => c.type))
          for (const newComp of correction.new_components || []) {
            if (!existingTypes.has(newComp.type)) {
              lessonPlans[planIndex].components = lessonPlans[planIndex].components || []
              lessonPlans[planIndex].components.push(newComp)
            }
          }
        }
      }

      const stillInvalid = lessonPlans.filter(lp => {
        const types = (lp.components || []).map(c => c.type)
        return !REQUIRED_COMPONENTS.every(req => types.includes(req))
      })

      if (stillInvalid.length === 0) {
        console.log(`[API/ESP-03] Componentes corregidos en intento ${attempt}`)
        return lessonPlans
      }
    } catch (e) {
      console.error(`[API/ESP-03] Error en reintento ${attempt}:`, e)
    }
  }

  return lessonPlans
}

function validateSemanticOA(lessonPlans: LessonPlan[]): { passed: boolean; issues: string[] } {
  const issues: string[] = []

  for (const lp of lessonPlans) {
    const oaLower = (lp.oa_text || '').toLowerCase()
    const hasBloomVerb = BLOOM_VERBS.some(verb => oaLower.includes(verb))
    const hasMeasurable = lp.measurable_criteria && lp.measurable_criteria.length > 10

    if (!hasBloomVerb) {
      issues.push(`${lp.lesson_title}: OA sin verbo Bloom`)
    }
    if (!hasMeasurable) {
      issues.push(`${lp.lesson_title}: Sin criterio medible`)
    }
  }

  return { passed: issues.length === 0, issues }
}

async function improveOAOperability(
  model: any,
  lessonPlans: LessonPlan[],
  ideaCentral: string
): Promise<LessonPlan[]> {
  const invalidPlans = lessonPlans.filter(lp => {
    const oaLower = (lp.oa_text || '').toLowerCase()
    const hasBloomVerb = BLOOM_VERBS.some(verb => oaLower.includes(verb))
    const hasMeasurable = lp.measurable_criteria && lp.measurable_criteria.length > 10
    return !hasBloomVerb || !hasMeasurable
  })

  if (invalidPlans.length === 0) return lessonPlans

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    console.log(`[API/ESP-03] Reintento ${attempt}/${MAX_RETRIES} para mejorar OA`)

    const prompt = `Estos OA no son operables (falta verbo Bloom o criterio medible):

${invalidPlans.map(lp => `- ${lp.lesson_title}: "${lp.oa_text}"`).join('\n')}

Curso: ${ideaCentral}

REGLAS:
1. El OA DEBE iniciar con verbo Bloom: Comprender, Aplicar, Analizar, Evaluar, Crear, Desarrollar, Identificar, Describir, Diseñar, Implementar
2. Debe incluir criterio medible (cómo se evaluará)
3. Formato: "[Verbo] [contenido específico] mediante [método/actividad]"

Responde con JSON:
{
  "corrections": [
    {
      "lesson_title": "título",
      "oa_text": "OA mejorado con verbo Bloom",
      "oa_bloom_verb": "Verbo principal",
      "measurable_criteria": "Cómo se medirá el logro (específico)"
    }
  ]
}`

    try {
      const result = await model.generateContent(prompt)
      const response = result.response.text()
      const cleanJson = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const corrections = JSON.parse(cleanJson)

      for (const correction of corrections.corrections || []) {
        const planIndex = lessonPlans.findIndex(lp => lp.lesson_title === correction.lesson_title)
        if (planIndex >= 0) {
          lessonPlans[planIndex].oa_text = correction.oa_text
          lessonPlans[planIndex].oa_bloom_verb = correction.oa_bloom_verb
          lessonPlans[planIndex].measurable_criteria = correction.measurable_criteria
        }
      }

      const validation = validateSemanticOA(lessonPlans)
      if (validation.passed) {
        console.log(`[API/ESP-03] OA mejorados en intento ${attempt}`)
        return lessonPlans
      }
    } catch (e) {
      console.error(`[API/ESP-03] Error en reintento ${attempt}:`, e)
    }
  }

  return lessonPlans
}

function validateOAComponentAlignment(lessonPlans: LessonPlan[]): { passed: boolean; issues: string[] } {
  const issues: string[] = []
  const practiceVerbs = ['aplicar', 'implementar', 'demostrar', 'crear', 'diseñar', 'desarrollar']

  for (const lp of lessonPlans) {
    const oaLower = (lp.oa_text || '').toLowerCase()
    const needsDemo = practiceVerbs.some(verb => oaLower.includes(verb))
    const hasDemo = (lp.components || []).some(c => c.type === 'DEMO_GUIDE' || c.type === 'EXERCISE')

    if (needsDemo && !hasDemo) {
      issues.push(`${lp.lesson_title}: OA implica práctica pero falta DEMO_GUIDE`)
    }
  }

  return { passed: issues.length === 0, issues }
}

async function addMissingDemoGuides(
  model: any,
  lessonPlans: LessonPlan[],
  ideaCentral: string
): Promise<LessonPlan[]> {
  const practiceVerbs = ['aplicar', 'implementar', 'demostrar', 'crear', 'diseñar', 'desarrollar']

  const needsDemo = lessonPlans.filter(lp => {
    const oaLower = (lp.oa_text || '').toLowerCase()
    const needsPractice = practiceVerbs.some(verb => oaLower.includes(verb))
    const hasDemo = (lp.components || []).some(c => c.type === 'DEMO_GUIDE' || c.type === 'EXERCISE')
    return needsPractice && !hasDemo
  })

  if (needsDemo.length === 0) return lessonPlans

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    console.log(`[API/ESP-03] Reintento ${attempt}/${MAX_RETRIES} para agregar DEMO_GUIDE`)

    const prompt = `Estas lecciones tienen OA que implican práctica pero no tienen guía de demostración:

${needsDemo.map(lp => `- ${lp.lesson_title}: OA = "${lp.oa_text}"`).join('\n')}

Curso: ${ideaCentral}

Genera componentes DEMO_GUIDE para cada una:

Responde con JSON:
{
  "additions": [
    {
      "lesson_title": "título",
      "demo_guide": {
        "type": "DEMO_GUIDE",
        "summary": "Descripción detallada de la guía de demostración práctica"
      }
    }
  ]
}`

    try {
      const result = await model.generateContent(prompt)
      const response = result.response.text()
      const cleanJson = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const additions = JSON.parse(cleanJson)

      for (const addition of additions.additions || []) {
        const planIndex = lessonPlans.findIndex(lp => lp.lesson_title === addition.lesson_title)
        if (planIndex >= 0 && addition.demo_guide) {
          lessonPlans[planIndex].components = lessonPlans[planIndex].components || []
          lessonPlans[planIndex].components.push(addition.demo_guide)
        }
      }

      const validation = validateOAComponentAlignment(lessonPlans)
      if (validation.passed) {
        console.log(`[API/ESP-03] DEMO_GUIDE agregados en intento ${attempt}`)
        return lessonPlans
      }
    } catch (e) {
      console.error(`[API/ESP-03] Error en reintento ${attempt}:`, e)
    }
  }

  return lessonPlans
}

function validatePlan(content: GeneratedPlan, allLessons: LessonInput[]) {
  const plans = content.lesson_plans || []

  // V01: Todas las lecciones presentes
  const existingIds = new Set(plans.map(lp => lp.lesson_id))
  const v01 = {
    passed: allLessons.every(l => existingIds.has(l.id)),
    message: `Lecciones: ${plans.length}/${allLessons.length}`
  }

  // V02: OA definido
  const v02 = {
    passed: plans.every(lp => lp.oa_text && lp.oa_text.length >= 20),
    message: 'OA definido para cada lección'
  }

  // V03: Componentes obligatorios
  const v03 = {
    passed: plans.every(lp => {
      const types = (lp.components || []).map(c => c.type)
      return REQUIRED_COMPONENTS.every(req => types.includes(req))
    }),
    message: 'Componentes obligatorios presentes'
  }

  return { v01, v02, v03 }
}
