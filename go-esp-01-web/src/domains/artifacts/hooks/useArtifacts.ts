'use client'

import { useEffect, useState, useCallback } from 'react'
import { artifactsService } from '../services/artifacts.service'
import type { Artifact, ArtifactFilters } from '../types/artifact.types'

export function useArtifacts(filters?: ArtifactFilters) {
  const [artifacts, setArtifacts] = useState<Artifact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchArtifacts = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await artifactsService.list(filters)
      setArtifacts(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchArtifacts()
  }, [fetchArtifacts])

  return {
    artifacts,
    loading,
    error,
    refetch: fetchArtifacts
  }
}

export function useArtifact(id: string) {
  const [artifact, setArtifact] = useState<Artifact | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return

    setLoading(true)
    setError(null)

    artifactsService.getById(id)
      .then(data => {
        setArtifact(data)
      })
      .catch(err => {
        setError(err.message)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [id])

  return { artifact, loading, error }
}

export function useArtifactStats() {
  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    generating: 0,
    pending_qa: 0,
    approved: 0,
    rejected: 0,
    escalated: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    artifactsService.getStats()
      .then(setStats)
      .finally(() => setLoading(false))
  }, [])

  return { stats, loading }
}
