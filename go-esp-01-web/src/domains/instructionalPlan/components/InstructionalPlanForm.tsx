'use client'

import { useState } from 'react'
import { Loader2, BookOpen, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { Textarea } from '@/shared/components/ui/textarea'
import { Badge } from '@/shared/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { Progress } from '@/shared/components/ui/progress'
import { useInstructionalPlan } from '../hooks/useInstructionalPlan'
import { LessonPlanCard } from './LessonPlanCard'
import { BlockersPanel } from './BlockersPanel'
import { DodChecklist } from './DodChecklist'

interface InstructionalPlanFormProps {
  artifactId: string
  courseName: string
}

export function InstructionalPlanForm({ artifactId, courseName }: InstructionalPlanFormProps) {
  const {
    plan,
    loading,
    error,
    isGenerating,
    startGeneration,
    regenerate,
    applyDecision,
    addBlocker,
    updateBlocker,
    removeBlocker,
    markNoBlockers
  } = useInstructionalPlan(artifactId)

  const [notes, setNotes] = useState('')

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Estado: Sin plan generado
  if (!plan || plan.state === 'STEP_DRAFT') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Paso 3: Plan Instruccional
          </CardTitle>
          <CardDescription>
            Genera el plan instruccional detallado para cada lección del temario.
            Incluye componentes obligatorios: Diálogo, Lectura y Quiz.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={startGeneration} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <BookOpen className="mr-2 h-4 w-4" />
                Generar Plan Instruccional
              </>
            )}
          </Button>

          {error && (
            <p className="text-destructive text-sm mt-2">{error}</p>
          )}
        </CardContent>
      </Card>
    )
  }

  // Estado: Generando
  if (plan.state === 'STEP_GENERATING' || plan.state === 'STEP_VALIDATING') {
    const progress = plan.state === 'STEP_GENERATING' ? 50 : 80
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <div>
              <h3 className="font-medium text-lg">
                {plan.state === 'STEP_GENERATING' ? 'Generando plan...' : 'Validando...'}
              </h3>
              <p className="text-muted-foreground text-sm">
                Esto puede tomar unos segundos
              </p>
            </div>
            <Progress value={progress} className="max-w-xs mx-auto" />
          </div>
        </CardContent>
      </Card>
    )
  }

  // Estado: Plan generado (listo para revisión, aprobado, con bloqueadores, escalado)
  const isReadyForReview = plan.state === 'STEP_READY_FOR_REVIEW'
  const isApproved = plan.state === 'STEP_APPROVED'
  const hasBlockers = plan.state === 'STEP_WITH_BLOCKERS'
  const isEscalated = plan.state === 'STEP_ESCALATED'

  const getStateColor = () => {
    if (isApproved) return 'bg-green-100 text-green-800'
    if (hasBlockers) return 'bg-orange-100 text-orange-800'
    if (isEscalated) return 'bg-red-100 text-red-800'
    return 'bg-blue-100 text-blue-800'
  }

  const getStateLabel = () => {
    if (isApproved) return 'Aprobado Fase 1'
    if (hasBlockers) return 'Con Bloqueadores'
    if (isEscalated) return 'Escalado'
    return 'Pendiente Revisión'
  }

  // Agrupar lecciones por módulo usando module_id y ordenar por module_index
  const moduleMap = new Map<string, { title: string; index: number; lessons: typeof plan.lesson_plans }>()
  for (const lp of plan.lesson_plans) {
    const moduleId = lp.module_id || lp.module_title // fallback para compatibilidad
    const existing = moduleMap.get(moduleId)
    if (existing) {
      existing.lessons.push(lp)
    } else {
      moduleMap.set(moduleId, {
        title: lp.module_title,
        index: lp.module_index ?? 999,
        lessons: [lp]
      })
    }
  }

  // Convertir a array y ordenar por module_index
  const modules = Array.from(moduleMap.entries())
    .sort((a, b) => a[1].index - b[1].index)

  // Funcion para limpiar prefijos duplicados del titulo del modulo
  const cleanModuleTitle = (title: string): string => {
    if (!title) return '(Sin título)'
    // Remover prefijos como "Módulo 1:", "Modulo 2:", etc.
    return title.replace(/^M[óo]dulo\s+\d+\s*:\s*/i, '').trim() || title
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge className={getStateColor()}>
            {getStateLabel()}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {plan.lesson_plans.length} lecciones planificadas
          </span>
          <span className="text-sm text-muted-foreground">
            Iteración: {plan.iteration_count}/2
          </span>
        </div>
        {!isApproved && !hasBlockers && plan.iteration_count < 2 && (
          <Button variant="outline" size="sm" onClick={regenerate} disabled={isGenerating}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Regenerar
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="plan">
        <TabsList>
          <TabsTrigger value="plan">Plan por Lección</TabsTrigger>
          <TabsTrigger value="validation">Validación y DoD</TabsTrigger>
          <TabsTrigger value="blockers">
            Bloqueadores
            {plan.blockers.length > 0 && (
              <Badge variant="secondary" className="ml-2">{plan.blockers.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Tab: Plan */}
        <TabsContent value="plan" className="space-y-4 mt-4">
          {modules.map(([moduleId, moduleData], displayIndex) => (
            <div key={moduleId} className="space-y-3">
              <h3 className="font-medium text-lg flex items-center gap-2">
                <span className="text-muted-foreground">Módulo {displayIndex + 1}:</span>
                {cleanModuleTitle(moduleData.title)}
              </h3>
              <div className="space-y-2 pl-4">
                {moduleData.lessons.map((lp, index) => (
                  <LessonPlanCard
                    key={lp.lesson_id}
                    lessonPlan={lp}
                    index={index}
                  />
                ))}
              </div>
            </div>
          ))}
        </TabsContent>

        {/* Tab: Validación */}
        <TabsContent value="validation" className="mt-4">
          <DodChecklist
            checklist={plan.dod.checklist}
            automaticChecks={plan.dod.automatic_checks}
            semanticChecks={plan.dod.semantic_checks}
          />
        </TabsContent>

        {/* Tab: Bloqueadores */}
        <TabsContent value="blockers" className="mt-4">
          <BlockersPanel
            blockers={plan.blockers}
            onAdd={addBlocker}
            onUpdate={updateBlocker}
            onRemove={removeBlocker}
            onMarkNoBlockers={markNoBlockers}
            readOnly={isApproved || hasBlockers}
          />
        </TabsContent>
      </Tabs>

      {/* Panel de decisión del Arquitecto */}
      {isReadyForReview && (
        <Card className="border-primary/50">
          <CardHeader>
            <CardTitle className="text-base">Decisión del Arquitecto</CardTitle>
            <CardDescription>
              Revisa el plan instruccional y el checklist DoD antes de tomar una decisión.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Notas (requerido para bloqueadores)</label>
              <Textarea
                placeholder="Observaciones sobre el plan instruccional..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => applyDecision('APPROVED', notes)}
                className="flex-1"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Aprobar Fase 1
              </Button>
              <Button
                onClick={() => applyDecision('WITH_BLOCKERS', notes)}
                variant="outline"
                className="flex-1"
                disabled={plan.blockers.length === 0 && !notes.trim()}
              >
                <AlertTriangle className="mr-2 h-4 w-4" />
                Marcar con Bloqueadores
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mensaje de estado final */}
      {isApproved && (
        <Card className="border-green-500 bg-green-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-6 w-6 text-green-500" />
              <div>
                <h4 className="font-medium">Plan Instruccional Aprobado</h4>
                <p className="text-sm text-muted-foreground">
                  Aprobado por {plan.approvals.reviewed_by} el {plan.approvals.reviewed_at}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {hasBlockers && (
        <Card className="border-orange-500 bg-orange-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-orange-500" />
              <div>
                <h4 className="font-medium">Plan con Bloqueadores</h4>
                <p className="text-sm text-muted-foreground">
                  {plan.blockers.length} bloqueador(es) pendiente(s) de resolver
                </p>
                {plan.approvals.notes && (
                  <p className="text-sm mt-1">{plan.approvals.notes}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
