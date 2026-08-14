import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

// POST — upload a new payment QR image (multipart/form-data, field: "file")
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
  if (file.size > 5 * 1024 * 1024) {
    return Response.json({ error: 'Image must be under 5 MB' }, { status: 400 })
  }

  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const path = `payment-qr.${ext}`

  const buffer = Buffer.from(await file.arrayBuffer())

  const { error } = await supabaseAdmin.storage
    .from('event-assets')
    .upload(path, buffer, { contentType: file.type, upsert: true })

  if (error) {
    console.error('QR upload error:', error)
    return Response.json({ error: `Upload failed: ${error.message}` }, { status: 500 })
  }

  const { data } = supabaseAdmin.storage.from('event-assets').getPublicUrl(path)

  // Bust the CDN cache by appending a timestamp query param
  const publicUrl = `${data.publicUrl}?t=${Date.now()}`

  return Response.json({ publicUrl })
}
