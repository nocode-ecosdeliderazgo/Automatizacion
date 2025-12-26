// GO-ESP-02: Dominio Syllabus (Temario)

// Types
export * from './types/syllabus.types'

// Services
export { syllabusService } from './services/syllabus.service'

// Validators
export {
  validateModulesMatchObjectives,
  validateLessonsRange,
  validateObjectivesPresent,
  validateNoDuplicates,
  validateStructureComplete,
  runAllValidations
} from './validators/syllabus.validators'

// Hooks
export { useSyllabus } from './hooks/useSyllabus'
export { useSyllabusProgress } from './hooks/useSyllabusProgress'

// Components
export { SyllabusViewer } from './components/SyllabusViewer'
export { SyllabusRouteSelector } from './components/SyllabusRouteSelector'
export { SyllabusGenerationForm } from './components/SyllabusGenerationForm'
export { SyllabusQAView } from './components/SyllabusQAView'
