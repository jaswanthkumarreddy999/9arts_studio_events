import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { NextRequest } from 'next/server'

// POST — upload photo directly (multipart/form-data)
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const contestantId = formData.get('contestantId') as string | null

  if (!file || !contestantId) {
    return Response.json({ error: 'file and contestantId required' }, { status: 400 })
  }

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return Response.json({ error: 'Only JPEG, PNG or WebP images allowed' }, { status: 400 })
  }

  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    return Response.json({ error: 'Image must be under 5MB' }, { status: 400 })
  }

  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const path = `${contestantId}.${ext}`

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const { error } = await supabaseAdmin.storage
    .from('contestant Photos')
    .upload(path, buffer, {
      contentType: file.type,
      upsert: true,
    })

  if (error) {
    console.error('Storage upload error:', error)
    return Response.json({ error: `Upload failed: ${error.message}` }, { status: 500 })
  }

  const { data: publicData } = supabaseAdmin.storage
    .from('contestant Photos')
    .getPublicUrl(path)

  return Response.json({ publicUrl: publicData.publicUrl, path })
}
