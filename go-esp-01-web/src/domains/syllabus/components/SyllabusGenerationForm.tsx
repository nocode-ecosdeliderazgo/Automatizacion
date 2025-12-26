'use client'

import { useState } from 'react'
import { Loader2, Sparkles, Upload, AlertCircle } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Progress } from '@/shared/components/ui/progress'
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

  // Si ya hay un temario, mostrar el viewer
  if (temario && temario.modules.length > 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Temario Generado</h3>
            <p className="text-sm text-muted-foreground">
              Ruta: {temario.route === 'A_WITH_SOURCE' ? 'Con fuente' : 'Sin fuente'} |
              Estado: {temario.state}
            </p>
          </div>
          {temario.state === 'STEP_REJECTED' && (
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
          )}
        </div>
        <SyllabusViewer modules={temario.modules} validation={temario.validation} />
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
