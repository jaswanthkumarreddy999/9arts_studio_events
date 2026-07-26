import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { NextRequest } from 'next/server'

async function requireAdmin() {
  const session = await getSession()
  if (!session || session.role !== 'admin') return null
  return session
}

// PATCH — update contestant
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json()
  const { name, tagline, bio, photo_url, category, display_order } = body

  const updates: Record<string, unknown> = {}
  if (name !== undefined) updates.name = name
  if (tagline !== undefined) updates.tagline = tagline
  if (bio !== undefined) updates.bio = bio
  if (photo_url !== undefined) updates.photo_url = photo_url
  if (category !== undefined) updates.category = category
  if (display_order !== undefined) updates.display_order = display_order

  const { data, error } = await supabaseAdmin
    .from('contestants')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return Response.json({ error: 'Update failed' }, { status: 500 })
  return Response.json({ contestant: data })
}

// DELETE — remove contestant
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const { error } = await supabaseAdmin
    .from('contestants')
    .delete()
    .eq('id', id)

  if (error) return Response.json({ error: 'Delete failed' }, { status: 500 })
  return Response.json({ success: true })
}
