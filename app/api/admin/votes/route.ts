import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get vote counts per contestant
  const { data: voteCounts, error: voteError } = await supabaseAdmin
    .from('votes')
    .select('contestant_id, contestants(name, category, photo_url)')

  if (voteError) return Response.json({ error: 'Fetch failed' }, { status: 500 })

  // Aggregate counts
  const countMap = new Map<string, { contestantId: string; name: string; category: string | null; photo_url: string | null; count: number }>()

  for (const row of voteCounts ?? []) {
    const c = row.contestants as { name: string; category: string | null; photo_url: string | null } | null
    if (!countMap.has(row.contestant_id)) {
      countMap.set(row.contestant_id, {
        contestantId: row.contestant_id,
        name: c?.name ?? 'Unknown',
        category: c?.category ?? null,
        photo_url: c?.photo_url ?? null,
        count: 0,
      })
    }
    countMap.get(row.contestant_id)!.count++
  }

  const results = Array.from(countMap.values()).sort((a, b) => b.count - a.count)

  // Also fetch total votes
  const { count: totalVotes } = await supabaseAdmin
    .from('votes')
    .select('*', { count: 'exact', head: true })

  return Response.json({ results, totalVotes: totalVotes ?? 0 })
}

// DELETE — reset all votes
export async function DELETE() {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { error } = await supabaseAdmin.from('votes').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  if (error) return Response.json({ error: 'Reset failed' }, { status: 500 })

  return Response.json({ success: true })
}
