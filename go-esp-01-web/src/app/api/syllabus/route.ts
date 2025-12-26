// API Route para generacion ESP-02 (server-side) con reintentos
import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const MAX_RETRIES = 3

interface SyllabusModule {
  objective_general_ref: string
  title: string
  lessons: Array<{
    title: string
    objective_specific: string
  }>
}

interface GeneratedSyllabus {
  modules: SyllabusModule[]
}

export async function POST(request: NextRequest) {
  try {
    const { objetivos, ideaCentral, route } = await request.json()

    if (!objetivos || !ideaCentral) {
      return NextResponse.json(
        { error: 'objetivos e ideaCentral son requeridos' },
        { status: 400 }
      )
    }

    const apiKey = process.env.GOOGLE_API_KEY

    if (!apiKey) {
      console.warn('[API/ESP-02] GOOGLE_API_KEY no configurada - error')
      return NextResponse.json(
        { error: 'API key no configurada' },
        { status: 500 }
      )
    }

    console.log('[API/ESP-02] Generando temario con Gemini...')
    console.log('[API/ESP-02] Objetivos:', objetivos.length)

    const genAI = new GoogleGenerativeAI(apiKey)
    const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash'
    const model = genAI.getGenerativeModel({ model: modelName })

    // Generar contenido inicial
    let content = await generateInitialSyllabus(model, objetivos, ideaCentral, route)
    console.log('[API/ESP-02] Contenido inicial generado:', content.modules?.length, 'módulos')

    // Validar y reintentar si hay problemas
    const validation = validateSyllabus(content, objetivos)

    // V01: Número de módulos debe coincidir con objetivos
    if (!validation.v01.passed) {
      console.log('[API/ESP-02] V01 falló - reintentando módulos...')
      content = await retryModuleCount(model, objetivos, ideaCentral, route)
    }

    // V02: Cada módulo debe tener 3-6 lecciones
    if (!validation.v02.passed) {
      console.log('[API/ESP-02] V02 falló - reintentando lecciones...')
      content.modules = await retryLessonCounts(model, content.modules, ideaCentral)
    }

    // V03: Objetivos específicos válidos
    if (!validation.v03.passed) {
      console.log('[API/ESP-02] V03 falló - reintentando objetivos específicos...')
      content.modules = await retrySpecificObjectives(model, content.modules, ideaCentral)
    }

    // V04: Sin duplicados
    if (!validation.v04.passed) {
      console.log('[API/ESP-02] V04 falló - reintentando títulos únicos...')
      content.modules = await retryUniqueTitles(model, content.modules, ideaCentral)
    }

    console.log('[API/ESP-02] Generado exitosamente:', content.modules?.length, 'módulos')
    return NextResponse.json(content)

  } catch (error: any) {
    console.error('[API/ESP-02] Error:', error.message)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

async function generateInitialSyllabus(
  model: any,
  objetivos: string[],
  ideaCentral: string,
  route: string
): Promise<GeneratedSyllabus> {
  const routeContext = route === 'A_WITH_SOURCE'
    ? 'El contenido debe ser estructurado y formal, basado en fuentes académicas.'
    : 'Genera el contenido desde cero basándote en las mejores prácticas del tema.'

  const prompt = `Eres un experto en diseño instruccional. Genera un temario completo para un curso.

**CURSO:** ${ideaCentral}

**OBJETIVOS GENERALES (uno por módulo):**
${objetivos.map((obj, i) => `${i + 1}. ${obj}`).join('\n')}

**CONTEXTO:** ${routeContext}

**REGLAS OBLIGATORIAS:**
1. Genera EXACTAMENTE ${objetivos.length} módulos (uno por cada objetivo)
2. Cada módulo debe tener entre 3 y 6 lecciones
3. TODOS los títulos de lecciones deben ser ÚNICOS en todo el temario
4. Cada objetivo específico debe:
   - Iniciar con "El participante será capaz de"
   - Usar verbos: identificar, describir, aplicar, analizar, evaluar, crear, demostrar, diseñar
   - Tener al menos 60 caracteres
5. Los títulos deben ser específicos al contenido, NO genéricos

**FORMATO JSON (sin markdown):**
{
  "modules": [
    {
      "objective_general_ref": "Texto exacto del objetivo general",
      "title": "Módulo 1: Título específico y descriptivo",
      "lessons": [
        {
          "title": "Lección 1.1: Título único y específico",
          "objective_specific": "El participante será capaz de [verbo] [contenido específico] mediante [método]."
        }
      ]
    }
  ]
}

Responde SOLO con JSON válido.`

  const result = await model.generateContent(prompt)
  const response = result.response.text()
  const cleanJson = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  return JSON.parse(cleanJson)
}

async function retryModuleCount(
  model: any,
  objetivos: string[],
  ideaCentral: string,
  route: string
): Promise<GeneratedSyllabus> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    console.log(`[API/ESP-02] Reintento ${attempt}/${MAX_RETRIES} para cantidad de módulos`)

    const prompt = `CORRECCIÓN REQUERIDA: El temario debe tener EXACTAMENTE ${objetivos.length} módulos.

Curso: ${ideaCentral}

Objetivos (un módulo por cada uno):
${objetivos.map((obj, i) => `${i + 1}. ${obj}`).join('\n')}

Genera ${objetivos.length} módulos, cada uno con 3-6 lecciones únicas.
Cada lección debe tener un objetivo específico que inicie con "El participante será capaz de".

Responde SOLO con JSON:
{
  "modules": [
    {
      "objective_general_ref": "objetivo exacto",
      "title": "Módulo X: Título",
      "lessons": [{"title": "Lección X.Y: Título único", "objective_specific": "El participante será capaz de..."}]
    }
  ]
}`

    try {
      const result = await model.generateContent(prompt)
      const response = result.response.text()
      const cleanJson = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const content = JSON.parse(cleanJson)

      if (content.modules?.length === objetivos.length) {
        console.log(`[API/ESP-02] Módulos corregidos en intento ${attempt}`)
        return content
      }
    } catch (e) {
      console.error(`[API/ESP-02] Error en reintento ${attempt}:`, e)
    }
  }

  throw new Error('No se pudo generar el número correcto de módulos')
}

