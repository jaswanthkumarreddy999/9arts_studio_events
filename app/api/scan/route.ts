import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { verifyQRPayload, type QRPayload } from '@/lib/qr'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || (session.role !== 'admin' && session.role !== 'scanner')) {
    return Response.json({ valid: false, reason: 'Unauthorized' }, { status: 401 })
  }

  let payload: QRPayload
  try {
    payload = await req.json()
  } catch {
    return Response.json({ valid: false, reason: 'Invalid QR data' }, { status: 400 })
  }

  // Step 1: Verify HMAC signature
  if (!verifyQRPayload(payload)) {
    return Response.json({ valid: false, reason: 'Invalid or tampered QR code' }, { status: 400 })
  }

  // Step 2: Check pass exists and is approved
  const { data: pass } = await supabaseAdmin
    .from('passes')
    .select('full_name, seat_tier')
    .eq('application_id', payload.appId)
    .maybeSingle()

  if (!pass) {
    return Response.json({ valid: false, reason: 'Pass not found or payment not approved' }, { status: 403 })
  }

  // Step 3: Check for duplicate scan
  const { data: existing } = await supabaseAdmin
    .from('scan_logs')
    .select('id, scanned_at')
    .eq('application_id', payload.appId)
    .maybeSingle()

  if (existing) {
    const time = new Date(existing.scanned_at).toLocaleString('en-IN')
    return Response.json(
      { valid: false, reason: `Already scanned at ${time}. Duplicate entry.` },
      { status: 409 }
    )
  }

  // Step 4: Log attendance
  await supabaseAdmin.from('scan_logs').insert({
    application_id: payload.appId,
    scanned_at: new Date().toISOString(),
    scanner_device: req.headers.get('user-agent') ?? 'unknown',
  })

  return Response.json({
    valid: true,
    name: pass.full_name,
    tier: pass.seat_tier,
  })
}
