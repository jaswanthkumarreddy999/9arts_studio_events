import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || (session.role !== 'admin' && session.role !== 'scanner')) {
    return Response.json({ valid: false, reason: 'Unauthorized' }, { status: 401 })
  }

  const { applicationId } = await req.json()
  if (!applicationId?.trim()) {
    return Response.json({ valid: false, reason: 'applicationId required' }, { status: 400 })
  }

  const appId: string = applicationId.trim()

  // Check pass exists and payment is approved
  const { data: pass } = await supabaseAdmin
    .from('passes')
    .select('full_name, seat_tier, ticket_no, table_number')
    .eq('application_id', appId)
    .maybeSingle()

  if (!pass) {
    return Response.json({ valid: false, reason: 'Pass not found — payment may not be approved yet.' }, { status: 403 })
  }

  // Get registration details
  const { data: reg } = await supabaseAdmin
    .from('registrations')
    .select('mobile, gender')
    .eq('application_id', appId)
    .maybeSingle()

  // Check for duplicate scan
  const { data: existing } = await supabaseAdmin
    .from('scan_logs')
    .select('id, scanned_at')
    .eq('application_id', appId)
    .maybeSingle()

  if (existing) {
    const time = new Date(existing.scanned_at).toLocaleString('en-IN')
    return Response.json(
      { valid: false, reason: `Already scanned at ${time}. Duplicate entry.` },
      { status: 409 }
    )
  }

  // Log attendance
  await supabaseAdmin.from('scan_logs').insert({
    application_id: appId,
    scanned_at: new Date().toISOString(),
    scanner_device: `manual:${req.headers.get('user-agent') ?? 'unknown'}`,
  })

  return Response.json({
    valid: true,
    name: pass.full_name,
    tier: pass.seat_tier,
    applicationId: appId,
    ticketNo: pass.ticket_no ?? null,
    tableNumber: pass.table_number ?? null,
    mobile: reg?.mobile ?? null,
    gender: reg?.gender ?? null,
  })
}
