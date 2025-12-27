'use client'

import { useState } from 'react'
import { CheckCircle, XCircle, AlertCircle, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Textarea } from '@/shared/components/ui/textarea'
import { Badge } from '@/shared/components/ui/badge'
import type { CurationRow } from '../types/curation.types'

interface SourceRowProps {
  row: CurationRow
  onUpdate: (updates: Partial<CurationRow>) => void
  readOnly?: boolean
}

export function SourceRow({ row, onUpdate, readOnly = false }: SourceRowProps) {
  const [expanded, setExpanded] = useState(false)
  const [motivo, setMotivo] = useState(row.motivo_no_apta || '')

  const getStatusIcon = () => {
    if (row.apta === null) {
      return <AlertCircle className="h-4 w-4 text-yellow-500" />
    }
    if (row.apta && row.cobertura_completa) {
      return <CheckCircle className="h-4 w-4 text-green-500" />
    }
    if (row.apta && !row.cobertura_completa) {
      return <AlertCircle className="h-4 w-4 text-yellow-500" />
    }
    return <XCircle className="h-4 w-4 text-red-500" />
  }

  const getStatusBg = () => {
    if (row.apta === null) return 'bg-yellow-50'
    if (row.apta && row.cobertura_completa) return 'bg-green-50'
    if (row.apta && !row.cobertura_completa) return 'bg-yellow-50'
    return 'bg-red-50'
  }

  const handleAptaChange = (value: boolean) => {
    onUpdate({ apta: value })
    if (value) {
      onUpdate({ motivo_no_apta: '' })
      setMotivo('')
    }
  }

  const handleCoberturaChange = (value: boolean) => {
    onUpdate({ cobertura_completa: value })
  }

  const handleMotivoSave = () => {
    onUpdate({ motivo_no_apta: motivo })
  }

  return (
    <div className={`border rounded-lg p-3 ${getStatusBg()}`}>
      <div className="flex items-start gap-3">
        {/* Status icon */}
        <div className="flex-shrink-0 mt-1">
          {getStatusIcon()}
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm truncate">
              {row.source_title || row.source_ref}
            </span>
            {row.is_critical && (
              <Badge variant="destructive" className="text-xs">CRITICO</Badge>
            )}
            <Badge variant="outline" className="text-xs">{row.component}</Badge>
          </div>

          {row.source_ref && row.source_ref.startsWith('http') && (
            <a
              href={row.source_ref}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1"
            >
              <ExternalLink className="h-3 w-3" />
              {row.source_ref.length > 50 ? row.source_ref.slice(0, 50) + '...' : row.source_ref}
            </a>
          )}

          {row.source_rationale && (
            <p className="text-xs text-muted-foreground mt-1">
              {row.source_rationale}
            </p>
          )}
        </div>

        {/* Expand button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>

      {/* Expanded controls */}
      {expanded && (
        <div className="mt-3 pt-3 border-t space-y-3">
          {/* Apta selector */}
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium w-20">Apta:</span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={row.apta === true ? 'default' : 'outline'}
                onClick={() => handleAptaChange(true)}
                disabled={readOnly}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Si
              </Button>
              <Button
                size="sm"
                variant={row.apta === false ? 'destructive' : 'outline'}
                onClick={() => handleAptaChange(false)}
                disabled={readOnly}
              >
                <XCircle className="h-4 w-4 mr-1" />
                No
              </Button>
            </div>
          </div>

          {/* Motivo NO APTA */}
          {row.apta === false && (
            <div className="space-y-2">
              <span className="text-sm font-medium">Motivo (requerido):</span>
              <Textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                onBlur={handleMotivoSave}
                placeholder="Explica por que la fuente no es apta..."
                rows={2}
                disabled={readOnly}
                className="text-sm"
              />
            </div>
          )}

          {/* Cobertura selector (solo si es apta) */}
          {row.apta === true && (
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium w-20">Cobertura:</span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={row.cobertura_completa === true ? 'default' : 'outline'}
                  onClick={() => handleCoberturaChange(true)}
                  disabled={readOnly}
                >
                  Completa
                </Button>
                <Button
                  size="sm"
                  variant={row.cobertura_completa === false ? 'secondary' : 'outline'}
                  onClick={() => handleCoberturaChange(false)}
                  disabled={readOnly}
                >
                  Parcial
                </Button>
              </div>
            </div>
          )}

          {/* Notas */}
          <div className="space-y-2">
            <span className="text-sm font-medium">Notas (opcional):</span>
            <Textarea
              value={row.notes || ''}
              onChange={(e) => onUpdate({ notes: e.target.value })}
              placeholder="Notas adicionales..."
              rows={1}
              disabled={readOnly}
              className="text-sm"
            />
          </div>
        </div>
      )}
    </div>
  )
}
