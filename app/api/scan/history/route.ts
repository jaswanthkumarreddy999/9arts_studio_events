import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { NextRequest } from 'next/server'

// GET — fetch scan history
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || (session.role !== 'admin' && session.role !== 'scanner')) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const search = new URL(req.url).searchParams.get('q') ?? ''

  let query = supabaseAdmin
    .from('scan_logs')
    .select(`
      id, application_id, scanned_at, scanner_device,
      registrations (full_name, seat_tier, mobile)
    `)
    .order('scanned_at', { ascending: false })
    .limit(200)

  if (search) {
    query = query.or(`application_id.ilike.%${search}%`)
  }

  const { data, error } = await query
  if (error) return Response.json({ error: 'Fetch failed' }, { status: 500 })

  return Response.json({ logs: data ?? [] })
}

// DELETE — remove a scan log entry (allows re-entry)
export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await req.json()
  if (!id) return Response.json({ error: 'id required' }, { status: 400 })

  const { error } = await supabaseAdmin.from('scan_logs').delete().eq('id', id)
  if (error) return Response.json({ error: 'Delete failed' }, { status: 500 })

  return Response.json({ success: true })
}
