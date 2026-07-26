import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { NextRequest } from 'next/server'

const VALID_CATEGORIES = ['kid', 'teen', 'miss', 'misses'] as const
type VoteCategory = typeof VALID_CATEGORIES[number]

async function getEligibility(applicationId: string) {
  const { data: payment } = await supabaseAdmin
    .from('payments')
    .select('status')
    .eq('application_id', applicationId)
    .maybeSingle()
  return payment?.status === 'approved'
}

// GET — return existing votes and eligibility
export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'attendee') {
    return Response.json({ error: 'Login required', eligible: false }, { status: 401 })
  }

  const eligible = await getEligibility(session.sub)
  if (!eligible) {
    return Response.json({ eligible: false, votes: {} })
  }

  const { data: votes } = await supabaseAdmin
    .from('votes')
    .select('contestant_id, contestant_category')
    .eq('application_id', session.sub)

  // Build map: category -> contestant_id
  const voteMap: Record<string, string> = {}
  for (const v of votes ?? []) {
    voteMap[v.contestant_category] = v.contestant_id
  }

  return Response.json({ eligible: true, votes: voteMap })
}

// POST — cast or change a vote in one category
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'attendee') {
    return Response.json({ error: 'Login required' }, { status: 401 })
  }

  const { contestantId, category } = await req.json() as { contestantId: string; category: VoteCategory }

  if (!contestantId || !category) {
    return Response.json({ error: 'contestantId and category required' }, { status: 400 })
  }
  if (!VALID_CATEGORIES.includes(category)) {
    return Response.json({ error: 'Invalid category' }, { status: 400 })
  }

  const eligible = await getEligibility(session.sub)
  if (!eligible) {
    return Response.json({ error: 'Your payment must be approved before you can vote' }, { status: 403 })
  }

  // Verify contestant exists and belongs to the right category
  const { data: contestant } = await supabaseAdmin
    .from('contestants')
    .select('id, name, contestant_category')
    .eq('id', contestantId)
    .maybeSingle()

  if (!contestant) {
    return Response.json({ error: 'Contestant not found' }, { status: 404 })
  }
  if (contestant.contestant_category !== category) {
    return Response.json({ error: `This contestant is not in the ${category} category` }, { status: 400 })
  }

  // Block re-voting — vote is final once cast
  const { data: existing } = await supabaseAdmin
    .from('votes')
    .select('id')
    .eq('application_id', session.sub)
    .eq('contestant_category', category)
    .maybeSingle()

  if (existing) {
    return Response.json({ error: 'You have already voted in this category. Votes are final and cannot be changed.' }, { status: 409 })
  }

  // Insert — one vote per (application_id, category)
  const { error } = await supabaseAdmin
    .from('votes')
    .insert({ application_id: session.sub, contestant_id: contestantId, contestant_category: category })

  if (error) return Response.json({ error: 'Vote failed' }, { status: 500 })

  return Response.json({ success: true, contestantName: contestant.name })
}
