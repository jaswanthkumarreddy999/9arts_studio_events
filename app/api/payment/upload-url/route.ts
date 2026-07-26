import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

// Accepts multipart/form-data with file + applicationId
// Uploads directly to Supabase storage using service role (no signed URL needed)
export async function POST(req: NextRequest) {
  let applicationId: string
  let file: File | null = null

  const contentType = req.headers.get('content-type') ?? ''

  if (contentType.includes('multipart/form-data')) {
    const fd = await req.formData()
    applicationId = fd.get('applicationId') as string
    file = fd.get('file') as File | null
  } else {
    // Legacy: JSON body requesting a signed URL — we now do the upload server-side
    const body = await req.json()
    applicationId = body.applicationId
  }

  if (!applicationId) {
    return Response.json({ error: 'applicationId required' }, { status: 400 })
  }

  // Auth: logged-in attendee OR unauthed with valid applicationId in DB
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
    if (!reg) return Response.json({ error: 'Registration not found' }, { status: 404 })
  }

  // If a file was included, upload it directly
  if (file) {
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) {
      return Response.json({ error: 'Only JPEG, PNG or WebP images allowed' }, { status: 400 })
    }
    if (file.size > 5 * 1024 * 1024) {
      return Response.json({ error: 'Image must be under 5MB' }, { status: 400 })
    }

    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
    const path = `${applicationId}/screenshot.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const { error } = await supabaseAdmin.storage
      .from('PaymentSS')
      .upload(path, buffer, { contentType: file.type, upsert: true })

    if (error) {
      console.error('Screenshot upload error:', error)
      return Response.json({ error: `Upload failed: ${error.message}` }, { status: 500 })
    }

    return Response.json({ path })
  }

  // No file — return a dummy path so confirm route still works
  return Response.json({ path: '' })
}
