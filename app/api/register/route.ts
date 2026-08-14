import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { registrationSchema, groupRegistrationSchema } from '@/lib/schemas'
import { generateApplicationId } from '@/lib/applicationId'
import { getEventSettings, buildTierMap } from '@/lib/eventSettings'
import { randomBytes } from 'crypto'

// Duplicate check: same full_name (case-insensitive) + same mobile = already registered
async function findDuplicate(full_name: string, mobile: string) {
  const { data } = await supabaseAdmin
    .from('registrations')
    .select('application_id')
    .ilike('full_name', full_name.trim())
    .eq('mobile', mobile)
    .maybeSingle()
  return data
}

async function checkSeatAvailability(
  seat_tier: string,
  totalSeats: number,
  count = 1
): Promise<boolean> {
  const { count: approvedCount } = await supabaseAdmin
    .from('payments')
    .select('registrations!inner(seat_tier)', { count: 'exact', head: true })
    .eq('status', 'approved')
    .eq('registrations.seat_tier', seat_tier)
  return (approvedCount ?? 0) + count <= totalSeats
}

export async function POST(req: NextRequest) {
  // Load dynamic settings — prices, closed flags, seat counts all come from here
  const settings = await getEventSettings()
  const tierMap = buildTierMap(settings)

  function getTier(key: string) {
    return tierMap[key] ?? null
  }

  function isTierClosed(key: string): boolean {
    const t = getTier(key)
    return !t || t.closed === true
  }

  // Check registrations are open
  if (!settings.registrations_open) {
    return Response.json({ error: settings.registrations_closed_message }, { status: 403 })
  }

  let body: unknown
  try { body = await req.json() } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // ── GROUP BOOKING ────────────────────────────────────────────────────────
  const groupParsed = groupRegistrationSchema.safeParse(body)
  if (groupParsed.success) {
    const { tickets } = groupParsed.data
    const group_id = `GRP-${randomBytes(4).toString('hex').toUpperCase()}`

    // Duplicate within the group
    const seen = new Set<string>()
    for (const t of tickets) {
      const key = `${t.full_name.toLowerCase().trim()}:${t.mobile}`
      if (seen.has(key)) {
        return Response.json({ error: `Duplicate entry: ${t.full_name} (${t.mobile}) appears more than once.` }, { status: 422 })
      }
      seen.add(key)
    }

    // Check existing registrations
    const duplicates: string[] = []
    for (const t of tickets) {
      const dup = await findDuplicate(t.full_name, t.mobile)
      if (dup) duplicates.push(`${t.full_name} (already registered: ${dup.application_id})`)
    }
    if (duplicates.length > 0) {
      return Response.json({ error: `Some people are already registered:\n${duplicates.join('\n')}` }, { status: 409 })
    }

    // Validate tiers and check availability
    const tierCounts: Record<string, number> = {}
    for (const t of tickets) tierCounts[t.seat_tier] = (tierCounts[t.seat_tier] ?? 0) + 1
    for (const [tier, count] of Object.entries(tierCounts)) {
      const tierInfo = getTier(tier)
      if (!tierInfo) {
        return Response.json({ error: `Invalid pass type: ${tier}` }, { status: 422 })
      }
      if (isTierClosed(tier)) {
        return Response.json({ error: `${tierInfo.label} bookings are currently closed.` }, { status: 403 })
      }
      if (!(await checkSeatAvailability(tier, tierInfo.totalSeats, count))) {
        return Response.json({ error: `${tierInfo.label} seats are sold out.` }, { status: 409 })
      }
    }

    // Create registrations + payments
    const results: { application_id: string; full_name: string; amount: number; seat_tier: string }[] = []
    for (const t of tickets) {
      const application_id = generateApplicationId(t.mobile, settings.app_id_prefix)
      const amount = getTier(t.seat_tier)!.price

      const { error: regError } = await supabaseAdmin.from('registrations').insert({
        application_id, full_name: t.full_name, mobile: t.mobile,
        gender: t.gender, seat_tier: t.seat_tier, group_id,
      })
      if (regError) {
        return Response.json({ error: `Failed to register ${t.full_name}. Please try again.` }, { status: 500 })
      }

      const { error: payError } = await supabaseAdmin.from('payments').insert({ application_id, amount, status: 'pending' })
      if (payError) {
        return Response.json({ error: `Failed to create payment for ${t.full_name}. Please try again.` }, { status: 500 })
      }
      results.push({ application_id, full_name: t.full_name, amount, seat_tier: t.seat_tier })
    }

    const totalAmount = results.reduce((s, r) => s + r.amount, 0)
    return Response.json({ group: true, group_id, tickets: results, totalAmount }, { status: 201 })
  }

  // ── INDIVIDUAL BOOKING ───────────────────────────────────────────────────
  const parsed = registrationSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: 'Validation failed', issues: parsed.error.flatten().fieldErrors }, { status: 422 })
  }

  const data = parsed.data
  const tierInfo = getTier(data.seat_tier)

  if (!tierInfo) {
    return Response.json({ error: `Invalid pass type: ${data.seat_tier}` }, { status: 422 })
  }

  if (isTierClosed(data.seat_tier)) {
    return Response.json({ error: `${tierInfo.label} bookings are currently closed.` }, { status: 403 })
  }

  const existing = await findDuplicate(data.full_name, data.mobile)
  if (existing) {
    return Response.json({ error: 'This person is already registered.', application_id: existing.application_id }, { status: 409 })
  }

  if (!(await checkSeatAvailability(data.seat_tier, tierInfo.totalSeats))) {
    return Response.json({ error: `${tierInfo.label} seats are sold out.` }, { status: 409 })
  }

  const application_id = generateApplicationId(data.mobile, settings.app_id_prefix)
  const amount = tierInfo.price

  const { error: regError } = await supabaseAdmin.from('registrations').insert({
    application_id, full_name: data.full_name, mobile: data.mobile,
    gender: data.gender, seat_tier: data.seat_tier,
    extra_data: (body as Record<string, unknown>).extra_data ?? {},
  })
  if (regError) {
    return Response.json({ error: 'Registration failed. Please try again.' }, { status: 500 })
  }

  const { error: payError } = await supabaseAdmin.from('payments').insert({ application_id, amount, status: 'pending' })
  if (payError) {
    return Response.json({ error: 'Failed to create payment record. Please try again.' }, { status: 500 })
  }

  return Response.json({ application_id, amount }, { status: 201 })
}
