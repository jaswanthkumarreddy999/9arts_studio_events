import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { contestantId, fileName } = await req.json()
  if (!contestantId || !fileName) {
    return Response.json({ error: 'contestantId and fileName required' }, { status: 400 })
  }

  const ext = fileName.split('.').pop()?.toLowerCase() ?? 'jpg'
  const path = `${contestantId}.${ext}`

  const { data, error } = await supabaseAdmin.storage
    .from('contestant-photos')
    .createSignedUploadUrl(path)

  if (error) return Response.json({ error: 'Could not create upload URL' }, { status: 500 })

  // Build the public URL
  const { data: publicData } = supabaseAdmin.storage
    .from('contestant-photos')
    .getPublicUrl(path)

  return Response.json({
    signedUrl: data.signedUrl,
    path,
    publicUrl: publicData.publicUrl,
  })
}
