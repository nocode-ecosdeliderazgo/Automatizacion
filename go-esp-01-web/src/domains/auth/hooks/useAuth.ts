'use client'

import { useState } from 'react'

// Mock user for development without Supabase
const mockUser = {
  id: 'mock-user-001',
  email: 'dev@example.com',
  created_at: new Date().toISOString()
}

export function useAuth() {
  const [loading] = useState(false)

  // Always authenticated in dev mode
  return {
    user: mockUser,
    session: { user: mockUser },
    loading,
    signIn: async () => {},
    signUp: async () => {},
    signOut: async () => {},
    isAuthenticated: true
  }
}
