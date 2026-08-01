import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { NextRequest } from 'next/server'

async function requireAdmin() {
  const session = await getSession()
  if (!session || session.role !== 'admin') return null
  return session
}

// PATCH — assign seat to a registration (updates passes.ticket_no and passes.table_number)
export async function PATCH(req: NextRequest) {
  if (!(await requireAdmin())) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { applicationId, seatLabel, tableLabel } = await req.json()

  if (!applicationId) return Response.json({ error: 'applicationId required' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('passes')
    .update({ ticket_no: seatLabel ?? null, table_number: tableLabel ?? null })
    .eq('application_id', applicationId)

  if (error) return Response.json({ error: 'Assignment failed' }, { status: 500 })
  return Response.json({ success: true })
}

// POST — auto-assign all approved-payment registrations to seats
export async function POST() {
  if (!(await requireAdmin())) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // Get config
  const { data: configRow } = await supabaseAdmin
    .from('seating_config')
    .select('*')
    .limit(1)
    .maybeSingle()

  const cfg = configRow ?? {
    sofa_count: 20, sofa_capacity: 2,
    round_table_count: 20, round_table_capacity: 6,
    chair_count: 250,
  }

  // Get all approved passes without seat assignments, ordered by tier then created_at
  const { data: passes } = await supabaseAdmin
    .from('passes')
    .select('application_id, seat_tier, full_name, ticket_no')
    .is('ticket_no', null)
    .order('seat_tier')

  if (!passes?.length) return Response.json({ success: true, assigned: 0 })

  // Build seat pool
  const seats: { label: string; table: string; type: string }[] = []

  // Sofas (VIP/Parents/Sponsors) — prefix S
  for (let s = 1; s <= cfg.sofa_count; s++) {
    for (let p = 1; p <= cfg.sofa_capacity; p++) {
      seats.push({ label: `S${s}-${p}`, table: `Sofa ${s}`, type: 'sofa' })
    }
  }

  // Round tables (Elite) — prefix T
  for (let t = 1; t <= cfg.round_table_count; t++) {
    for (let p = 1; p <= cfg.round_table_capacity; p++) {
      seats.push({ label: `T${t}-${p}`, table: `Table ${t}`, type: 'round_table' })
    }
  }

  // Chairs (Gold) — prefix C
  for (let c = 1; c <= cfg.chair_count; c++) {
    seats.push({ label: `C${c}`, table: `Row ${Math.ceil(c / 10)}`, type: 'chair' })
  }

  // Assign elite first to round tables, gold to chairs
  const elitePasses = passes.filter(p => p.seat_tier === 'elite')
  const goldPasses = passes.filter(p => p.seat_tier === 'gold')

  const roundTableSeats = seats.filter(s => s.type === 'round_table')
  const chairSeats = seats.filter(s => s.type === 'chair')

  let assigned = 0
  const updates: { applicationId: string; seatLabel: string; tableLabel: string }[] = []

  elitePasses.forEach((p, i) => {
    if (i < roundTableSeats.length) {
      updates.push({ applicationId: p.application_id, seatLabel: roundTableSeats[i].label, tableLabel: roundTableSeats[i].table })
    }
  })

  goldPasses.forEach((p, i) => {
    if (i < chairSeats.length) {
      updates.push({ applicationId: p.application_id, seatLabel: chairSeats[i].label, tableLabel: chairSeats[i].table })
    }
  })

  for (const u of updates) {
    await supabaseAdmin
      .from('passes')
      .update({ ticket_no: u.seatLabel, table_number: u.tableLabel })
      .eq('application_id', u.applicationId)
    assigned++
  }

  return Response.json({ success: true, assigned })
}
