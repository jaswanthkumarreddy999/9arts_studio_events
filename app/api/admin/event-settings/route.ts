import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

// GET — fetch current event settings
export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin
    .from('event_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle()

  if (error) {
    return Response.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }

  return Response.json({ settings: data })
}

// PUT — save (full replace) event settings
export async function PUT(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Strip id and updated_at — these are managed by DB
  const { id: _id, updated_at: _ua, ...updates } = body

  // Validate pass_tiers if present
  if (updates.pass_tiers !== undefined) {
    if (!Array.isArray(updates.pass_tiers) || updates.pass_tiers.length === 0) {
      return Response.json({ error: 'pass_tiers must be a non-empty array' }, { status: 422 })
    }
    for (const t of updates.pass_tiers as Record<string, unknown>[]) {
      if (!t.key || !t.label || typeof t.price !== 'number' || typeof t.totalSeats !== 'number') {
        return Response.json({ error: 'Each pass tier needs key, label, price and totalSeats' }, { status: 422 })
      }
      if (!['elite', 'gold'].includes(t.key as string)) {
        return Response.json({ error: `Tier key "${t.key}" is not valid. Must be "elite" or "gold".` }, { status: 422 })
      }
    }
  }

  const { error } = await supabaseAdmin
    .from('event_settings')
    .update(updates)
    .eq('id', 1)

  if (error) {
    console.error('event_settings update error:', error)
    return Response.json({ error: 'Failed to save settings', detail: error.message }, { status: 500 })
  }

  // Revalidate the public homepage and layout so changes show immediately
  revalidatePath('/')
  revalidatePath('/login')

  return Response.json({ success: true })
}

// PATCH — update a subset of event settings (same as PUT but more explicit)
export async function PATCH(req: NextRequest) {
  return PUT(req)
}
