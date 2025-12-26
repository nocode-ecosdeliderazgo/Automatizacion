import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(date))
}

export function getStateColor(state: string): string {
  const colors: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-800',
    GENERATING: 'bg-blue-100 text-blue-800',
    VALIDATING: 'bg-yellow-100 text-yellow-800',
    READY_FOR_QA: 'bg-purple-100 text-purple-800',
    APPROVED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
    ESCALATED: 'bg-orange-100 text-orange-800',
  }
  return colors[state] || 'bg-gray-100 text-gray-800'
}

export function getStateLabel(state: string): string {
  const labels: Record<string, string> = {
    DRAFT: 'Borrador',
    GENERATING: 'Generando',
    VALIDATING: 'Validando',
    READY_FOR_QA: 'Pendiente QA',
    APPROVED: 'Aprobado',
    REJECTED: 'Rechazado',
    ESCALATED: 'Escalado',
  }
  return labels[state] || state
}
