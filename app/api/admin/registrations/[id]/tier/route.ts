import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { NextRequest } from 'next/server'
import { generateQRDataURL } from '@/lib/qr'
import { SEAT_TIERS } from '@/lib/types'

async function requireAdmin() {
  const session = await getSession()
  if (!session || session.role !== 'admin') return null
  return session
}

// PATCH — upgrade or downgrade seat tier (elite ↔ gold)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const { tier } = await req.json() as { tier: 'elite' | 'gold' }

  if (!['elite', 'gold'].includes(tier)) {
    return Response.json({ error: 'Invalid tier' }, { status: 400 })
  }

  // Update registration tier
  const { error: regError } = await supabaseAdmin
    .from('registrations')
    .update({ seat_tier: tier })
    .eq('application_id', id)

  if (regError) return Response.json({ error: 'Failed to update tier' }, { status: 500 })

  // Update payment amount to match new tier price
  const newPrice = SEAT_TIERS[tier].price
  await supabaseAdmin
    .from('payments')
    .update({ amount: newPrice })
    .eq('application_id', id)

  // Regenerate QR pass with new tier if pass exists
  const { data: pass } = await supabaseAdmin
    .from('passes')
    .select('application_id, full_name')
    .eq('application_id', id)
    .maybeSingle()

  if (pass) {
    const qrDataUrl = await generateQRDataURL(id, tier, pass.full_name)
    await supabaseAdmin
      .from('passes')
      .update({ seat_tier: tier, qr_data_url: qrDataUrl })
      .eq('application_id', id)
  }

  return Response.json({ success: true, tier })
}
