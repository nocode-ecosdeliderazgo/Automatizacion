'use client'

import { useEffect, useState } from 'react'
import { syllabusService } from '../services/syllabus.service'
import type { Esp02StepState } from '../types/syllabus.types'
import { ESP02_STATES } from '../types/syllabus.types'

interface SyllabusProgress {
  state: Esp02StepState
  label: string
  progress: number
}

export function useSyllabusProgress(artifactId: string | null) {
  const [progress, setProgress] = useState<SyllabusProgress | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!artifactId) return

    const fetchState = async () => {
      try {
        const temario = await syllabusService.getTemario(artifactId)
        if (temario) {
          const stateInfo = ESP02_STATES[temario.state]
          setProgress({
            state: temario.state,
            label: stateInfo?.label || temario.state,
            progress: stateInfo?.progress || 0
          })
        } else {
          setProgress({
            state: 'STEP_DRAFT',
            label: ESP02_STATES.STEP_DRAFT.label,
            progress: 0
          })
        }
      } catch (err: any) {
        setError(err.message)
      }
    }

    fetchState()

    // Poll cada 2 segundos
    const interval = setInterval(fetchState, 2000)

    return () => clearInterval(interval)
  }, [artifactId])

  return { progress, error }
}
