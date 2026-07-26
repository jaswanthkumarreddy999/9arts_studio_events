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
    .select('id, contestant_id, contestant_category, application_id, voted_at, contestants(name, photo_url)')
    .order('voted_at', { ascending: false })

  if (voteError) return Response.json({ error: 'Fetch failed' }, { status: 500 })

  type VoteRow = {
    id: string
    contestantId: string
    contestantName: string
    photo_url: string | null
    category: string
    applicationId: string
    votedAt: string
  }

  type CategoryResult = {
    contestantId: string
    name: string
    photo_url: string | null
    count: number
  }

  const categoryMap: Record<string, Map<string, CategoryResult>> = {}
  const categoryVotes: Record<string, VoteRow[]> = {}
  for (const cat of CATEGORIES) { categoryMap[cat] = new Map(); categoryVotes[cat] = [] }

  for (const row of voteCounts ?? []) {
    const raw = row.contestants as unknown
    const c = (Array.isArray(raw) ? raw[0] : raw) as { name: string; photo_url: string | null } | null
    const cat = row.contestant_category as string
    if (!categoryMap[cat]) continue

    // Aggregate counts
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

    // Individual votes
    categoryVotes[cat].push({
      id: row.id,
      contestantId: row.contestant_id,
      contestantName: c?.name ?? 'Unknown',
      photo_url: c?.photo_url ?? null,
      category: cat,
      applicationId: row.application_id,
      votedAt: row.voted_at,
    })
  }

  const byCategory: Record<string, CategoryResult[]> = {}
  for (const cat of CATEGORIES) {
    byCategory[cat] = Array.from(categoryMap[cat].values()).sort((a, b) => b.count - a.count)
  }

  const { count: totalVotes } = await supabaseAdmin
    .from('votes')
    .select('*', { count: 'exact', head: true })

  return Response.json({ byCategory, categoryVotes, totalVotes: totalVotes ?? 0 })
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
