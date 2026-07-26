import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { NextRequest } from 'next/server'

// GET — check if current user has already voted
export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'attendee') {
    return Response.json({ error: 'Login required' }, { status: 401 })
  }

  // Only users with approved payments can vote
  const { data: payment } = await supabaseAdmin
    .from('payments')
    .select('status')
    .eq('application_id', session.sub)
    .maybeSingle()

  if (payment?.status !== 'approved') {
    return Response.json({ error: 'Payment must be approved to vote', eligible: false }, { status: 403 })
  }

  const { data: vote } = await supabaseAdmin
    .from('votes')
    .select('contestant_id, contestants(name)')
    .eq('application_id', session.sub)
    .maybeSingle()

  return Response.json({ vote, eligible: true })
}

// POST — cast a vote
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'attendee') {
    return Response.json({ error: 'Login required' }, { status: 401 })
  }

  const { contestantId } = await req.json()
  if (!contestantId) {
    return Response.json({ error: 'contestantId required' }, { status: 400 })
  }

  // Only approved payments can vote
  const { data: payment } = await supabaseAdmin
    .from('payments')
    .select('status')
    .eq('application_id', session.sub)
    .maybeSingle()

  if (payment?.status !== 'approved') {
    return Response.json({ error: 'Your payment must be approved before you can vote' }, { status: 403 })
  }

  // Check contestant exists
  const { data: contestant } = await supabaseAdmin
    .from('contestants')
    .select('id, name')
    .eq('id', contestantId)
    .maybeSingle()

  if (!contestant) {
    return Response.json({ error: 'Contestant not found' }, { status: 404 })
  }

  // Upsert vote (one per person — DB constraint will also enforce this)
  const { error } = await supabaseAdmin
    .from('votes')
    .upsert({ application_id: session.sub, contestant_id: contestantId }, { onConflict: 'application_id' })

  if (error) return Response.json({ error: 'Vote failed' }, { status: 500 })

  return Response.json({ success: true, contestantName: contestant.name })
}
