import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { ArtifactList } from '@/domains/artifacts'

export default function ArtifactsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Artefactos</h1>
          <p className="text-muted-foreground mt-1">
            Todos los artefactos generados
          </p>
        </div>

        <Button asChild>
          <Link href="/generate">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Artefacto
          </Link>
        </Button>
      </div>

      <ArtifactList />
    </div>
  )
}
