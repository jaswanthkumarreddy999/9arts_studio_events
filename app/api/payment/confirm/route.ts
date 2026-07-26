import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { applicationId, utrNumber, screenshotPath } = await req.json()

  if (!applicationId) {
    return Response.json({ error: 'applicationId required' }, { status: 400 })
  }

  // Allow either: logged-in attendee owning this ID, or unauthed request verified by DB lookup
  const session = await getSession()
  if (session && session.role === 'attendee' && session.sub !== applicationId) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  // If no session, verify applicationId actually exists in DB
  if (!session) {
    const { data: reg } = await supabaseAdmin
      .from('registrations')
      .select('application_id')
      .eq('application_id', applicationId)
      .maybeSingle()
    if (!reg) {
      return Response.json({ error: 'Registration not found' }, { status: 404 })
    }
  }

  if (!utrNumber?.trim()) {
    return Response.json({ error: 'UTR number is required' }, { status: 422 })
  }

  const updates: Record<string, string> = {
    utr_number: utrNumber.trim(),
    submitted_at: new Date().toISOString(),
  }
  if (screenshotPath) updates.screenshot_path = screenshotPath

  const { error } = await supabaseAdmin
    .from('payments')
    .update(updates)
    .eq('application_id', applicationId)

  if (error) {
    return Response.json({ error: 'Update failed' }, { status: 500 })
  }

  return Response.json({ success: true })
}
