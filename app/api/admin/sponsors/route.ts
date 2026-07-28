import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { NextRequest } from 'next/server'
import { revalidatePath } from 'next/cache'

async function requireAdmin() {
  const session = await getSession()
  if (!session || session.role !== 'admin') return null
  return session
}

export async function GET() {
  if (!(await requireAdmin())) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { data, error } = await supabaseAdmin
    .from('sponsors')
    .select('*')
    .order('display_order')
  if (error) return Response.json({ error: 'Fetch failed' }, { status: 500 })
  return Response.json({ sponsors: data ?? [] })
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await req.json()
  const { name, tagline, logo_url, website_url, tier, display_order } = body
  if (!name?.trim()) return Response.json({ error: 'Name is required' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('sponsors')
    .insert({ name: name.trim(), tagline, logo_url, website_url, tier: tier ?? 'gold', display_order: display_order ?? 0 })
    .select()
    .single()

  if (error) return Response.json({ error: 'Insert failed' }, { status: 500 })
  revalidatePath('/')
  return Response.json({ sponsor: data }, { status: 201 })
}
