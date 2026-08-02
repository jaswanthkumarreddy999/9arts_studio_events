import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { registrationSchema, groupRegistrationSchema } from '@/lib/schemas'
import { generateApplicationId } from '@/lib/applicationId'
import { SEAT_TIERS } from '@/lib/types'
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

async function checkSeatAvailability(seat_tier: string, count = 1): Promise<boolean> {
  const { count: approvedCount } = await supabaseAdmin
    .from('payments')
    .select('registrations!inner(seat_tier)', { count: 'exact', head: true })
    .eq('status', 'approved')
    .eq('registrations.seat_tier', seat_tier)
  const totalSeats = SEAT_TIERS[seat_tier as keyof typeof SEAT_TIERS].totalSeats
  return (approvedCount ?? 0) + count <= totalSeats
}

export async function POST(req: NextRequest) {
  let body: unknown
  try { body = await req.json() } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // ── GROUP BOOKING ────────────────────────────────────────────────────────
  const groupParsed = groupRegistrationSchema.safeParse(body)
  if (groupParsed.success) {
    const { tickets } = groupParsed.data
    const group_id = `GRP-${randomBytes(4).toString('hex').toUpperCase()}`

    // Check for duplicates within the group itself
    const seen = new Set<string>()
    for (const t of tickets) {
      const key = `${t.full_name.toLowerCase().trim()}:${t.mobile}`
      if (seen.has(key)) {
        return Response.json({ error: `Duplicate entry: ${t.full_name} (${t.mobile}) appears more than once in this booking.` }, { status: 422 })
      }
      seen.add(key)
    }

    // Check for existing registrations
    const duplicates: string[] = []
    for (const t of tickets) {
      const dup = await findDuplicate(t.full_name, t.mobile)
      if (dup) duplicates.push(`${t.full_name} (already registered: ${dup.application_id})`)
    }
    if (duplicates.length > 0) {
      return Response.json({ error: `Some people are already registered:\n${duplicates.join('\n')}` }, { status: 409 })
    }

    // Check seat availability per tier
    const tierCounts: Record<string, number> = {}
    for (const t of tickets) tierCounts[t.seat_tier] = (tierCounts[t.seat_tier] ?? 0) + 1
    for (const [tier, count] of Object.entries(tierCounts)) {
      if (!(await checkSeatAvailability(tier, count))) {
        return Response.json({ error: `${SEAT_TIERS[tier as keyof typeof SEAT_TIERS].label} seats are sold out.` }, { status: 409 })
      }
    }

    // Create all registrations + payments
    const results: { application_id: string; full_name: string; amount: number; seat_tier: string }[] = []
    for (const t of tickets) {
      const application_id = generateApplicationId(t.mobile)
      const amount = SEAT_TIERS[t.seat_tier].price

      const { error: regError } = await supabaseAdmin.from('registrations').insert({
        application_id, full_name: t.full_name, mobile: t.mobile,
        gender: t.gender, seat_tier: t.seat_tier, group_id,
      })
      if (regError) {
        console.error('Group reg insert error:', regError)
        return Response.json({ error: `Failed to register ${t.full_name}. Please try again.` }, { status: 500 })
      }

      const { error: payError } = await supabaseAdmin.from('payments').insert({ application_id, amount, status: 'pending' })
      if (payError) {
        console.error('Group payment insert error:', payError)
        return Response.json({ error: `Failed to create payment record for ${t.full_name}. Please try again.` }, { status: 500 })
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

  // Duplicate check: same name + same mobile
  const existing = await findDuplicate(data.full_name, data.mobile)
  if (existing) {
    return Response.json({
      error: 'This person is already registered.',
      application_id: existing.application_id,
    }, { status: 409 })
  }

  if (!(await checkSeatAvailability(data.seat_tier))) {
    return Response.json({ error: `${SEAT_TIERS[data.seat_tier].label} seats are sold out.` }, { status: 409 })
  }

  const application_id = generateApplicationId(data.mobile)
  const amount = SEAT_TIERS[data.seat_tier].price

  const { error: regError } = await supabaseAdmin.from('registrations').insert({
    application_id, full_name: data.full_name, mobile: data.mobile,
    gender: data.gender, seat_tier: data.seat_tier,
  })

  if (regError) {
    console.error('Registration insert error:', regError)
    return Response.json({ error: 'Registration failed. Please try again.' }, { status: 500 })
  }

  const { error: payError } = await supabaseAdmin.from('payments').insert({ application_id, amount, status: 'pending' })
  if (payError) {
    console.error('Payment insert error:', payError)
    return Response.json({ error: 'Failed to create payment record. Please try again.' }, { status: 500 })
  }
  return Response.json({ application_id, amount }, { status: 201 })
}
