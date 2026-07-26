import { buildLogoutCookieHeader } from '@/lib/auth'

export async function POST() {
  const headers = new Headers()
  headers.append('Set-Cookie', buildLogoutCookieHeader())
  return new Response(JSON.stringify({ success: true }), { status: 200, headers })
}
