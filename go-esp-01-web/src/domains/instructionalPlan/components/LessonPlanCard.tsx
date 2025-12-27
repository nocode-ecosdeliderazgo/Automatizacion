'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, CheckCircle, AlertCircle, Target } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { ComponentChips, ComponentList } from './ComponentChips'
import type { LessonPlan } from '../types/instructionalPlan.types'

interface LessonPlanCardProps {
  lessonPlan: LessonPlan
  index: number
}

export function LessonPlanCard({ lessonPlan, index }: LessonPlanCardProps) {
  const [expanded, setExpanded] = useState(false)

  const hasAllRequired = ['DIALOGUE', 'READING', 'QUIZ'].every(
    req => lessonPlan.components.some(c => c.type === req)
  )

  const hasBloomVerb = lessonPlan.oa_bloom_verb && lessonPlan.oa_bloom_verb.length > 0
  const hasMeasurable = lessonPlan.measurable_criteria && lessonPlan.measurable_criteria.length > 10

  return (
    <Card className="overflow-hidden">
      <CardHeader
        className="cursor-pointer hover:bg-muted/50 transition-colors py-3"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-mono text-muted-foreground">
              {index + 1}
            </span>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                {lessonPlan.lesson_title}
                {hasAllRequired ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                )}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {lessonPlan.module_title}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ComponentChips components={lessonPlan.components} />
            {expanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="border-t pt-4 space-y-4">
          {/* Objetivo de Aprendizaje */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <h4 className="font-medium text-sm">Objetivo de Aprendizaje</h4>
              {hasBloomVerb && (
                <Badge variant="outline" className="text-xs">
                  {lessonPlan.oa_bloom_verb}
                </Badge>
              )}
            </div>
            <p className="text-sm pl-6">{lessonPlan.oa_text}</p>

            {lessonPlan.measurable_criteria && (
              <div className="pl-6">
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">Criterio medible:</span> {lessonPlan.measurable_criteria}
                </p>
              </div>
            )}
          </div>

          {/* Componentes */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Componentes planificados</h4>
            <ComponentList components={lessonPlan.components} />
          </div>

          {/* Notas de alineación */}
          {lessonPlan.alignment_notes && (
            <div className="bg-muted/50 p-3 rounded-lg">
              <h4 className="font-medium text-sm mb-1">Notas de alineación</h4>
              <p className="text-sm text-muted-foreground">{lessonPlan.alignment_notes}</p>
            </div>
          )}

          {/* Indicadores */}
          <div className="flex gap-2 pt-2 border-t">
            {hasBloomVerb ? (
              <Badge variant="outline" className="text-green-600 border-green-600">
                <CheckCircle className="h-3 w-3 mr-1" />
                Verbo Bloom
              </Badge>
            ) : (
              <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                <AlertCircle className="h-3 w-3 mr-1" />
                Sin verbo Bloom
              </Badge>
            )}
            {hasMeasurable ? (
              <Badge variant="outline" className="text-green-600 border-green-600">
                <CheckCircle className="h-3 w-3 mr-1" />
                Criterio medible
              </Badge>
            ) : (
              <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                <AlertCircle className="h-3 w-3 mr-1" />
                Sin criterio medible
              </Badge>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  )
}
