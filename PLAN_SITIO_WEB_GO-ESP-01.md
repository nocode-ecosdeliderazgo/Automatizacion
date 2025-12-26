# Plan de Implementación: Sitio Web GO-ESP-01

## Resumen Ejecutivo

Aplicación web para generar, validar y aprobar artefactos de cursos usando **Supabase** como backend completo, **Netlify** para hosting, y **Screaming Architecture** donde la estructura del código refleja el dominio del negocio.

---

## 1. Arquitectura: Screaming Architecture

> "La arquitectura debe gritar el propósito del sistema, no los frameworks que usa"
> — Robert C. Martin

### Principios

1. **Organización por Dominio**: Carpetas nombradas por casos de uso, no por tipo técnico
2. **Cohesión**: Todo lo relacionado a un dominio vive junto
3. **Independencia de Framework**: El dominio no depende de Next.js, Supabase, etc.
4. **Boundaries claros**: Cada módulo expone una API pública clara

### Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         NETLIFY (Edge)                                   │
│                      Next.js SSR + Static                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    SCREAMING DOMAINS                              │  │
│  │                                                                    │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐ │  │
│  │  │ GENERATION │  │ ARTIFACTS  │  │    QA      │  │   AUTH     │ │  │
│  │  │            │  │            │  │  WORKFLOW  │  │            │ │  │
│  │  │ - Form     │  │ - List     │  │ - Review   │  │ - Login    │ │  │
│  │  │ - Progress │  │ - Detail   │  │ - Approve  │  │ - Profile  │ │  │
│  │  │ - Pipeline │  │ - Export   │  │ - Reject   │  │ - Roles    │ │  │
│  │  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘ │  │
│  │        │               │               │               │         │  │
│  └────────┼───────────────┼───────────────┼───────────────┼─────────┘  │
│           │               │               │               │            │
├───────────┴───────────────┴───────────────┴───────────────┴────────────┤
│                                                                          │
│                           SUPABASE                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │  PostgreSQL  │  │     Auth     │  │   Realtime   │  │   Edge     │  │
│  │   Database   │  │     JWT      │  │  WebSocket   │  │ Functions  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │      GEMINI API               │
                    │   (Pipeline Generation)       │
                    └───────────────────────────────┘
