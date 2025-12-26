'use client'

import { useState } from 'react'
import { CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Textarea } from '@/shared/components/ui/textarea'
import { Label } from '@/shared/components/ui/label'
import { Badge } from '@/shared/components/ui/badge'
import { Separator } from '@/shared/components/ui/separator'
import { SyllabusViewer } from './SyllabusViewer'
import { syllabusService } from '../services/syllabus.service'
import { useSyllabus } from '../hooks/useSyllabus'
import type { Esp02StepState } from '../types/syllabus.types'

interface SyllabusQAViewProps {
  artifactId: string
  onDecision?: (decision: 'APPROVED' | 'REJECTED') => void
}

export function SyllabusQAView({ artifactId, onDecision }: SyllabusQAViewProps) {
  const { temario, loading, refetch } = useSyllabus(artifactId)
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleDecision = async (decision: 'APPROVED' | 'REJECTED') => {
    if (decision === 'REJECTED' && !notes.trim()) {
      alert('Por favor, agrega observaciones para el rechazo')
      return
    }

    setIsSubmitting(true)
    try {
      await syllabusService.applyQaDecision(artifactId, decision, notes)
      refetch()
      onDecision?.(decision)
    } catch (err) {
      console.error('Error al aplicar decision:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!temario) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No hay temario para revisar. El Paso 2 aun no ha sido generado.
        </CardContent>
      </Card>
    )
  }

  const isReadyForQA = temario.state === 'STEP_READY_FOR_QA'
  const isDecided = temario.state === 'STEP_APPROVED' || temario.state === 'STEP_REJECTED'

  const getStateColor = (state: Esp02StepState) => {
    switch (state) {
      case 'STEP_APPROVED':
        return 'bg-green-500'
      case 'STEP_REJECTED':
        return 'bg-red-500'
      case 'STEP_READY_FOR_QA':
        return 'bg-yellow-500'
      case 'STEP_ESCALATED':
        return 'bg-orange-500'
      default:
        return 'bg-gray-500'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header con estado */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Revision QA - Paso 2: Temario</CardTitle>
              <CardDescription>
                Ruta: {temario.route === 'A_WITH_SOURCE' ? 'Con fuente primaria' : 'Sin fuente (IA)'}
              </CardDescription>
            </div>
            <Badge className={getStateColor(temario.state)}>
              {temario.state.replace('STEP_', '')}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Checklist de validaciones */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Validaciones Automaticas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {temario.validation.checks.map((check, i) => (
              <div key={i} className="flex items-start gap-3 py-2">
                {check.pass ? (
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                      {check.code}
                    </span>
                    <span className={check.pass ? 'text-muted-foreground' : 'text-red-600'}>
                      {check.message}
                    </span>
                  </div>
                  {check.observed && check.observed !== 'OK' && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Observado: {check.observed}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <Separator className="my-4" />

          <div className="flex items-center gap-2">
            {temario.validation.automatic_pass ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-green-600 font-medium">
                  Todas las validaciones pasaron
                </span>
              </>
            ) : (
              <>
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                <span className="text-yellow-600 font-medium">
                  Algunas validaciones fallaron
                </span>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Vista del temario */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contenido del Temario</CardTitle>
        </CardHeader>
        <CardContent>
          <SyllabusViewer
            modules={temario.modules}
            showValidation={false}
          />
        </CardContent>
      </Card>

      {/* Decision QA */}
      {isReadyForQA && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Decision de QA</CardTitle>
            <CardDescription>
              Revisa el temario y aprueba o rechaza con observaciones
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Observaciones {!notes.trim() && '(requerido para rechazar)'}</Label>
              <Textarea
                id="notes"
                placeholder="Escribe tus observaciones aqui..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
              />
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => handleDecision('APPROVED')}
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="mr-2 h-4 w-4" />
                )}
                Aprobar
              </Button>
              <Button
                onClick={() => handleDecision('REJECTED')}
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
      )}

      {/* Resultado de decision previa */}
      {isDecided && temario.qa && (
        <Card className={temario.state === 'STEP_APPROVED' ? 'border-green-500' : 'border-red-500'}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              {temario.state === 'STEP_APPROVED' ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Temario Aprobado
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-500" />
                  Temario Rechazado
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><strong>Revisado por:</strong> {temario.qa.reviewed_by}</p>
            <p><strong>Fecha:</strong> {temario.qa.reviewed_at ? new Date(temario.qa.reviewed_at).toLocaleString() : '-'}</p>
            {temario.qa.notes && (
              <div>
                <strong>Observaciones:</strong>
                <p className="mt-1 p-2 bg-muted rounded">{temario.qa.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
