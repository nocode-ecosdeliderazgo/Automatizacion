'use client'

import { MessageSquare, BookOpen, HelpCircle, PlayCircle, Dumbbell, Link } from 'lucide-react'
import { Badge } from '@/shared/components/ui/badge'
import type { PlanComponent, PlanComponentType } from '../types/instructionalPlan.types'

const COMPONENT_CONFIG: Record<PlanComponentType, { label: string; icon: any; color: string }> = {
  DIALOGUE: { label: 'Diálogo', icon: MessageSquare, color: 'bg-blue-100 text-blue-800' },
  READING: { label: 'Lectura', icon: BookOpen, color: 'bg-green-100 text-green-800' },
  QUIZ: { label: 'Quiz', icon: HelpCircle, color: 'bg-purple-100 text-purple-800' },
  DEMO_GUIDE: { label: 'Demo/Guía', icon: PlayCircle, color: 'bg-orange-100 text-orange-800' },
  EXERCISE: { label: 'Ejercicio', icon: Dumbbell, color: 'bg-pink-100 text-pink-800' },
  RESOURCE: { label: 'Recurso', icon: Link, color: 'bg-gray-100 text-gray-800' }
}

interface ComponentChipsProps {
  components: PlanComponent[]
  showDetails?: boolean
}

export function ComponentChips({ components, showDetails = false }: ComponentChipsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {components.map((comp, index) => {
        const config = COMPONENT_CONFIG[comp.type] || { label: comp.type, icon: Link, color: 'bg-gray-100' }
        const Icon = config.icon

        return (
          <div key={index} className="group relative">
            <Badge className={`${config.color} cursor-default`}>
              <Icon className="h-3 w-3 mr-1" />
              {config.label}
            </Badge>
            {showDetails && comp.summary && (
              <div className="absolute z-10 invisible group-hover:visible bg-popover text-popover-foreground border rounded-md shadow-lg p-3 w-64 top-full mt-1 left-0">
                <p className="text-sm">{comp.summary}</p>
                {comp.notes && (
                  <p className="text-xs text-muted-foreground mt-1">{comp.notes}</p>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

interface ComponentListProps {
  components: PlanComponent[]
}

export function ComponentList({ components }: ComponentListProps) {
  return (
    <div className="space-y-3">
      {components.map((comp, index) => {
        const config = COMPONENT_CONFIG[comp.type] || { label: comp.type, icon: Link, color: 'bg-gray-100' }
        const Icon = config.icon

        return (
          <div key={index} className="flex gap-3 p-3 border rounded-lg">
            <div className={`p-2 rounded-md ${config.color}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-sm">{config.label}</h4>
              <p className="text-sm text-muted-foreground mt-1">{comp.summary}</p>
              {comp.notes && (
                <p className="text-xs text-muted-foreground mt-1 italic">{comp.notes}</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