```

---

## 2. Stack Tecnológico

### Frontend + Hosting
| Tecnología | Propósito |
|------------|-----------|
| **Next.js 14** | App Router, Server Components |
| **Netlify** | Hosting, Edge Functions, Forms |
| **TailwindCSS** | Estilos utility-first |
| **shadcn/ui** | Componentes accesibles |
| **Zustand** | Estado global ligero |

### Backend (Supabase)
| Servicio | Propósito |
|----------|-----------|
| **PostgreSQL** | Base de datos principal |
| **Auth** | Autenticación JWT, OAuth |
| **Realtime** | WebSocket para progreso |
| **Edge Functions** | Lógica serverless (Deno) |
| **Row Level Security** | Autorización a nivel de fila |
| **Storage** | Archivos exportados (opcional) |

### Pipeline (Existente)
| Componente | Uso |
|------------|-----|
| **step01_automation** | Se invoca desde Edge Functions |
| **Gemini API** | Generación de contenido |

---

## 3. Estructura del Proyecto (Screaming)

```
go-esp-01-web/
│
├── src/
│   │
│   ├── domains/                      # 🎯 SCREAMING: Dominios del negocio
│   │   │
│   │   ├── generation/               # Dominio: Generación de artefactos
│   │   │   ├── components/
│   │   │   │   ├── GenerationForm.tsx
│   │   │   │   ├── IdeaCentralInput.tsx
│   │   │   │   ├── PipelineProgress.tsx
│   │   │   │   └── GenerationSuccess.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useGeneration.ts
│   │   │   │   └── usePipelineProgress.ts
│   │   │   ├── services/
│   │   │   │   └── generation.service.ts
│   │   │   ├── types/
│   │   │   │   └── generation.types.ts
│   │   │   └── index.ts              # API pública del dominio
│   │   │
│   │   ├── artifacts/                # Dominio: Gestión de artefactos
│   │   │   ├── components/
│   │   │   │   ├── ArtifactList.tsx
│   │   │   │   ├── ArtifactCard.tsx
│   │   │   │   ├── ArtifactViewer.tsx
│   │   │   │   ├── NamesSection.tsx
│   │   │   │   ├── ObjectivesSection.tsx
│   │   │   │   ├── DescriptionSection.tsx
│   │   │   │   └── ValidationBadge.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useArtifacts.ts
│   │   │   │   ├── useArtifact.ts
│   │   │   │   └── useArtifactHistory.ts
│   │   │   ├── services/
│   │   │   │   └── artifacts.service.ts
│   │   │   ├── types/
│   │   │   │   └── artifact.types.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── qa-workflow/              # Dominio: Flujo de QA
│   │   │   ├── components/
│   │   │   │   ├── QAQueue.tsx
│   │   │   │   ├── ReviewPanel.tsx
│   │   │   │   ├── ApprovalActions.tsx
│   │   │   │   ├── FeedbackForm.tsx
│   │   │   │   └── QAHistory.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useQAQueue.ts
│   │   │   │   ├── useReview.ts
│   │   │   │   └── useQAActions.ts
│   │   │   ├── services/
│   │   │   │   └── qa.service.ts
│   │   │   ├── types/
│   │   │   │   └── qa.types.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── validation/               # Dominio: Validación
│   │   │   ├── components/
│   │   │   │   ├── ValidationReport.tsx
│   │   │   │   ├── SemanticScore.tsx
│   │   │   │   ├── RuleStatus.tsx
│   │   │   │   └── ErrorExplanation.tsx
│   │   │   ├── types/
│   │   │   │   └── validation.types.ts
│   │   │   └── index.ts
│   │   │
│   │   └── auth/                     # Dominio: Autenticación
│   │       ├── components/
│   │       │   ├── LoginForm.tsx
│   │       │   ├── SignUpForm.tsx
│   │       │   ├── UserMenu.tsx
│   │       │   └── ProtectedRoute.tsx
│   │       ├── hooks/
│   │       │   ├── useAuth.ts
│   │       │   └── useUser.ts
│   │       ├── services/
│   │       │   └── auth.service.ts
│   │       └── index.ts
│   │
│   ├── shared/                       # Código compartido (no dominio)
│   │   ├── components/
│   │   │   ├── ui/                   # shadcn/ui components
│   │   │   ├── Layout.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   └── LoadingSpinner.tsx
│   │   ├── hooks/
│   │   │   ├── useSupabase.ts
│   │   │   └── useRealtime.ts
│   │   ├── lib/
│   │   │   ├── supabase/
│   │   │   │   ├── client.ts         # Cliente browser
│   │   │   │   ├── server.ts         # Cliente server
│   │   │   │   └── middleware.ts
│   │   │   └── utils.ts
│   │   └── types/
│   │       └── database.types.ts     # Tipos generados por Supabase
│   │
│   └── app/                          # Next.js App Router (solo routing)
│       ├── (auth)/
│       │   ├── login/
│       │   │   └── page.tsx          # Usa: auth/LoginForm
│       │   └── signup/
│       │       └── page.tsx          # Usa: auth/SignUpForm
│       ├── (dashboard)/
│       │   ├── layout.tsx            # Layout autenticado
│       │   ├── page.tsx              # Dashboard (stats + quick actions)
│       │   ├── generate/
│       │   │   └── page.tsx          # Usa: generation/*
│       │   ├── artifacts/
│       │   │   ├── page.tsx          # Usa: artifacts/ArtifactList
│       │   │   └── [id]/
│       │   │       └── page.tsx      # Usa: artifacts/ArtifactViewer
│       │   └── qa/
│       │       ├── page.tsx          # Usa: qa-workflow/QAQueue
│       │       └── [id]/
│       │           └── page.tsx      # Usa: qa-workflow/ReviewPanel
│       ├── api/                      # API Routes (proxy a Supabase)
│       │   └── pipeline/
│       │       └── route.ts
│       ├── layout.tsx
│       └── page.tsx                  # Landing/redirect
│
├── supabase/                         # Configuración Supabase
│   ├── migrations/                   # Migraciones SQL
│   │   ├── 00001_create_artifacts.sql
│   │   ├── 00002_create_qa_sessions.sql
│   │   └── 00003_create_events.sql
│   ├── functions/                    # Edge Functions (Deno)
│   │   └── generate-artifact/
│   │       └── index.ts
│   ├── seed.sql
│   └── config.toml
│
├── pipeline/                         # Symlink o copia del pipeline
│   └── step01_automation/            # (para Edge Functions)
│
├── public/
├── .env.local
├── netlify.toml
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

