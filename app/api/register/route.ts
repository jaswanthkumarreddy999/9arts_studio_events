import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { registrationSchema } from '@/lib/schemas'
import { generateApplicationId } from '@/lib/applicationId'
import { SEAT_TIERS } from '@/lib/types'

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = registrationSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: 'Validation failed', issues: parsed.error.flatten().fieldErrors },
      { status: 422 }
    )
  }

  const data = parsed.data

  // Check if mobile already registered
  const { data: existing } = await supabaseAdmin
    .from('registrations')
    .select('application_id')
    .eq('mobile', data.mobile)
    .maybeSingle()

  if (existing) {
    return Response.json(
      {
        error: 'This mobile number is already registered.',
        application_id: existing.application_id,
      },
      { status: 409 }
    )
  }

  // Check seat availability — count approved payments for this tier
  const { count: approvedCount } = await supabaseAdmin
    .from('payments')
    .select('registrations!inner(seat_tier)', { count: 'exact', head: true })
    .eq('status', 'approved')
    .eq('registrations.seat_tier', data.seat_tier)

  const totalSeats = SEAT_TIERS[data.seat_tier].totalSeats
  if ((approvedCount ?? 0) >= totalSeats) {
    return Response.json(
      { error: `${SEAT_TIERS[data.seat_tier].label} seats are sold out.` },
      { status: 409 }
    )
  }

  const application_id = generateApplicationId(data.mobile)
  const amount = SEAT_TIERS[data.seat_tier].price

  // Insert registration
  const { error: regError } = await supabaseAdmin.from('registrations').insert({
    application_id,
    full_name: data.full_name,
    mobile: data.mobile,
    gender: data.gender,
    seat_tier: data.seat_tier,
  })

  if (regError) {
    console.error('Registration insert error:', regError)
    return Response.json({ error: 'Registration failed. Please try again.' }, { status: 500 })
  }

  // Insert payment record
  await supabaseAdmin.from('payments').insert({
    application_id,
    amount,
    status: 'pending',
  })

  // Note: seats_remaining decrements when admin approves payment, not at registration time
  return Response.json({ application_id, amount }, { status: 201 })
}
