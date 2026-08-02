import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { NextRequest } from 'next/server'

async function requireAdmin() {
  const session = await getSession()
  if (!session || session.role !== 'admin') return null
  return session
}

export async function GET() {
  if (!(await requireAdmin())) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabaseAdmin
    .from('seating_config')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return Response.json({
    config: data ?? {
      sofa_count: 20, sofa_capacity: 2,
      round_table_count: 20, round_table_capacity: 6,
      chair_count: 250, chairs_per_row: 10,
      capacity_overrides: {},
    }
  })
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { sofa_count, sofa_capacity, round_table_count, round_table_capacity,
          chair_count, chairs_per_row, capacity_overrides } = body

  const { data: existing } = await supabaseAdmin
    .from('seating_config').select('id').limit(1).maybeSingle()

  const payload = {
    sofa_count, sofa_capacity,
    round_table_count, round_table_capacity,
    chair_count, chairs_per_row: chairs_per_row ?? 10,
    capacity_overrides: capacity_overrides ?? {},
  }

  if (existing) {
    await supabaseAdmin.from('seating_config').update(payload).eq('id', existing.id)
  } else {
    await supabaseAdmin.from('seating_config').insert(payload)
  }

  return Response.json({ success: true })
}
