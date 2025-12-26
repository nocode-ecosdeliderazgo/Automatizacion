'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Sparkles } from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import { Textarea } from '@/shared/components/ui/textarea'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'

import { generationService } from '../services/generation.service'
import { usePipelineProgress } from '../hooks/usePipelineProgress'
import { PipelineProgress } from './PipelineProgress'

const schema = z.object({
  ideaCentral: z.string()
    .min(10, 'Mínimo 10 caracteres')
    .max(500, 'Máximo 500 caracteres'),
  courseId: z.string().optional()
})

type FormData = z.infer<typeof schema>

export function GenerationForm() {
  const router = useRouter()
  const [artifactId, setArtifactId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const { progress, error: progressError } = usePipelineProgress(artifactId)

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { ideaCentral: '', courseId: '' }
  })

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const result = await generationService.startGeneration(data)
      setArtifactId(result.artifactId)
    } catch (error: any) {
      setSubmitError(error.message || 'Error al iniciar generación')
      setIsSubmitting(false)
    }
  }

  // Redirect when ready
  if (progress?.state === 'READY_FOR_QA' && artifactId) {
    setTimeout(() => {
      router.push(`/artifacts/${artifactId}`)
    }, 1500)
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Generar Nuevo Artefacto
        </CardTitle>
        <CardDescription>
          Ingresa la idea central del curso para generar nombres, objetivos y descripción
        </CardDescription>
      </CardHeader>

      <CardContent>
        {artifactId ? (
          <div className="space-y-4">
            <PipelineProgress progress={progress} error={progressError} />

            {progress?.state === 'READY_FOR_QA' && (
              <p className="text-center text-green-600 font-medium">
                Redirigiendo al artefacto...
              </p>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {submitError && (
              <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                {submitError}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="ideaCentral">Idea Central del Curso</Label>
              <Textarea
                id="ideaCentral"
                placeholder="Ejemplo: Curso sobre liderazgo transformacional para gerentes de nivel medio que buscan desarrollar habilidades de coaching y comunicación efectiva..."
                className="min-h-[120px]"
                {...register('ideaCentral')}
                disabled={isSubmitting}
              />
              {errors.ideaCentral && (
                <p className="text-sm text-destructive">
                  {errors.ideaCentral.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Sé específico sobre el tema, audiencia y objetivos del curso
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="courseId">ID del Curso (opcional)</Label>
              <Input
                id="courseId"
                placeholder="CURSO-001"
                {...register('courseId')}
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground">
                Identificador único para tracking
              </p>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full"
              size="lg"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Iniciando...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generar Artefacto
                </>
              )}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
