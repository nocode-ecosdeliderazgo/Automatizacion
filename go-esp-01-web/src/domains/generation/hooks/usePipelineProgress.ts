'use client'

import { useEffect, useState } from 'react'
import { artifactsService } from '@/domains/artifacts/services/artifacts.service'
import type { PipelineProgress } from '../types/generation.types'
import { PIPELINE_STATES } from '../types/generation.types'

export function usePipelineProgress(artifactId: string | null) {
  const [progress, setProgress] = useState<PipelineProgress | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!artifactId) return

    // Get initial state
    const fetchState = async () => {
      try {
        const artifact = await artifactsService.getById(artifactId)
        if (artifact) {
          const stateInfo = PIPELINE_STATES[artifact.state as keyof typeof PIPELINE_STATES]
          setProgress({
            state: artifact.state,
            message: stateInfo?.label || artifact.state,
            progress: stateInfo?.progress || 0,
            artifactId
          })
        }
      } catch (err: any) {
        setError(err.message)
      }
    }

    fetchState()

    // Poll for updates every 2 seconds (simulates realtime)
    const interval = setInterval(fetchState, 2000)

    return () => clearInterval(interval)
  }, [artifactId])

  return { progress, error }
}
