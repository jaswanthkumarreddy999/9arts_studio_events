import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { generateQRDataURL } from '@/lib/qr'

// POST — approve all payments sharing a UTR number
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { utrNumber, action, note } = await req.json()

  if (!utrNumber || !['approve', 'reject'].includes(action)) {
    return Response.json({ error: 'utrNumber and action required' }, { status: 400 })
  }

  // Find all pending payments with this UTR
  const { data: payments } = await supabaseAdmin
    .from('payments')
    .select('application_id, status, amount')
    .eq('utr_number', utrNumber)

  if (!payments || payments.length === 0) {
    return Response.json({ error: 'No payments found with this UTR' }, { status: 404 })
  }

  for (const payment of payments) {
    const wasApproved = payment.status === 'approved'
    const newStatus = action === 'approve' ? 'approved' : 'rejected'

    await supabaseAdmin.from('payments').update({
      status: newStatus,
      rejection_reason: note ?? null,
      verified_at: new Date().toISOString(),
    }).eq('application_id', payment.application_id)

    const { data: reg } = await supabaseAdmin
      .from('registrations')
      .select('application_id, full_name, seat_tier')
      .eq('application_id', payment.application_id)
      .single()

    if (!reg) continue

    if (action === 'approve' && !wasApproved) {
      await supabaseAdmin.rpc('reserve_seat', { p_tier: reg.seat_tier })
      const qrDataUrl = await generateQRDataURL(reg.application_id, reg.seat_tier, reg.full_name)
      await supabaseAdmin.from('passes').upsert({
        application_id: reg.application_id,
        full_name: reg.full_name,
        seat_tier: reg.seat_tier,
        qr_data_url: qrDataUrl,
        issued_at: new Date().toISOString(),
      })
    } else if (action === 'reject' && wasApproved) {
      await supabaseAdmin.rpc('release_seat', { p_tier: reg.seat_tier })
      await supabaseAdmin.from('passes').delete().eq('application_id', payment.application_id)
    }
  }

  return Response.json({ success: true, count: payments.length })
}
