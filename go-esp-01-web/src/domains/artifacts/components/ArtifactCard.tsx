'use client'

import Link from 'next/link'
import { FileText, ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { formatDate, getStateColor, getStateLabel } from '@/shared/lib/utils'
import type { Artifact } from '../types/artifact.types'

interface Props {
  artifact: Artifact
}

export function ArtifactCard({ artifact }: Props) {
  const nombres = artifact.nombres as string[] | null

  return (
    <Link href={`/artifacts/${artifact.id}`}>
      <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
                <FileText className="h-5 w-5 text-primary" />
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate">
                  {nombres?.[0] || 'Sin nombre'}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                  {artifact.idea_central}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className={getStateColor(artifact.state)}>
                    {getStateLabel(artifact.state)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(artifact.created_at)}
                  </span>
                </div>
              </div>
            </div>

            <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
