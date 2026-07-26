import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { NextRequest } from 'next/server'
import { generateQRDataURL } from '@/lib/qr'

const VALID_STATUSES = ['active', 'done', 'payment_pending', 'review', 'deleted'] as const
type RegStatus = typeof VALID_STATUSES[number]

async function requireAdmin() {
  const session = await getSession()
  if (!session || session.role !== 'admin') return null
  return session
}

// PATCH — update registration status
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const { status, note } = await req.json() as { status: RegStatus; note?: string }

  if (!VALID_STATUSES.includes(status)) {
    return Response.json({ error: 'Invalid status' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('registrations')
    .update({
      registration_status: status,
      status_note: note ?? null,
      status_updated_at: new Date().toISOString(),
    })
    .eq('application_id', id)

  if (error) return Response.json({ error: 'Update failed' }, { status: 500 })

  // When marking as done — approve payment and generate QR pass if not already done
  if (status === 'done') {
    const { data: reg } = await supabaseAdmin
      .from('registrations')
      .select('application_id, full_name, seat_tier')
      .eq('application_id', id)
      .single()

    if (reg) {
      // Check if payment already approved
      const { data: payment } = await supabaseAdmin
        .from('payments')
        .select('status')
        .eq('application_id', id)
        .maybeSingle()

      const alreadyApproved = payment?.status === 'approved'

      // Approve or insert payment record
      if (payment) {
        await supabaseAdmin
          .from('payments')
          .update({ status: 'approved', verified_at: new Date().toISOString() })
          .eq('application_id', id)
      } else {
        await supabaseAdmin
          .from('payments')
          .insert({ application_id: id, amount: 0, status: 'approved', verified_at: new Date().toISOString() })
      }

      if (!alreadyApproved) {
        await supabaseAdmin.rpc('reserve_seat', { p_tier: reg.seat_tier })
      }

      // Generate and store QR pass
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

// DELETE — permanently remove a registration (only allowed if already in 'deleted' status)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  // Safety check — must be in deleted status before hard delete
  const { data: reg } = await supabaseAdmin
    .from('registrations')
    .select('registration_status')
    .eq('application_id', id)
    .maybeSingle()

  if (!reg) return Response.json({ error: 'Not found' }, { status: 404 })
  if (reg.registration_status !== 'deleted') {
    return Response.json({ error: 'Move to trash first before permanently deleting' }, { status: 400 })
  }

  // Cascade deletes payments, passes, scan_logs, votes via FK
  const { error } = await supabaseAdmin
    .from('registrations')
    .delete()
    .eq('application_id', id)

  if (error) return Response.json({ error: 'Delete failed' }, { status: 500 })

  return Response.json({ success: true })
}
