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

  // Check seat availability
  const { data: config } = await supabaseAdmin
    .from('event_config')
    .select('seats_remaining')
    .eq('tier', data.seat_tier)
    .single()

  if (!config || config.seats_remaining <= 0) {
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
    email: data.email || null,
    age: data.age,
    address: data.address,
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

  // Decrement seat count
  await supabaseAdmin.rpc('reserve_seat', { p_tier: data.seat_tier })

  return Response.json({ application_id, amount }, { status: 201 })
}
