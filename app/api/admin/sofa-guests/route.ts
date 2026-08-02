import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

async function requireAdmin() {
  const session = await getSession()
  if (!session || session.role !== 'admin') return null
  return session
}

// GET — all sofa guests
export async function GET() {
  if (!(await requireAdmin())) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('sofa_guests')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ guests: data ?? [] })
}

// POST — add a walk-in guest to a sofa
export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, remark, sofaLabel, seatLabel } = await req.json()
  if (!name?.trim()) return Response.json({ error: 'Name is required' }, { status: 400 })
  if (!sofaLabel || !seatLabel) return Response.json({ error: 'sofaLabel and seatLabel required' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('sofa_guests')
    .insert({ name: name.trim(), remark: remark?.trim() || null, sofa_label: sofaLabel, seat_label: seatLabel })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ guest: data }, { status: 201 })
}

// DELETE — remove a guest by id
export async function DELETE(req: NextRequest) {
  if (!(await requireAdmin())) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  if (!id) return Response.json({ error: 'id required' }, { status: 400 })

  const { error } = await supabaseAdmin.from('sofa_guests').delete().eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true })
}
