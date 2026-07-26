import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { NextRequest } from 'next/server'

async function requireAdmin() {
  const session = await getSession()
  if (!session || session.role !== 'admin') return null
  return session
}

// GET — list all contestants
export async function GET() {
  if (!(await requireAdmin())) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin
    .from('contestants')
    .select('*')
    .order('display_order')

  if (error) return Response.json({ error: 'Fetch failed' }, { status: 500 })
  return Response.json({ contestants: data })
}

// POST — create contestant
export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { name, tagline, bio, photo_url, category, display_order } = body

  if (!name?.trim()) {
    return Response.json({ error: 'Name is required' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('contestants')
    .insert({ name: name.trim(), tagline, bio, photo_url, category, display_order: display_order ?? 0 })
    .select()
    .single()

  if (error) return Response.json({ error: 'Insert failed' }, { status: 500 })
  return Response.json({ contestant: data }, { status: 201 })
}
