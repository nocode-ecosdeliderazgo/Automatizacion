import { ArtifactList } from '@/domains/artifacts'

export default function QAPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Cola de QA</h1>
        <p className="text-muted-foreground mt-1">
          Artefactos pendientes de revisión y aprobación
        </p>
      </div>

      <ArtifactList initialFilter="READY_FOR_QA" />
    </div>
  )
}
