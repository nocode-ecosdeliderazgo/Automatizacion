'use client'

import { useState } from 'react'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Textarea } from '@/shared/components/ui/textarea'
import { Label } from '@/shared/components/ui/label'
import { artifactsService } from '../services/artifacts.service'

interface ArtifactQAActionsProps {
  artifactId: string
  onAction?: () => void
}

export function ArtifactQAActions({ artifactId, onAction }: ArtifactQAActionsProps) {
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleApprove = async () => {
    setIsSubmitting(true)
    try {
      await artifactsService.approve(artifactId)
      onAction?.()
    } catch (err) {
      console.error('Error al aprobar:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReject = async () => {
    if (!notes.trim()) {
      alert('Por favor, agrega observaciones para el rechazo')
      return
    }
    setIsSubmitting(true)
    try {
      await artifactsService.reject(artifactId)
      onAction?.()
    } catch (err) {
      console.error('Error al rechazar:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="border-primary/50">
      <CardHeader>
        <CardTitle className="text-base">Acciones de QA - Paso 1</CardTitle>
        <CardDescription>
          Revisa el artefacto y aprueba o rechaza
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="qa-notes">Observaciones (requerido para rechazar)</Label>
          <Textarea
            id="qa-notes"
            placeholder="Escribe tus observaciones aqui..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>

        <div className="flex gap-3">
          <Button
            onClick={handleApprove}
            disabled={isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="mr-2 h-4 w-4" />
            )}
            Aprobar Paso 1
          </Button>
          <Button
            onClick={handleReject}
            disabled={isSubmitting || !notes.trim()}
            variant="destructive"
            className="flex-1"
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="mr-2 h-4 w-4" />
            )}
            Rechazar
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
