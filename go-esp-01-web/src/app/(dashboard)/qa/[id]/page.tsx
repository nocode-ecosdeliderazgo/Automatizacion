import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { ArtifactViewer } from '@/domains/artifacts'

interface Props {
  params: { id: string }
}

export default function QADetailPage({ params }: Props) {
  return (
    <div className="space-y-6">
      <Button variant="ghost" asChild>
        <Link href="/qa">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a Cola QA
        </Link>
      </Button>

      <ArtifactViewer artifactId={params.id} />

      {/* TODO: Add QA approval/rejection panel */}
    </div>
  )
}
