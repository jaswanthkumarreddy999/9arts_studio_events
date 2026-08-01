import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { NextRequest } from 'next/server'

async function requireAdmin() {
  const session = await getSession()
  if (!session || session.role !== 'admin') return null
  return session
}

// GET — fetch pass details (ticket_no, table_number)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const { data: pass } = await supabaseAdmin
    .from('passes')
    .select('application_id, ticket_no, table_number')
    .eq('application_id', id)
    .maybeSingle()
  return Response.json({ pass })
}

// PATCH — set ticket_no and table_number on an existing pass
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const { ticket_no, table_number } = await req.json()

  const { error } = await supabaseAdmin
    .from('passes')
    .update({ ticket_no, table_number })
    .eq('application_id', id)

  if (error) return Response.json({ error: 'Update failed' }, { status: 500 })
  return Response.json({ success: true })
}