---

## 4. Base de Datos (Supabase)

### 4.1 Migraciones SQL

```sql
-- supabase/migrations/00001_create_artifacts.sql

-- Enum para estados
CREATE TYPE artifact_state AS ENUM (
  'DRAFT',
  'GENERATING',
  'VALIDATING',
  'READY_FOR_QA',
  'APPROVED',
  'REJECTED',
  'ESCALATED'
);

-- Tabla principal de artefactos
CREATE TABLE artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id TEXT UNIQUE,
  course_id TEXT,

  -- Input
  idea_central TEXT NOT NULL,

  -- Output generado
  nombres JSONB DEFAULT '[]'::jsonb,
  objetivos JSONB DEFAULT '[]'::jsonb,
  descripcion JSONB DEFAULT '{}'::jsonb,

  -- Estado
  state artifact_state DEFAULT 'DRAFT',

  -- Validación
  validation_report JSONB,
  semantic_result JSONB,

  -- Contadores
  auto_retry_count INT DEFAULT 0,
  iteration_count INT DEFAULT 0,

  -- Metadata
  generation_metadata JSONB DEFAULT '{}'::jsonb,

  -- Audit
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_artifacts_state ON artifacts(state);
CREATE INDEX idx_artifacts_created_by ON artifacts(created_by);
CREATE INDEX idx_artifacts_created_at ON artifacts(created_at DESC);

-- RLS (Row Level Security)
ALTER TABLE artifacts ENABLE ROW LEVEL SECURITY;

-- Políticas: usuarios ven sus propios artefactos
CREATE POLICY "Users can view own artifacts"
  ON artifacts FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Users can insert own artifacts"
  ON artifacts FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own artifacts"
  ON artifacts FOR UPDATE
  USING (auth.uid() = created_by);

-- QA reviewers pueden ver artefactos READY_FOR_QA
CREATE POLICY "QA can view pending artifacts"
  ON artifacts FOR SELECT
  USING (
    state = 'READY_FOR_QA' AND
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('qa_reviewer', 'admin')
    )
  );

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER artifacts_updated_at
  BEFORE UPDATE ON artifacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
```

```sql
-- supabase/migrations/00002_create_qa_sessions.sql

CREATE TYPE qa_decision AS ENUM (
  'APPROVED',
  'REJECTED',
  'NEEDS_REVISION'
);

CREATE TABLE qa_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id UUID REFERENCES artifacts(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES auth.users(id),

  decision qa_decision,
  feedback TEXT,
  suggestions JSONB DEFAULT '[]'::jsonb,

  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_qa_sessions_artifact ON qa_sessions(artifact_id);
CREATE INDEX idx_qa_sessions_reviewer ON qa_sessions(reviewer_id);

ALTER TABLE qa_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "QA reviewers can manage sessions"
  ON qa_sessions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('qa_reviewer', 'admin')
    )
  );
```

```sql
-- supabase/migrations/00003_create_events.sql

CREATE TABLE pipeline_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id UUID REFERENCES artifacts(id) ON DELETE CASCADE,

  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_artifact ON pipeline_events(artifact_id);
CREATE INDEX idx_events_created ON pipeline_events(created_at DESC);

ALTER TABLE pipeline_events ENABLE ROW LEVEL SECURITY;

-- Usuarios pueden ver eventos de sus artefactos
CREATE POLICY "Users can view own artifact events"
  ON pipeline_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM artifacts
      WHERE artifacts.id = pipeline_events.artifact_id
      AND artifacts.created_by = auth.uid()
    )
  );
```

