import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { NextRequest } from 'next/server'

// PATCH — set adjustment for a contestant in a category
export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { contestantId, category, adjustment } = await req.json()

  if (!contestantId || !category || typeof adjustment !== 'number') {
    return Response.json({ error: 'contestantId, category and adjustment required' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('vote_adjustments')
    .upsert(
      { contestant_id: contestantId, contestant_category: category, adjustment, updated_at: new Date().toISOString() },
      { onConflict: 'contestant_id,contestant_category' }
    )

  if (error) {
    console.error('Adjustment error:', error)
    return Response.json({ error: 'Failed to save adjustment' }, { status: 500 })
  }

  return Response.json({ success: true })
}

// GET — fetch all adjustments
export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin
    .from('vote_adjustments')
    .select('contestant_id, contestant_category, adjustment')

  if (error) return Response.json({ error: 'Fetch failed' }, { status: 500 })

  return Response.json({ adjustments: data ?? [] })
}
