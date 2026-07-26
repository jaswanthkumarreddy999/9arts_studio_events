import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { path } = await req.json()
  if (!path) return Response.json({ error: 'Path required' }, { status: 400 })

  const { data, error } = await supabaseAdmin.storage
    .from('PaymentSS')
    .createSignedUrl(path, 60) // 60 second URL

  if (error) return Response.json({ error: 'Could not create URL' }, { status: 500 })

  return Response.json({ url: data.signedUrl })
}
