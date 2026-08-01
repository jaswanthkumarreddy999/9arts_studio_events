import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { NextRequest } from 'next/server'

async function requireAdmin() {
  const session = await getSession()
  if (!session || session.role !== 'admin') return null
  return session
}

// GET — fetch seating venue config
export async function GET() {
  if (!(await requireAdmin())) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabaseAdmin
    .from('seating_config')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Return defaults if not configured yet
  return Response.json({
    config: data ?? {
      sofa_count: 20,
      sofa_capacity: 2,
      round_table_count: 20,
      round_table_capacity: 6,
      chair_count: 250,
    }
  })
}

// POST — save seating venue config
export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { sofa_count, sofa_capacity, round_table_count, round_table_capacity, chair_count } = body

  // Upsert single config row
  const { data: existing } = await supabaseAdmin
    .from('seating_config')
    .select('id')
    .limit(1)
    .maybeSingle()

  if (existing) {
    await supabaseAdmin
      .from('seating_config')
      .update({ sofa_count, sofa_capacity, round_table_count, round_table_capacity, chair_count })
      .eq('id', existing.id)
  } else {
    await supabaseAdmin
      .from('seating_config')
      .insert({ sofa_count, sofa_capacity, round_table_count, round_table_capacity, chair_count })
  }

  return Response.json({ success: true })
}
