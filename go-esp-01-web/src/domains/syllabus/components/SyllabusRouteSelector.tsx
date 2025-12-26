'use client'

import { useState } from 'react'
import { FileText, Brain } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Label } from '@/shared/components/ui/label'
import type { Esp02Route } from '../types/syllabus.types'

interface SyllabusRouteSelectorProps {
  value: Esp02Route | null
  onChange: (route: Esp02Route) => void
  disabled?: boolean
}

export function SyllabusRouteSelector({ value, onChange, disabled }: SyllabusRouteSelectorProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card
        className={`cursor-pointer transition-all ${
          value === 'B_NO_SOURCE'
            ? 'ring-2 ring-primary border-primary'
            : 'hover:border-primary/50'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        onClick={() => !disabled && onChange('B_NO_SOURCE')}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${value === 'B_NO_SOURCE' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
              <Brain className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base">Ruta B - Sin fuente</CardTitle>
              <CardDescription className="text-xs">IA como co-creador</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground">
            La IA genera el temario basandose en los objetivos del Paso 1 y conocimiento general del tema.
          </p>
          <ul className="mt-2 text-xs text-muted-foreground space-y-1">
            <li>• Ideal cuando no hay material de referencia</li>
            <li>• Generacion mas rapida</li>
            <li>• Requiere revision cuidadosa de QA</li>
          </ul>
        </CardContent>
      </Card>

      <Card
        className={`cursor-pointer transition-all ${
          value === 'A_WITH_SOURCE'
            ? 'ring-2 ring-primary border-primary'
            : 'hover:border-primary/50'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        onClick={() => !disabled && onChange('A_WITH_SOURCE')}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${value === 'A_WITH_SOURCE' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base">Ruta A - Con fuente</CardTitle>
              <CardDescription className="text-xs">Basado en documentos</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground">
            El temario se genera a partir de documentos de referencia que subas (PDF, DOC, PPT).
          </p>
          <ul className="mt-2 text-xs text-muted-foreground space-y-1">
            <li>• Ideal con material existente</li>
            <li>• Mayor fidelidad al contenido original</li>
            <li>• Requiere documentos utilizables</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
