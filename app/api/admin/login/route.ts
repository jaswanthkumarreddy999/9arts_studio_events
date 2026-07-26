import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { signToken, buildSessionCookieHeader } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  const { username, password } = await req.json()

  if (!username || !password) {
    return Response.json({ error: 'Username and password required' }, { status: 400 })
  }

  const { data: admin } = await supabaseAdmin
    .from('admins')
    .select('id, username, password_hash, role')
    .eq('username', username.toLowerCase().trim())
    .maybeSingle()

  if (!admin) {
    return Response.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const valid = await bcrypt.compare(password, admin.password_hash)
  if (!valid) {
    return Response.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const token = await signToken({
    sub: admin.id,
    role: admin.role,
    tier: 'admin',
    name: admin.username,
  })

  const headers = new Headers()
  headers.append('Set-Cookie', buildSessionCookieHeader(token))
  return new Response(JSON.stringify({ success: true }), { status: 200, headers })
}
