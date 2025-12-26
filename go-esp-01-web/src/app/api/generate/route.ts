// API Route para generacion ESP-01 (server-side) con reintentos
import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const MAX_RETRIES = 3
const BLOOM_VERBS = ['comprender', 'aplicar', 'analizar', 'evaluar', 'crear', 'desarrollar', 'identificar', 'describir', 'diseñar', 'implementar', 'demostrar', 'explicar']

interface GeneratedContent {
  nombres: string[]
  objetivos: string[]
  descripcion: {
    texto: string
    publico_objetivo: string
    beneficios: string
    estructura_general: string
    diferenciador: string
  }
}

export async function POST(request: NextRequest) {
  try {
    const { ideaCentral } = await request.json()

    if (!ideaCentral) {
      return NextResponse.json(
        { error: 'ideaCentral es requerido' },
        { status: 400 }
      )
    }

    const apiKey = process.env.GOOGLE_API_KEY

    if (!apiKey) {
      console.warn('[API/ESP-01] GOOGLE_API_KEY no configurada - retornando mock')
      return NextResponse.json(mockEsp01(ideaCentral))
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash'
    const model = genAI.getGenerativeModel({ model: modelName })

    console.log('[API/ESP-01] Generando con Gemini...')

    // Generar contenido inicial
    let content = await generateInitialContent(model, ideaCentral)
    console.log('[API/ESP-01] Contenido inicial generado')

    // Validar y reintentar partes que fallen
    const validation = validateContent(content)

    // Reintentar objetivos si VAL_004 falla
    if (!validation.val004.passed) {
      console.log('[API/ESP-01] VAL_004 falló - reintentando objetivos...')
      content.objetivos = await retryObjectives(model, ideaCentral, content.objetivos)
    }

    // Reintentar nombres si VAL_001 falla
    if (!validation.val001.passed) {
      console.log('[API/ESP-01] VAL_001 falló - reintentando nombres...')
      content.nombres = await retryNames(model, ideaCentral, content.nombres)
    }

    // Reintentar descripcion si VAL_003 falla
    if (!validation.val003.passed) {
      console.log('[API/ESP-01] VAL_003 falló - reintentando descripción...')
      content.descripcion = await retryDescription(model, ideaCentral, content.descripcion)
    }

    console.log('[API/ESP-01] Generado exitosamente:', content.nombres?.[0])
    return NextResponse.json(content)

  } catch (error: any) {
    console.error('[API/ESP-01] Error:', error.message)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

async function generateInitialContent(model: any, ideaCentral: string): Promise<GeneratedContent> {
  const prompt = `Eres un experto en diseño instruccional y creación de cursos empresariales.

Genera el artefacto base para un curso basado en:

**IDEA CENTRAL:** ${ideaCentral}

IMPORTANTE - Los objetivos DEBEN iniciar con uno de estos verbos exactamente:
Comprender, Aplicar, Analizar, Evaluar, Crear, Desarrollar, Identificar, Describir, Diseñar, Implementar, Demostrar, Explicar

Formato JSON (sin markdown):

{
  "nombres": [
    "Nombre profesional del curso",
    "Nombre alternativo dinámico",
    "Tercer nombre con enfoque en beneficios"
  ],
  "objetivos": [
    "Comprender los fundamentos de...",
    "Aplicar técnicas de...",
    "Desarrollar habilidades para...",
    "Evaluar resultados de..."
  ],
  "descripcion": {
    "texto": "Descripción completa del curso en 2-3 oraciones.",
    "publico_objetivo": "Descripción del público ideal",
    "beneficios": "3-4 beneficios principales",
    "estructura_general": "Organización del curso",
    "diferenciador": "Qué hace único este curso"
  }
}

Responde SOLO con JSON válido.`

  const result = await model.generateContent(prompt)
  const response = result.response.text()
  const cleanJson = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  return JSON.parse(cleanJson)
}

async function retryObjectives(model: any, ideaCentral: string, currentObjectives: string[]): Promise<string[]> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    console.log(`[API/ESP-01] Reintento ${attempt}/${MAX_RETRIES} para objetivos`)

    const prompt = `Los siguientes objetivos de aprendizaje NO cumplen con la taxonomía de Bloom porque no inician con los verbos correctos:

${currentObjectives.map((o, i) => `${i + 1}. ${o}`).join('\n')}

REESCRIBE estos ${currentObjectives.length} objetivos para el curso "${ideaCentral}".

REGLA OBLIGATORIA: Cada objetivo DEBE iniciar con uno de estos verbos (primera palabra):
- Comprender
- Aplicar
- Analizar
- Evaluar
- Crear
- Desarrollar
- Identificar
- Describir
- Diseñar
- Implementar

Responde SOLO con un array JSON de strings, ejemplo:
["Comprender los fundamentos de...", "Aplicar técnicas de...", "Desarrollar habilidades para...", "Evaluar el impacto de..."]`

    try {
      const result = await model.generateContent(prompt)
      const response = result.response.text()
      const cleanJson = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const newObjectives = JSON.parse(cleanJson)

      // Validar que ahora sí cumplan
      const allValid = newObjectives.every((obj: string) =>
        BLOOM_VERBS.some(verb => obj.toLowerCase().startsWith(verb))
      )

      if (allValid) {
        console.log(`[API/ESP-01] Objetivos corregidos en intento ${attempt}`)
        return newObjectives
      }
    } catch (e) {
      console.error(`[API/ESP-01] Error en reintento ${attempt}:`, e)
    }
  }

  console.warn('[API/ESP-01] No se pudieron corregir objetivos después de 3 intentos')
  return currentObjectives
}

async function retryNames(model: any, ideaCentral: string, currentNames: string[]): Promise<string[]> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    console.log(`[API/ESP-01] Reintento ${attempt}/${MAX_RETRIES} para nombres`)

    const prompt = `Genera exactamente 3 nombres profesionales para un curso sobre "${ideaCentral}".

Los nombres deben ser:
- Atractivos para el mercado corporativo
- Diferentes entre sí
- En español

Responde SOLO con un array JSON de 3 strings:
["Nombre 1", "Nombre 2", "Nombre 3"]`

    try {
      const result = await model.generateContent(prompt)
      const response = result.response.text()
      const cleanJson = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const newNames = JSON.parse(cleanJson)

      if (Array.isArray(newNames) && newNames.length === 3) {
        console.log(`[API/ESP-01] Nombres corregidos en intento ${attempt}`)
        return newNames
      }
    } catch (e) {
      console.error(`[API/ESP-01] Error en reintento ${attempt}:`, e)
    }
  }

  return currentNames
}

