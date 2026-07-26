import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { generateQRDataURL } from '@/lib/qr'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { applicationId, action, note } = await req.json()

  if (!applicationId || !['approve', 'reject'].includes(action)) {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  // Get current payment status before changing it (needed for seat restore logic)
  const { data: currentPayment } = await supabaseAdmin
    .from('payments')
    .select('status')
    .eq('application_id', applicationId)
    .maybeSingle()

  const wasApproved = currentPayment?.status === 'approved'
  const newStatus = action === 'approve' ? 'approved' : 'rejected'

  const { error } = await supabaseAdmin
    .from('payments')
    .update({
      status: newStatus,
      rejection_reason: note ?? null,
      verified_at: new Date().toISOString(),
    })
    .eq('application_id', applicationId)

  if (error) {
    return Response.json({ error: 'Update failed' }, { status: 500 })
  }

  // Fetch registration info
  const { data: reg } = await supabaseAdmin
    .from('registrations')
    .select('application_id, full_name, seat_tier')
    .eq('application_id', applicationId)
    .single()

  if (!reg) return Response.json({ success: true })

  if (action === 'approve' && !wasApproved) {
    // Decrement seat count — only when transitioning to approved for first time
    await supabaseAdmin.rpc('reserve_seat', { p_tier: reg.seat_tier })

    // Generate and store QR pass
    const qrDataUrl = await generateQRDataURL(reg.application_id, reg.seat_tier, reg.full_name)
    await supabaseAdmin.from('passes').upsert({
      application_id: reg.application_id,
      full_name: reg.full_name,
      seat_tier: reg.seat_tier,
      qr_data_url: qrDataUrl,
      issued_at: new Date().toISOString(),
    })
  } else if (action === 'reject' && wasApproved) {
    // Restore seat — payment was previously approved, now being reversed
    await supabaseAdmin.rpc('release_seat', { p_tier: reg.seat_tier })

    // Remove the QR pass
    await supabaseAdmin.from('passes').delete().eq('application_id', applicationId)
  }

  return Response.json({ success: true })
}
