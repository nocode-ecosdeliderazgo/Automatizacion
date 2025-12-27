'use client'

import { useEffect, useState, useCallback } from 'react'
import { instructionalPlanService } from '../services/instructionalPlan.service'
import type { Esp03PlanPayload, Esp03StepState, Blocker } from '../types/instructionalPlan.types'

export function useInstructionalPlan(artifactId: string) {
  const [plan, setPlan] = useState<Esp03PlanPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const fetchPlan = useCallback(async () => {
    if (!artifactId) return

    try {
      const data = await instructionalPlanService.getPlan(artifactId)
      setPlan(data)
      setIsGenerating(data?.state === 'STEP_GENERATING' || data?.state === 'STEP_VALIDATING')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [artifactId])

  useEffect(() => {
    fetchPlan()
  }, [fetchPlan])

  // Polling mientras está generando
  useEffect(() => {
    if (!isGenerating) return

    const interval = setInterval(() => {
      fetchPlan()
    }, 2000)

    return () => clearInterval(interval)
  }, [isGenerating, fetchPlan])

  const startGeneration = async () => {
    setIsGenerating(true)
    setError(null)

    try {
      const result = await instructionalPlanService.startGeneration(artifactId)
      if (!result.success) {
        setError(result.error || 'Error al iniciar generación')
        setIsGenerating(false)
      }
    } catch (err: any) {
      setError(err.message)
      setIsGenerating(false)
    }
  }

  const regenerate = async () => {
    setIsGenerating(true)
    setError(null)

    try {
      const result = await instructionalPlanService.regenerate(artifactId)
      if (!result.success) {
        setError(result.error || 'Error al regenerar')
        setIsGenerating(false)
      }
    } catch (err: any) {
      setError(err.message)
      setIsGenerating(false)
    }
  }

  const applyDecision = async (
    decision: 'APPROVED' | 'WITH_BLOCKERS',
    notes?: string,
    newBlockers?: Omit<Blocker, 'id' | 'created_at'>[]
  ) => {
    try {
      await instructionalPlanService.applyArchitectDecision(artifactId, decision, notes, newBlockers)
      await fetchPlan()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const addBlocker = async (blocker: Omit<Blocker, 'id' | 'created_at'>) => {
    try {
      await instructionalPlanService.addBlocker(artifactId, blocker)
      await fetchPlan()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const updateBlocker = async (blockerId: string, updates: Partial<Blocker>) => {
    try {
      await instructionalPlanService.updateBlocker(artifactId, blockerId, updates)
      await fetchPlan()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const removeBlocker = async (blockerId: string) => {
    try {
      await instructionalPlanService.removeBlocker(artifactId, blockerId)
      await fetchPlan()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const markNoBlockers = async () => {
    try {
      await instructionalPlanService.markNoBlockers(artifactId)
      await fetchPlan()
    } catch (err: any) {
      setError(err.message)
    }
  }

  return {
    plan,
    loading,
    error,
    isGenerating,
    refetch: fetchPlan,
    startGeneration,
    regenerate,
    applyDecision,
    addBlocker,
    updateBlocker,
    removeBlocker,
    markNoBlockers
  }
}
