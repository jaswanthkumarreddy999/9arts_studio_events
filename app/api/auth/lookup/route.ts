import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { signToken, buildSessionCookieHeader } from '@/lib/auth'
import { mobileLookupSchema, lookupSchema } from '@/lib/schemas'

const attempts = new Map<string, { count: number; resetAt: number }>()
const MAX_ATTEMPTS = 10
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

// Mask a name: "Jaswanth Kumar" → "Jas****** Kum***"
function maskName(name: string): string {
  return name.trim().split(/\s+/).map(word => {
    if (word.length <= 3) return word + '***'
    return word.substring(0, 3) + '*'.repeat(Math.min(word.length - 3, 6))
  }).join(' ')
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  if (isRateLimited(ip)) {
    return Response.json({ error: 'Too many attempts. Please wait 15 minutes.' }, { status: 429 })
  }

  let body: unknown
  try { body = await req.json() } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // ── STEP 1: mobile only → return masked names ────────────────────────────
  const mobileOnly = mobileLookupSchema.safeParse(body)
  if (mobileOnly.success && !('full_name' in (body as object))) {
    const { mobile } = mobileOnly.data

    const { data: regs } = await supabaseAdmin
      .from('registrations')
      .select('application_id, full_name, seat_tier')
      .eq('mobile', mobile)
      .neq('registration_status', 'deleted')

    if (!regs || regs.length === 0) {
      return Response.json({ error: 'No registrations found for this mobile number.' }, { status: 404 })
    }

    return Response.json({
      step: 1,
      count: regs.length,
      maskedNames: regs.map(r => ({ masked: maskName(r.full_name), seat_tier: r.seat_tier })),
    })
  }

  // ── STEP 2: mobile + full_name → confirm and login ───────────────────────
  const parsed = lookupSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: 'Invalid input', issues: parsed.error.flatten().fieldErrors }, { status: 422 })
  }

  const { full_name, mobile } = parsed.data

  const { data: regs } = await supabaseAdmin
    .from('registrations')
    .select('application_id, full_name, seat_tier, mobile, registration_status')
    .eq('mobile', mobile)
    .neq('registration_status', 'deleted')

  if (!regs || regs.length === 0) {
    return Response.json({ error: 'No registrations found for this mobile number.' }, { status: 404 })
  }

  // Fuzzy name match — normalize and compare
  const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim()
  const inputName = normalize(full_name)
  const match = regs.find(r => normalize(r.full_name) === inputName)

  if (!match) {
    return Response.json({ error: 'Name does not match our records. Please check the spelling.' }, { status: 401 })
  }

  const token = await signToken({
    sub: match.application_id,
    role: 'attendee',
    tier: match.seat_tier,
    name: match.full_name,
  })

  const headers = new Headers()
  headers.append('Set-Cookie', buildSessionCookieHeader(token))
  headers.append('Content-Type', 'application/json')

  return new Response(
    JSON.stringify({ success: true, application_id: match.application_id, name: match.full_name }),
    { status: 200, headers }
  )
}
