import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'attendee') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { applicationId } = await req.json()
  if (applicationId !== session.sub) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const path = `${applicationId}/screenshot.jpg`

  const { data, error } = await supabaseAdmin.storage
    .from('payment-screenshots')
    .createSignedUploadUrl(path)

  if (error) {
    return Response.json({ error: 'Could not create upload URL' }, { status: 500 })
  }

  return Response.json({ signedUrl: data.signedUrl, path })
}