async function retryLessonCounts(
  model: any,
  modules: SyllabusModule[],
  ideaCentral: string
): Promise<SyllabusModule[]> {
  const invalidModules = modules.filter(m => m.lessons.length < 3 || m.lessons.length > 6)

  if (invalidModules.length === 0) return modules

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    console.log(`[API/ESP-02] Reintento ${attempt}/${MAX_RETRIES} para cantidad de lecciones`)

    const prompt = `Estos módulos tienen un número incorrecto de lecciones (deben ser 3-6):

${invalidModules.map(m => `- "${m.title}": tiene ${m.lessons.length} lecciones`).join('\n')}

Curso: ${ideaCentral}

Para cada módulo, genera entre 3 y 6 lecciones únicas con objetivos específicos.

Responde con JSON:
{
  "corrections": [
    {
      "module_title": "título del módulo",
      "lessons": [
        {"title": "Lección única", "objective_specific": "El participante será capaz de..."}
      ]
    }
  ]
}`

    try {
      const result = await model.generateContent(prompt)
      const response = result.response.text()
      const cleanJson = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const corrections = JSON.parse(cleanJson)

      // Aplicar correcciones
      for (const correction of corrections.corrections || []) {
        const moduleIndex = modules.findIndex(m => m.title === correction.module_title)
        if (moduleIndex >= 0 && correction.lessons?.length >= 3 && correction.lessons?.length <= 6) {
          modules[moduleIndex].lessons = correction.lessons
        }
      }

      const allValid = modules.every(m => m.lessons.length >= 3 && m.lessons.length <= 6)
      if (allValid) {
        console.log(`[API/ESP-02] Lecciones corregidas en intento ${attempt}`)
        return modules
      }
    } catch (e) {
      console.error(`[API/ESP-02] Error en reintento ${attempt}:`, e)
    }
  }

  return modules
}

async function retrySpecificObjectives(
  model: any,
  modules: SyllabusModule[],
  ideaCentral: string
): Promise<SyllabusModule[]> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    console.log(`[API/ESP-02] Reintento ${attempt}/${MAX_RETRIES} para objetivos específicos`)

    const invalidLessons: Array<{ module: string; lesson: string; current: string }> = []

    for (const mod of modules) {
      for (const lesson of mod.lessons) {
        if (!lesson.objective_specific?.toLowerCase().startsWith('el participante será capaz de') ||
            lesson.objective_specific.length < 60) {
          invalidLessons.push({
            module: mod.title,
            lesson: lesson.title,
            current: lesson.objective_specific
          })
        }
      }
    }

    if (invalidLessons.length === 0) return modules

    const prompt = `Estos objetivos específicos NO cumplen el formato requerido:

${invalidLessons.slice(0, 10).map(l => `- ${l.lesson}: "${l.current?.slice(0, 50)}..."`).join('\n')}

REGLAS:
1. DEBE iniciar exactamente con "El participante será capaz de"
2. Usar verbos: identificar, describir, aplicar, analizar, evaluar, crear
3. Mínimo 60 caracteres
4. Ser específico al tema del curso: ${ideaCentral}

Responde con JSON:
{
  "corrections": [
    {"lesson_title": "título de lección", "objective_specific": "El participante será capaz de..."}
  ]
}`

    try {
      const result = await model.generateContent(prompt)
      const response = result.response.text()
      const cleanJson = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const corrections = JSON.parse(cleanJson)

      // Aplicar correcciones
      for (const correction of corrections.corrections || []) {
        for (const mod of modules) {
          const lessonIndex = mod.lessons.findIndex(l => l.title === correction.lesson_title)
          if (lessonIndex >= 0) {
            mod.lessons[lessonIndex].objective_specific = correction.objective_specific
          }
        }
      }

      // Verificar
      let allValid = true
      for (const mod of modules) {
        for (const lesson of mod.lessons) {
          if (!lesson.objective_specific?.toLowerCase().startsWith('el participante será capaz de') ||
              lesson.objective_specific.length < 60) {
            allValid = false
            break
          }
        }
      }

      if (allValid) {
        console.log(`[API/ESP-02] Objetivos específicos corregidos en intento ${attempt}`)
        return modules
      }
    } catch (e) {
      console.error(`[API/ESP-02] Error en reintento ${attempt}:`, e)
    }
  }

  return modules
}

