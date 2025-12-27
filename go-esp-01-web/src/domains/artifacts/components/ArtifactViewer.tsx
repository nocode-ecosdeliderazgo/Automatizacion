'use client'

import { useState } from 'react'
import { CheckCircle, XCircle, AlertCircle, Loader2, BookOpen, ClipboardList } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { Separator } from '@/shared/components/ui/separator'
import { getStateColor, getStateLabel, formatDate } from '@/shared/lib/utils'
import { useArtifact } from '../hooks/useArtifacts'
import { ArtifactQAActions } from './ArtifactQAActions'
import { SyllabusGenerationForm, useSyllabus } from '@/domains/syllabus'
import { InstructionalPlanForm, useInstructionalPlan } from '@/domains/instructionalPlan'
import type { ArtifactDescription, ValidationReport, SemanticResult } from '../types/artifact.types'

interface Props {
  artifactId: string
}

export function ArtifactViewer({ artifactId }: Props) {
  const { artifact, loading, error, refetch } = useArtifact(artifactId)
  const { temario } = useSyllabus(artifactId)
  const { plan: instructionalPlan } = useInstructionalPlan(artifactId)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleQAAction = () => {
    refetch()
    setRefreshKey(k => k + 1)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !artifact) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h3 className="font-medium text-lg">Artefacto no encontrado</h3>
        <p className="text-muted-foreground">{error || 'El artefacto no existe'}</p>
      </div>
    )
  }

  const nombres = artifact.nombres as string[] | null
  const objetivos = artifact.objetivos as string[] | null
  const descripcion = artifact.descripcion as ArtifactDescription | null
  const validationReport = artifact.validation_report as ValidationReport | null
  const semanticResult = artifact.semantic_result as SemanticResult | null

  const isPaso1Approved = artifact.state === 'APPROVED'
  const isPaso1ReadyForQA = artifact.state === 'READY_FOR_QA'
  const hasPaso2 = temario && temario.modules.length > 0
  const isPaso2Approved = temario?.state === 'STEP_APPROVED'
  const hasPaso3 = instructionalPlan && instructionalPlan.lesson_plans.length > 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {nombres?.[0] || 'Artefacto sin nombre'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {artifact.idea_central}
          </p>
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <Badge className={getStateColor(artifact.state)}>
              Paso 1: {getStateLabel(artifact.state)}
            </Badge>
            {hasPaso2 && (
              <Badge className={getStateColor(temario.state.replace('STEP_', '') as any)}>
                Paso 2: {temario.state.replace('STEP_', '')}
              </Badge>
            )}
            {hasPaso3 && (
              <Badge className={getStateColor(instructionalPlan.state.replace('STEP_', '') as any)}>
                Paso 3: {instructionalPlan.state.replace('STEP_', '')}
              </Badge>
            )}
            <span className="text-sm text-muted-foreground">
              Creado: {formatDate(artifact.created_at)}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs principales: Paso 1, Paso 2 y Paso 3 */}
      <Tabs defaultValue="paso1">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="paso1" className="flex items-center gap-2">
            Paso 1: Artefacto
            {isPaso1Approved && <CheckCircle className="h-4 w-4 text-green-500" />}
          </TabsTrigger>
          <TabsTrigger value="paso2" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Paso 2: Temario
            {isPaso2Approved && <CheckCircle className="h-4 w-4 text-green-500" />}
          </TabsTrigger>
          <TabsTrigger value="paso3" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Paso 3: Plan
            {instructionalPlan?.state === 'STEP_APPROVED' && (
              <CheckCircle className="h-4 w-4 text-green-500" />
            )}
          </TabsTrigger>
        </TabsList>

        {/* PASO 1 */}
        <TabsContent value="paso1" className="mt-6">
          <Tabs defaultValue="content">
            <TabsList>
              <TabsTrigger value="content">Contenido</TabsTrigger>
              <TabsTrigger value="validation">Validacion</TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="space-y-4 mt-4">
              {/* Nombres */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    Nombres del Curso
                    {validationReport?.results?.find(r => r.code === 'VAL_001')?.passed && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="list-decimal list-inside space-y-2">
                    {nombres?.map((nombre, i) => (
                      <li key={i} className="text-lg">{nombre}</li>
                    ))}
                  </ol>
                </CardContent>
              </Card>

              {/* Objetivos */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    Objetivos de Aprendizaje
                    {validationReport?.results?.find(r => r.code === 'VAL_002')?.passed && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {objetivos?.map((obj, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{obj}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Descripcion */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    Descripcion
                    {validationReport?.results?.find(r => r.code === 'VAL_003')?.passed && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-base leading-relaxed">
                    {descripcion?.texto}
                  </p>

                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground">
                        Publico Objetivo
                      </h4>
                      <p className="mt-1">{descripcion?.publico_objetivo}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground">
                        Beneficios
                      </h4>
                      <p className="mt-1">{descripcion?.beneficios}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground">
                        Estructura
                      </h4>
                      <p className="mt-1">{descripcion?.estructura_general}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground">
                        Diferenciador
                      </h4>
                      <p className="mt-1">{descripcion?.diferenciador}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="validation" className="space-y-4 mt-4">
              {/* Validation Report */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    Validacion Determinista
                    {validationReport?.all_passed ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {validationReport?.results?.map((result, i) => (
                      <div key={i} className="flex items-center gap-3">
                        {result.passed ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                        <span className="font-mono text-sm text-muted-foreground">
                          {result.code}
                        </span>
                        <span>{result.message}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Semantic Result */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    Validacion Semantica
                    {semanticResult?.passed ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-yellow-500" />
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="text-sm text-muted-foreground">Confianza</span>
                      <p className="text-2xl font-bold">
                        {((semanticResult?.confidence || 0) * 100).toFixed(0)}%
                      </p>
                    </div>
                    <div className="flex-1">
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${(semanticResult?.confidence || 0) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <p className="text-muted-foreground">
                    {semanticResult?.rationale}
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* QA Actions for Paso 1 */}
          {isPaso1ReadyForQA && (
            <ArtifactQAActions
              artifactId={artifactId}
              onAction={handleQAAction}
            />
          )}
        </TabsContent>

        {/* PASO 2: TEMARIO */}
        <TabsContent value="paso2" className="mt-6">
          {!isPaso1Approved ? (
            <Card>
              <CardContent className="py-12 text-center">
                <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                <h3 className="font-medium text-lg">Paso 1 pendiente</h3>
                <p className="text-muted-foreground mt-2">
                  El Paso 1 debe estar aprobado antes de generar el temario.
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Estado actual: {getStateLabel(artifact.state)}
                </p>
              </CardContent>
            </Card>
          ) : (
            <SyllabusGenerationForm
              artifactId={artifactId}
              artifactName={nombres?.[0] || artifact.idea_central}
              objetivos={objetivos || []}
            />
          )}
        </TabsContent>

        {/* PASO 3: PLAN INSTRUCCIONAL */}
        <TabsContent value="paso3" className="mt-6">
          {!isPaso2Approved ? (
            <Card>
              <CardContent className="py-12 text-center">
                <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                <h3 className="font-medium text-lg">Paso 2 pendiente</h3>
                <p className="text-muted-foreground mt-2">
                  El Paso 2 (Temario) debe estar aprobado antes de generar el plan instruccional.
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Estado actual del temario: {temario?.state?.replace('STEP_', '') || 'Sin iniciar'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <InstructionalPlanForm
              artifactId={artifactId}
              courseName={nombres?.[0] || artifact.idea_central}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
