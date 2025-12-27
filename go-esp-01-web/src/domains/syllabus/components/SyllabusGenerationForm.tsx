'use client'

import { useState } from 'react'
import { Loader2, Sparkles, Upload, AlertCircle, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Progress } from '@/shared/components/ui/progress'
import { Textarea } from '@/shared/components/ui/textarea'
import { Badge } from '@/shared/components/ui/badge'
import { SyllabusRouteSelector } from './SyllabusRouteSelector'
import { SyllabusViewer } from './SyllabusViewer'
import { syllabusService } from '../services/syllabus.service'
import { useSyllabusProgress } from '../hooks/useSyllabusProgress'
import { useSyllabus } from '../hooks/useSyllabus'
import type { Esp02Route } from '../types/syllabus.types'

interface SyllabusGenerationFormProps {
  artifactId: string
  artifactName: string
  objetivos: string[]
  onComplete?: () => void
}

export function SyllabusGenerationForm({
  artifactId,
  artifactName,
  objetivos,
  onComplete
}: SyllabusGenerationFormProps) {
  const [route, setRoute] = useState<Esp02Route | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [qaNote, setQaNote] = useState('')
  const [isApproving, setIsApproving] = useState(false)

  const { progress } = useSyllabusProgress(isGenerating ? artifactId : null)
  const { temario, refetch } = useSyllabus(artifactId)

  const handleGenerate = async () => {
    if (!route) {
      setError('Selecciona una ruta de generacion')
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      const result = await syllabusService.startGeneration({
        artifactId,
        route
      })

      if (!result.success) {
        setError(result.error || 'Error al iniciar generacion')
        setIsGenerating(false)
        return
      }

      // Esperar a que termine
      const checkCompletion = setInterval(async () => {
        const state = await syllabusService.getState(artifactId)
        if (
          state === 'STEP_READY_FOR_QA' ||
          state === 'STEP_APPROVED' ||
          state === 'STEP_ESCALATED'
        ) {
          clearInterval(checkCompletion)
          setIsGenerating(false)
          refetch()
          onComplete?.()
        }
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'Error inesperado')
      setIsGenerating(false)
    }
  }

  const handleQaDecision = async (decision: 'APPROVED' | 'REJECTED') => {
    setIsApproving(true)
    try {
      await syllabusService.applyQaDecision(artifactId, decision, qaNote)
      refetch()
      onComplete?.()
    } catch (err: any) {
      setError(err.message || 'Error al aplicar decision')
    } finally {
      setIsApproving(false)
    }
  }

  // Si ya hay un temario, mostrar el viewer
  if (temario && temario.modules.length > 0) {
    const isReadyForQA = temario.state === 'STEP_READY_FOR_QA'
    const isApproved = temario.state === 'STEP_APPROVED'
    const isRejected = temario.state === 'STEP_REJECTED'

    const getStateBadge = () => {
      if (isApproved) return <Badge className="bg-green-100 text-green-800">Aprobado</Badge>
      if (isRejected) return <Badge className="bg-red-100 text-red-800">Rechazado</Badge>
      if (isReadyForQA) return <Badge className="bg-blue-100 text-blue-800">Pendiente Revision</Badge>
      return <Badge variant="secondary">{temario.state.replace('STEP_', '')}</Badge>
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold">Temario Generado</h3>
            {getStateBadge()}
          </div>
          <p className="text-sm text-muted-foreground">
            Ruta: {temario.route === 'A_WITH_SOURCE' ? 'Con fuente' : 'Sin fuente'}
          </p>
        </div>

        <SyllabusViewer modules={temario.modules} validation={temario.validation} />

        {/* Panel de aprobacion para STEP_READY_FOR_QA */}
        {isReadyForQA && (
          <Card className="border-primary/50">
            <CardHeader>
              <CardTitle className="text-base">Decision del Revisor - Paso 2</CardTitle>
              <CardDescription>
                Revisa el temario generado y decide si aprobarlo o rechazarlo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Notas (opcional)</label>
                <Textarea
                  placeholder="Observaciones sobre el temario..."
                  value={qaNote}
                  onChange={(e) => setQaNote(e.target.value)}
                  rows={2}
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={() => handleQaDecision('APPROVED')}
                  disabled={isApproving}
                  className="flex-1"
                >
                  {isApproving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="mr-2 h-4 w-4" />
                  )}
                  Aprobar Temario
                </Button>
                <Button
                  onClick={() => handleQaDecision('REJECTED')}
                  disabled={isApproving}
                  variant="outline"
                  className="flex-1"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Rechazar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Mensaje de aprobado */}
        {isApproved && (
          <Card className="border-green-500 bg-green-50">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-6 w-6 text-green-500" />
                <div>
                  <h4 className="font-medium">Temario Aprobado</h4>
                  <p className="text-sm text-muted-foreground">
                    El Paso 2 ha sido completado. Puedes continuar con el Paso 3.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Boton regenerar si rechazado */}
        {isRejected && (
          <Card className="border-red-500 bg-red-50">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <XCircle className="h-6 w-6 text-red-500" />
                  <div>
                    <h4 className="font-medium">Temario Rechazado</h4>
                    {temario.qa.notes && (
                      <p className="text-sm text-muted-foreground">{temario.qa.notes}</p>
                    )}
                  </div>
                </div>
                <Button onClick={handleGenerate} disabled={isGenerating}>
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Regenerando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Regenerar
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Generar Temario - Paso 2
          </CardTitle>
          <CardDescription>
            Genera el temario estructurado a partir de los objetivos del curso "{artifactName}"
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Resumen del Paso 1 */}
          <div className="p-4 rounded-lg bg-muted/50">
            <h4 className="font-medium mb-2">Objetivos generales ({objetivos.length})</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {objetivos.map((obj, i) => (
                <li key={i} className="flex gap-2">
                  <span className="font-medium">{i + 1}.</span>
                  <span>{obj}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Selector de ruta */}
          <div className="space-y-3">
            <h4 className="font-medium">Selecciona la ruta de generacion</h4>
            <SyllabusRouteSelector
              value={route}
              onChange={setRoute}
              disabled={isGenerating}
            />
          </div>

          {/* Subir archivos (Ruta A) */}
          {route === 'A_WITH_SOURCE' && (
            <div className="p-4 border-2 border-dashed rounded-lg text-center">
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Arrastra archivos aqui o haz clic para seleccionar
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PDF, DOC, DOCX, PPT, PPTX (max 10MB)
              </p>
              <p className="text-xs text-yellow-600 mt-2">
                (Upload deshabilitado en modo mock)
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Progreso */}
          {isGenerating && progress && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{progress.label}</span>
                <span>{progress.progress}%</span>
              </div>
              <Progress value={progress.progress} />
            </div>
          )}

          {/* Boton generar */}
          <Button
            onClick={handleGenerate}
            disabled={!route || isGenerating}
            className="w-full"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generando temario...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generar Temario
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