```sql
-- supabase/migrations/00004_create_user_roles.sql

CREATE TYPE user_role AS ENUM (
  'operator',
  'qa_reviewer',
  'admin'
);

CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role DEFAULT 'operator',

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, role)
);

-- Asignar rol por defecto al registrarse
CREATE OR REPLACE FUNCTION assign_default_role()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_roles (user_id, role)
  VALUES (NEW.id, 'operator');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION assign_default_role();
```

### 4.2 Tipos TypeScript (Generados)

```typescript
// src/shared/types/database.types.ts
// Generado con: npx supabase gen types typescript

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      artifacts: {
        Row: {
          id: string
          run_id: string | null
          course_id: string | null
          idea_central: string
          nombres: Json
          objetivos: Json
          descripcion: Json
          state: 'DRAFT' | 'GENERATING' | 'VALIDATING' | 'READY_FOR_QA' | 'APPROVED' | 'REJECTED' | 'ESCALATED'
          validation_report: Json | null
          semantic_result: Json | null
          auto_retry_count: number
          iteration_count: number
          generation_metadata: Json
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          idea_central: string
          course_id?: string
          created_by?: string
        }
        Update: {
          state?: 'DRAFT' | 'GENERATING' | 'VALIDATING' | 'READY_FOR_QA' | 'APPROVED' | 'REJECTED' | 'ESCALATED'
          nombres?: Json
          objetivos?: Json
          descripcion?: Json
        }
      }
      qa_sessions: {
        Row: {
          id: string
          artifact_id: string
          reviewer_id: string
          decision: 'APPROVED' | 'REJECTED' | 'NEEDS_REVISION' | null
          feedback: string | null
          suggestions: Json
          started_at: string
          completed_at: string | null
        }
      }
      pipeline_events: {
        Row: {
          id: string
          artifact_id: string
          event_type: string
          event_data: Json
          created_at: string
        }
      }
    }
  }
}
```

---

## 5. Dominios: Implementación

### 5.1 Dominio: Generation

```typescript
// src/domains/generation/types/generation.types.ts

export interface GenerationInput {
  ideaCentral: string
  courseId?: string
}

export interface PipelineProgress {
  state: string
  message: string
  progress: number // 0-100
  artifactId?: string
}

export interface GenerationResult {
  success: boolean
  artifactId: string
  state: string
  error?: string
}
```

```typescript
// src/domains/generation/services/generation.service.ts

import { createClient } from '@/shared/lib/supabase/client'
import type { GenerationInput, GenerationResult } from '../types/generation.types'

export const generationService = {
  async startGeneration(input: GenerationInput): Promise<GenerationResult> {
    const supabase = createClient()

    // 1. Crear artefacto en estado GENERATING
    const { data: artifact, error: insertError } = await supabase
      .from('artifacts')
      .insert({
        idea_central: input.ideaCentral,
        course_id: input.courseId,
        state: 'GENERATING',
        created_by: (await supabase.auth.getUser()).data.user?.id
      })
      .select()
      .single()

    if (insertError) throw insertError

    // 2. Invocar Edge Function para ejecutar pipeline
    const { error: fnError } = await supabase.functions.invoke('generate-artifact', {
      body: { artifactId: artifact.id }
    })

    if (fnError) {
      // Marcar como error
      await supabase
        .from('artifacts')
        .update({ state: 'ESCALATED' })
        .eq('id', artifact.id)

      throw fnError
    }

    return {
      success: true,
      artifactId: artifact.id,
      state: 'GENERATING'
    }
  }
}
```

