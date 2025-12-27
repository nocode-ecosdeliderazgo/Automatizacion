'use client'

import { useState } from 'react'
import { Loader2, Library, CheckCircle, AlertTriangle, RefreshCw, Send, RotateCcw } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { Textarea } from '@/shared/components/ui/textarea'
import { Badge } from '@/shared/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { Progress } from '@/shared/components/ui/progress'
import { useCuration } from '../hooks/useCuration'
import { SourcesTable } from './SourcesTable'
import { CurationBitacora } from './CurationBitacora'
import { CurationBlockers } from './CurationBlockers'
import { CurationDodChecklist } from './CurationDodChecklist'

interface CurationFormProps {
  artifactId: string
  courseName: string
}

export function CurationForm({ artifactId, courseName }: CurationFormProps) {
  const {
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
    runValidations
  } = useCuration(artifactId)

  const [qaNote, setQaNote] = useState('')
  const [validationResult, setValidationResult] = useState<{ hasErrors: boolean; canSubmitToQA: boolean } | null>(null)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Estado: Sin curaduria iniciada
  if (!curation || curation.state === 'PHASE2_DRAFT') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Library className="h-5 w-5" />
            Paso 4: Curaduria de Fuentes (Fase 2)
          </CardTitle>
          <CardDescription>
            Genera y evalua fuentes para cada componente del plan instruccional.
            Marca aptitud y cobertura para cada fuente candidata.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={startCuration} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <Library className="mr-2 h-4 w-4" />
                Iniciar Curaduria
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
  if (curation.state === 'PHASE2_GENERATING') {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <div>
              <h3 className="font-medium text-lg">Generando fuentes candidatas...</h3>
              <p className="text-muted-foreground text-sm">
                Intento {curation.attempt_number}/2 - Esto puede tomar unos segundos
              </p>
            </div>
            <Progress value={50} className="max-w-xs mx-auto" />
          </div>
        </CardContent>
      </Card>
    )
  }

  // Estado: Con curaduria (generada, HITL, ready for QA, aprobada, etc.)
  const isGenerated = curation.state === 'PHASE2_GENERATED'
  const isHITLReview = curation.state === 'PHASE2_HITL_REVIEW'
  const isReadyForQA = curation.state === 'PHASE2_READY_FOR_QA'
  const isApproved = curation.state === 'PHASE2_APPROVED'
  const isCorrectable = curation.state === 'PHASE2_CORRECTABLE'
  const isBlocked = curation.state === 'PHASE2_BLOCKED'

  const getStateColor = () => {
    if (isApproved) return 'bg-green-100 text-green-800'
    if (isBlocked) return 'bg-red-100 text-red-800'
    if (isCorrectable) return 'bg-yellow-100 text-yellow-800'
    if (isReadyForQA) return 'bg-purple-100 text-purple-800'
    return 'bg-blue-100 text-blue-800'
  }

  const getStateLabel = () => {
    if (isApproved) return 'Aprobado Fase 2'
    if (isBlocked) return 'Con Bloqueadores'
    if (isCorrectable) return 'Corregible'
    if (isReadyForQA) return 'Pendiente QA'
    if (isHITLReview) return 'En Revision HITL'
    return 'Generado'
  }

  const canEdit = isGenerated || isHITLReview || isCorrectable

  const handleRunValidations = async () => {
    const result = await runValidations()
    setValidationResult(result)
  }

  const handleSubmitToQA = async () => {
    await submitToQA()
    setValidationResult(null)
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
            {curation.rows.length} fuentes | Intento {curation.attempt_number}/2
          </span>
        </div>
        <div className="flex gap-2">
          {canEdit && curation.attempt_number < 2 && (
            <Button variant="outline" size="sm" onClick={runAttempt2} disabled={isGenerating}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Intento 2
            </Button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-3">
            <p className="text-red-700 text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="sources">
        <TabsList>
          <TabsTrigger value="sources">Fuentes</TabsTrigger>
          <TabsTrigger value="bitacora">
            Bitacora
            {curation.bitacora.length > 0 && (
              <Badge variant="secondary" className="ml-2">{curation.bitacora.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="blockers">
            Bloqueadores
            {curation.blockers.length > 0 && (
              <Badge variant="destructive" className="ml-2">{curation.blockers.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="dod">DoD</TabsTrigger>
        </TabsList>

        {/* Tab: Fuentes */}
        <TabsContent value="sources" className="mt-4">
          <SourcesTable
            rows={curation.rows}
            onUpdateRow={updateRow}
            readOnly={!canEdit}
          />
        </TabsContent>

        {/* Tab: Bitacora */}
        <TabsContent value="bitacora" className="mt-4">
          <CurationBitacora
            entries={curation.bitacora}
            onAdd={addBitacoraEntry}
            readOnly={!canEdit}
          />
        </TabsContent>

        {/* Tab: Bloqueadores */}
        <TabsContent value="blockers" className="mt-4">
          <CurationBlockers
            blockers={curation.blockers}
            onAdd={addBlocker}
            onUpdate={updateBlocker}
            onRemove={removeBlocker}
            readOnly={isApproved || isBlocked}
          />
        </TabsContent>

        {/* Tab: DoD */}
        <TabsContent value="dod" className="mt-4">
          <CurationDodChecklist
            checklist={curation.dod.checklist}
            automaticChecks={curation.dod.automatic_checks}
          />
        </TabsContent>
      </Tabs>

      {/* Panel de acciones HITL */}
      {canEdit && !isReadyForQA && (
        <Card className="border-primary/50">
          <CardHeader>
            <CardTitle className="text-base">Acciones del Operador</CardTitle>
            <CardDescription>
              Evalua las fuentes, documenta en la bitacora y envia a QA cuando estes listo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleRunValidations}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Validar
              </Button>
              <Button
                onClick={handleSubmitToQA}
                disabled={validationResult?.hasErrors && curation.blockers.length === 0}
              >
                <Send className="h-4 w-4 mr-2" />
                Enviar a QA
              </Button>
            </div>

            {validationResult && (
              <div className={`p-3 rounded ${validationResult.canSubmitToQA ? 'bg-green-50' : 'bg-red-50'}`}>
                <p className={`text-sm ${validationResult.canSubmitToQA ? 'text-green-700' : 'text-red-700'}`}>
                  {validationResult.canSubmitToQA
                    ? 'Validaciones pasadas. Puedes enviar a QA.'
                    : 'Hay errores de validacion. Corrige antes de enviar o documenta bloqueadores.'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Panel de decision QA */}
      {isReadyForQA && (
        <Card className="border-purple-500/50">
          <CardHeader>
            <CardTitle className="text-base">Decision QA - Fase 2</CardTitle>
            <CardDescription>
              Revisa las fuentes, bitacora y bloqueadores antes de tomar una decision.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Notas de QA (opcional)..."
              value={qaNote}
              onChange={(e) => setQaNote(e.target.value)}
              rows={2}
            />

            <div className="flex gap-3">
              <Button
                onClick={() => applyQADecision('APPROVED', qaNote)}
                className="flex-1"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Aprobar Fase 2
              </Button>
              <Button
                onClick={() => applyQADecision('CORRECTABLE', qaNote)}
                variant="outline"
                className="flex-1"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Corregible
              </Button>
              <Button
                onClick={() => applyQADecision('BLOCKED', qaNote)}
                variant="destructive"
                className="flex-1"
              >
                <AlertTriangle className="mr-2 h-4 w-4" />
                Bloqueado
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
                <h4 className="font-medium">Curaduria Aprobada - Fase 2 Completa</h4>
                {curation.qa_decision && (
                  <p className="text-sm text-muted-foreground">
                    Aprobado por {curation.qa_decision.reviewed_by} el{' '}
                    {curation.qa_decision.reviewed_at
                      ? new Date(curation.qa_decision.reviewed_at).toLocaleDateString('es-ES')
                      : ''}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isBlocked && (
        <Card className="border-red-500 bg-red-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-red-500" />
              <div>
                <h4 className="font-medium">Curaduria con Bloqueadores</h4>
                <p className="text-sm text-muted-foreground">
                  {curation.blockers.length} bloqueador(es) pendiente(s) - Requiere escalacion
                </p>
                {curation.qa_decision?.notes && (
                  <p className="text-sm mt-1">{curation.qa_decision.notes}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isCorrectable && (
        <Card className="border-yellow-500 bg-yellow-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <RefreshCw className="h-6 w-6 text-yellow-500" />
              <div>
                <h4 className="font-medium">Curaduria Corregible</h4>
                <p className="text-sm text-muted-foreground">
                  QA solicita ajustes. Realiza las correcciones y vuelve a enviar.
                </p>
                {curation.qa_decision?.notes && (
                  <p className="text-sm mt-1">{curation.qa_decision.notes}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
