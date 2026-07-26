import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { signToken, buildSessionCookieHeader } from '@/lib/auth'
import { lookupSchema } from '@/lib/schemas'

const attempts = new Map<string, { count: number; resetAt: number }>()
const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = attempts.get(ip)
  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return false
  }
  entry.count++
  return entry.count > MAX_ATTEMPTS
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  if (isRateLimited(ip)) {
    return Response.json({ error: 'Too many attempts. Please wait 15 minutes.' }, { status: 429 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = lookupSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: 'Invalid input', issues: parsed.error.flatten().fieldErrors },
      { status: 422 }
    )
  }

  const { full_name, mobile } = parsed.data

  const { data: reg } = await supabaseAdmin
    .from('registrations')
    .select('application_id, full_name, seat_tier, mobile')
    .ilike('full_name', full_name.trim())
    .eq('mobile', mobile.trim())
    .maybeSingle()

  if (!reg) {
    return Response.json(
      { error: 'No registration found with these details.' },
      { status: 401 }
    )
  }

  const token = await signToken({
    sub: reg.application_id,
    role: 'attendee',
    tier: reg.seat_tier,
    name: reg.full_name,
  })

  const headers = new Headers()
  headers.append('Set-Cookie', buildSessionCookieHeader(token))
  headers.append('Content-Type', 'application/json')

  return new Response(
    JSON.stringify({
      success: true,
      application_id: reg.application_id,
      name: reg.full_name,
    }),
    { status: 200, headers }
  )
}
