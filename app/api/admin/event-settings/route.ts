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

  // Validate pass_tiers if present — but skip the elite/gold key restriction
  // so custom tier keys added via the UI work
  if (updates.pass_tiers !== undefined) {
    if (!Array.isArray(updates.pass_tiers) || updates.pass_tiers.length === 0) {
      return Response.json({ error: 'pass_tiers must be a non-empty array' }, { status: 422 })
    }
    for (const t of updates.pass_tiers as Record<string, unknown>[]) {
      if (!t.key || !t.label || typeof t.price !== 'number' || typeof t.totalSeats !== 'number') {
        return Response.json({ error: 'Each pass tier needs key, label, price and totalSeats' }, { status: 422 })
      }
    }
  }

  // Discover which columns actually exist in the DB by reading the current row.
  // This lets us gracefully skip columns added in migrations that haven't been
  // run yet, instead of failing the entire save.
  const { data: existing, error: fetchErr } = await supabaseAdmin
    .from('event_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle()

  let safeUpdates: Record<string, unknown>
  if (fetchErr || !existing) {
    // Can't determine columns — try sending everything and let DB error surface
    safeUpdates = updates
  } else {
    const knownColumns = new Set(Object.keys(existing))
    safeUpdates = Object.fromEntries(
      Object.entries(updates).filter(([k]) => knownColumns.has(k))
    )
  }

  if (Object.keys(safeUpdates).length === 0) {
    return Response.json({ success: true }) // nothing to update
  }

  const { error } = await supabaseAdmin
    .from('event_settings')
    .update(safeUpdates)
    .eq('id', 1)

  if (error) {
    console.error('event_settings update error:', error)
    return Response.json({ error: 'Failed to save settings', detail: error.message }, { status: 500 })
  }

  // Revalidate public pages and the my-pass page so changes show immediately
  revalidatePath('/')
  revalidatePath('/login')
  revalidatePath('/my-pass')

  return Response.json({ success: true })
}

// PATCH — update a subset of event settings (same as PUT but more explicit)
export async function PATCH(req: NextRequest) {
  return PUT(req)
}
