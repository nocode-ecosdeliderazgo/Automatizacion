// GO-ESP-03: Validadores para Plan Instruccional

import type { LessonPlan, ValidationCheck, DodCheck, Blocker } from '../types/instructionalPlan.types'

const REQUIRED_COMPONENTS: string[] = ['DIALOGUE', 'READING', 'QUIZ']
const BLOOM_VERBS = ['comprender', 'aplicar', 'analizar', 'evaluar', 'crear', 'desarrollar', 'identificar', 'describir', 'diseñar', 'implementar', 'demostrar', 'explicar']
const PRACTICE_VERBS = ['aplicar', 'implementar', 'demostrar', 'crear', 'diseñar', 'desarrollar']

// V01: Todas las lecciones del temario están presentes
export function validateAllLessonsPresent(
  lessonPlans: LessonPlan[],
  expectedLessonIds: string[]
): ValidationCheck {
  const existingIds = new Set(lessonPlans.map(lp => lp.lesson_id))
  const missingIds = expectedLessonIds.filter(id => !existingIds.has(id))

  return {
    code: 'V01_ALL_LESSONS_PRESENT',
    pass: missingIds.length === 0,
    message: missingIds.length === 0
      ? `Todas las ${expectedLessonIds.length} lecciones incluidas`
      : `Faltan ${missingIds.length} lecciones: ${missingIds.slice(0, 3).join(', ')}${missingIds.length > 3 ? '...' : ''}`,
    severity: 'error'
  }
}

// V02: Cada lección tiene OA definido
export function validateOADefined(lessonPlans: LessonPlan[]): ValidationCheck {
  const invalid = lessonPlans.filter(lp => !lp.oa_text || lp.oa_text.length < 20)

  return {
    code: 'V02_OA_DEFINED',
    pass: invalid.length === 0,
    message: invalid.length === 0
      ? 'Todos los OA están definidos'
      : `${invalid.length} lecciones sin OA válido`,
    severity: 'error'
  }
}

// V03: Componentes obligatorios presentes
export function validateRequiredComponents(lessonPlans: LessonPlan[]): ValidationCheck {
  const invalid = lessonPlans.filter(lp => {
    const types = (lp.components || []).map(c => c.type as string)
    return !REQUIRED_COMPONENTS.every(req => types.includes(req))
  })

  return {
    code: 'V03_REQUIRED_COMPONENTS',
    pass: invalid.length === 0,
    message: invalid.length === 0
      ? 'DIALOGUE, READING y QUIZ presentes en todas las lecciones'
      : `${invalid.length} lecciones sin componentes obligatorios`,
    severity: 'error'
  }
}

// V04: Bloqueadores documentados
export function validateBlockersDocumented(
  blockers: Blocker[],
  hasExplicitNoBlockers: boolean
): ValidationCheck {
  const hasBlockers = blockers.length > 0
  const allHaveOwner = blockers.every(b => b.owner && b.owner.length > 0)
  const allHaveImpact = blockers.every(b => b.impact)

  if (hasBlockers && (!allHaveOwner || !allHaveImpact)) {
    return {
      code: 'V04_BLOCKERS_DOCUMENTED',
      pass: false,
      message: 'Bloqueadores incompletos: falta responsable o impacto',
      severity: 'error'
    }
  }

  return {
    code: 'V04_BLOCKERS_DOCUMENTED',
    pass: hasBlockers || hasExplicitNoBlockers,
    message: hasBlockers
      ? `${blockers.length} bloqueador(es) documentado(s)`
      : hasExplicitNoBlockers
        ? 'Sin bloqueadores (documentado)'
        : 'Debe indicar bloqueadores o marcar "Sin bloqueadores"',
    severity: 'warning'
  }
}

// V05: Máximo de iteraciones
export function validateMaxIterations(iterationCount: number): ValidationCheck {
  return {
    code: 'V05_MAX_ITERATIONS',
    pass: iterationCount <= 2,
    message: iterationCount <= 2
      ? `Iteración ${iterationCount}/2`
      : 'Máximo de iteraciones excedido - escalar',
    severity: 'error'
  }
}

// S01: OA operable (verbo Bloom + criterio medible)
export function validateOAOperable(lessonPlans: LessonPlan[]): ValidationCheck {
  const invalid = lessonPlans.filter(lp => {
    const oaLower = (lp.oa_text || '').toLowerCase()
    const hasBloomVerb = BLOOM_VERBS.some(verb => oaLower.startsWith(verb) || oaLower.includes(` ${verb} `))
    const hasMeasurable = lp.measurable_criteria && lp.measurable_criteria.length > 10
    return !hasBloomVerb || !hasMeasurable
  })

  return {
    code: 'S01_OA_OPERABLE',
    pass: invalid.length === 0,
    message: invalid.length === 0
      ? 'Todos los OA son operables'
      : `${invalid.length} OA sin verbo Bloom o criterio medible`,
    severity: 'warning'
  }
}

