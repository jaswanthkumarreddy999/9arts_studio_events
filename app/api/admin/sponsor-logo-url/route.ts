import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const sponsorId = formData.get('sponsorId') as string | null

  if (!file || !sponsorId) {
    return Response.json({ error: 'Missing file or sponsorId' }, { status: 400 })
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const path = `sponsors/${sponsorId}/logo.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error } = await supabaseAdmin.storage
    .from('uploads')
    .upload(path, buffer, { contentType: file.type, upsert: true })

  if (error) return Response.json({ error: 'Upload failed' }, { status: 500 })

  const { data } = supabaseAdmin.storage.from('uploads').getPublicUrl(path)
  return Response.json({ publicUrl: data.publicUrl })
}
