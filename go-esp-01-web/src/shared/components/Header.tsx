'use client'

import { User } from 'lucide-react'
import { Button } from './ui/button'

interface HeaderProps {
  title?: string
  user?: {
    email: string
    name?: string
  } | null
}

export function Header({ title, user }: HeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      <div>
        {title && <h1 className="text-xl font-semibold">{title}</h1>}
      </div>

      <div className="flex items-center gap-4">
        {user && (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <User className="h-4 w-4" />
            </div>
            <span className="text-sm text-muted-foreground">
              {user.name || user.email}
            </span>
          </div>
        )}
      </div>
    </header>
  )
}
