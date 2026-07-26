import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { NextRequest } from 'next/server'

// DELETE — remove a single vote by vote id
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const { error } = await supabaseAdmin.from('votes').delete().eq('id', id)
  if (error) return Response.json({ error: 'Delete failed' }, { status: 500 })

  return Response.json({ success: true })
}
