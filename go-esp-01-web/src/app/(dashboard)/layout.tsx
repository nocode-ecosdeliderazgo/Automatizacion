'use client'

import { useRouter } from 'next/navigation'
import { Sidebar } from '@/shared/components/Sidebar'
import { useAuth } from '@/domains/auth'
import { Loader2 } from 'lucide-react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { loading, isAuthenticated, signOut } = useAuth()

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    router.push('/login')
    return null
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar onSignOut={signOut} />
      <main className="flex-1 overflow-auto">
        <div className="container py-6">
          {children}
        </div>
      </main>
    </div>
  )
}
