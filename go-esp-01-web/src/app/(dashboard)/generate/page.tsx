import { GenerationForm } from '@/domains/generation'

export default function GeneratePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Generar Artefacto</h1>
        <p className="text-muted-foreground mt-1">
          Crea un nuevo artefacto de curso usando IA
        </p>
      </div>

      <GenerationForm />
    </div>
  )
}
