// GO-ESP-04: Validadores para Curaduria de Fuentes

import type {
  CurationRow,
  CurationValidationCheck,
  CurationDodCheck,
  CurationBlocker,
  RequiredComponent
} from '../types/curation.types'

// V01: Cobertura por Componente
// Para cada (lesson, component) requerido, existe >=1 row con apta=true AND cobertura_completa=true
export function validateCoveragePerComponent(
  rows: CurationRow[],
  requiredComponents: RequiredComponent[]
): CurationValidationCheck {
  const uncovered: string[] = []

  for (const req of requiredComponents) {
    const hasValidSource = rows.some(
      r => r.lesson_id === req.lesson_id &&
           r.component === req.component &&
           r.apta === true &&
           r.cobertura_completa === true
    )

    if (!hasValidSource) {
      uncovered.push(`${req.lesson_title}: ${req.component}`)
    }
  }

  return {
    code: 'V01_COVERAGE_PER_COMPONENT',
    pass: uncovered.length === 0,
    message: uncovered.length === 0
      ? 'Todos los componentes tienen fuente apta con cobertura completa'
      : `${uncovered.length} componente(s) sin cobertura: ${uncovered.slice(0, 3).join(', ')}${uncovered.length > 3 ? '...' : ''}`,
    severity: 'error'
  }
}

// V02: Criticos Requieren Cobertura Completa
// Si is_critical=true, entonces debe haber al menos una fuente con apta=true y cobertura_completa=true
export function validateCriticalCoverage(
  rows: CurationRow[],
  requiredComponents: RequiredComponent[]
): CurationValidationCheck {
  const criticalComponents = requiredComponents.filter(c => c.is_critical)
  const uncoveredCritical: string[] = []

  for (const critical of criticalComponents) {
    const hasValidSource = rows.some(
      r => r.lesson_id === critical.lesson_id &&
           r.component === critical.component &&
           r.apta === true &&
           r.cobertura_completa === true
    )

    if (!hasValidSource) {
      uncoveredCritical.push(`${critical.lesson_title}: ${critical.component}`)
    }
  }

  return {
    code: 'V02_CRITICAL_COVERAGE',
    pass: uncoveredCritical.length === 0,
    message: uncoveredCritical.length === 0
      ? 'Todos los componentes criticos tienen cobertura completa'
      : `${uncoveredCritical.length} componente(s) CRITICO(s) sin cobertura`,
    severity: 'error'
  }
}

// V03: NO APTA Requiere Motivo
// Si apta=false, motivo_no_apta no puede estar vacio
export function validateNoAptaHasReason(rows: CurationRow[]): CurationValidationCheck {
  const withoutReason = rows.filter(
    r => r.apta === false && (!r.motivo_no_apta || r.motivo_no_apta.trim().length === 0)
  )

  return {
    code: 'V03_NO_APTA_HAS_REASON',
    pass: withoutReason.length === 0,
    message: withoutReason.length === 0
      ? 'Todas las fuentes NO APTA tienen motivo documentado'
      : `${withoutReason.length} fuente(s) NO APTA sin motivo`,
    severity: 'error'
  }
}

// V04: Componente Sin Fuente Apta (Componente Huerfano)
// Si un componente solo tiene fuentes apta=false o ninguna fuente, es un gap
export function validateNoOrphanComponents(
  rows: CurationRow[],
  requiredComponents: RequiredComponent[]
): CurationValidationCheck {
  const orphans: string[] = []

  for (const req of requiredComponents) {
    const componentRows = rows.filter(
      r => r.lesson_id === req.lesson_id && r.component === req.component
    )

    // Si no hay filas o todas son apta=false
    const hasAnyApta = componentRows.some(r => r.apta === true)

    if (!hasAnyApta) {
      orphans.push(`${req.lesson_title}: ${req.component}`)
    }
  }

  return {
    code: 'V04_NO_ORPHAN_COMPONENTS',
    pass: orphans.length === 0,
    message: orphans.length === 0
      ? 'Todos los componentes tienen al menos una fuente apta'
      : `${orphans.length} componente(s) sin ninguna fuente apta`,
    severity: 'error'
  }
}

// V05: Maximo de Intentos
export function validateMaxAttempts(attemptNumber: number): CurationValidationCheck {
  return {
    code: 'V05_MAX_ATTEMPTS',
    pass: attemptNumber <= 2,
    message: attemptNumber <= 2
      ? `Intento ${attemptNumber}/2`
      : 'Maximo de intentos excedido - requiere escalacion',
    severity: 'error'
  }
}

