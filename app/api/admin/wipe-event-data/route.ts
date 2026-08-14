import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'

// POST /api/admin/wipe-event-data
// Wipes all event data: registrations, payments, passes, votes, vote_adjustments,
// scan_logs, sofa_guests, and optionally contestants & sponsors.
// Resets event_config seat counts. Preserves: admins, event_settings.
// Body: { confirmation: 'WIPE ALL DATA', keep_contestants?: boolean, keep_sponsors?: boolean }

export async function POST(req: NextRequest) {
  // Auth — admin only
  const cookieStore = await cookies()
  const token = cookieStore.get('mn_session')?.value
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const session = await verifyToken(token)
  if (!session || session.role !== 'admin') {
    return Response.json({ error: 'Admin access required' }, { status: 403 })
  }

  let body: { confirmation?: string; keep_contestants?: boolean; keep_sponsors?: boolean } = {}
  try { body = await req.json() } catch { /* empty body */ }

  if (body.confirmation !== 'WIPE ALL DATA') {
    return Response.json({ error: 'Confirmation phrase required: send { "confirmation": "WIPE ALL DATA" }' }, { status: 400 })
  }

  const errors: string[] = []

  async function wipe(table: string, column = 'id') {
    // Delete all rows — use a condition that's always true
    const { error } = await supabaseAdmin.from(table).delete().gte(column, '0')
    if (error) {
      // Some tables use UUID PKs, try text comparison
      const { error: e2 } = await supabaseAdmin.from(table).delete().neq(column, 'NONE_WILL_MATCH_THIS_SENTINEL_VALUE_XYZ')
      if (e2) errors.push(`${table}: ${e2.message}`)
    }
  }

  // Order matters — child tables before parent tables (FK constraints)
  await wipe('vote_adjustments', 'contestant_id')
  await wipe('votes')
  await wipe('scan_logs')
  await wipe('passes')
  await wipe('payments')
  await wipe('registrations')
  await wipe('sofa_guests')

  if (!body.keep_contestants) {
    await wipe('contestants')
  }
  if (!body.keep_sponsors) {
    await wipe('sponsors')
  }

  // Reset event_config: set seats_remaining = total_seats for all tiers
  const { data: configs } = await supabaseAdmin.from('event_config').select('tier, total_seats')
  if (configs) {
    for (const cfg of configs) {
      await supabaseAdmin
        .from('event_config')
        .update({ seats_remaining: cfg.total_seats })
        .eq('tier', cfg.tier)
    }
  }

  // Reset seating_config capacity overrides (best effort)
  await supabaseAdmin.from('seating_config').update({ capacity_overrides: {} }).gte('sofa_count', 0)

  if (errors.length > 0) {
    return Response.json({
      success: false,
      message: 'Partial wipe — some tables could not be cleared',
      errors,
    }, { status: 207 })
  }

  return Response.json({
    success: true,
    message: 'All event data wiped. Admins and event settings are preserved.',
    kept_contestants: body.keep_contestants ?? false,
    kept_sponsors: body.keep_sponsors ?? false,
  })
}
