'use client'

import { useState } from 'react'
import { Search, FileText, Loader2 } from 'lucide-react'
import { Input } from '@/shared/components/ui/input'
import { useArtifacts } from '../hooks/useArtifacts'
import { ArtifactCard } from './ArtifactCard'
import type { ArtifactState } from '@/shared/types/database.types'

interface Props {
  initialFilter?: ArtifactState
}

export function ArtifactList({ initialFilter }: Props) {
  const [search, setSearch] = useState('')
  const { artifacts, loading, error } = useArtifacts({
    state: initialFilter,
    search: search || undefined
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">Error: {error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar artefactos..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* List */}
      {artifacts.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="font-medium text-lg">No hay artefactos</h3>
          <p className="text-muted-foreground">
            {search
              ? 'No se encontraron resultados para tu búsqueda'
              : 'Genera tu primer artefacto para comenzar'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {artifacts.map(artifact => (
            <ArtifactCard key={artifact.id} artifact={artifact} />
          ))}
        </div>
      )}
    </div>
  )
}
