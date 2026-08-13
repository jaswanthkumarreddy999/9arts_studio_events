import { supabaseAdmin } from '@/lib/supabase'
import { getEventSettings, buildTierMap } from '@/lib/eventSettings'

export const revalidate = 0 // always fresh

export async function GET() {
  const settings = await getEventSettings()
  const tierMap = buildTierMap(settings)

  // Count approved payments per tier
  const { data: approvals } = await supabaseAdmin
    .from('payments')
    .select('registrations!inner(seat_tier)')
    .eq('status', 'approved')

  const taken: Record<string, number> = {}
  for (const t of settings.pass_tiers) taken[t.key] = 0

  for (const row of approvals ?? []) {
    const reg = row.registrations as { seat_tier: string } | { seat_tier: string }[]
    const tier = Array.isArray(reg) ? reg[0]?.seat_tier : reg?.seat_tier
    if (tier && tier in taken) taken[tier]++
  }

  const seats: Record<string, { total: number; remaining: number; sold: number }> = {}
  for (const key of Object.keys(tierMap)) {
    const total = tierMap[key].totalSeats
    const sold = taken[key] ?? 0
    seats[key] = { total, remaining: Math.max(0, total - sold), sold }
  }

  return Response.json({ seats })
}