```typescript
// src/domains/generation/hooks/usePipelineProgress.ts

import { useEffect, useState } from 'react'
import { createClient } from '@/shared/lib/supabase/client'
import type { PipelineProgress } from '../types/generation.types'

export function usePipelineProgress(artifactId: string | null) {
  const [progress, setProgress] = useState<PipelineProgress | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (!artifactId) return

    // Suscribirse a cambios en el artefacto via Realtime
    const channel = supabase
      .channel(`artifact:${artifactId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'artifacts',
          filter: `id=eq.${artifactId}`
        },
        (payload) => {
          const artifact = payload.new
          setProgress({
            state: artifact.state,
            message: getStateMessage(artifact.state),
            progress: getStateProgress(artifact.state),
            artifactId: artifact.id
          })
        }
      )
      .subscribe()

    // También suscribirse a eventos del pipeline
    const eventsChannel = supabase
      .channel(`events:${artifactId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'pipeline_events',
          filter: `artifact_id=eq.${artifactId}`
        },
        (payload) => {
          const event = payload.new
          setProgress(prev => ({
            ...prev!,
            message: event.event_data.message || event.event_type
          }))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      supabase.removeChannel(eventsChannel)
    }
  }, [artifactId])

  return progress
}

function getStateMessage(state: string): string {
  const messages: Record<string, string> = {
    GENERATING: 'Generando artefacto con IA...',
    VALIDATING: 'Validando estructura y contenido...',
    READY_FOR_QA: 'Listo para revisión',
    APPROVED: 'Aprobado',
    REJECTED: 'Rechazado',
    ESCALATED: 'Requiere intervención manual'
  }
  return messages[state] || state
}

function getStateProgress(state: string): number {
  const progress: Record<string, number> = {
    DRAFT: 0,
    GENERATING: 30,
    VALIDATING: 70,
    READY_FOR_QA: 100,
    APPROVED: 100,
    REJECTED: 100
  }
  return progress[state] || 0
}
```

```tsx
// src/domains/generation/components/GenerationForm.tsx

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { Button } from '@/shared/components/ui/button'
import { Textarea } from '@/shared/components/ui/textarea'
import { Input } from '@/shared/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'

import { generationService } from '../services/generation.service'
import { usePipelineProgress } from '../hooks/usePipelineProgress'
import { PipelineProgress } from './PipelineProgress'

const schema = z.object({
  ideaCentral: z.string().min(10, 'Mínimo 10 caracteres').max(500),
  courseId: z.string().optional()
})

type FormData = z.infer<typeof schema>

export function GenerationForm() {
  const router = useRouter()
  const [artifactId, setArtifactId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const progress = usePipelineProgress(artifactId)

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { ideaCentral: '', courseId: '' }
  })

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    try {
      const result = await generationService.startGeneration(data)
      setArtifactId(result.artifactId)
    } catch (error) {
      console.error(error)
      setIsSubmitting(false)
    }
  }

  // Redirigir cuando esté listo
  if (progress?.state === 'READY_FOR_QA') {
    router.push(`/artifacts/${artifactId}`)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generar Nuevo Artefacto</CardTitle>
      </CardHeader>
      <CardContent>
        {artifactId ? (
          <PipelineProgress progress={progress} />
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Idea Central</label>
              <Textarea
                {...form.register('ideaCentral')}
                placeholder="Describe la idea central del curso..."
                className="mt-1 min-h-[120px]"
              />
              {form.formState.errors.ideaCentral && (
                <p className="text-sm text-red-500 mt-1">
                  {form.formState.errors.ideaCentral.message}
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium">ID del Curso (opcional)</label>
              <Input
                {...form.register('courseId')}
                placeholder="CURSO-001"
                className="mt-1"
              />
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? 'Iniciando...' : 'Generar Artefacto'}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
```

```tsx
// src/domains/generation/components/PipelineProgress.tsx

import { CheckCircle, Circle, Loader2 } from 'lucide-react'
import { Progress } from '@/shared/components/ui/progress'
import type { PipelineProgress as ProgressType } from '../types/generation.types'

const STEPS = [
  { key: 'GENERATING', label: 'Generando con IA' },
  { key: 'VALIDATING', label: 'Validando' },
  { key: 'READY_FOR_QA', label: 'Listo' }
]

interface Props {
  progress: ProgressType | null
}

export function PipelineProgress({ progress }: Props) {
  if (!progress) return <div className="animate-pulse">Conectando...</div>

  const currentIndex = STEPS.findIndex(s => s.key === progress.state)

  return (
    <div className="space-y-6">
      <Progress value={progress.progress} className="h-2" />

      <div className="space-y-3">
        {STEPS.map((step, index) => {
          const isComplete = index < currentIndex
          const isCurrent = index === currentIndex
          const isPending = index > currentIndex

          return (
            <div key={step.key} className="flex items-center gap-3">
              {isComplete && <CheckCircle className="h-5 w-5 text-green-500" />}
              {isCurrent && <Loader2 className="h-5 w-5 animate-spin text-blue-500" />}
              {isPending && <Circle className="h-5 w-5 text-gray-300" />}

              <span className={isCurrent ? 'font-medium' : 'text-muted-foreground'}>
                {step.label}
              </span>
            </div>
          )
        })}
      </div>

      <p className="text-sm text-muted-foreground text-center">
        {progress.message}
      </p>
    </div>
  )
}
```

```typescript
// src/domains/generation/index.ts
// API pública del dominio

export { GenerationForm } from './components/GenerationForm'
export { PipelineProgress } from './components/PipelineProgress'
export { usePipelineProgress } from './hooks/usePipelineProgress'
export { generationService } from './services/generation.service'
export type * from './types/generation.types'
```

### 5.2 Dominio: Artifacts

```typescript
// src/domains/artifacts/services/artifacts.service.ts

import { createClient } from '@/shared/lib/supabase/client'
import type { Database } from '@/shared/types/database.types'

type Artifact = Database['public']['Tables']['artifacts']['Row']

export const artifactsService = {
  async list(filters?: { state?: string }): Promise<Artifact[]> {
    const supabase = createClient()

    let query = supabase
      .from('artifacts')
      .select('*')
      .order('created_at', { ascending: false })

    if (filters?.state) {
      query = query.eq('state', filters.state)
    }

    const { data, error } = await query

    if (error) throw error
    return data
  },

  async getById(id: string): Promise<Artifact> {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('artifacts')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  },

  async getHistory(artifactId: string) {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('pipeline_events')
      .select('*')
      .eq('artifact_id', artifactId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data
  }
}
```

---

## 6. Edge Function: Pipeline

```typescript
// supabase/functions/generate-artifact/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// El pipeline se ejecuta como proceso Python
// Esta función coordina la ejecución

serve(async (req) => {
  const { artifactId } = await req.json()

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  try {
    // Obtener artefacto
    const { data: artifact } = await supabase
      .from('artifacts')
      .select('*')
      .eq('id', artifactId)
      .single()

    // Log evento
    await supabase.from('pipeline_events').insert({
      artifact_id: artifactId,
      event_type: 'PIPELINE_START',
      event_data: { idea_central: artifact.idea_central }
    })

    // Llamar al pipeline Python via HTTP (deployed separately)
    // O usar Deno subprocess si está en el mismo servidor
    const pipelineResponse = await fetch(Deno.env.get('PIPELINE_API_URL')!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('PIPELINE_API_KEY')}`
      },
      body: JSON.stringify({
        idea_central: artifact.idea_central,
        course_id: artifact.course_id
      })
    })

    const result = await pipelineResponse.json()

    // Actualizar artefacto con resultado
    await supabase
      .from('artifacts')
      .update({
        run_id: result.run_id,
        nombres: result.artifact?.nombres,
        objetivos: result.artifact?.objetivos,
        descripcion: result.artifact?.descripcion,
        state: result.state,
        validation_report: result.validation_report,
        semantic_result: result.semantic_result,
        auto_retry_count: result.auto_retry_count,
        generation_metadata: result.metadata
      })
      .eq('id', artifactId)

    // Log evento final
    await supabase.from('pipeline_events').insert({
      artifact_id: artifactId,
      event_type: 'PIPELINE_COMPLETE',
      event_data: { state: result.state, success: result.success }
    })

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    // Marcar como escalado en caso de error
    await supabase
      .from('artifacts')
      .update({ state: 'ESCALATED' })
      .eq('id', artifactId)

    await supabase.from('pipeline_events').insert({
      artifact_id: artifactId,
      event_type: 'PIPELINE_ERROR',
      event_data: { error: error.message }
    })

    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
