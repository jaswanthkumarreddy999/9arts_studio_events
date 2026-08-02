import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { NextRequest } from 'next/server'

async function requireAdmin() {
  const session = await getSession()
  if (!session || session.role !== 'admin') return null
  return session
}

const DEFAULTS = {
  sofa_count: 20, sofa_capacity: 2,
  round_table_count: 20, round_table_capacity: 6,
  chair_row_count: 25, chairs_per_row: 10,
  capacity_overrides: {} as Record<string, number>,
}

export async function GET() {
  if (!(await requireAdmin())) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('seating_config')
    .select('*')
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('seating_config GET error:', error)
    // Table might not exist yet — return defaults so UI still works
    return Response.json({ config: DEFAULTS, _error: error.message })
  }

  return Response.json({ config: data ?? DEFAULTS })
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const {
    sofa_count, sofa_capacity,
    round_table_count, round_table_capacity,
    chair_row_count, chairs_per_row,
    capacity_overrides,
  } = body

  const payload = {
    sofa_count:           sofa_count          ?? DEFAULTS.sofa_count,
    sofa_capacity:        sofa_capacity        ?? DEFAULTS.sofa_capacity,
    round_table_count:    round_table_count    ?? DEFAULTS.round_table_count,
    round_table_capacity: round_table_capacity ?? DEFAULTS.round_table_capacity,
    chair_row_count:      chair_row_count      ?? DEFAULTS.chair_row_count,
    chairs_per_row:       chairs_per_row       ?? DEFAULTS.chairs_per_row,
    capacity_overrides:   capacity_overrides   ?? DEFAULTS.capacity_overrides,
    updated_at: new Date().toISOString(),
  }

  // Try to find existing row
  const { data: existing, error: findError } = await supabaseAdmin
    .from('seating_config')
    .select('id')
    .limit(1)
    .maybeSingle()

  if (findError) {
    console.error('seating_config find error:', findError)
    return Response.json({ error: `DB error: ${findError.message}` }, { status: 500 })
  }

  if (existing) {
    const { error: updateError } = await supabaseAdmin
      .from('seating_config')
      .update(payload)
      .eq('id', existing.id)

    if (updateError) {
      console.error('seating_config update error:', updateError)
      return Response.json({ error: `Save failed: ${updateError.message}` }, { status: 500 })
    }
  } else {
    const { error: insertError } = await supabaseAdmin
      .from('seating_config')
      .insert(payload)

    if (insertError) {
      console.error('seating_config insert error:', insertError)
      return Response.json({ error: `Save failed: ${insertError.message}` }, { status: 500 })
    }
  }

  return Response.json({ success: true })
}
