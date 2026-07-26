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

  const status = action === 'approve' ? 'approved' : 'rejected'

  const { error } = await supabaseAdmin
    .from('payments')
    .update({
      status,
      rejection_reason: note ?? null,
      verified_at: new Date().toISOString(),
    })
    .eq('application_id', applicationId)

  if (error) {
    return Response.json({ error: 'Update failed' }, { status: 500 })
  }

  if (action === 'approve') {
    // Fetch registration to generate QR
    const { data: reg } = await supabaseAdmin
      .from('registrations')
      .select('application_id, full_name, seat_tier')
      .eq('application_id', applicationId)
      .single()

    if (reg) {
      const qrDataUrl = await generateQRDataURL(reg.application_id, reg.seat_tier, reg.full_name)

      await supabaseAdmin.from('passes').upsert({
        application_id: reg.application_id,
        full_name: reg.full_name,
        seat_tier: reg.seat_tier,
        qr_data_url: qrDataUrl,
        issued_at: new Date().toISOString(),
      })
    }
  }

  return Response.json({ success: true })
}
