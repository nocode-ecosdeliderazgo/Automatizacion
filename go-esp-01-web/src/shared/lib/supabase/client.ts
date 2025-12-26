import { createBrowserClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/shared/types/database.types'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
