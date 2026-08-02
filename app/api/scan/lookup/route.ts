import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || (session.role !== 'admin' && session.role !== 'scanner')) {
    return Response.json({ valid: false, reason: 'Unauthorized' }, { status: 401 })
  }

  const { query } = await req.json()
  if (!query?.trim()) {
    return Response.json({ valid: false, reason: 'Search query is required' }, { status: 400 })
  }

  const q = query.trim()

  // Search registrations by application_id, mobile, or full_name
  const { data: regs } = await supabaseAdmin
    .from('registrations')
    .select('application_id, full_name, mobile, gender, seat_tier')
    .or(`application_id.ilike.%${q}%,mobile.ilike.%${q}%,full_name.ilike.%${q}%`)
    .limit(10)

  if (!regs || regs.length === 0) {
    return Response.json({ valid: false, reason: 'No registration found for that ID, mobile, or name.' }, { status: 404 })
  }

  // If multiple results, return the list so the user can pick
  if (regs.length > 1) {
    return Response.json({ multiple: true, results: regs })
  }

  return Response.json({ multiple: false, result: regs[0] })
}
