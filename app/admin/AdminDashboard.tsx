'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { SEAT_TIERS } from '@/lib/types'
import Link from 'next/link'

type PaymentStatus = 'pending' | 'approved' | 'rejected'
type RegStatus = 'active' | 'done' | 'payment_pending' | 'review' | 'deleted'
type AdminTab = 'registrations' | 'contestants' | 'sponsors' | 'seating' | 'votes'
const VOTE_CATEGORIES = ['kid', 'teen', 'miss', 'misses'] as const
type VoteCategory = typeof VOTE_CATEGORIES[number]

const REG_STATUS_META: Record<RegStatus, { label: string; color: string; icon: string }> = {
  active:          { label: 'Active',          icon: '🟢', color: 'text-green-400 bg-green-900/20 border-green-700/30' },
  done:            { label: 'Done',            icon: '✅', color: 'text-emerald-400 bg-emerald-900/20 border-emerald-700/30' },
  payment_pending: { label: 'Payment Pending', icon: '⏳', color: 'text-yellow-400 bg-yellow-900/20 border-yellow-700/30' },
  review:          { label: 'Under Review',    icon: '🔍', color: 'text-blue-400 bg-blue-900/20 border-blue-700/30' },
  deleted:         { label: 'Deleted',         icon: '🗑️', color: 'text-red-400 bg-red-900/20 border-red-700/30' },
}

interface PaymentRecord {
  status: PaymentStatus
  utr_number?: string
  screenshot_path?: string
  submitted_at?: string
  rejection_reason?: string
  verified_at?: string
  amount?: number
}

interface RegRow {
  application_id: string
  full_name: string
  mobile: string
  gender?: string
  seat_tier: string
  created_at: string
  registration_status: RegStatus
  status_note?: string
  payments: PaymentRecord | null
}

interface Contestant {
  id: string
  name: string
  tagline?: string
  bio?: string
  photo_url?: string
  category?: string
  contestant_category?: VoteCategory
  display_order: number
}

interface CategoryResult {
  contestantId: string
  name: string
  photo_url: string | null
  count: number
  adjustment?: number
  displayCount?: number
}

export default function AdminDashboard({ adminName }: { adminName: string }) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<AdminTab>('registrations')

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/admin/login')
  }

  return (
    <div className="min-h-screen" style={{ background: '#0a0a0f' }}>
      <header className="bg-black/60 border-b border-white/10 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">👑</span>
            <div>
              <div className="font-bold text-white text-sm">Miss Nellore 2026 — Admin</div>
              <div className="text-zinc-500 text-xs">Welcome, {adminName}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/scan" className="text-sm text-yellow-400 hover:text-yellow-300 transition-colors">📷 Scanner</Link>
            <button onClick={handleLogout} className="text-zinc-400 hover:text-red-400 text-sm transition-colors">Logout</button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 flex gap-1">
          {(['registrations', 'contestants', 'sponsors', 'seating', 'votes'] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${activeTab === tab ? 'border-yellow-500 text-yellow-400' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}>
              {tab === 'registrations' ? '🎟️ Registrations' : tab === 'contestants' ? '👸 Contestants' : tab === 'sponsors' ? '🤝 Sponsors' : tab === 'seating' ? '🪑 Seating' : '🗳️ Votes'}
            </button>
          ))}
        </div>
      </header>
      <div className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'registrations' && <RegistrationsTab />}
        {activeTab === 'contestants' && <ContestantsTab />}
        {activeTab === 'sponsors' && <SponsorsTab />}
        {activeTab === 'seating' && <SeatingTab />}
        {activeTab === 'votes' && <VotesTab />}
      </div>
    </div>
  )
}

// ─── TierUpgradePanel ─────────────────────────────────────────────────────────

function TierUpgradePanel({ applicationId, currentTier, onSaved }: {
  applicationId: string; currentTier: 'elite' | 'gold'; onSaved: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function changeTier(tier: 'elite' | 'gold') {
    if (tier === currentTier) return
    if (!confirm(`Change pass from ${currentTier.toUpperCase()} to ${tier.toUpperCase()}?\n\nThis will update the tier, price, and regenerate the QR pass.`)) return
    setSaving(true)
    const res = await fetch(`/api/admin/registrations/${applicationId}/tier`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tier }),
    })
    setSaving(false)
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000); onSaved() }
    else { const d = await res.json(); alert(d.error ?? 'Failed') }
  }

  return (
    <div className="border border-purple-700/30 rounded-xl p-4 space-y-3">
      <div className="text-xs text-purple-400 font-semibold uppercase tracking-wide">🔄 Upgrade / Downgrade Pass</div>
      <div className="flex gap-3">
        <button onClick={() => changeTier('elite')} disabled={saving || currentTier === 'elite'}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all ${currentTier === 'elite' ? 'border-amber-500 bg-amber-900/20 text-amber-400 cursor-default' : 'border-amber-700/40 text-amber-400 hover:bg-amber-900/20 disabled:opacity-50'}`}>
          👑 Elite Pass {currentTier === 'elite' ? '(Current)' : '↑ Upgrade · ₹499'}
        </button>
        <button onClick={() => changeTier('gold')} disabled={saving || currentTier === 'gold'}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all ${currentTier === 'gold' ? 'border-yellow-500 bg-yellow-900/20 text-yellow-400 cursor-default' : 'border-yellow-700/40 text-yellow-400 hover:bg-yellow-900/20 disabled:opacity-50'}`}>
          ⭐ Gold Pass {currentTier === 'gold' ? '(Current)' : '↓ Downgrade · ₹299'}
        </button>
      </div>
      {saved && <div className="text-green-400 text-xs text-center">✅ Tier updated & QR regenerated</div>}
    </div>
  )
}

// ─── SeatingTab ───────────────────────────────────────────────────────────────

interface SeatingConfig {
  sofa_count: number; sofa_capacity: number
  round_table_count: number; round_table_capacity: number
  chair_count: number
}

interface SeatRow {
  application_id: string; full_name: string; seat_tier: string
  ticket_no: string | null; table_number: string | null
}

