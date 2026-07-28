import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { NextRequest } from 'next/server'
import { revalidatePath } from 'next/cache'

async function requireAdmin() {
  const session = await getSession()
  if (!session || session.role !== 'admin') return null
  return session
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  const updates: Record<string, unknown> = {}
  for (const key of ['name', 'tagline', 'logo_url', 'website_url', 'tier', 'display_order']) {
    if (body[key] !== undefined) updates[key] = body[key]
  }
  const { data, error } = await supabaseAdmin.from('sponsors').update(updates).eq('id', id).select().single()
  if (error) return Response.json({ error: 'Update failed' }, { status: 500 })
  revalidatePath('/')
  return Response.json({ sponsor: data })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const { error } = await supabaseAdmin.from('sponsors').delete().eq('id', id)
  if (error) return Response.json({ error: 'Delete failed' }, { status: 500 })
  revalidatePath('/')
  return Response.json({ success: true })
}
