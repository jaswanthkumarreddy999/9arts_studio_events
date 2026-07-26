import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'attendee') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: pass } = await supabaseAdmin
    .from('passes')
    .select('application_id, full_name, seat_tier, qr_data_url, issued_at')
    .eq('application_id', session.sub)
    .maybeSingle()

  const { data: payment } = await supabaseAdmin
    .from('payments')
    .select('status, rejection_reason, amount, utr_number')
    .eq('application_id', session.sub)
    .maybeSingle()

  return Response.json({ pass, payment })
}
