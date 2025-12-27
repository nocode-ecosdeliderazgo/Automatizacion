'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { SourceRow } from './SourceRow'
import type { CurationRow } from '../types/curation.types'

interface SourcesTableProps {
  rows: CurationRow[]
  onUpdateRow: (rowId: string, updates: Partial<CurationRow>) => void
  readOnly?: boolean
}

export function SourcesTable({ rows, onUpdateRow, readOnly = false }: SourcesTableProps) {
  // Agrupar filas por leccion y componente
  const groupedByLesson = useMemo(() => {
    const lessonMap = new Map<string, { title: string; components: Map<string, CurationRow[]> }>()

    for (const row of rows) {
      let lesson = lessonMap.get(row.lesson_id)
      if (!lesson) {
        lesson = { title: row.lesson_title, components: new Map() }
        lessonMap.set(row.lesson_id, lesson)
      }

      const componentRows = lesson.components.get(row.component) || []
      componentRows.push(row)
      lesson.components.set(row.component, componentRows)
    }

    return lessonMap
  }, [rows])

  // Calcular estadisticas
  const stats = useMemo(() => {
    const total = rows.length
    const evaluated = rows.filter(r => r.apta !== null).length
    const apta = rows.filter(r => r.apta === true).length
    const cobertura = rows.filter(r => r.apta === true && r.cobertura_completa === true).length
    const noApta = rows.filter(r => r.apta === false).length
    const pending = total - evaluated

    return { total, evaluated, apta, cobertura, noApta, pending }
  }, [rows])

  const getComponentStatus = (componentRows: CurationRow[]) => {
    const hasAptaWithCobertura = componentRows.some(
      r => r.apta === true && r.cobertura_completa === true
    )
    const allEvaluated = componentRows.every(r => r.apta !== null)
    const allNoApta = componentRows.every(r => r.apta === false)

    if (hasAptaWithCobertura) return 'complete'
    if (allNoApta) return 'blocked'
    if (!allEvaluated) return 'pending'
    return 'partial'
  }

  const getComponentStatusIcon = (status: string) => {
    switch (status) {
      case 'complete':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'blocked':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'partial':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />
    }
  }

  return (
    <div className="space-y-4">
      {/* Estadisticas */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Total:</span>
              <Badge variant="secondary">{stats.total}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Evaluadas:</span>
              <Badge variant="outline">{stats.evaluated}/{stats.total}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Apta + Cobertura:</span>
              <Badge className="bg-green-100 text-green-800">{stats.cobertura}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <span>No Apta:</span>
              <Badge className="bg-red-100 text-red-800">{stats.noApta}</Badge>
            </div>
            {stats.pending > 0 && (
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                <span>Pendientes:</span>
                <Badge className="bg-yellow-100 text-yellow-800">{stats.pending}</Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabla por leccion */}
      {Array.from(groupedByLesson.entries()).map(([lessonId, lesson]) => (
        <Card key={lessonId}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{lesson.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from(lesson.components.entries()).map(([component, componentRows]) => {
              const status = getComponentStatus(componentRows)
              const isCritical = componentRows.some(r => r.is_critical)

              return (
                <div key={component} className="space-y-2">
                  <div className="flex items-center gap-2">
                    {getComponentStatusIcon(status)}
                    <span className="font-medium text-sm">{component}</span>
                    {isCritical && (
                      <Badge variant="destructive" className="text-xs">CRITICO</Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      ({componentRows.length} fuente{componentRows.length !== 1 ? 's' : ''})
                    </span>
                  </div>

                  <div className="space-y-2 pl-6">
                    {componentRows.map(row => (
                      <SourceRow
                        key={row.id}
                        row={row}
                        onUpdate={(updates) => onUpdateRow(row.id, updates)}
                        readOnly={readOnly}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      ))}

      {rows.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No hay fuentes generadas aun
          </CardContent>
        </Card>
      )}
    </div>
  )
}
