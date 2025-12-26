'use client'

import Link from 'next/link'
import { Sparkles, FileText, ClipboardCheck, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { useArtifactStats, ArtifactList } from '@/domains/artifacts'

export default function DashboardPage() {
  const { stats, loading } = useArtifactStats()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Resumen de tu actividad de generación de artefactos
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Generados
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pendientes QA
            </CardTitle>
            <ClipboardCheck className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending_qa}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Aprobados
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Escalados
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.escalated}</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Acciones Rápidas</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Button asChild>
            <Link href="/generate">
              <Sparkles className="mr-2 h-4 w-4" />
              Generar Nuevo Artefacto
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/artifacts">
              <FileText className="mr-2 h-4 w-4" />
              Ver Todos los Artefactos
            </Link>
          </Button>
          {stats.pending_qa > 0 && (
            <Button variant="secondary" asChild>
              <Link href="/qa">
                <ClipboardCheck className="mr-2 h-4 w-4" />
                Revisar Pendientes ({stats.pending_qa})
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Recent Artifacts */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Artefactos Recientes</h2>
        <ArtifactList />
      </div>
    </div>
  )
}
