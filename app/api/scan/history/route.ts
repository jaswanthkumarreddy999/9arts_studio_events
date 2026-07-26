import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { NextRequest } from 'next/server'

// GET — fetch scan history with stats
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || (session.role !== 'admin' && session.role !== 'scanner')) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const search = new URL(req.url).searchParams.get('q') ?? ''

  // Fetch all logs with registration info (no limit for stats)
  const { data: allLogs, error } = await supabaseAdmin
    .from('scan_logs')
    .select(`
      id, application_id, scanned_at, scanner_device,
      registrations (full_name, seat_tier, mobile, gender)
    `)
    .order('scanned_at', { ascending: false })

  if (error) return Response.json({ error: 'Fetch failed' }, { status: 500 })

  const logs = allLogs ?? []

  // ── Stats breakdown ──────────────────────────────────────────────────────
  const stats = {
    total: logs.length,
    elite: 0, gold: 0,
    male: 0, female: 0, other: 0,
    male_elite: 0, male_gold: 0,
    female_elite: 0, female_gold: 0,
    other_elite: 0, other_gold: 0,
  }

  for (const log of logs) {
    const rawReg = log.registrations
    const reg = (Array.isArray(rawReg) ? rawReg[0] : rawReg) as { seat_tier: string; gender: string } | null
    const tier = reg?.seat_tier ?? ''
    const gender = reg?.gender ?? ''

    if (tier === 'elite') stats.elite++
    if (tier === 'gold') stats.gold++
    if (gender === 'male') stats.male++
    if (gender === 'female') stats.female++
    if (gender === 'other') stats.other++
    if (gender === 'male' && tier === 'elite') stats.male_elite++
    if (gender === 'male' && tier === 'gold') stats.male_gold++
    if (gender === 'female' && tier === 'elite') stats.female_elite++
    if (gender === 'female' && tier === 'gold') stats.female_gold++
    if (gender === 'other' && tier === 'elite') stats.other_elite++
    if (gender === 'other' && tier === 'gold') stats.other_gold++
  }

  // ── Filter for search ────────────────────────────────────────────────────
  const filtered = search
    ? logs.filter(l => {
        const reg = l.registrations as { full_name: string; mobile: string } | null
        const q = search.toLowerCase()
        return (
          l.application_id.toLowerCase().includes(q) ||
          reg?.full_name.toLowerCase().includes(q) ||
          reg?.mobile.includes(search)
        )
      })
    : logs

  return Response.json({ logs: filtered, stats })
}

// DELETE — remove a scan log entry (allows re-entry)
export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await req.json()
  if (!id) return Response.json({ error: 'id required' }, { status: 400 })

  const { error } = await supabaseAdmin.from('scan_logs').delete().eq('id', id)
  if (error) return Response.json({ error: 'Delete failed' }, { status: 500 })

  return Response.json({ success: true })
}
