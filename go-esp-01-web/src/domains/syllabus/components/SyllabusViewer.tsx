'use client'

import { ChevronDown, ChevronRight, Target, BookOpen, CheckCircle, XCircle } from 'lucide-react'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { Separator } from '@/shared/components/ui/separator'
import type { SyllabusModule, TemarioValidation } from '../types/syllabus.types'

interface SyllabusViewerProps {
  modules: SyllabusModule[]
  validation?: TemarioValidation
  showValidation?: boolean
}

export function SyllabusViewer({ modules, validation, showValidation = true }: SyllabusViewerProps) {
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set(modules.map(m => m.id)))

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev)
      if (next.has(moduleId)) {
        next.delete(moduleId)
      } else {
        next.add(moduleId)
      }
      return next
    })
  }

  const totalLessons = modules.reduce((acc, m) => acc + m.lessons.length, 0)

  return (
    <div className="space-y-4">
      {/* Resumen */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          <BookOpen className="h-4 w-4" />
          {modules.length} modulos
        </span>
        <span className="flex items-center gap-1">
          <Target className="h-4 w-4" />
          {totalLessons} lecciones
        </span>
        {validation && (
          <Badge variant={validation.automatic_pass ? 'default' : 'destructive'}>
            {validation.automatic_pass ? 'Validacion OK' : 'Validacion fallida'}
          </Badge>
        )}
      </div>

      {/* Validaciones */}
      {showValidation && validation && validation.checks.length > 0 && (
        <Card className="bg-muted/30">
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Validaciones automaticas</CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <div className="space-y-1">
              {validation.checks.map((check, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  {check.pass ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className={check.pass ? 'text-muted-foreground' : 'text-red-600'}>
                    [{check.code}] {check.message}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modulos */}
      <div className="space-y-3">
        {modules.map((module, moduleIndex) => (
          <Card key={module.id} className="overflow-hidden">
            <div
              className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => toggleModule(module.id)}
            >
              {expandedModules.has(module.id) ? (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              )}
              <div className="flex-1">
                <h3 className="font-semibold">{module.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Objetivo: {module.objective_general_ref}
                </p>
              </div>
              <Badge variant="outline">{module.lessons.length} lecciones</Badge>
            </div>

            {expandedModules.has(module.id) && (
              <>
                <Separator />
                <div className="p-4 bg-muted/20">
                  <div className="space-y-3">
                    {module.lessons.map((lesson, lessonIndex) => (
                      <div key={lesson.id} className="flex gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                          {moduleIndex + 1}.{lessonIndex + 1}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{lesson.title}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            <Target className="h-3 w-3 inline mr-1" />
                            {lesson.objective_specific}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </Card>
        ))}
      </div>

      {modules.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No hay modulos generados aun
        </div>
      )}
    </div>
  )
}
