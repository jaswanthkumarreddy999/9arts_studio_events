import { supabaseAdmin } from '@/lib/supabase'
import { SEAT_TIERS } from '@/lib/types'

export const revalidate = 0 // always fresh, no caching

export async function GET() {
  // Count approved payments per tier — this is the ground truth for seats taken
  const { data: approvals } = await supabaseAdmin
    .from('payments')
    .select('registrations!inner(seat_tier)')
    .eq('status', 'approved')

  const taken: Record<string, number> = { elite: 0, gold: 0 }
  for (const row of approvals ?? []) {
    const reg = row.registrations as { seat_tier: string } | { seat_tier: string }[]
    const tier = Array.isArray(reg) ? reg[0]?.seat_tier : reg?.seat_tier
    if (tier && tier in taken) taken[tier]++
  }

  const seats: Record<string, { total: number; remaining: number; sold: number }> = {}
  for (const tier of ['elite', 'gold'] as const) {
    const total = SEAT_TIERS[tier].totalSeats
    const sold = taken[tier] ?? 0
    seats[tier] = { total, remaining: Math.max(0, total - sold), sold }
  }

  return Response.json({ seats })
}
