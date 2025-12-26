import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { ArtifactViewer } from '@/domains/artifacts'

interface Props {
  params: { id: string }
}

export default function ArtifactDetailPage({ params }: Props) {
  return (
    <div className="space-y-6">
      <Button variant="ghost" asChild>
        <Link href="/artifacts">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a Artefactos
        </Link>
      </Button>

      <ArtifactViewer artifactId={params.id} />
    </div>
  )
}
