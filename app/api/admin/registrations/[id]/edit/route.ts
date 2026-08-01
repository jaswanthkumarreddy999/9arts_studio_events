import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { NextRequest } from 'next/server'
import { generateQRDataURL } from '@/lib/qr'

async function requireAdmin() {
  const session = await getSession()
  if (!session || session.role !== 'admin') return null
  return session
}

// PATCH — edit registration fields (name, mobile, gender, seat_tier, payment amount/UTR)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const { full_name, mobile, gender, seat_tier, utr_number, amount } = body

  // Update registration fields
  const regUpdates: Record<string, unknown> = {}
  if (full_name !== undefined) regUpdates.full_name = full_name.trim()
  if (mobile !== undefined) regUpdates.mobile = mobile.trim()
  if (gender !== undefined) regUpdates.gender = gender
  if (seat_tier !== undefined) regUpdates.seat_tier = seat_tier

  if (Object.keys(regUpdates).length > 0) {
    const { error } = await supabaseAdmin
      .from('registrations')
      .update(regUpdates)
      .eq('application_id', id)
    if (error) return Response.json({ error: 'Failed to update registration' }, { status: 500 })
  }

  // Update payment fields
  const payUpdates: Record<string, unknown> = {}
  if (utr_number !== undefined) payUpdates.utr_number = utr_number.trim() || null
  if (amount !== undefined) payUpdates.amount = Number(amount)

  if (Object.keys(payUpdates).length > 0) {
    await supabaseAdmin
      .from('payments')
      .update(payUpdates)
      .eq('application_id', id)
  }

  // If name or tier changed and pass exists, regenerate QR
  if (full_name !== undefined || seat_tier !== undefined) {
    const { data: pass } = await supabaseAdmin
      .from('passes')
      .select('full_name, seat_tier')
      .eq('application_id', id)
      .maybeSingle()

    if (pass) {
      const newName = full_name?.trim() ?? pass.full_name
      const newTier = seat_tier ?? pass.seat_tier
      const qrDataUrl = await generateQRDataURL(id, newTier, newName)
      await supabaseAdmin
        .from('passes')
        .update({ full_name: newName, seat_tier: newTier, qr_data_url: qrDataUrl })
        .eq('application_id', id)
    }
  }

  return Response.json({ success: true })
}
