'use client'

import { useState, useEffect, useCallback } from 'react'
import type {
  CurationPayload,
  CurationRow,
  BitacoraEntry,
  CurationBlocker,
  Esp04StepState
} from '../types/curation.types'
import { curationService } from '../services/curation.service'

interface UseCurationReturn {
  curation: CurationPayload | null
  loading: boolean
  error: string | null
  isGenerating: boolean
  startCuration: () => Promise<void>
  updateRow: (rowId: string, updates: Partial<CurationRow>) => Promise<void>
  addBitacoraEntry: (entry: Omit<BitacoraEntry, 'id' | 'created_at'>) => Promise<void>
  runAttempt2: () => Promise<void>
  submitToQA: () => Promise<void>
  applyQADecision: (decision: 'APPROVED' | 'CORRECTABLE' | 'BLOCKED', notes?: string) => Promise<void>
  addBlocker: (blocker: Omit<CurationBlocker, 'id' | 'created_at'>) => Promise<void>
  updateBlocker: (blockerId: string, updates: Partial<CurationBlocker>) => Promise<void>
  removeBlocker: (blockerId: string) => Promise<void>
  runValidations: () => Promise<{ hasErrors: boolean; canSubmitToQA: boolean }>
  refetch: () => Promise<void>
}

export function useCuration(artifactId: string): UseCurationReturn {
  const [curation, setCuration] = useState<CurationPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const fetchCuration = useCallback(async () => {
    try {
      const data = await curationService.getCuration(artifactId)
      setCuration(data)
      setError(null)
    } catch (err: any) {
      setError(err.message || 'Error al obtener curaduria')
    } finally {
      setLoading(false)
    }
  }, [artifactId])

  useEffect(() => {
    fetchCuration()
  }, [fetchCuration])

  // Polling mientras genera
  useEffect(() => {
    if (!isGenerating) return

    const interval = setInterval(async () => {
      const state = await curationService.getState(artifactId)
      if (state !== 'PHASE2_GENERATING') {
        setIsGenerating(false)
        fetchCuration()
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [isGenerating, artifactId, fetchCuration])

  const startCuration = async () => {
    setIsGenerating(true)
    setError(null)

    try {
      const result = await curationService.startCuration(artifactId)
      if (!result.success) {
        setError(result.error || 'Error al iniciar curaduria')
        setIsGenerating(false)
      }
    } catch (err: any) {
      setError(err.message || 'Error inesperado')
      setIsGenerating(false)
    }
  }

  const updateRow = async (rowId: string, updates: Partial<CurationRow>) => {
    await curationService.updateRow(artifactId, rowId, updates)
    await fetchCuration()
  }

  const addBitacoraEntry = async (entry: Omit<BitacoraEntry, 'id' | 'created_at'>) => {
    await curationService.addBitacoraEntry(artifactId, entry)
    await fetchCuration()
  }

  const runAttempt2 = async () => {
    setIsGenerating(true)
    setError(null)

    try {
      const result = await curationService.runAttempt2(artifactId)
      if (!result.success) {
        setError(result.error || 'Error al ejecutar intento 2')
      }
      setIsGenerating(false)
      await fetchCuration()
    } catch (err: any) {
      setError(err.message || 'Error inesperado')
      setIsGenerating(false)
    }
  }

  const submitToQA = async () => {
    try {
      const result = await curationService.submitToQA(artifactId)
      if (!result.success) {
        setError(result.error || 'Error al enviar a QA')
      }
      await fetchCuration()
    } catch (err: any) {
      setError(err.message || 'Error inesperado')
    }
  }

  const applyQADecision = async (
    decision: 'APPROVED' | 'CORRECTABLE' | 'BLOCKED',
    notes?: string
  ) => {
    await curationService.applyQADecision(artifactId, decision, notes)
    await fetchCuration()
  }

  const addBlocker = async (blocker: Omit<CurationBlocker, 'id' | 'created_at'>) => {
    await curationService.addBlocker(artifactId, blocker)
    await fetchCuration()
  }

  const updateBlocker = async (blockerId: string, updates: Partial<CurationBlocker>) => {
    await curationService.updateBlocker(artifactId, blockerId, updates)
    await fetchCuration()
  }

  const removeBlocker = async (blockerId: string) => {
    await curationService.removeBlocker(artifactId, blockerId)
    await fetchCuration()
  }

  const runValidations = async () => {
    const result = await curationService.runValidations(artifactId)
    await fetchCuration()
    return result
  }

  return {
    curation,
    loading,
    error,
    isGenerating,
    startCuration,
    updateRow,
    addBitacoraEntry,
    runAttempt2,
    submitToQA,
    applyQADecision,
    addBlocker,
    updateBlocker,
    removeBlocker,
    runValidations,
    refetch: fetchCuration
  }
}