// V06: Todas las filas evaluadas (no hay pendientes)
export function validateAllRowsEvaluated(rows: CurationRow[]): CurationValidationCheck {
  const pending = rows.filter(r => r.apta === null)

  return {
    code: 'V06_ALL_ROWS_EVALUATED',
    pass: pending.length === 0,
    message: pending.length === 0
      ? 'Todas las fuentes han sido evaluadas'
      : `${pending.length} fuente(s) pendiente(s) de evaluacion`,
    severity: 'warning'
  }
}

// Ejecutar todas las validaciones
export function runAllValidations(
  rows: CurationRow[],
  requiredComponents: RequiredComponent[],
  attemptNumber: number
): { automaticChecks: CurationValidationCheck[]; allPassed: boolean; hasErrors: boolean } {
  const automaticChecks = [
    validateCoveragePerComponent(rows, requiredComponents),
    validateCriticalCoverage(rows, requiredComponents),
    validateNoAptaHasReason(rows),
    validateNoOrphanComponents(rows, requiredComponents),
    validateMaxAttempts(attemptNumber),
    validateAllRowsEvaluated(rows)
  ]

  const errors = automaticChecks.filter(c => !c.pass && c.severity === 'error')
  const allPassed = automaticChecks.every(c => c.pass)

  return { automaticChecks, allPassed, hasErrors: errors.length > 0 }
}

// Generar checklist DoD
export function generateDodChecklist(
  rows: CurationRow[],
  requiredComponents: RequiredComponent[],
  blockers: CurationBlocker[],
  bitacoraCount: number
): CurationDodCheck[] {
  const v01 = validateCoveragePerComponent(rows, requiredComponents)
  const v02 = validateCriticalCoverage(rows, requiredComponents)
  const v03 = validateNoAptaHasReason(rows)
  const v06 = validateAllRowsEvaluated(rows)

  return [
    {
      code: 'DOD_COVERAGE',
      label: 'Cobertura por leccion',
      pass: v01.pass,
      evidence: v01.pass
        ? `${requiredComponents.length} componentes cubiertos`
        : undefined,
      notes: !v01.pass ? v01.message : undefined
    },
    {
      code: 'DOD_CRITICAL',
      label: 'Componentes criticos cubiertos',
      pass: v02.pass,
      evidence: v02.pass
        ? 'Todos los criticos con cobertura completa'
        : undefined,
      notes: !v02.pass ? v02.message : undefined
    },
    {
      code: 'DOD_OPERABILITY',
      label: 'Fuentes NO APTA con motivo',
      pass: v03.pass,
      evidence: v03.pass
        ? 'Todas las fuentes NO APTA documentadas'
        : undefined,
      notes: !v03.pass ? v03.message : undefined
    },
    {
      code: 'DOD_TRACEABILITY',
      label: 'Bitacora completa',
      pass: bitacoraCount > 0,
      evidence: bitacoraCount > 0
        ? `${bitacoraCount} entrada(s) en bitacora`
        : undefined,
      notes: bitacoraCount === 0
        ? 'Se requiere al menos una entrada en la bitacora'
        : undefined
    }
  ]
}

// Detectar gaps para Intento 2
export function detectGaps(
  rows: CurationRow[],
  requiredComponents: RequiredComponent[]
): { lesson_id: string; lesson_title: string; component: string }[] {
  const gaps: { lesson_id: string; lesson_title: string; component: string }[] = []

  for (const req of requiredComponents) {
    const hasValidSource = rows.some(
      r => r.lesson_id === req.lesson_id &&
           r.component === req.component &&
           r.apta === true &&
           r.cobertura_completa === true
    )

    if (!hasValidSource) {
      gaps.push({
        lesson_id: req.lesson_id,
        lesson_title: req.lesson_title,
        component: req.component
      })
    }
  }

  return gaps
}

// Generar bloqueadores automaticos tras Intento 2
export function generateAutoBlockers(
  gaps: { lesson_id: string; lesson_title: string; component: string }[],
  attemptNumber: number
): Omit<CurationBlocker, 'id' | 'created_at'>[] {
  if (attemptNumber < 2 || gaps.length === 0) return []

  return gaps.map(gap => ({
    lesson_id: gap.lesson_id,
    lesson_title: gap.lesson_title,
    component: gap.component,
    impact: `Componente ${gap.component} de leccion "${gap.lesson_title}" sin fuente apta con cobertura completa tras 2 intentos`,
    owner: 'Pendiente asignar',
    status: 'OPEN' as const
  }))
}
