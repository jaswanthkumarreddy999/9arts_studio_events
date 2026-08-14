import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

// POST — upload a new pass/ticket template background image
// multipart/form-data, field: "file"
// Returns: { publicUrl: string }
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return Response.json({ error: 'file field required' }, { status: 400 })

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return Response.json({ error: 'Only JPEG, PNG or WebP allowed' }, { status: 400 })
  }
  if (file.size > 10 * 1024 * 1024) {
    return Response.json({ error: 'Image must be under 10 MB' }, { status: 400 })
  }

  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  // Always overwrite the same path so the URL stays stable
  const path = `pass-template.${ext}`

  const buffer = Buffer.from(await file.arrayBuffer())

  const { error } = await supabaseAdmin.storage
    .from('event-assets')
    .upload(path, buffer, { contentType: file.type, upsert: true })

  if (error) {
    console.error('Pass template upload error:', error)
    return Response.json({ error: `Upload failed: ${error.message}` }, { status: 500 })
  }

  const { data } = supabaseAdmin.storage.from('event-assets').getPublicUrl(path)

  // Append timestamp to bust CDN cache after re-upload
  const publicUrl = `${data.publicUrl}?t=${Date.now()}`

  return Response.json({ publicUrl })
}
