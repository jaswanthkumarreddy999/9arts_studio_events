import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

const CATEGORIES = ['kid', 'teen', 'miss', 'misses'] as const

export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: voteCounts, error: voteError } = await supabaseAdmin
    .from('votes')
    .select('contestant_id, contestant_category, contestants(name, photo_url)')

  if (voteError) return Response.json({ error: 'Fetch failed' }, { status: 500 })

  // Per-category aggregation
  type CategoryResult = {
    contestantId: string
    name: string
    photo_url: string | null
    count: number
  }
  const categoryMap: Record<string, Map<string, CategoryResult>> = {}
  for (const cat of CATEGORIES) categoryMap[cat] = new Map()

  for (const row of voteCounts ?? []) {
    const raw = row.contestants as unknown
    const c = (Array.isArray(raw) ? raw[0] : raw) as { name: string; photo_url: string | null } | null
    const cat = row.contestant_category as string
    if (!categoryMap[cat]) continue
    const map = categoryMap[cat]
    if (!map.has(row.contestant_id)) {
      map.set(row.contestant_id, {
        contestantId: row.contestant_id,
        name: c?.name ?? 'Unknown',
        photo_url: c?.photo_url ?? null,
        count: 0,
      })
    }
    map.get(row.contestant_id)!.count++
  }

  const byCategory: Record<string, CategoryResult[]> = {}
  for (const cat of CATEGORIES) {
    byCategory[cat] = Array.from(categoryMap[cat].values()).sort((a, b) => b.count - a.count)
  }

  const { count: totalVotes } = await supabaseAdmin
    .from('votes')
    .select('*', { count: 'exact', head: true })

  return Response.json({ byCategory, totalVotes: totalVotes ?? 0 })
}

// DELETE — reset votes (optionally by category)
export async function DELETE(req: Request) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let category: string | undefined
  try {
    const body = await req.json()
    category = body?.category
  } catch { /* no body = reset all */ }

  let query = supabaseAdmin.from('votes').delete()
  if (category && CATEGORIES.includes(category as typeof CATEGORIES[number])) {
    query = query.eq('contestant_category', category) as typeof query
  } else {
    query = query.neq('id', '00000000-0000-0000-0000-000000000000') as typeof query
  }

  const { error } = await query
  if (error) return Response.json({ error: 'Reset failed' }, { status: 500 })

  return Response.json({ success: true })
}