async function retryDescription(model: any, ideaCentral: string, currentDesc: any): Promise<any> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    console.log(`[API/ESP-01] Reintento ${attempt}/${MAX_RETRIES} para descripción`)

    const prompt = `Genera una descripción completa para un curso sobre "${ideaCentral}".

Responde SOLO con JSON:
{
  "texto": "Descripción del curso en 2-3 oraciones (mínimo 50 caracteres)",
  "publico_objetivo": "A quién va dirigido (mínimo 20 caracteres)",
  "beneficios": "Beneficios principales (mínimo 20 caracteres)",
  "estructura_general": "Cómo está organizado (mínimo 20 caracteres)",
  "diferenciador": "Qué lo hace único (mínimo 20 caracteres)"
}`

    try {
      const result = await model.generateContent(prompt)
      const response = result.response.text()
      const cleanJson = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const newDesc = JSON.parse(cleanJson)

      const fields = ['texto', 'publico_objetivo', 'beneficios', 'estructura_general', 'diferenciador']
      const allValid = fields.every(f => newDesc[f]?.length > 15)

      if (allValid) {
        console.log(`[API/ESP-01] Descripción corregida en intento ${attempt}`)
        return newDesc
      }
    } catch (e) {
      console.error(`[API/ESP-01] Error en reintento ${attempt}:`, e)
    }
  }

  return currentDesc
}

function validateContent(content: GeneratedContent) {
  return {
    val001: {
      passed: content.nombres?.length === 3,
      message: `Nombres: ${content.nombres?.length || 0}/3`
    },
    val002: {
      passed: content.objetivos?.length >= 3 && content.objetivos?.length <= 6,
      message: `Objetivos: ${content.objetivos?.length || 0}`
    },
    val003: {
      passed: ['texto', 'publico_objetivo', 'beneficios', 'estructura_general', 'diferenciador']
        .every(f => content.descripcion?.[f as keyof typeof content.descripcion]?.length > 15),
      message: 'Descripción completa'
    },
    val004: {
      passed: content.objetivos?.every((obj: string) =>
        BLOOM_VERBS.some(verb => obj.toLowerCase().startsWith(verb))
      ) || false,
      message: 'Verbos de Bloom'
    }
  }
}

function mockEsp01(ideaCentral: string): GeneratedContent {
  return {
    nombres: [
      `${ideaCentral}: Guía Práctica`,
      `Masterclass: ${ideaCentral}`,
      `${ideaCentral} para Profesionales`
    ],
    objetivos: [
      `Comprender los fundamentos de ${ideaCentral.toLowerCase()}`,
      'Aplicar técnicas y metodologías prácticas',
      'Desarrollar habilidades de implementación',
      'Evaluar resultados y mejora continua'
    ],
    descripcion: {
      texto: `Este programa integral está diseñado para profesionales que buscan dominar ${ideaCentral.toLowerCase()}. A través de metodologías experienciales y casos de estudio reales, desarrollarán competencias clave.`,
      publico_objetivo: 'Profesionales y líderes de equipo que buscan mejorar sus habilidades',
      beneficios: 'Habilidades prácticas aplicables inmediatamente en el entorno laboral',
      estructura_general: '4 módulos progresivos con ejercicios prácticos y casos de estudio',
      diferenciador: 'Enfoque práctico basado en casos reales de la industria'
    }
  }
}