// S02: Coherencia OA↔componentes
export function validateOAComponentAlignment(lessonPlans: LessonPlan[]): ValidationCheck {
  const misaligned = lessonPlans.filter(lp => {
    const oaLower = (lp.oa_text || '').toLowerCase()
    const needsPractice = PRACTICE_VERBS.some(verb => oaLower.includes(verb))
    const hasDemo = (lp.components || []).some(c => c.type === 'DEMO_GUIDE' || c.type === 'EXERCISE')
    return needsPractice && !hasDemo
  })

  return {
    code: 'S02_OA_COMPONENT_ALIGNMENT',
    pass: misaligned.length === 0,
    message: misaligned.length === 0
      ? 'OA y componentes alineados'
      : `${misaligned.length} lecciones con OA práctico sin DEMO_GUIDE`,
    severity: 'warning'
  }
}

// S03: Sin contradicciones
export function validateNoContradictions(lessonPlans: LessonPlan[]): ValidationCheck {
  // Esta validación es más compleja y normalmente requiere IA
  // Por ahora, validamos que el alignment_notes no contenga palabras de alerta
  const alertWords = ['contradicción', 'inconsistente', 'no coincide', 'discrepancia']
  const issues = lessonPlans.filter(lp =>
    alertWords.some(word => (lp.alignment_notes || '').toLowerCase().includes(word))
  )

  return {
    code: 'S03_NO_CONTRADICTIONS',
    pass: issues.length === 0,
    message: issues.length === 0
      ? 'Sin contradicciones detectadas'
      : `${issues.length} posibles contradicciones`,
    severity: 'warning'
  }
}

// Ejecutar todas las validaciones
export function runAllValidations(
  lessonPlans: LessonPlan[],
  expectedLessonIds: string[],
  blockers: Blocker[],
  iterationCount: number,
  hasExplicitNoBlockers: boolean = false
): { automaticChecks: ValidationCheck[]; semanticChecks: ValidationCheck[]; allPassed: boolean } {
  const automaticChecks = [
    validateAllLessonsPresent(lessonPlans, expectedLessonIds),
    validateOADefined(lessonPlans),
    validateRequiredComponents(lessonPlans),
    validateBlockersDocumented(blockers, hasExplicitNoBlockers),
    validateMaxIterations(iterationCount)
  ]

  const semanticChecks = [
    validateOAOperable(lessonPlans),
    validateOAComponentAlignment(lessonPlans),
    validateNoContradictions(lessonPlans)
  ]

  const automaticErrors = automaticChecks.filter(c => !c.pass && c.severity === 'error')
  const allPassed = automaticErrors.length === 0

  return { automaticChecks, semanticChecks, allPassed }
}

// Generar checklist DoD
export function generateDodChecklist(
  lessonPlans: LessonPlan[],
  expectedLessonIds: string[],
  blockers: Blocker[],
  hasExplicitNoBlockers: boolean
): DodCheck[] {
  const v01 = validateAllLessonsPresent(lessonPlans, expectedLessonIds)
  const v02 = validateOADefined(lessonPlans)
  const v03 = validateRequiredComponents(lessonPlans)
  const s01 = validateOAOperable(lessonPlans)
  const s02 = validateOAComponentAlignment(lessonPlans)

  return [
    {
      code: 'DOD_A',
      label: 'Completitud',
      pass: v01.pass && v02.pass,
      evidence: `${lessonPlans.length} lecciones con OA definido`,
      notes: !v01.pass ? v01.message : !v02.pass ? v02.message : undefined
    },
    {
      code: 'DOD_B',
      label: 'Calidad instruccional',
      pass: s01.pass && s02.pass,
      evidence: s01.pass && s02.pass ? 'OA operables y alineados' : undefined,
      notes: !s01.pass ? s01.message : !s02.pass ? s02.message : undefined
    },
    {
      code: 'DOD_C',
      label: 'Componentes obligatorios',
      pass: v03.pass,
      evidence: v03.pass ? 'DIALOGUE, READING, QUIZ en todas las lecciones' : undefined,
      notes: !v03.pass ? v03.message : undefined
    },
    {
      code: 'DOD_D',
      label: 'Bloqueadores documentados',
      pass: blockers.length > 0 || hasExplicitNoBlockers,
      evidence: blockers.length > 0
        ? `${blockers.length} bloqueador(es) registrado(s)`
        : hasExplicitNoBlockers
          ? 'Sin bloqueadores'
          : undefined,
      notes: !hasExplicitNoBlockers && blockers.length === 0
        ? 'Debe documentar bloqueadores o marcar "Sin bloqueadores"'
        : undefined
    }
  ]
}
