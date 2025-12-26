'use client'

import { useEffect, useState, useCallback } from 'react'
import { syllabusService } from '../services/syllabus.service'
import type { TemarioEsp02, Esp02StepState } from '../types/syllabus.types'

interface UseSyllabusResult {
  temario: (TemarioEsp02 & { state: Esp02StepState; iteration_count: number }) | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useSyllabus(artifactId: string | null): UseSyllabusResult {
  const [temario, setTemario] = useState<(TemarioEsp02 & { state: Esp02StepState; iteration_count: number }) | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTemario = useCallback(async () => {
    if (!artifactId) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const data = await syllabusService.getTemario(artifactId)
      setTemario(data)
    } catch (err: any) {
      setError(err.message || 'Error al cargar temario')
    } finally {
      setLoading(false)
    }
  }, [artifactId])

  useEffect(() => {
    fetchTemario()
  }, [fetchTemario])

  return {
    temario,
    loading,
    error,
    refetch: fetchTemario
  }
}