function SeatingTab() {
  const [config, setConfig] = useState<SeatingConfig>({
    sofa_count: 20, sofa_capacity: 2,
    round_table_count: 20, round_table_capacity: 6,
    chair_count: 250,
  })
  const [seats, setSeats] = useState<SeatRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [autoAssigning, setAutoAssigning] = useState(false)
  const [search, setSearch] = useState('')
  const [filterTier, setFilterTier] = useState<'all' | 'elite' | 'gold'>('all')
  const [filterAssigned, setFilterAssigned] = useState<'all' | 'assigned' | 'unassigned'>('all')

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const [cfgRes, regRes, passRes] = await Promise.all([
      fetch('/api/admin/seating/config'),
      fetch('/api/admin/registrations'),
      fetch('/api/admin/passes-all'),
    ])
    if (cfgRes.ok) { const d = await cfgRes.json(); if (d.config) setConfig(d.config) }

    if (regRes.ok && passRes.ok) {
      const regData = await regRes.json()
      const passData = await passRes.json()
      const passMap = new Map<string, { ticket_no: string | null; table_number: string | null }>(
        (passData.data ?? []).map((p: { application_id: string; ticket_no: string | null; table_number: string | null }) => [p.application_id, p])
      )
      type RawReg = {
        application_id: string; full_name: string; seat_tier: string
        registration_status: string
        payments: { status: string } | { status: string }[] | null
      }
      const rows: SeatRow[] = (regData.registrations ?? [])
        .map((r: RawReg) => {
          // Normalize payments array → single object (same as RegistrationsTab)
          const payment = Array.isArray(r.payments) ? (r.payments[0] ?? null) : r.payments
          return { ...r, payments: payment }
        })
        .filter((r: RawReg & { payments: { status: string } | null }) =>
          r.registration_status !== 'deleted'
        )
        .map((r: RawReg) => {
          const p = passMap.get(r.application_id)
          return {
            application_id: r.application_id,
            full_name: r.full_name,
            seat_tier: r.seat_tier,
            ticket_no: p?.ticket_no ?? null,
            table_number: p?.table_number ?? null,
          }
        })
      setSeats(rows)
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  async function saveConfig() {
    setSaving(true)
    await fetch('/api/admin/seating/config', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    })
    setSaving(false)
  }

  async function autoAssign() {
    if (!confirm('Auto-assign seats to all approved unassigned registrations?\n\nElite → Round Tables, Gold → Chairs. This will not overwrite existing assignments.')) return
    setAutoAssigning(true)
    const res = await fetch('/api/admin/seating/assign', { method: 'POST' })
    const d = await res.json()
    setAutoAssigning(false)
    if (res.ok) { alert(`✅ Assigned ${d.assigned} seats`); fetchAll() }
    else alert(d.error ?? 'Failed')
  }

  async function clearSeat(applicationId: string) {
    await fetch('/api/admin/seating/assign', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ applicationId, seatLabel: null, tableLabel: null }),
    })
    fetchAll()
  }

  async function updateSeat(applicationId: string, seatLabel: string, tableLabel: string) {
    await fetch('/api/admin/seating/assign', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ applicationId, seatLabel, tableLabel }),
    })
    fetchAll()
  }

  const totalSofaSeats = config.sofa_count * config.sofa_capacity
  const totalTableSeats = config.round_table_count * config.round_table_capacity
  const totalCapacity = totalSofaSeats + totalTableSeats + config.chair_count

  const eliteCount = seats.filter(s => s.seat_tier === 'elite').length
  const goldCount = seats.filter(s => s.seat_tier === 'gold').length
  const assignedCount = seats.filter(s => s.ticket_no).length

  const filtered = seats
    .filter(s => filterTier === 'all' || s.seat_tier === filterTier)
    .filter(s => filterAssigned === 'all' || (filterAssigned === 'assigned' ? !!s.ticket_no : !s.ticket_no))
    .filter(s => !search || s.full_name.toLowerCase().includes(search.toLowerCase()) || s.application_id.toLowerCase().includes(search.toLowerCase()) || (s.ticket_no ?? '').toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-6">
      {/* Venue Config */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between">
          <span className="text-white font-semibold text-sm">🏟️ Venue Configuration</span>
          <button onClick={saveConfig} disabled={saving}
            className="text-xs bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-4 py-1.5 rounded-lg disabled:opacity-50 transition-colors">
            {saving ? 'Saving…' : '💾 Save Config'}
          </button>
        </div>
        <div className="p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {([
            { label: 'Sofas', field: 'sofa_count', desc: 'VIP/Parents/Sponsors' },
            { label: 'Per Sofa', field: 'sofa_capacity', desc: 'Seats per sofa' },
            { label: 'Round Tables', field: 'round_table_count', desc: 'Elite section' },
            { label: 'Per Table', field: 'round_table_capacity', desc: 'Seats per table' },
            { label: 'Chairs', field: 'chair_count', desc: 'Gold section' },
          ] as { label: string; field: keyof SeatingConfig; desc: string }[]).map(({ label, field, desc }) => (
            <div key={field}>
              <label className="block text-xs text-zinc-400 mb-1">{label}</label>
              <input type="number" min={0} value={config[field]}
                onChange={e => setConfig(c => ({ ...c, [field]: Number(e.target.value) }))}
                className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-yellow-500" />
              <div className="text-zinc-600 text-xs mt-0.5">{desc}</div>
            </div>
          ))}
        </div>
        {/* Capacity summary */}
        <div className="px-5 pb-4 grid grid-cols-3 sm:grid-cols-5 gap-3 text-center">
          {[
            { label: 'Sofa seats', value: totalSofaSeats, color: 'text-purple-400' },
            { label: 'Table seats', value: totalTableSeats, color: 'text-amber-400' },
            { label: 'Chair seats', value: config.chair_count, color: 'text-yellow-400' },
            { label: 'Total capacity', value: totalCapacity, color: 'text-green-400' },
            { label: 'Assigned', value: `${assignedCount}/${seats.length}`, color: 'text-cyan-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white/5 rounded-xl px-3 py-2">
              <div className={`font-bold text-lg ${color}`}>{value}</div>
              <div className="text-zinc-500 text-xs">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Seat overview per tier */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-amber-900/10 border border-amber-700/30 rounded-2xl p-4">
          <div className="text-amber-400 font-semibold text-sm mb-1">👑 Elite Registrations</div>
          <div className="text-3xl font-bold text-white">{eliteCount}</div>
          <div className="text-zinc-500 text-xs mt-1">Assigned to Round Tables (capacity: {totalTableSeats})</div>
          {eliteCount > totalTableSeats && (
            <div className="text-red-400 text-xs mt-1">⚠️ Overflow: {eliteCount - totalTableSeats} without a table seat</div>
          )}
        </div>
        <div className="bg-yellow-900/10 border border-yellow-700/30 rounded-2xl p-4">
          <div className="text-yellow-400 font-semibold text-sm mb-1">⭐ Gold Registrations</div>
          <div className="text-3xl font-bold text-white">{goldCount}</div>
          <div className="text-zinc-500 text-xs mt-1">Assigned to Chairs (capacity: {config.chair_count})</div>
          {goldCount > config.chair_count && (
            <div className="text-red-400 text-xs mt-1">⚠️ Overflow: {goldCount - config.chair_count} without a chair</div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 items-center">
        <button onClick={autoAssign} disabled={autoAssigning}
          className="bg-green-700 hover:bg-green-600 text-white text-sm font-bold px-5 py-2.5 rounded-xl disabled:opacity-50 transition-colors">
          {autoAssigning ? '⏳ Assigning…' : '🪄 Auto-Assign All Unassigned'}
        </button>
        <button onClick={fetchAll} className="text-xs text-zinc-400 hover:text-white transition-colors">↻ Refresh</button>
      </div>

      {/* Seat table */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10 flex flex-wrap gap-3 items-center">
          <span className="text-white text-sm font-semibold">Seat Assignments ({filtered.length})</span>
          <div className="flex gap-2 flex-wrap ml-auto">
            {(['all', 'elite', 'gold'] as const).map(t => (
              <button key={t} onClick={() => setFilterTier(t)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-all capitalize ${filterTier === t ? 'border-yellow-500 text-yellow-400 bg-yellow-900/20' : 'border-white/10 text-zinc-400'}`}>
                {t === 'all' ? 'All tiers' : t === 'elite' ? '👑 Elite' : '⭐ Gold'}
              </button>
            ))}
            {(['all', 'assigned', 'unassigned'] as const).map(f => (
              <button key={f} onClick={() => setFilterAssigned(f)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-all capitalize ${filterAssigned === f ? 'border-cyan-500 text-cyan-400 bg-cyan-900/20' : 'border-white/10 text-zinc-400'}`}>
                {f}
              </button>
            ))}
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name / ID / seat…"
              className="bg-black/40 border border-white/10 text-white placeholder-zinc-600 rounded-lg px-3 py-1 text-xs focus:outline-none focus:border-yellow-500 w-44" />
          </div>
        </div>
        {loading ? (
          <div className="text-center py-8 text-zinc-500">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-zinc-500">No registrations found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-zinc-500 text-xs uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Name / ID</th>
                  <th className="text-left px-4 py-3">Tier</th>
                  <th className="text-left px-4 py-3">Seat No</th>
                  <th className="text-left px-4 py-3">Table / Row</th>
                  <th className="text-left px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map(row => (
                  <SeatAssignRow key={row.application_id} row={row}
                    onClear={() => clearSeat(row.application_id)}
                    onSave={(seat, table) => updateSeat(row.application_id, seat, table)} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function SeatAssignRow({ row, onClear, onSave }: {
  row: SeatRow; onClear: () => void; onSave: (seat: string, table: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [seat, setSeat] = useState(row.ticket_no ?? '')
  const [table, setTable] = useState(row.table_number ?? '')

  useEffect(() => { setSeat(row.ticket_no ?? ''); setTable(row.table_number ?? '') }, [row])

  return (
    <tr className="hover:bg-white/5 transition-colors">
      <td className="px-4 py-3">
        <div className="text-white font-medium text-sm">{row.full_name}</div>
        <div className="text-zinc-500 text-xs font-mono">{row.application_id}</div>
      </td>
      <td className="px-4 py-3">
        <span className={`text-xs font-bold px-2 py-1 rounded-full border ${row.seat_tier === 'elite' ? 'text-amber-400 bg-amber-900/20 border-amber-700/30' : 'text-yellow-400 bg-yellow-900/20 border-yellow-700/30'}`}>
          {row.seat_tier === 'elite' ? '👑 Elite' : '⭐ Gold'}
        </span>
      </td>
      <td className="px-4 py-3">
        {editing ? (
          <input value={seat} onChange={e => setSeat(e.target.value)} placeholder="e.g. T1-3"
            className="w-24 bg-white/5 border border-white/10 text-white rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-yellow-500" />
        ) : (
          row.ticket_no
            ? <span className="text-cyan-400 font-mono text-xs bg-cyan-900/20 border border-cyan-700/30 px-2 py-1 rounded-lg">{row.ticket_no}</span>
            : <span className="text-zinc-600 text-xs">Not assigned</span>
        )}
      </td>
      <td className="px-4 py-3">
        {editing ? (
          <input value={table} onChange={e => setTable(e.target.value)} placeholder="e.g. Table 1"
            className="w-24 bg-white/5 border border-white/10 text-white rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-yellow-500" />
        ) : (
          row.table_number
            ? <span className="text-zinc-300 text-xs">{row.table_number}</span>
            : <span className="text-zinc-600 text-xs">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-2">
          {editing ? (
            <>
              <button onClick={() => { onSave(seat, table); setEditing(false) }}
                className="text-xs bg-green-700 hover:bg-green-600 text-white px-2.5 py-1 rounded-lg">✓ Save</button>
              <button onClick={() => setEditing(false)}
                className="text-xs text-zinc-400 hover:text-white px-2 py-1 rounded-lg">✕</button>
            </>
          ) : (
            <>
              <button onClick={() => setEditing(true)}
                className="text-xs text-yellow-400 hover:text-yellow-300 border border-yellow-700/30 px-2.5 py-1 rounded-lg">✏️</button>
              {row.ticket_no && (
                <button onClick={onClear}
                  className="text-xs text-red-400 hover:text-red-300 border border-red-700/30 px-2.5 py-1 rounded-lg">✕</button>
              )}
            </>
          )}
        </div>
      </td>
    </tr>
  )
}

// ─── TicketAssignPanel ────────────────────────────────────────────────────────

function TicketAssignPanel({ applicationId, onSaved }: { applicationId: string; onSaved: () => void }) {
  const [ticketNo, setTicketNo] = useState('')
  const [tableNo, setTableNo] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    // Load existing values
    fetch(`/api/admin/passes/${applicationId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.pass) {
          setTicketNo(d.pass.ticket_no ?? '')
          setTableNo(d.pass.table_number ?? '')
        }
      })
      .catch(() => {})
  }, [applicationId])

  async function handleSave() {
    setSaving(true)
    const res = await fetch(`/api/admin/passes/${applicationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ticket_no: ticketNo.trim() || null,
        table_number: tableNo.trim() || null,
      }),
    })
    setSaving(false)
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000); onSaved() }
  }

  return (
    <div className="border border-cyan-700/30 rounded-xl p-4 space-y-3">
      <div className="text-xs text-cyan-400 font-semibold uppercase tracking-wide">🎫 Ticket & Table Assignment</div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-zinc-500 mb-1">Ticket No</label>
          <input
            type="text"
            value={ticketNo}
            onChange={e => setTicketNo(e.target.value)}
            placeholder="e.g. T-001"
            className="w-full bg-white/5 border border-white/10 text-white placeholder-zinc-600 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
          />
        </div>
        <div>
          <label className="block text-xs text-zinc-500 mb-1">Table No</label>
          <input
            type="text"
            value={tableNo}
            onChange={e => setTableNo(e.target.value)}
            placeholder="e.g. T-12"
            className="w-full bg-white/5 border border-white/10 text-white placeholder-zinc-600 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-2 rounded-xl text-sm font-semibold bg-cyan-900/30 border border-cyan-700/40 text-cyan-300 hover:bg-cyan-900/50 disabled:opacity-50 transition-colors"
      >
        {saving ? 'Saving…' : saved ? '✅ Saved' : '💾 Save Ticket & Table'}
      </button>
    </div>
  )
}

// ─── REGISTRATIONS TAB ────────────────────────────────────────────────────────

function RegistrationsTab() {
  const [rows, setRows] = useState<RegRow[]>([])
  const [statusFilter, setStatusFilter] = useState<RegStatus | 'all'>('all')
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatus | 'all'>('all')
  const [selected, setSelected] = useState<RegRow | null>(null)
  const [screenshotUrl, setScreenshotUrl] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [paymentNote, setPaymentNote] = useState('')
  const [statusNote, setStatusNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  type SortField = 'name' | 'date' | 'utr' | 'tier' | 'mobile' | 'gender' | 'reg_status' | 'pay_status'
  type SortDir = 'asc' | 'desc'
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  const fetchRows = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/registrations')
    if (res.ok) {
      const data = await res.json()
      // Supabase returns payments as array (one-to-many) — normalize to single object
      const normalized = (data.registrations ?? []).map((r: RegRow & { payments: PaymentRecord | PaymentRecord[] | null }) => ({
        ...r,
        payments: Array.isArray(r.payments) ? (r.payments[0] ?? null) : r.payments,
      }))
      setRows(normalized)
    } else {
      console.error('Failed to fetch registrations:', res.status, await res.text())
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchRows() }, [fetchRows])

  async function openDetail(row: RegRow) {
    setSelected(row)
    setPaymentNote('')
    setStatusNote(row.status_note ?? '')
    setScreenshotUrl('')
    if (row.payments?.screenshot_path) {
      const res = await fetch('/api/admin/screenshot-url', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: row.payments.screenshot_path }),
      })
      if (res.ok) { const d = await res.json(); setScreenshotUrl(d.url) }
    }
  }

  async function handlePaymentAction(action: 'approve' | 'reject') {
    if (!selected) return
    setActionLoading(true)
    const res = await fetch('/api/admin/verify-payment', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ applicationId: selected.application_id, action, note: paymentNote }),
    })
    if (res.ok) { await fetchRows(); setSelected(null) }
    setActionLoading(false)
  }

  async function handleStatusChange(newStatus: RegStatus) {
    if (!selected) return
    setActionLoading(true)
    const res = await fetch(`/api/admin/registrations/${selected.application_id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus, note: statusNote }),
    })
    if (res.ok) {
      setSelected(s => s ? { ...s, registration_status: newStatus, status_note: statusNote } : null)
      await fetchRows()
    } else {
      const d = await res.json().catch(() => ({}))
      alert(`Status update failed: ${d.error ?? res.status}`)
    }
    setActionLoading(false)
  }

  async function handleHardDelete() {
    if (!selected) return
    if (!confirm(`PERMANENTLY DELETE "${selected.full_name}"?\n\nThis will remove ALL their data including payment records. This cannot be undone.`)) return
    setActionLoading(true)
    const res = await fetch(`/api/admin/registrations/${selected.application_id}`, { method: 'DELETE' })
    if (res.ok) { setSelected(null); await fetchRows() }
    else { const d = await res.json(); alert(d.error) }
    setActionLoading(false)
  }

  const counts = {
    all: rows.length,
    active: rows.filter(r => (r.registration_status ?? 'active') === 'active').length,
    done: rows.filter(r => r.registration_status === 'done').length,
    payment_pending: rows.filter(r => r.registration_status === 'payment_pending').length,
    review: rows.filter(r => r.registration_status === 'review').length,
    deleted: rows.filter(r => r.registration_status === 'deleted').length,
  }

  // Exclude deleted from stats
  const active = rows.filter(r => r.registration_status !== 'deleted')
  const regStats = {
    total: active.length,
    elite: active.filter(r => r.seat_tier === 'elite').length,
    gold: active.filter(r => r.seat_tier === 'gold').length,
    male: active.filter(r => r.gender === 'male').length,
    female: active.filter(r => r.gender === 'female').length,
    other: active.filter(r => r.gender === 'other').length,
    male_elite: active.filter(r => r.gender === 'male' && r.seat_tier === 'elite').length,
    male_gold: active.filter(r => r.gender === 'male' && r.seat_tier === 'gold').length,
    female_elite: active.filter(r => r.gender === 'female' && r.seat_tier === 'elite').length,
    female_gold: active.filter(r => r.gender === 'female' && r.seat_tier === 'gold').length,
    other_elite: active.filter(r => r.gender === 'other' && r.seat_tier === 'elite').length,
    other_gold: active.filter(r => r.gender === 'other' && r.seat_tier === 'gold').length,
    paid: active.filter(r => r.payments?.status === 'approved').length,
    paid_elite: active.filter(r => r.payments?.status === 'approved' && r.seat_tier === 'elite').length,
    paid_gold: active.filter(r => r.payments?.status === 'approved' && r.seat_tier === 'gold').length,
  }

  const filtered = rows
    .filter(r => statusFilter === 'all' || (r.registration_status ?? 'active') === statusFilter)
    .filter(r => paymentFilter === 'all' || r.payments?.status === paymentFilter)
    .filter(r => !search ||
      r.full_name.toLowerCase().includes(search.toLowerCase()) ||
      r.mobile.includes(search) ||
      r.application_id.toLowerCase().includes(search.toLowerCase()) ||
      (r.payments?.utr_number ?? '').toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      let cmp = 0
      if (sortField === 'name') cmp = a.full_name.localeCompare(b.full_name)
      else if (sortField === 'mobile') cmp = a.mobile.localeCompare(b.mobile)
      else if (sortField === 'gender') cmp = (a.gender ?? '').localeCompare(b.gender ?? '')
      else if (sortField === 'reg_status') cmp = (a.registration_status ?? '').localeCompare(b.registration_status ?? '')
      else if (sortField === 'pay_status') cmp = (a.payments?.status ?? '').localeCompare(b.payments?.status ?? '')
      else if (sortField === 'date') cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      else if (sortField === 'tier') cmp = a.seat_tier.localeCompare(b.seat_tier)
      else if (sortField === 'utr') {
        const ua = a.payments?.utr_number ?? ''
        const ub = b.payments?.utr_number ?? ''
        cmp = ua.localeCompare(ub)
      }
      return sortDir === 'asc' ? cmp : -cmp
    })

  const paymentColor = (s?: string) =>
    s === 'approved' ? 'text-green-400 bg-green-900/20 border-green-700/30' :
    s === 'rejected' ? 'text-red-400 bg-red-900/20 border-red-700/30' :
    'text-yellow-400 bg-yellow-900/20 border-yellow-700/30'

  // ── Anomaly detection (client-side, from existing rows data) ──────────────
  interface Anomaly {
    type: 'duplicate_mobile' | 'duplicate_name' | 'utr_shared_different_mobile' | 'approved_no_pass' | 'duplicate_utr_approved'
    label: string
    detail: string
    ids: string[]
  }

  const anomalies: Anomaly[] = []
  const nonDeleted = rows.filter(r => r.registration_status !== 'deleted')

  // 1. Duplicate mobile numbers
  const byMobile = new Map<string, RegRow[]>()
  for (const r of nonDeleted) {
    const m = r.mobile.replace(/\D/g, '').slice(-10)
    if (!byMobile.has(m)) byMobile.set(m, [])
    byMobile.get(m)!.push(r)
  }
  for (const [mobile, group] of byMobile) {
    if (group.length > 1) {
      anomalies.push({
        type: 'duplicate_mobile',
        label: 'Duplicate Mobile Number',
        detail: `+91 ${mobile} — ${group.length} registrations: ${group.map(r => r.full_name).join(', ')}`,
        ids: group.map(r => r.application_id),
      })
    }
  }

  // 2. Duplicate full names (case-insensitive)
  const byName = new Map<string, RegRow[]>()
  for (const r of nonDeleted) {
    const key = r.full_name.trim().toLowerCase()
    if (!byName.has(key)) byName.set(key, [])
    byName.get(key)!.push(r)
  }
  for (const [, group] of byName) {
    if (group.length > 1) {
      anomalies.push({
        type: 'duplicate_name',
        label: 'Duplicate Name',
        detail: `"${group[0].full_name}" — ${group.length} registrations with different IDs`,
        ids: group.map(r => r.application_id),
      })
    }
  }

  // 3. Same UTR approved for registrations with different mobile numbers (suspicious cross-group approval)
  const approvedByUtr = new Map<string, RegRow[]>()
  for (const r of nonDeleted) {
    const utr = r.payments?.utr_number?.trim()
    if (utr && r.payments?.status === 'approved') {
      if (!approvedByUtr.has(utr)) approvedByUtr.set(utr, [])
      approvedByUtr.get(utr)!.push(r)
    }
  }
  for (const [utr, group] of approvedByUtr) {
    const uniqueMobiles = new Set(group.map(r => r.mobile.replace(/\D/g, '').slice(-10)))
    if (uniqueMobiles.size > 1) {
      anomalies.push({
        type: 'utr_shared_different_mobile',
        label: 'UTR Approved Across Different Mobiles',
        detail: `UTR ${utr} approved for ${group.length} people with ${uniqueMobiles.size} different mobile numbers — possible fraud or wrong approval`,
        ids: group.map(r => r.application_id),
      })
    }
  }

  // 4. Same UTR approved many times (> 5 — likely a mistake)
  for (const [utr, group] of approvedByUtr) {
    if (group.length > 5) {
      anomalies.push({
        type: 'duplicate_utr_approved',
        label: 'UTR Over-Approved',
        detail: `UTR ${utr} has been approved ${group.length} times — expected max ~5 for group bookings`,
        ids: group.map(r => r.application_id),
      })
    }
  }

  // 5. Approved payment but registration still not active/done (status mismatch)
  for (const r of nonDeleted) {
    if (r.payments?.status === 'approved' && r.registration_status === 'payment_pending') {
      anomalies.push({
        type: 'approved_no_pass',
        label: 'Approved Payment — Status Still Pending',
        detail: `${r.full_name} (${r.application_id}) — payment approved but registration status is still "Payment Pending"`,
        ids: [r.application_id],
      })
    }
  }

  const ANOMALY_META: Record<Anomaly['type'], { icon: string; color: string }> = {
    duplicate_mobile:             { icon: '📱', color: 'border-orange-700/40 bg-orange-900/10 text-orange-300' },
    duplicate_name:               { icon: '👤', color: 'border-yellow-700/40 bg-yellow-900/10 text-yellow-300' },
    utr_shared_different_mobile:  { icon: '⚠️', color: 'border-red-700/40 bg-red-900/10 text-red-300' },
    duplicate_utr_approved:       { icon: '🔴', color: 'border-red-700/40 bg-red-900/10 text-red-300' },
    approved_no_pass:             { icon: '🟡', color: 'border-yellow-700/40 bg-yellow-900/10 text-yellow-300' },
  }


  return (
    <>
      {/* Registration status stat cards */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
        {(['all', 'active', 'done', 'payment_pending', 'review', 'deleted'] as const).map((s) => {
          const meta = s === 'all' ? null : REG_STATUS_META[s]
          return (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`rounded-xl p-3 border text-left transition-all ${statusFilter === s ? 'border-yellow-500 bg-yellow-900/20' : 'border-white/10 bg-white/5 hover:border-white/20'}`}>
              <div className="text-xl font-bold text-white">{counts[s]}</div>
              <div className="text-xs text-zinc-400 mt-0.5">{meta ? `${meta.icon} ${meta.label}` : '📋 All'}</div>
            </button>
          )
        })}
      </div>

      {/* Detailed stats breakdown */}
      {regStats.total > 0 && (
        <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Pass type counts */}
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <div className="px-4 py-2 border-b border-white/10 text-xs text-zinc-500 uppercase tracking-wide font-semibold">Pass Distribution</div>
            <div className="grid grid-cols-2 divide-x divide-white/10">
              <div className="px-4 py-3 text-center">
                <div className="text-xl font-bold text-amber-400">{regStats.elite}</div>
                <div className="text-xs text-amber-600 mt-0.5">👑 Elite</div>
              </div>
              <div className="px-4 py-3 text-center">
                <div className="text-xl font-bold text-yellow-400">{regStats.gold}</div>
                <div className="text-xs text-yellow-600 mt-0.5">⭐ Gold</div>
              </div>
            </div>
          </div>

          {/* Paid counts */}
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <div className="px-4 py-2 border-b border-white/10 text-xs text-zinc-500 uppercase tracking-wide font-semibold">Payment Approved</div>
            <div className="grid grid-cols-3 divide-x divide-white/10">
              <div className="px-3 py-3 text-center">
                <div className="text-xl font-bold text-green-400">{regStats.paid}</div>
                <div className="text-xs text-green-600 mt-0.5">Total</div>
              </div>
              <div className="px-3 py-3 text-center">
                <div className="text-xl font-bold text-amber-400">{regStats.paid_elite}</div>
                <div className="text-xs text-amber-600 mt-0.5">👑 Elite</div>
              </div>
              <div className="px-3 py-3 text-center">
                <div className="text-xl font-bold text-yellow-400">{regStats.paid_gold}</div>
                <div className="text-xs text-yellow-600 mt-0.5">⭐ Gold</div>
              </div>
            </div>
          </div>

          {/* Gender × Pass breakdown table */}
          <div className="sm:col-span-2 bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <div className="px-4 py-2 border-b border-white/10 text-xs text-zinc-500 uppercase tracking-wide font-semibold">Gender × Pass Breakdown</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-4 py-2 text-zinc-600 text-xs font-medium">Gender</th>
                  <th className="text-center px-4 py-2 text-amber-600 text-xs font-medium">👑 Elite</th>
                  <th className="text-center px-4 py-2 text-yellow-600 text-xs font-medium">⭐ Gold</th>
                  <th className="text-center px-4 py-2 text-zinc-400 text-xs font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <tr>
                  <td className="px-4 py-2 text-blue-300 text-xs">♂ Male</td>
                  <td className="px-4 py-2 text-center text-white text-xs font-medium">{regStats.male_elite}</td>
                  <td className="px-4 py-2 text-center text-white text-xs font-medium">{regStats.male_gold}</td>
                  <td className="px-4 py-2 text-center text-zinc-300 text-xs font-bold">{regStats.male}</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-pink-300 text-xs">♀ Female</td>
                  <td className="px-4 py-2 text-center text-white text-xs font-medium">{regStats.female_elite}</td>
                  <td className="px-4 py-2 text-center text-white text-xs font-medium">{regStats.female_gold}</td>
                  <td className="px-4 py-2 text-center text-zinc-300 text-xs font-bold">{regStats.female}</td>
                </tr>
                {regStats.other > 0 && (
                  <tr>
                    <td className="px-4 py-2 text-purple-300 text-xs">⚧ Other</td>
                    <td className="px-4 py-2 text-center text-white text-xs font-medium">{regStats.other_elite}</td>
                    <td className="px-4 py-2 text-center text-white text-xs font-medium">{regStats.other_gold}</td>
                    <td className="px-4 py-2 text-center text-zinc-300 text-xs font-bold">{regStats.other}</td>
                  </tr>
                )}
                <tr className="bg-white/5">
                  <td className="px-4 py-2 text-zinc-400 text-xs font-semibold">Total</td>
                  <td className="px-4 py-2 text-center text-amber-400 text-xs font-bold">{regStats.elite}</td>
                  <td className="px-4 py-2 text-center text-yellow-400 text-xs font-bold">{regStats.gold}</td>
                  <td className="px-4 py-2 text-center text-white text-xs font-bold">{regStats.total}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Anomaly Panel ── */}
      {anomalies.length > 0 && (
        <div className="mb-4 border border-red-700/30 bg-red-900/10 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-red-700/20 flex items-center gap-2">
            <span className="text-lg">🚨</span>
            <span className="text-red-400 font-semibold text-sm">Anomalies Detected ({anomalies.length})</span>
            <span className="text-zinc-500 text-xs ml-1">— review and resolve these issues</span>
          </div>
          <div className="divide-y divide-red-700/10">
            {anomalies.map((a, i) => {
              const meta = ANOMALY_META[a.type]
              return (
                <div key={i} className={`px-4 py-3 flex flex-col sm:flex-row sm:items-start gap-2 border-l-4 ${meta.color}`}>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-base">{meta.icon}</span>
                    <span className="text-xs font-bold uppercase tracking-wide">{a.label}</span>
                  </div>
                  <div className="flex-1 text-xs text-zinc-400">{a.detail}</div>
                  <button
                    onClick={() => {
                      // Click first affected ID to open its detail
                      const row = rows.find(r => r.application_id === a.ids[0])
                      if (row) openDetail(row)
                    }}
                    className="text-xs text-yellow-400 hover:text-yellow-300 border border-yellow-700/30 px-2 py-1 rounded-lg shrink-0 transition-colors"
                  >
                    View →
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
      {anomalies.length === 0 && !loading && (
        <div className="mb-4 border border-green-700/20 bg-green-900/5 rounded-xl px-4 py-2.5 flex items-center gap-2">
          <span className="text-green-400 text-sm">✅</span>
          <span className="text-green-400 text-xs font-medium">No anomalies detected — all registrations look clean</span>
        </div>
      )}

      {/* Payment filter + search */}
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <span className="text-zinc-500 text-xs">Payment:</span>
        {(['all', 'pending', 'approved', 'rejected'] as const).map(s => (
          <button key={s} onClick={() => setPaymentFilter(s)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-all capitalize ${paymentFilter === s ? 'border-yellow-500 text-yellow-400 bg-yellow-900/20' : 'border-white/10 text-zinc-400 hover:border-white/30'}`}>
            {s}
          </button>
        ))}
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name / mobile / ID / UTR…"
          className="ml-auto bg-black/40 border border-white/10 text-white placeholder-zinc-600 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-yellow-500 w-full sm:w-64" />
        <button onClick={fetchRows} className="text-xs text-zinc-400 hover:text-white transition-colors">↻</button>
      </div>

      {/* Group approve — shown when search is a UTR with multiple pending payments */}
      {search && filtered.filter(r => r.payments?.utr_number?.toLowerCase() === search.toLowerCase() && r.payments?.status === 'pending').length > 1 && (
        <div className="mb-4 bg-blue-900/20 border border-blue-700/40 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-blue-300 text-sm font-semibold">Group booking detected</div>
            <div className="text-zinc-500 text-xs mt-0.5">
              {filtered.filter(r => r.payments?.utr_number?.toLowerCase() === search.toLowerCase() && r.payments?.status === 'pending').length} pending payments with UTR: <span className="font-mono text-zinc-300">{search}</span>
            </div>
          </div>
          <button
            onClick={async () => {
              if (!confirm(`Approve ALL pending payments for UTR "${search}"?`)) return
              const res = await fetch('/api/admin/verify-payment/group', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ utrNumber: search, action: 'approve' }),
              })
              if (res.ok) { await fetchRows() }
              else { const d = await res.json(); alert(d.error) }
            }}
            className="bg-green-600 hover:bg-green-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors shrink-0"
          >
            ✅ Approve All
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-4 py-2.5 border-b border-white/10">
          <span className="text-white text-sm font-semibold">Registrations ({filtered.length})</span>
        </div>
        {loading ? (
          <div className="text-center py-12 text-zinc-500">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-zinc-500">No registrations found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-zinc-500 text-xs uppercase tracking-wide">
                  <th className="text-left px-4 py-3 cursor-pointer hover:text-zinc-300 select-none whitespace-nowrap" onClick={() => toggleSort('name')}>
                    Name / ID {sortField === 'name' ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
                  </th>
                  <th className="text-left px-4 py-3 cursor-pointer hover:text-zinc-300 select-none whitespace-nowrap" onClick={() => toggleSort('mobile')}>
                    Mobile {sortField === 'mobile' ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
                  </th>
                  <th className="text-left px-4 py-3 cursor-pointer hover:text-zinc-300 select-none whitespace-nowrap" onClick={() => toggleSort('tier')}>
                    Pass {sortField === 'tier' ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
                  </th>
                  <th className="text-left px-4 py-3 cursor-pointer hover:text-zinc-300 select-none whitespace-nowrap" onClick={() => toggleSort('gender')}>
                    Gender {sortField === 'gender' ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
                  </th>
                  <th className="text-left px-4 py-3 cursor-pointer hover:text-zinc-300 select-none whitespace-nowrap" onClick={() => toggleSort('reg_status')}>
                    Status {sortField === 'reg_status' ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
                  </th>
                  <th className="text-left px-4 py-3 cursor-pointer hover:text-zinc-300 select-none whitespace-nowrap" onClick={() => toggleSort('pay_status')}>
                    Payment {sortField === 'pay_status' ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
                  </th>
                  <th className="text-left px-4 py-3 cursor-pointer hover:text-zinc-300 select-none whitespace-nowrap" onClick={() => toggleSort('utr')}>
                    UTR {sortField === 'utr' ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
                  </th>
                  <th className="text-left px-4 py-3 cursor-pointer hover:text-zinc-300 select-none whitespace-nowrap" onClick={() => toggleSort('date')}>
                    Date {sortField === 'date' ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
                  </th>
                  <th className="text-left px-4 py-3 whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const sm = REG_STATUS_META[row.registration_status] ?? REG_STATUS_META['active']
                  return (
                    <tr key={row.application_id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3">
                        <div className="text-white font-medium">{row.full_name}</div>
                        <div className="text-zinc-500 text-xs font-mono">{row.application_id}</div>
                      </td>
                      <td className="px-4 py-3 text-zinc-400 whitespace-nowrap">{row.mobile}</td>
                      <td className="px-4 py-3 text-zinc-300 whitespace-nowrap">
                        {SEAT_TIERS[row.seat_tier as keyof typeof SEAT_TIERS]?.badge}{' '}
                        {SEAT_TIERS[row.seat_tier as keyof typeof SEAT_TIERS]?.label}
                      </td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap">
                        {row.gender === 'male'
                          ? <span className="text-blue-300">♂ Male</span>
                          : row.gender === 'female'
                          ? <span className="text-pink-300">♀ Female</span>
                          : <span className="text-purple-300">⚧ Other</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full border ${sm.color}`}>{sm.icon} {sm.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full border ${paymentColor(row.payments?.status)}`}>
                          {row.payments?.status ?? 'none'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {row.payments?.utr_number
                          ? <span className="text-xs font-mono text-cyan-400 bg-cyan-900/20 border border-cyan-700/30 px-2 py-1 rounded-lg">{row.payments.utr_number}</span>
                          : <span className="text-zinc-600 text-xs">—</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-zinc-500 text-xs whitespace-nowrap">
                        {new Date(row.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => openDetail(row)} className="text-xs text-yellow-400 hover:text-yellow-300 font-medium">View →</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setSelected(null)}>
          <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-zinc-900 border-b border-white/10 px-5 py-4 flex items-center justify-between">
              <h3 className="font-semibold text-white">Registration Detail</h3>
              <button onClick={() => setSelected(null)} className="text-zinc-500 hover:text-white text-xl">✕</button>
            </div>
            <div className="p-5 space-y-5">
              {/* Info */}
              <div className="space-y-2 text-sm">
                {[
                  { l: 'Name', v: selected.full_name },
                  { l: 'Mobile', v: selected.mobile },
                  { l: 'Gender', v: selected.gender ? selected.gender.charAt(0).toUpperCase() + selected.gender.slice(1) : '—' },
                  { l: 'Application ID', v: selected.application_id },
                  { l: 'Pass', v: `${SEAT_TIERS[selected.seat_tier as keyof typeof SEAT_TIERS]?.badge} ${SEAT_TIERS[selected.seat_tier as keyof typeof SEAT_TIERS]?.label}` },
                  { l: 'Amount Paid', v: `₹${selected.payments?.amount?.toLocaleString() ?? '–'}` },
                ].map(({ l, v }) => (
                  <div key={l} className="flex justify-between gap-4">
                    <span className="text-zinc-500 shrink-0">{l}</span>
                    <span className="text-white text-right font-medium break-all">{v}</span>
                  </div>
                ))}
              </div>

              {/* Payment verification */}
              {!selected.payments ? (
                <div className="border border-white/10 rounded-xl p-4 space-y-2">
                  <div className="text-xs text-zinc-400 font-semibold uppercase tracking-wide">Payment</div>
                  <div className="text-sm text-zinc-500 italic">No payment record found for this registration.</div>
                  <div className="text-xs text-zinc-600">Use &quot;Grant Free Pass&quot; below to approve without payment.</div>
                </div>
              ) : selected.payments.status === 'pending' ? (
                <div className="border border-white/10 rounded-xl p-4 space-y-3">
                  <div className="text-xs text-zinc-400 font-semibold uppercase tracking-wide">Payment Verification</div>

                  {/* UTR display */}
                  <div className={`rounded-lg px-3 py-2.5 text-sm flex items-center justify-between gap-2 ${selected.payments.utr_number ? 'bg-blue-900/20 border border-blue-700/30' : 'bg-white/5 border border-white/10'}`}>
                    <div>
                      <div className="text-xs text-zinc-500 mb-0.5">UTR / Transaction ID</div>
                      {selected.payments.utr_number
                        ? <div className="text-white font-mono font-bold">{selected.payments.utr_number}</div>
                        : <div className="text-zinc-500 italic">Not submitted yet</div>
                      }
                    </div>
                    {selected.payments.utr_number && (
                      <button
                        type="button"
                        onClick={() => navigator.clipboard.writeText(selected.payments!.utr_number!)}
                        className="text-xs text-zinc-400 hover:text-yellow-400 transition-colors shrink-0"
                      >
                        Copy
                      </button>
                    )}
                  </div>

                  {/* Screenshot */}
                  {screenshotUrl ? (
                    <div>
                      <div className="text-xs text-zinc-500 uppercase tracking-wide mb-2">Payment Screenshot</div>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={screenshotUrl} alt="Payment screenshot" className="w-full rounded-xl border border-white/10" />
                    </div>
                  ) : selected.payments.screenshot_path ? (
                    <div className="text-xs text-zinc-500 italic">Screenshot uploaded — preview unavailable.</div>
                  ) : (
                    <div className="text-xs text-zinc-600 italic">No screenshot uploaded yet.</div>
                  )}

                  <input type="text" value={paymentNote} onChange={e => setPaymentNote(e.target.value)}
                    placeholder="Rejection reason (optional)"
                    className="w-full bg-white/5 border border-white/10 text-white placeholder-zinc-500 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-yellow-500" />
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => handlePaymentAction('approve')} disabled={actionLoading}
                      className="bg-green-600 hover:bg-green-500 text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-60">
                      {actionLoading ? '…' : '✅ Approve'}
                    </button>
                    <button onClick={() => handlePaymentAction('reject')} disabled={actionLoading}
                      className="bg-red-700 hover:bg-red-600 text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-60">
                      {actionLoading ? '…' : '❌ Reject'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className={`rounded-xl p-4 space-y-3 text-sm ${paymentColor(selected.payments.status)}`}>
                  {/* Status header */}
                  <div className="flex items-center gap-2">
                    <span className="text-lg">
                      {selected.payments.status === 'approved' ? '✅' : '❌'}
                    </span>
                    <div className="font-semibold">
                      Payment {selected.payments.status}
                      {selected.payments.rejection_reason && ` — ${selected.payments.rejection_reason}`}
                    </div>
                  </div>

                  {/* UTR */}
                  <div className="bg-black/20 rounded-lg px-3 py-2.5 flex items-center justify-between gap-2">
                    <div>
                      <div className="text-xs opacity-60 mb-0.5">UTR / Transaction ID</div>
                      {selected.payments.utr_number
                        ? <div className="font-mono font-bold text-white">{selected.payments.utr_number}</div>
                        : <div className="opacity-50 italic">Not provided</div>
                      }
                    </div>
                    {selected.payments.utr_number && (
                      <button
                        type="button"
                        onClick={() => navigator.clipboard.writeText(selected.payments!.utr_number!)}
                        className="text-xs opacity-60 hover:opacity-100 transition-opacity shrink-0"
                      >
                        Copy
                      </button>
                    )}
                  </div>

                  {/* Screenshot */}
                  {screenshotUrl ? (
                    <div>
                      <div className="text-xs opacity-60 uppercase tracking-wide mb-2">Payment Screenshot</div>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={screenshotUrl} alt="Payment screenshot" className="w-full rounded-xl border border-white/10" />
                    </div>
                  ) : selected.payments.screenshot_path ? (
                    <div className="text-xs opacity-50 italic">Screenshot uploaded — preview unavailable.</div>
                  ) : (
                    <div className="bg-black/20 rounded-lg px-3 py-2 text-xs opacity-50 italic">No screenshot provided</div>
                  )}
                </div>
              )}

              {/* Tier Upgrade / Downgrade */}
              <TierUpgradePanel
                applicationId={selected.application_id}
                currentTier={selected.seat_tier as 'elite' | 'gold'}
                onSaved={fetchRows}
              />

              {/* Ticket No & Table Number */}
              <TicketAssignPanel
                applicationId={selected.application_id}
                onSaved={fetchRows}
              />

              {/* Registration status management */}
              <div className="border border-white/10 rounded-xl p-4 space-y-3">
                <div className="text-xs text-zinc-400 font-semibold uppercase tracking-wide">Registration Status</div>
                <div className="text-sm text-zinc-300">
                  Current: <span className={`font-semibold ${REG_STATUS_META[selected.registration_status ?? 'active'].color.split(' ')[0]}`}>
                    {REG_STATUS_META[selected.registration_status ?? 'active'].icon} {REG_STATUS_META[selected.registration_status ?? 'active'].label}
                  </span>
                </div>
                {selected.status_note && (
                  <div className="text-xs text-zinc-500 italic">Note: {selected.status_note}</div>
                )}
                <input type="text" value={statusNote} onChange={e => setStatusNote(e.target.value)}
                  placeholder="Add a note (optional)"
                  className="w-full bg-white/5 border border-white/10 text-white placeholder-zinc-500 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-yellow-500" />

                {/* Free Pass grant — complimentary access without payment */}
                <button
                  onClick={(e) => { e.stopPropagation(); handleStatusChange('done') }}
                  disabled={actionLoading || selected.registration_status === 'done'}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold border border-emerald-600/50 text-emerald-300 bg-emerald-900/20 hover:bg-emerald-900/40 disabled:opacity-40 transition-colors">
                  {actionLoading ? '…' : selected.registration_status === 'done' ? '✅ Free Pass Already Granted' : '🎁 Grant Free Pass — skip payment, generate QR'}
                </button>

                <div className="text-xs text-zinc-600 text-center">— or change status —</div>

                <div className="grid grid-cols-2 gap-2">
                  {(['active', 'payment_pending', 'review'] as const).map(s => (
                    <button key={s} onClick={(e) => { e.stopPropagation(); handleStatusChange(s) }} disabled={actionLoading || selected.registration_status === s}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all disabled:opacity-40 ${REG_STATUS_META[s].color}`}>
                      {REG_STATUS_META[s].icon} {REG_STATUS_META[s].label}
                    </button>
                  ))}
                  {/* Revoke done — allows going back from done if needed */}
                  {selected.registration_status === 'done' && (
                    <button onClick={(e) => { e.stopPropagation(); handleStatusChange('active') }} disabled={actionLoading}
                      className="py-2 px-3 rounded-xl text-xs font-semibold border transition-all border-zinc-600 text-zinc-400 bg-zinc-900/40 hover:bg-zinc-800/60">
                      ↩️ Revoke Done → Active
                    </button>
                  )}
                </div>
                {/* Move to trash */}
                {(selected.registration_status ?? 'active') !== 'deleted' ? (
                  <button onClick={(e) => { e.stopPropagation(); handleStatusChange('deleted') }} disabled={actionLoading}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold border border-red-700/40 text-red-400 bg-red-900/20 hover:bg-red-900/40 disabled:opacity-40 transition-colors">
                    🗑️ Move to Trash — blocks login, retains data
                  </button>
                ) : (
                  <div className="space-y-2">
                    <div className="text-xs text-zinc-500 text-center">This registration is in trash. Login is blocked.</div>
                    <button onClick={(e) => { e.stopPropagation(); handleStatusChange('active') }} disabled={actionLoading}
                      className="w-full py-2.5 rounded-xl text-sm font-semibold border border-green-700/40 text-green-400 bg-green-900/20 hover:bg-green-900/40 disabled:opacity-40 transition-colors">
                      ↩️ Restore from Trash
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleHardDelete() }} disabled={actionLoading}
                      className="w-full py-2.5 rounded-xl text-sm font-semibold border border-red-500/50 text-red-300 bg-red-900/30 hover:bg-red-800/50 disabled:opacity-40 transition-colors">
                      ☠️ Permanently Delete — removes all data forever
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── CONTESTANTS TAB ──────────────────────────────────────────────────────────

const CONTESTANT_CATEGORIES: { value: VoteCategory; label: string; icon: string }[] = [
  { value: 'kid',    label: 'Little', icon: '🧒' },
  { value: 'teen',   label: 'Teen',   icon: '👧' },
  { value: 'miss',   label: 'Miss',   icon: '👩' },
  { value: 'misses', label: 'Misses', icon: '👑' },
]

const emptyForm = { name: '', tagline: '', bio: '', photo_url: '', category: '', contestant_category: '' as VoteCategory | '', display_order: 0 }

function ContestantsTab() {
  const [contestants, setContestants] = useState<Contestant[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Contestant | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [filterCat, setFilterCat] = useState<VoteCategory | 'all'>('all')

  const fetchContestants = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/contestants')
    if (res.ok) { const d = await res.json(); setContestants(d.contestants) }
    setLoading(false)
  }, [])

  useEffect(() => { fetchContestants() }, [fetchContestants])

  function openCreate() { setForm(emptyForm); setPhotoFile(null); setError(''); setCreating(true); setEditing(null) }
  function openEdit(c: Contestant) {
    setForm({ name: c.name, tagline: c.tagline ?? '', bio: c.bio ?? '', photo_url: c.photo_url ?? '', category: c.category ?? '', contestant_category: c.contestant_category ?? '', display_order: c.display_order })
    setPhotoFile(null); setError(''); setEditing(c); setCreating(false)
  }
  function closeModal() { setEditing(null); setCreating(false); setError('') }

  async function uploadPhoto(contestantId: string): Promise<string | null> {
    if (!photoFile) return null
    setUploading(true)
    const fd = new FormData()
    fd.append('file', photoFile)
    fd.append('contestantId', contestantId)
    const res = await fetch('/api/admin/contestant-photo-url', { method: 'POST', body: fd })
    const data = await res.json()
    setUploading(false)
    if (!res.ok) { setError(data.error ?? 'Upload failed'); return null }
    return data.publicUrl
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Name is required'); return }
    if (!form.contestant_category) { setError('Vote category is required (little / teen / miss / misses)'); return }
    setSaving(true); setError('')

    const payload = { ...form, display_order: Number(form.display_order) }

    if (creating) {
      const res = await fetch('/api/admin/contestants', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed'); setSaving(false); return }
      if (photoFile) {
        const photoUrl = await uploadPhoto(data.contestant.id)
        if (!photoUrl) { setSaving(false); return } // upload error already set
        await fetch(`/api/admin/contestants/${data.contestant.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ photo_url: photoUrl }) })
      }
    } else if (editing) {
      let photoUrl = form.photo_url
      if (photoFile) {
        const uploaded = await uploadPhoto(editing.id)
        if (!uploaded) { setSaving(false); return } // upload error already set
        photoUrl = uploaded
      }
      const res = await fetch(`/api/admin/contestants/${editing.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, photo_url: photoUrl }) })
      if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Failed'); setSaving(false); return }
    }

    setSaving(false); closeModal(); fetchContestants()
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    await fetch(`/api/admin/contestants/${id}`, { method: 'DELETE' })
    fetchContestants()
  }

  const displayed = filterCat === 'all' ? contestants : contestants.filter(c => c.contestant_category === filterCat)

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setFilterCat('all')} className={`text-xs px-3 py-1.5 rounded-full border transition-all ${filterCat === 'all' ? 'border-yellow-500 text-yellow-400 bg-yellow-900/20' : 'border-white/10 text-zinc-400'}`}>
            All ({contestants.length})
          </button>
          {CONTESTANT_CATEGORIES.map(cat => (
            <button key={cat.value} onClick={() => setFilterCat(cat.value)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all ${filterCat === cat.value ? 'border-yellow-500 text-yellow-400 bg-yellow-900/20' : 'border-white/10 text-zinc-400'}`}>
              {cat.icon} {cat.label} ({contestants.filter(c => c.contestant_category === cat.value).length})
            </button>
          ))}
        </div>
        <button onClick={openCreate} className="bg-gradient-to-r from-yellow-600 to-yellow-400 text-black font-bold px-4 py-2 rounded-xl text-sm hover:from-yellow-500 hover:to-yellow-300 transition-all">
          + Add Contestant
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-zinc-500">Loading...</div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-12 text-zinc-500">No contestants in this category.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayed.map((c) => {
            const catMeta = CONTESTANT_CATEGORIES.find(x => x.value === c.contestant_category)
            return (
              <div key={c.id} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden flex flex-col">
                <div className="aspect-[3/2] bg-gradient-to-br from-purple-900/40 to-yellow-900/20 relative overflow-hidden">
                  {c.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.photo_url} alt={c.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex items-center justify-center h-full text-5xl">👸</div>
                  )}
                  {catMeta && (
                    <div className="absolute top-2 left-2 bg-black/70 text-yellow-400 text-xs px-2 py-1 rounded-full border border-yellow-700/40">
                      {catMeta.icon} {catMeta.label}
                    </div>
                  )}
                  {c.category && (
                    <div className="absolute bottom-2 left-2 bg-black/60 text-zinc-300 text-xs px-2 py-1 rounded-full">
                      {c.category}
                    </div>
                  )}
                  <div className="absolute top-2 right-2 bg-black/60 text-zinc-400 text-xs px-2 py-1 rounded-full">#{c.display_order}</div>
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <div className="font-bold text-white">{c.name}</div>
                  {c.tagline && <div className="text-zinc-400 text-sm italic mt-0.5">&ldquo;{c.tagline}&rdquo;</div>}
                  {c.bio && <div className="text-zinc-500 text-xs mt-2 line-clamp-2">{c.bio}</div>}
                  <div className="flex gap-2 mt-4 pt-3 border-t border-white/10">
                    <button onClick={() => openEdit(c)} className="flex-1 bg-white/10 hover:bg-white/20 text-white text-xs font-medium py-2 rounded-lg">✏️ Edit</button>
                    <button onClick={() => handleDelete(c.id, c.name)} className="flex-1 bg-red-900/30 hover:bg-red-800/50 text-red-400 text-xs font-medium py-2 rounded-lg">🗑️ Delete</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {(creating || !!editing) && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={closeModal}>
          <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-zinc-900 border-b border-white/10 px-5 py-4 flex items-center justify-between">
              <h3 className="font-semibold text-white">{creating ? 'Add Contestant' : `Edit — ${editing?.name}`}</h3>
              <button onClick={closeModal} className="text-zinc-500 hover:text-white text-xl">✕</button>
            </div>
            <div className="p-5 space-y-4">
              {error && <div className="bg-red-900/20 border border-red-700/40 text-red-400 text-sm rounded-xl px-4 py-3">{error}</div>}

              {/* Vote category — required */}
              <div>
                <label className="block text-xs text-zinc-400 mb-2">Vote Category * (determines which poll they appear in)</label>
                <div className="grid grid-cols-4 gap-2">
                  {CONTESTANT_CATEGORIES.map(cat => (
                    <button key={cat.value} type="button" onClick={() => setForm(f => ({ ...f, contestant_category: cat.value }))}
                      className={`py-2 rounded-xl text-xs font-semibold border transition-all ${form.contestant_category === cat.value ? 'border-yellow-500 bg-yellow-900/20 text-yellow-400' : 'border-white/10 text-zinc-400 hover:border-white/30'}`}>
                      {cat.icon} {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {[
                { label: 'Name *', field: 'name', placeholder: 'Contestant full name' },
                { label: 'Sub-category / Title', field: 'category', placeholder: 'e.g. Miss Elegance' },
                { label: 'Tagline', field: 'tagline', placeholder: 'Short catchy phrase' },
                { label: 'Display Order', field: 'display_order', placeholder: '1', type: 'number' },
              ].map(({ label, field, placeholder, type }) => (
                <div key={field}>
                  <label className="block text-xs text-zinc-400 mb-1.5">{label}</label>
                  <input type={type ?? 'text'} value={String(form[field as keyof typeof form])}
                    onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} placeholder={placeholder}
                    className="w-full bg-white/5 border border-white/10 text-white placeholder-zinc-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-yellow-500" />
                </div>
              ))}

              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Bio</label>
                <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} placeholder="Short biography" rows={3}
                  className="w-full bg-white/5 border border-white/10 text-white placeholder-zinc-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-yellow-500 resize-none" />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Photo</label>
                <label className={`flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-xl cursor-pointer ${photoFile ? 'border-green-600 bg-green-900/10' : 'border-white/10 hover:border-yellow-700/50 bg-white/5'}`}>
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={e => setPhotoFile(e.target.files?.[0] ?? null)} />
                  {photoFile ? (
                    <div className="text-center"><div className="text-green-400 text-sm font-medium">{photoFile.name}</div><div className="text-zinc-500 text-xs">{(photoFile.size / 1024 / 1024).toFixed(1)} MB</div></div>
                  ) : (
                    <div className="text-center"><div className="text-zinc-400 text-sm">📷 Click to upload photo</div><div className="text-zinc-600 text-xs mt-0.5">JPG, PNG or WebP</div></div>
                  )}
                </label>
                {!photoFile && form.photo_url && (
                  <div className="mt-2 flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={form.photo_url} alt="Current" className="w-10 h-10 rounded-lg object-cover border border-white/10" />
                    <span className="text-zinc-500 text-xs">Current photo (upload new to replace)</span>
                  </div>
                )}
              </div>

              <button onClick={handleSave} disabled={saving || uploading}
                className="w-full bg-gradient-to-r from-yellow-600 to-yellow-400 text-black font-bold py-3 rounded-xl disabled:opacity-60 hover:from-yellow-500 hover:to-yellow-300 transition-all">
                {uploading ? 'Uploading…' : saving ? 'Saving…' : creating ? 'Add Contestant' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── SPONSORS TAB ────────────────────────────────────────────────────────────

interface Sponsor {
  id: string
  name: string
  tagline?: string
  logo_url?: string
  website_url?: string
  tier: 'title' | 'gold' | 'silver' | 'bronze'
  display_order: number
}

const SPONSOR_TIERS: { value: Sponsor['tier']; label: string; icon: string; color: string }[] = [
  { value: 'title',  label: 'Title',  icon: '👑', color: 'text-amber-300' },
  { value: 'gold',   label: 'Gold',   icon: '🥇', color: 'text-yellow-400' },
  { value: 'silver', label: 'Silver', icon: '🥈', color: 'text-zinc-300' },
  { value: 'bronze', label: 'Bronze', icon: '🥉', color: 'text-amber-700' },
]

const emptySponsorForm = { name: '', tagline: '', logo_url: '', website_url: '', tier: 'gold' as Sponsor['tier'], display_order: 0 }

function SponsorsTab() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Sponsor | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState(emptySponsorForm)
  const [saving, setSaving] = useState(false)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [filterTier, setFilterTier] = useState<Sponsor['tier'] | 'all'>('all')

  const fetchSponsors = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/sponsors')
    if (res.ok) { const d = await res.json(); setSponsors(d.sponsors ?? []) }
    setLoading(false)
  }, [])

  useEffect(() => { fetchSponsors() }, [fetchSponsors])

  function openCreate() { setForm(emptySponsorForm); setLogoFile(null); setError(''); setCreating(true); setEditing(null) }
  function openEdit(s: Sponsor) {
    setForm({ name: s.name, tagline: s.tagline ?? '', logo_url: s.logo_url ?? '', website_url: s.website_url ?? '', tier: s.tier, display_order: s.display_order })
    setLogoFile(null); setError(''); setEditing(s); setCreating(false)
  }
  function closeModal() { setEditing(null); setCreating(false); setError('') }

  async function uploadLogo(sponsorId: string): Promise<string | null> {
    if (!logoFile) return null
    setUploading(true)
    const fd = new FormData()
    fd.append('file', logoFile)
    fd.append('sponsorId', sponsorId)
    const res = await fetch('/api/admin/sponsor-logo-url', { method: 'POST', body: fd })
    const data = await res.json()
    setUploading(false)
    if (!res.ok) { setError(data.error ?? 'Upload failed'); return null }
    return data.publicUrl
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Name is required'); return }
    setSaving(true); setError('')
    const payload = { ...form, display_order: Number(form.display_order) }
    if (creating) {
      const res = await fetch('/api/admin/sponsors', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed'); setSaving(false); return }
      if (logoFile) {
        const url = await uploadLogo(data.sponsor.id)
        if (!url) { setSaving(false); return }
        await fetch(`/api/admin/sponsors/${data.sponsor.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ logo_url: url }) })
      }
    } else if (editing) {
      let logoUrl = form.logo_url
      if (logoFile) {
        const uploaded = await uploadLogo(editing.id)
        if (!uploaded) { setSaving(false); return }
        logoUrl = uploaded
      }
      const res = await fetch(`/api/admin/sponsors/${editing.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, logo_url: logoUrl }) })
      if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Failed'); setSaving(false); return }
    }
    setSaving(false); closeModal(); fetchSponsors()
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete sponsor "${name}"? This cannot be undone.`)) return
    await fetch(`/api/admin/sponsors/${id}`, { method: 'DELETE' })
    fetchSponsors()
  }

  const displayed = filterTier === 'all' ? sponsors : sponsors.filter(s => s.tier === filterTier)

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setFilterTier('all')} className={`text-xs px-3 py-1.5 rounded-full border transition-all ${filterTier === 'all' ? 'border-yellow-500 text-yellow-400 bg-yellow-900/20' : 'border-white/10 text-zinc-400'}`}>
            All ({sponsors.length})
          </button>
          {SPONSOR_TIERS.map(t => (
            <button key={t.value} onClick={() => setFilterTier(t.value)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all ${filterTier === t.value ? 'border-yellow-500 text-yellow-400 bg-yellow-900/20' : 'border-white/10 text-zinc-400'}`}>
              {t.icon} {t.label} ({sponsors.filter(s => s.tier === t.value).length})
            </button>
          ))}
        </div>
        <button onClick={openCreate} className="bg-gradient-to-r from-yellow-600 to-yellow-400 text-black font-bold px-4 py-2 rounded-xl text-sm hover:from-yellow-500 hover:to-yellow-300 transition-all">
          + Add Sponsor
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-zinc-500">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayed.map(s => {
            const tierMeta = SPONSOR_TIERS.find(t => t.value === s.tier)!
            return (
              <div key={s.id} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden flex flex-col">
                <div className="aspect-[16/7] bg-gradient-to-br from-zinc-900 to-zinc-800 flex items-center justify-center relative overflow-hidden">
                  {s.logo_url
                    ? <img src={s.logo_url} alt={s.name} className="w-full h-full object-contain p-4" /> // eslint-disable-line @next/next/no-img-element
                    : <div className="text-4xl">🤝</div>
                  }
                  <div className={`absolute top-2 left-2 bg-black/70 text-xs px-2 py-1 rounded-full border border-white/10 font-semibold ${tierMeta.color}`}>
                    {tierMeta.icon} {tierMeta.label}
                  </div>
                  <div className="absolute top-2 right-2 bg-black/60 text-zinc-400 text-xs px-2 py-1 rounded-full">#{s.display_order}</div>
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <div className="font-bold text-white">{s.name}</div>
                  {s.tagline && <div className="text-zinc-400 text-sm italic mt-0.5">{s.tagline}</div>}
                  {s.website_url && <a href={s.website_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 text-xs mt-1 hover:underline truncate">{s.website_url}</a>}
                  <div className="flex gap-2 mt-4 pt-3 border-t border-white/10">
                    <button onClick={() => openEdit(s)} className="flex-1 bg-white/10 hover:bg-white/20 text-white text-xs font-medium py-2 rounded-lg">✏️ Edit</button>
                    <button onClick={() => handleDelete(s.id, s.name)} className="flex-1 bg-red-900/30 hover:bg-red-800/50 text-red-400 text-xs font-medium py-2 rounded-lg">🗑️ Delete</button>
                  </div>
                </div>
              </div>
            )
          })}
          {/* Empty placeholder cards to maintain grid structure */}
          {displayed.length === 0 && Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white/3 border border-dashed border-white/10 rounded-2xl aspect-[4/3] flex flex-col items-center justify-center gap-2 text-zinc-700">
              <span className="text-3xl">🤝</span>
              <span className="text-xs">No sponsors yet</span>
            </div>
          ))}
        </div>
      )}

      {(creating || !!editing) && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={closeModal}>
          <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-zinc-900 border-b border-white/10 px-5 py-4 flex items-center justify-between">
              <h3 className="font-semibold text-white">{creating ? 'Add Sponsor' : `Edit — ${editing?.name}`}</h3>
              <button onClick={closeModal} className="text-zinc-500 hover:text-white text-xl">✕</button>
            </div>
            <div className="p-5 space-y-4">
              {error && <div className="bg-red-900/20 border border-red-700/40 text-red-400 text-sm rounded-xl px-4 py-3">{error}</div>}
              <div>
                <label className="block text-xs text-zinc-400 mb-2">Sponsor Tier *</label>
                <div className="grid grid-cols-4 gap-2">
                  {SPONSOR_TIERS.map(t => (
                    <button key={t.value} type="button" onClick={() => setForm(f => ({ ...f, tier: t.value }))}
                      className={`py-2 rounded-xl text-xs font-semibold border transition-all ${form.tier === t.value ? 'border-yellow-500 bg-yellow-900/20 text-yellow-400' : 'border-white/10 text-zinc-400 hover:border-white/30'}`}>
                      {t.icon} {t.label}
                    </button>
                  ))}
                </div>
              </div>
              {[
                { label: 'Sponsor Name *', field: 'name', placeholder: 'Company or brand name' },
                { label: 'Tagline', field: 'tagline', placeholder: 'Short description or slogan' },
                { label: 'Website URL', field: 'website_url', placeholder: 'https://example.com' },
                { label: 'Display Order', field: 'display_order', placeholder: '1', type: 'number' },
              ].map(({ label, field, placeholder, type }) => (
                <div key={field}>
                  <label className="block text-xs text-zinc-400 mb-1.5">{label}</label>
                  <input type={type ?? 'text'} value={String(form[field as keyof typeof form])}
                    onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} placeholder={placeholder}
                    className="w-full bg-white/5 border border-white/10 text-white placeholder-zinc-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-yellow-500" />
                </div>
              ))}
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Logo</label>
                <label className={`flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-xl cursor-pointer ${logoFile ? 'border-green-600 bg-green-900/10' : 'border-white/10 hover:border-yellow-700/50 bg-white/5'}`}>
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" className="sr-only" onChange={e => setLogoFile(e.target.files?.[0] ?? null)} />
                  {logoFile
                    ? <div className="text-center"><div className="text-green-400 text-sm font-medium">{logoFile.name}</div><div className="text-zinc-500 text-xs">{(logoFile.size / 1024 / 1024).toFixed(1)} MB</div></div>
                    : <div className="text-center"><div className="text-zinc-400 text-sm">🖼️ Click to upload logo</div><div className="text-zinc-600 text-xs mt-0.5">JPG, PNG, WebP or SVG</div></div>
                  }
                </label>
                {!logoFile && form.logo_url && (
                  <div className="mt-2 flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={form.logo_url} alt="Current" className="w-10 h-10 rounded-lg object-contain border border-white/10 bg-white p-1" />
                    <span className="text-zinc-500 text-xs">Current logo (upload new to replace)</span>
                  </div>
                )}
              </div>
              <button onClick={handleSave} disabled={saving || uploading}
                className="w-full bg-gradient-to-r from-yellow-600 to-yellow-400 text-black font-bold py-3 rounded-xl disabled:opacity-60 hover:from-yellow-500 hover:to-yellow-300 transition-all">
                {uploading ? 'Uploading…' : saving ? 'Saving…' : creating ? 'Add Sponsor' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── VOTES TAB ────────────────────────────────────────────────────────────────

function VotesTab() {
  const [byCategory, setByCategory] = useState<Record<string, CategoryResult[]>>({})
  const [totalVotes, setTotalVotes] = useState(0)
  const [loading, setLoading] = useState(true)
  const [resetting, setResetting] = useState<string | null>(null)

  const fetchVotes = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/votes')
    if (res.ok) { const d = await res.json(); setByCategory(d.byCategory); setTotalVotes(d.totalVotes) }
    setLoading(false)
  }, [])

  useEffect(() => { fetchVotes() }, [fetchVotes])

  async function handleReset(category?: string) {
    const label = category ? `all ${category} votes` : 'ALL votes across every category'
    if (!confirm(`Reset ${label}? This cannot be undone.`)) return
    setResetting(category ?? 'all')
    await fetch('/api/admin/votes', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(category ? { category } : {}),
    })
    setResetting(null)
    fetchVotes()
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-white font-semibold">Vote Results by Category</h2>
          <div className="text-zinc-500 text-sm mt-0.5">Total votes cast: <span className="text-yellow-400 font-semibold">{totalVotes}</span></div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchVotes} className="text-xs text-zinc-400 hover:text-white">↻ Refresh</button>
          <button onClick={() => handleReset()} disabled={resetting !== null || totalVotes === 0}
            className="bg-red-900/40 hover:bg-red-800/60 text-red-400 border border-red-700/40 text-xs font-semibold px-4 py-2 rounded-xl disabled:opacity-40">
            {resetting === 'all' ? 'Resetting…' : '🗑️ Reset All'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-zinc-500">Loading...</div>
      ) : (
        <div className="space-y-8">
          {VOTE_CATEGORIES.map(cat => {
            const catMeta = CONTESTANT_CATEGORIES.find(x => x.value === cat)!
            const results = byCategory[cat] ?? []
            const catTotal = results.reduce((s, r) => s + (r.displayCount ?? r.count), 0)
            const maxCount = Math.max(...results.map(r => r.displayCount ?? r.count), 1)

            return (
              <div key={cat} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-semibold">{catMeta.icon} {catMeta.label} Category</h3>
                    <div className="text-zinc-500 text-xs mt-0.5">{catTotal} vote{catTotal !== 1 ? 's' : ''} cast</div>
                  </div>
                  <button onClick={() => handleReset(cat)} disabled={resetting !== null || results.length === 0}
                    className="text-xs text-red-400 hover:text-red-300 border border-red-700/30 px-3 py-1.5 rounded-lg disabled:opacity-40 transition-colors">
                    {resetting === cat ? 'Resetting…' : '🗑️ Reset'}
                  </button>
                </div>

                {results.length === 0 ? (
                  <div className="text-center py-6 text-zinc-600 text-sm">No votes yet in this category</div>
                ) : (
                  <div className="p-4 space-y-3">
                    {results.map((r, i) => {
                      const display = r.displayCount ?? r.count
                      const pct = catTotal > 0 ? Math.round((display / catTotal) * 100) : 0
                      return (
                        <div key={r.contestantId} className="flex items-center gap-3">
                          <div className={`text-base w-7 text-center font-bold shrink-0 ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-zinc-400' : i === 2 ? 'text-amber-700' : 'text-zinc-600'}`}>
                            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                          </div>
                          {r.photo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={r.photo_url} alt={r.name} className="w-9 h-9 rounded-full object-cover border border-white/20 shrink-0" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-purple-900/40 flex items-center justify-center text-base shrink-0">👸</div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-white text-sm font-medium truncate">{r.name}</span>
                              <span className="text-yellow-400 text-xs font-bold ml-2 shrink-0">{display} ({pct}%)</span>
                            </div>
                            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400 rounded-full" style={{ width: `${(display / maxCount) * 100}%` }} />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
