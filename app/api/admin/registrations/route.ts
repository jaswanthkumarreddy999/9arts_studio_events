import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin
    .from('registrations')
    .select(`
      application_id, full_name, mobile, email, age, address, seat_tier, created_at,
      registration_status, status_note,
      payments (status, utr_number, screenshot_path, submitted_at, rejection_reason, verified_at, amount)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    return Response.json({ error: 'Fetch failed' }, { status: 500 })
  }

  return Response.json({ registrations: data })
}
