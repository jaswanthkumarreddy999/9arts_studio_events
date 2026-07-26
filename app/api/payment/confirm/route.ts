import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  // Accepts single: { applicationId, utrNumber, screenshotPath }
  // Or group:       { applicationIds: string[], utrNumber, screenshotPath }
  const body = await req.json()
  const { utrNumber, screenshotPath } = body

  const applicationIds: string[] = body.applicationIds
    ? body.applicationIds
    : body.applicationId
    ? [body.applicationId]
    : []

  if (applicationIds.length === 0) {
    return Response.json({ error: 'applicationId(s) required' }, { status: 400 })
  }

  // Auth: logged-in attendee (single), or unauthed with valid IDs (group/registration flow)
  const session = await getSession()
  if (session && session.role === 'attendee') {
    if (!applicationIds.includes(session.sub)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  if (!session) {
    // Verify all IDs exist
    for (const id of applicationIds) {
      const { data: reg } = await supabaseAdmin
        .from('registrations')
        .select('application_id')
        .eq('application_id', id)
        .maybeSingle()
      if (!reg) return Response.json({ error: `Registration not found: ${id}` }, { status: 404 })
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

  // Update all payment records
  for (const id of applicationIds) {
    await supabaseAdmin.from('payments').update(updates).eq('application_id', id)
  }

  return Response.json({ success: true })
}
