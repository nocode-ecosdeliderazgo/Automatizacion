// GO-ESP-02: Validadores automaticos

import type { SyllabusModule, ValidationCheck, TemarioValidation } from '../types/syllabus.types'

const MIN_OBJECTIVE_LENGTH = 12
const MIN_LESSONS = 3
const MAX_LESSONS = 6

// V01: Numero de modulos == numero de objetivos generales
export function validateModulesMatchObjectives(
  modules: SyllabusModule[],
  objetivosGenerales: string[]
): ValidationCheck {
  const modulesCount = modules.length
  const objectivesCount = objetivosGenerales.length
  const pass = modulesCount === objectivesCount

  return {
    code: 'V01',
    pass,
    message: pass
      ? `${modulesCount} modulos coinciden con ${objectivesCount} objetivos generales`
      : `Error: ${modulesCount} modulos pero ${objectivesCount} objetivos generales`,
    observed: modulesCount
  }
}

// V02: Cada modulo tiene 3-6 lecciones
export function validateLessonsRange(modules: SyllabusModule[]): ValidationCheck {
  const invalidModules = modules.filter(
    m => m.lessons.length < MIN_LESSONS || m.lessons.length > MAX_LESSONS
  )

  const pass = invalidModules.length === 0

  return {
    code: 'V02',
    pass,
    message: pass
      ? `Todos los modulos tienen entre ${MIN_LESSONS} y ${MAX_LESSONS} lecciones`
      : `Error: ${invalidModules.length} modulo(s) fuera de rango (${MIN_LESSONS}-${MAX_LESSONS} lecciones)`,
    observed: invalidModules.map(m => `${m.title}: ${m.lessons.length} lecciones`).join(', ') || 'OK'
  }
}

// V03: Cada leccion tiene objetivo especifico no vacio (min 12 chars)
export function validateObjectivesPresent(modules: SyllabusModule[]): ValidationCheck {
  const invalidLessons: string[] = []

  modules.forEach(module => {
    module.lessons.forEach(lesson => {
      const objective = lesson.objective_specific?.trim() || ''
      if (objective.length < MIN_OBJECTIVE_LENGTH) {
        invalidLessons.push(`${module.title} > ${lesson.title}`)
      }
    })
  })

  const pass = invalidLessons.length === 0

  return {
    code: 'V03',
    pass,
    message: pass
      ? 'Todas las lecciones tienen objetivos especificos validos'
      : `Error: ${invalidLessons.length} leccion(es) sin objetivo especifico valido`,
    observed: invalidLessons.length > 0 ? invalidLessons.slice(0, 3).join(', ') : 'OK'
  }
}

// V04: No hay duplicados obvios
export function validateNoDuplicates(modules: SyllabusModule[]): ValidationCheck {
  const duplicates: string[] = []

  // Verificar titulos de modulos duplicados
  const moduleTitles = modules.map(m => m.title.toLowerCase().trim())
  const uniqueModuleTitles = new Set(moduleTitles)
  if (moduleTitles.length !== uniqueModuleTitles.size) {
    duplicates.push('Titulos de modulos duplicados')
  }

  // Verificar objetivos especificos duplicados
  const allObjectives: string[] = []
  modules.forEach(module => {
    module.lessons.forEach(lesson => {
      const normalized = lesson.objective_specific.toLowerCase().trim()
      if (allObjectives.includes(normalized)) {
        duplicates.push(`Objetivo duplicado: "${lesson.objective_specific.slice(0, 30)}..."`)
      }
      allObjectives.push(normalized)
    })
  })

  const pass = duplicates.length === 0

  return {
    code: 'V04',
    pass,
    message: pass
      ? 'No se encontraron duplicados'
      : `Error: ${duplicates.length} duplicado(s) encontrado(s)`,
    observed: duplicates.length > 0 ? duplicates.slice(0, 2).join('; ') : 'OK'
  }
}

// V05: Estructura completa (sin huecos)
export function validateStructureComplete(modules: SyllabusModule[]): ValidationCheck {
  const issues: string[] = []

  if (modules.length === 0) {
    issues.push('No hay modulos')
  }

  modules.forEach(module => {
    if (!module.title?.trim()) {
      issues.push(`Modulo sin titulo (ID: ${module.id})`)
    }
    if (!module.objective_general_ref?.trim()) {
      issues.push(`Modulo "${module.title}" sin objetivo general de referencia`)
    }
    if (!module.lessons || module.lessons.length === 0) {
      issues.push(`Modulo "${module.title}" sin lecciones`)
    }
    module.lessons?.forEach(lesson => {
      if (!lesson.title?.trim()) {
        issues.push(`Leccion sin titulo en modulo "${module.title}"`)
      }
    })
  })

  const pass = issues.length === 0

  return {
    code: 'V05',
    pass,
    message: pass
      ? 'Estructura del temario completa'
      : `Error: ${issues.length} problema(s) de estructura`,
    observed: issues.length > 0 ? issues.slice(0, 2).join('; ') : 'OK'
  }
}

// Ejecutar todas las validaciones
export function runAllValidations(
  modules: SyllabusModule[],
  objetivosGenerales: string[]
): TemarioValidation {
  const checks: ValidationCheck[] = [
    validateModulesMatchObjectives(modules, objetivosGenerales),
    validateLessonsRange(modules),
    validateObjectivesPresent(modules),
    validateNoDuplicates(modules),
    validateStructureComplete(modules)
  ]

  const automatic_pass = checks.every(c => c.pass)

  return {
    automatic_pass,
    checks,
    ran_at: new Date().toISOString()
  }
}
