'use client'

import { CheckCircle, Circle, Loader2 } from 'lucide-react'
import { Progress } from '@/shared/components/ui/progress'
import type { PipelineProgress as ProgressType } from '../types/generation.types'

const STEPS = [
  { key: 'GENERATING', label: 'Generando con IA' },
  { key: 'VALIDATING', label: 'Validando' },
  { key: 'READY_FOR_QA', label: 'Listo para QA' }
]

interface Props {
  progress: ProgressType | null
  error?: string | null
}

export function PipelineProgress({ progress, error }: Props) {
  if (error) {
    return (
      <div className="p-4 rounded-md bg-destructive/10 text-destructive">
        <p className="font-medium">Error en el pipeline</p>
        <p className="text-sm">{error}</p>
      </div>
    )
  }

  if (!progress) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Conectando...</span>
      </div>
    )
  }

  const currentIndex = STEPS.findIndex(s => s.key === progress.state)
  const isComplete = progress.state === 'READY_FOR_QA' ||
    progress.state === 'APPROVED' ||
    progress.state === 'REJECTED'

  return (
    <div className="space-y-6">
      <Progress value={progress.progress} className="h-2" />

      <div className="space-y-3">
        {STEPS.map((step, index) => {
          const isStepComplete = index < currentIndex || isComplete
          const isCurrent = index === currentIndex && !isComplete
          const isPending = index > currentIndex && !isComplete

          return (
            <div key={step.key} className="flex items-center gap-3">
              {isStepComplete && (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
              {isCurrent && (
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              )}
              {isPending && (
                <Circle className="h-5 w-5 text-muted-foreground/40" />
              )}

              <span className={
                isCurrent
                  ? 'font-medium text-foreground'
                  : isStepComplete
                    ? 'text-muted-foreground'
                    : 'text-muted-foreground/60'
              }>
                {step.label}
              </span>
            </div>
          )
        })}
      </div>

      <p className="text-sm text-muted-foreground text-center">
        {progress.message}
      </p>
    </div>
  )
}
