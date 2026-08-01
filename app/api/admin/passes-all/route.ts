import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

async function requireAdmin() {
  const session = await getSession()
  if (!session || session.role !== 'admin') return null
  return session
}

export async function GET() {
  if (!(await requireAdmin())) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('passes')
    .select('application_id, ticket_no, table_number, seat_tier')

  if (error) return Response.json({ error: 'Fetch failed' }, { status: 500 })
  return Response.json({ data: data ?? [] })
}