```

---

## 7. Configuración Netlify

```toml
# netlify.toml

[build]
  command = "npm run build"
  publish = ".next"

[build.environment]
  NODE_VERSION = "20"

# Configuración Next.js
[[plugins]]
  package = "@netlify/plugin-nextjs"

# Headers de seguridad
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"

# Redirects
[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200
```

```javascript
// next.config.js

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['supabase.co'],
  },
  // Netlify adapter
  output: 'standalone',
}

module.exports = nextConfig
```

---

## 8. Variables de Entorno

```env
# .env.local

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # Solo backend

# Pipeline API (si está separado)
PIPELINE_API_URL=https://pipeline-api.railway.app
PIPELINE_API_KEY=your_secret_key

# Gemini (para Edge Functions)
GOOGLE_API_KEY=your_gemini_key
```

---

## 9. Plan de Implementación

### Fase 1: Setup Base (3-4 días)

1. [ ] Crear proyecto Next.js con estructura Screaming
2. [ ] Configurar Supabase proyecto
3. [ ] Ejecutar migraciones SQL
4. [ ] Setup shadcn/ui
5. [ ] Configurar auth con Supabase
6. [ ] Deploy inicial en Netlify

### Fase 2: Dominio Auth (2-3 días)

1. [ ] LoginForm component
2. [ ] SignUpForm component
3. [ ] UserMenu component
4. [ ] ProtectedRoute HOC
5. [ ] Middleware de autenticación

### Fase 3: Dominio Generation (3-4 días)

1. [ ] GenerationForm component
2. [ ] PipelineProgress component
3. [ ] Edge Function para pipeline
4. [ ] Realtime subscription
5. [ ] Tests de integración

### Fase 4: Dominio Artifacts (2-3 días)

1. [ ] ArtifactList component
2. [ ] ArtifactViewer component
3. [ ] ValidationReport component
4. [ ] Hooks y services
5. [ ] Página de detalle

### Fase 5: Dominio QA (3-4 días)

1. [ ] QAQueue component
2. [ ] ReviewPanel component
3. [ ] ApprovalActions component
4. [ ] FeedbackForm component
5. [ ] Workflow completo

### Fase 6: Polish (2-3 días)

1. [ ] Responsive design
2. [ ] Loading states
3. [ ] Error handling
4. [ ] Dashboard con stats
5. [ ] Documentación

---

## 10. Comandos de Setup

```bash
# 1. Crear proyecto
npx create-next-app@latest go-esp-01-web --typescript --tailwind --app
cd go-esp-01-web

