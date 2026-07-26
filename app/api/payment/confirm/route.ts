import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'attendee') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { applicationId, utrNumber, screenshotPath } = await req.json()

  if (applicationId !== session.sub) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (!utrNumber?.trim()) {
    return Response.json({ error: 'UTR number is required' }, { status: 422 })
  }

  const { error } = await supabaseAdmin
    .from('payments')
    .update({
      utr_number: utrNumber.trim(),
      screenshot_path: screenshotPath,
      submitted_at: new Date().toISOString(),
    })
    .eq('application_id', applicationId)

  if (error) {
    return Response.json({ error: 'Update failed' }, { status: 500 })
  }

  return Response.json({ success: true })
}
