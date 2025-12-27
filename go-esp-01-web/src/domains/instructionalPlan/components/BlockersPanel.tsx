'use client'

import { useState } from 'react'
import { AlertTriangle, Plus, X, Edit2, Check } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Textarea } from '@/shared/components/ui/textarea'
import { Badge } from '@/shared/components/ui/badge'
import type { Blocker } from '../types/instructionalPlan.types'

interface BlockersPanelProps {
  blockers: Blocker[]
  onAdd: (blocker: Omit<Blocker, 'id' | 'created_at'>) => void
  onUpdate: (id: string, updates: Partial<Blocker>) => void
  onRemove: (id: string) => void
  onMarkNoBlockers: () => void
  readOnly?: boolean
}

const IMPACT_COLORS = {
  LOW: 'bg-yellow-100 text-yellow-800',
  MEDIUM: 'bg-orange-100 text-orange-800',
  HIGH: 'bg-red-100 text-red-800'
}

const STATUS_COLORS = {
  OPEN: 'bg-red-100 text-red-800',
  RESOLVED: 'bg-green-100 text-green-800',
  WONT_FIX: 'bg-gray-100 text-gray-800'
}

export function BlockersPanel({
  blockers,
  onAdd,
  onUpdate,
  onRemove,
  onMarkNoBlockers,
  readOnly = false
}: BlockersPanelProps) {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    impact: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH',
    owner: '',
    lesson_id: ''
  })

  const handleSubmit = () => {
    if (!formData.title || !formData.owner) return

    onAdd({
      ...formData,
      status: 'OPEN',
      lesson_id: formData.lesson_id || undefined
    })

    setFormData({ title: '', description: '', impact: 'MEDIUM', owner: '', lesson_id: '' })
    setShowForm(false)
  }

  const handleStatusChange = (id: string, status: Blocker['status']) => {
    onUpdate(id, { status })
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Bloqueadores y Riesgos
            {blockers.length > 0 && (
              <Badge variant="secondary">{blockers.length}</Badge>
            )}
          </CardTitle>
          {!readOnly && blockers.length === 0 && (
            <Button size="sm" variant="outline" onClick={onMarkNoBlockers}>
              Marcar sin bloqueadores
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {blockers.length === 0 && !showForm && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No hay bloqueadores registrados
          </p>
        )}

        {blockers.map((blocker) => (
          <div
            key={blocker.id}
            className="border rounded-lg p-3 space-y-2"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-sm">{blocker.title}</h4>
                  <Badge className={IMPACT_COLORS[blocker.impact]}>
                    {blocker.impact}
                  </Badge>
                  <Badge className={STATUS_COLORS[blocker.status]}>
                    {blocker.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {blocker.description}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Responsable: <span className="font-medium">{blocker.owner}</span>
                </p>
              </div>
              {!readOnly && (
                <div className="flex gap-1">
                  {blocker.status === 'OPEN' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleStatusChange(blocker.id, 'RESOLVED')}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onRemove(blocker.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}

        {showForm && (
          <div className="border rounded-lg p-3 space-y-3 bg-muted/50">
            <Input
              placeholder="Título del bloqueador"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
            <Textarea
              placeholder="Descripción del bloqueador"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
            />
            <div className="flex gap-2">
              <select
                className="flex-1 px-3 py-2 border rounded-md text-sm"
                value={formData.impact}
                onChange={(e) => setFormData({ ...formData, impact: e.target.value as any })}
              >
                <option value="LOW">Impacto Bajo</option>
                <option value="MEDIUM">Impacto Medio</option>
                <option value="HIGH">Impacto Alto</option>
              </select>
              <Input
                placeholder="Responsable"
                value={formData.owner}
                onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                className="flex-1"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button size="sm" onClick={handleSubmit} disabled={!formData.title || !formData.owner}>
                Agregar
              </Button>
            </div>
          </div>
        )}

        {!readOnly && !showForm && (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setShowForm(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Agregar bloqueador
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
