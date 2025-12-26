'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { ArtifactViewer } from '@/domains/artifacts'
import { SyllabusQAView, useSyllabus } from '@/domains/syllabus'

interface Props {
  params: { id: string }
}

export default function QADetailPage({ params }: Props) {
  const { temario } = useSyllabus(params.id)
  const hasPaso2 = temario && temario.modules.length > 0

  return (
    <div className="space-y-6">
      <Button variant="ghost" asChild>
        <Link href="/qa">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a Cola QA
        </Link>
      </Button>

      <Tabs defaultValue="artifact">
        <TabsList>
          <TabsTrigger value="artifact">Paso 1: Artefacto</TabsTrigger>
          <TabsTrigger value="syllabus" disabled={!hasPaso2}>
            Paso 2: Temario {hasPaso2 ? '' : '(no generado)'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="artifact" className="mt-6">
          <ArtifactViewer artifactId={params.id} />
        </TabsContent>

        <TabsContent value="syllabus" className="mt-6">
          <SyllabusQAView artifactId={params.id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