# 2. Instalar dependencias
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
npm install zustand react-hook-form @hookform/resolvers zod
npm install lucide-react date-fns

# 3. Setup shadcn/ui
npx shadcn-ui@latest init
npx shadcn-ui@latest add button card input textarea tabs progress

# 4. Setup Supabase CLI
npm install -D supabase
npx supabase init
npx supabase link --project-ref your-project-ref
npx supabase db push

# 5. Generar tipos
npx supabase gen types typescript --project-id your-project-id > src/shared/types/database.types.ts

# 6. Deploy Netlify
npm install -D @netlify/plugin-nextjs
netlify init
netlify deploy --prod
```

---

## Diagrama de Flujo: Usuario Genera Artefacto

```
┌──────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────────┐
│  Usuario │────▶│ GenerationForm│────▶│  Supabase   │────▶│ Edge Function│
│          │     │  (React)     │     │  INSERT     │     │  (Deno)      │
└──────────┘     └──────────────┘     └─────────────┘     └──────┬───────┘
                        │                                        │
                        │ Realtime                               │ HTTP
                        │ Subscription                           ▼
                        │                              ┌──────────────────┐
                        │                              │  Pipeline API    │
                        │                              │  (Python/Gemini) │
                        │                              └────────┬─────────┘
                        │                                       │
                        │         ┌─────────────────────────────┘
                        │         │ UPDATE artifact
                        │         ▼
                        │  ┌─────────────┐
                        └──│  Supabase   │
                           │  Realtime   │
                           └─────────────┘
                                  │
                                  ▼
                         ┌───────────────┐
                         │ PipelineProgress│
                         │   (React)     │
                         └───────────────┘
```

---

**Stack Final:**
- **Frontend:** Next.js 14 + shadcn/ui + Zustand
- **Backend:** Supabase (Auth + PostgreSQL + Realtime + Edge Functions)
- **Hosting:** Netlify
- **Pipeline:** Python + Gemini API (servicio separado)
- **Arquitectura:** Screaming (por dominio)

---

**Autor:** Claude Code
**Fecha:** 2025-12-24
**Versión:** 2.0 (Supabase + Netlify + Screaming)
