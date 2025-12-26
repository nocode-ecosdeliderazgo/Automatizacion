'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/shared/lib/supabase/client'
import type { PipelineProgress } from '../types/generation.types'
import { PIPELINE_STATES } from '../types/generation.types'

export function usePipelineProgress(artifactId: string | null) {
  const [progress, setProgress] = useState<PipelineProgress | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!artifactId) return

    const supabase = createClient()

    // Get initial state
    supabase
      .from('artifacts')
      .select('state')
      .eq('id', artifactId)
      .single()
      .then(({ data, error }) => {
        if (error) {
          setError(error.message)
          return
        }

        if (data) {
          const stateInfo = PIPELINE_STATES[data.state as keyof typeof PIPELINE_STATES]
          setProgress({
            state: data.state,
            message: stateInfo?.label || data.state,
            progress: stateInfo?.progress || 0,
            artifactId
          })
        }
      })

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`artifact:${artifactId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'artifacts',
          filter: `id=eq.${artifactId}`
        },
        (payload) => {
          const artifact = payload.new as { state: string; id: string }
          const stateInfo = PIPELINE_STATES[artifact.state as keyof typeof PIPELINE_STATES]

          setProgress({
            state: artifact.state,
            message: stateInfo?.label || artifact.state,
            progress: stateInfo?.progress || 0,
            artifactId: artifact.id
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [artifactId])

  return { progress, error }
}
