import { createClient } from '@/shared/lib/supabase/client'
import type { Artifact, ArtifactFilters } from '../types/artifact.types'

export const artifactsService = {
  async list(filters?: ArtifactFilters): Promise<Artifact[]> {
    const supabase = createClient()

    let query = supabase
      .from('artifacts')
      .select('*')
      .order('created_at', { ascending: false })

    if (filters?.state) {
      query = query.eq('state', filters.state)
    }

    if (filters?.search) {
      query = query.ilike('idea_central', `%${filters.search}%`)
    }

    const { data, error } = await query

    if (error) throw error
    return data || []
  },

  async getById(id: string): Promise<Artifact | null> {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('artifacts')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }

    return data
  },

  async getHistory(artifactId: string) {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('pipeline_events')
      .select('*')
      .eq('artifact_id', artifactId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data || []
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient()

    const { error } = await supabase
      .from('artifacts')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  async getStats() {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('artifacts')
      .select('state')

    if (error) throw error

    const stats = {
      total: data?.length || 0,
      draft: 0,
      generating: 0,
      pending_qa: 0,
      approved: 0,
      rejected: 0,
      escalated: 0
    }

    data?.forEach(artifact => {
      switch (artifact.state) {
        case 'DRAFT':
          stats.draft++
          break
        case 'GENERATING':
        case 'VALIDATING':
          stats.generating++
          break
        case 'READY_FOR_QA':
          stats.pending_qa++
          break
        case 'APPROVED':
          stats.approved++
          break
        case 'REJECTED':
          stats.rejected++
          break
        case 'ESCALATED':
          stats.escalated++
          break
      }
    })

    return stats
  }
}