async function retryUniqueTitles(
  model: any,
  modules: SyllabusModule[],
  ideaCentral: string
): Promise<SyllabusModule[]> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    console.log(`[API/ESP-02] Reintento ${attempt}/${MAX_RETRIES} para títulos únicos`)

    // Encontrar duplicados
    const allTitles = modules.flatMap(m => m.lessons.map(l => l.title))
    const duplicates = allTitles.filter((title, index) => allTitles.indexOf(title) !== index)

    if (duplicates.length === 0) return modules

    const prompt = `Estos títulos de lección están DUPLICADOS y necesitan ser únicos:

${Array.from(new Set(duplicates)).map(d => `- "${d}"`).join('\n')}

Curso: ${ideaCentral}

Genera títulos ÚNICOS y específicos para reemplazar cada duplicado.
Los títulos deben ser descriptivos del contenido, no genéricos.

Responde con JSON:
{
  "replacements": [
    {"old_title": "título duplicado", "new_titles": ["Título único 1", "Título único 2"]}
  ]
}`

    try {
      const result = await model.generateContent(prompt)
      const response = result.response.text()
      const cleanJson = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const replacements = JSON.parse(cleanJson)

      // Aplicar reemplazos
      for (const replacement of replacements.replacements || []) {
        let newTitleIndex = 0
        for (const mod of modules) {
          for (let i = 0; i < mod.lessons.length; i++) {
            if (mod.lessons[i].title === replacement.old_title && newTitleIndex < replacement.new_titles?.length) {
              mod.lessons[i].title = replacement.new_titles[newTitleIndex]
              newTitleIndex++
            }
          }
        }
      }

      // Verificar
      const newTitles = modules.flatMap(m => m.lessons.map(l => l.title))
      const newDuplicates = newTitles.filter((title, index) => newTitles.indexOf(title) !== index)

      if (newDuplicates.length === 0) {
        console.log(`[API/ESP-02] Títulos únicos corregidos en intento ${attempt}`)
        return modules
      }
    } catch (e) {
      console.error(`[API/ESP-02] Error en reintento ${attempt}:`, e)
    }
  }

  return modules
}

function validateSyllabus(content: GeneratedSyllabus, objetivos: string[]) {
  const modules = content.modules || []

  // V01: Módulos = Objetivos
  const v01 = {
    passed: modules.length === objetivos.length,
    message: `Módulos: ${modules.length}/${objetivos.length}`
  }

  // V02: 3-6 lecciones por módulo
  const v02 = {
    passed: modules.every(m => m.lessons?.length >= 3 && m.lessons?.length <= 6),
    message: 'Lecciones por módulo'
  }

  // V03: Objetivos específicos válidos
  let v03Valid = true
  for (const mod of modules) {
    for (const lesson of mod.lessons || []) {
      if (!lesson.objective_specific?.toLowerCase().startsWith('el participante será capaz de') ||
          lesson.objective_specific.length < 60) {
        v03Valid = false
        break
      }
    }
  }
  const v03 = { passed: v03Valid, message: 'Objetivos específicos' }

  // V04: Sin duplicados
  const allTitles = modules.flatMap(m => (m.lessons || []).map(l => l.title))
  const uniqueTitles = new Set(allTitles)
  const v04 = {
    passed: allTitles.length === uniqueTitles.size,
    message: `Títulos únicos: ${uniqueTitles.size}/${allTitles.length}`
  }

  return { v01, v02, v03, v04 }
}
