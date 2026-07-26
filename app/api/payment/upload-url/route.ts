import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { applicationId } = await req.json()

  if (!applicationId) {
    return Response.json({ error: 'applicationId required' }, { status: 400 })
  }

  // Allow either: logged-in attendee owning this ID, or unauthed request verified by DB lookup
  const session = await getSession()
  if (session && session.role === 'attendee' && session.sub !== applicationId) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

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

  const path = `${applicationId}/screenshot.jpg`

  const { data, error } = await supabaseAdmin.storage
    .from('PaymentSS')
    .createSignedUploadUrl(path)

  if (error) {
    return Response.json({ error: 'Could not create upload URL' }, { status: 500 })
  }

  return Response.json({ signedUrl: data.signedUrl, path })
}
